# Festipals Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Festipals from a functional prototype into a polished, mobile-native festival schedule app ready for Download 2026 through four groups of improvements: share/invite flow, mobile usability, social polish, and code hygiene.

**Architecture:** Next.js 16 App Router with server components and TanStack Query mutations. The most foundational change (Task 1) is a DB schema migration removing the single-use constraint from invite tokens. All subsequent tasks build on the codebase as it stands — no architectural changes beyond what each task describes.

**Tech Stack:** Next.js 16, TypeScript 5, Tailwind CSS v4, Drizzle ORM 0.45, Neon PostgreSQL, TanStack Query v5, Vitest

**Spec:** `docs/superpowers/specs/2026-05-01-festipals-overhaul-design.md`

---

## File Structure

Files modified or created by this plan:

| File | Change |
|------|--------|
| `lib/db/schema.ts` | Drop `usedAt`/`usedBy` from `inviteTokens`, add `expiresAt` |
| `lib/db/queries/invites.ts` | Multi-use logic, remove `markInviteUsed` |
| `lib/db/queries/users.ts` | Add `createUserWithColour`, parallel `getUserById` |
| `lib/db/queries/lineup.ts` | `unstable_cache` wrapper |
| `lib/clash-detection.ts` | Add `overlapStart` to `ClashPair` push |
| `lib/time.ts` | Already has `formatTime` — no change needed |
| `types/index.ts` | Add `overlapStart` to `ClashPair`; update `InviteToken` |
| `lib/__tests__/clash-detection.test.ts` | Update tests for `overlapStart`, add confirmed live-data test |
| `lib/__tests__/time.test.ts` | Add `formatTime` tests |
| `app/api/invites/route.ts` | Set `expiresAt` on creation |
| `app/api/invites/[token]/route.ts` | Update expired-token check |
| `app/api/invites/[token]/redeem/route.ts` | Update expired-token response |
| `app/api/connections/direct/route.ts` | Remove `markInviteUsed` call |
| `app/api/users/[userId]/route.ts` | Colour whitelist, UUID guard |
| `app/api/selections/route.ts` | UUID guard |
| `app/api/connections/[id]/route.ts` | UUID guard |
| `app/api/invites/[token]/route.ts` | UUID guard |
| `app/invite/[token]/page.tsx` | Expiry messaging, "join as existing" form |
| `app/u/[userId]/page.tsx` | Festival-aware day default |
| `app/u/[userId]/SchedulePageClient.tsx` | `h-dvh`, mobile view default, swipe gesture, `planSummary` prop |
| `app/layout.tsx` | OpenGraph metadata |
| `middleware.ts` | Rate limiting (new file) |
| `components/Header.tsx` | Inline invite result block, ✏ nickname affordance, Escape |
| `components/DayTabs.tsx` | Full date label |
| `components/people/PeoplePanel.tsx` | Full redesign: Your Plan, share CTA, inline connect, ⎘ buttons, mobile bottom sheet, remove Manage sub-view |
| `components/people/PersonRow.tsx` | Add `onCopyLink` prop |
| `components/schedule/ScheduleGrid.tsx` | Column flex-grow, symmetric clash maps |
| `components/schedule/ActCard.tsx` | `box-shadow` clash border, ⚠ glyph, headliner border, initials dots (44px min-height) |
| `components/schedule/ClashBanner.tsx` | **Deleted** |
| `components/ArtistsList.tsx` | Pass `nickname` in friend dots |
| `components/ColourPicker.tsx` | 3px selected ring |

---

## Task 1: Schema Migration — Multi-Use Invite Tokens

**Files:**
- Modify: `lib/db/schema.ts`
- Modify: `lib/db/queries/invites.ts`
- Modify: `app/api/invites/route.ts`
- Modify: `app/api/invites/[token]/route.ts`
- Modify: `app/api/invites/[token]/redeem/route.ts`
- Modify: `app/api/connections/direct/route.ts`
- Modify: `app/invite/[token]/page.tsx`
- Modify: `types/index.ts`

- [ ] **Step 1: Update `lib/db/schema.ts` — drop single-use columns, add expires_at**

Replace the `inviteTokens` table definition (currently lines 56–62):

```typescript
export const inviteTokens = pgTable('invite_tokens', {
  token:     uuid('token').primaryKey().defaultRandom(),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
})
```

- [ ] **Step 2: Push the schema migration**

```bash
npx drizzle-kit push
```

Expected: Drizzle detects the column drops and addition. Confirm when prompted. Verify in Drizzle Studio that `invite_tokens` now has `token`, `created_by`, `created_at`, `expires_at`.

- [ ] **Step 3: Update `types/index.ts` — replace InviteToken type**

```typescript
export type InviteToken = {
  token: string
  createdBy: string
  createdAt: string
  expiresAt: string | null   // null = never expires
}
```

- [ ] **Step 4: Rewrite `lib/db/queries/invites.ts`**

```typescript
import { db } from '../index'
import { inviteTokens, connections } from '../schema'
import { eq } from 'drizzle-orm'

// Default expiry: one week after Download 2026 festival end
const FESTIVAL_EXPIRY = new Date('2026-06-21T23:59:59Z')

export async function createInvite(createdBy: string) {
  const [invite] = await db
    .insert(inviteTokens)
    .values({ createdBy, expiresAt: FESTIVAL_EXPIRY })
    .returning()
  return invite
}

export async function getInviteByToken(token: string) {
  const [invite] = await db
    .select()
    .from(inviteTokens)
    .where(eq(inviteTokens.token, token))
  return invite ?? null
}

export type RedeemResult =
  | { success: true }
  | { success: false; reason: 'not_found' | 'expired' | 'self_invite' }

export async function redeemInvite(token: string, visitorId: string): Promise<RedeemResult> {
  const invite = await getInviteByToken(token)

  if (!invite) return { success: false, reason: 'not_found' }
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { success: false, reason: 'expired' }
  }
  if (invite.createdBy === visitorId) return { success: false, reason: 'self_invite' }

  const [userA, userB] = [invite.createdBy, visitorId].sort() as [string, string]
  await db.insert(connections).values({ userA, userB }).onConflictDoNothing()

  return { success: true }
}
```

- [ ] **Step 5: Update `app/api/invites/[token]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getInviteByToken } from '@/lib/db/queries/invites'

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await getInviteByToken(token)
  if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 410 })
  }
  return NextResponse.json({ createdBy: invite.createdBy })
}
```

- [ ] **Step 6: Update `app/api/invites/[token]/redeem/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { redeemInvite } from '@/lib/db/queries/invites'

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    const result = await redeemInvite(token, userId)
    if (!result.success) {
      const statusMap = { not_found: 404, expired: 410, self_invite: 400 } as const
      return NextResponse.json({ error: result.reason }, { status: statusMap[result.reason] })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to redeem invite' }, { status: 500 })
  }
}
```

- [ ] **Step 7: Update `app/api/connections/direct/route.ts` — remove markInviteUsed**

Replace the entire file:

```typescript
import { NextResponse } from 'next/server'
import { createDirectConnection } from '@/lib/db/queries/connections'
import { getInviteByToken } from '@/lib/db/queries/invites'
import { getUserById } from '@/lib/db/queries/users'

export async function POST(request: Request) {
  try {
    const { userId, targetUserId, token } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const requester = await getUserById(userId)
    if (!requester) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let targetId: string

    if (token) {
      const invite = await getInviteByToken(token)
      if (!invite) return NextResponse.json({ error: 'Invite link not found or expired.' }, { status: 404 })
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return NextResponse.json({ error: 'This invite link has expired.' }, { status: 410 })
      }
      if (invite.createdBy === userId) {
        return NextResponse.json({ error: "You can't connect using your own invite link." }, { status: 400 })
      }
      targetId = invite.createdBy
    } else if (targetUserId) {
      if (targetUserId === userId) {
        return NextResponse.json({ error: "You can't connect with yourself." }, { status: 400 })
      }
      const target = await getUserById(targetUserId)
      if (!target) {
        return NextResponse.json({ error: 'User not found. Check the link and try again.' }, { status: 404 })
      }
      targetId = targetUserId
    } else {
      return NextResponse.json({ error: 'targetUserId or token required' }, { status: 400 })
    }

    await createDirectConnection(userId, targetId)
    const connected = await getUserById(targetId)
    return NextResponse.json({ ok: true, nickname: connected?.nickname ?? 'your friend' })
  } catch {
    return NextResponse.json({ error: 'Failed to connect' }, { status: 500 })
  }
}
```

- [ ] **Step 8: Update `app/invite/[token]/page.tsx` — change "already used" messaging to "expired"**

In the `InvitePage` default export, change:

```typescript
// Old:
if (invite.usedAt) {
  return <InviteError message="This invite link has already been used. Ask your friend to send a new one." />
}

// New:
if (invite.expiresAt && invite.expiresAt < new Date()) {
  return <InviteError message="This invite link has expired. Ask your friend to share a new one." />
}
```

Also in the `accept()` server action, update the error message mapping:

```typescript
// Old:
already_used: 'This invite link has already been used.',
// New:
expired: 'This invite link has expired.',
```

- [ ] **Step 9: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: clean (no errors). If Drizzle infers the new column types correctly there will be no TS errors.

- [ ] **Step 10: Run tests**

```bash
npx vitest run
```

Expected: all passing. No tests depend on `used_at`/`used_by`.

- [ ] **Step 11: Commit**

```bash
git add lib/db/schema.ts lib/db/queries/invites.ts types/index.ts \
  app/api/invites/ app/api/connections/direct/route.ts app/invite/
git commit -m "feat: multi-use invite tokens — replace single-use with expiry-based (expires 2026-06-21)"
```

---

## Task 2: Time Formatter Tests + ClashPair.overlapStart

**Files:**
- Modify: `lib/__tests__/time.test.ts`
- Modify: `types/index.ts`
- Modify: `lib/clash-detection.ts`

- [ ] **Step 1: Add `formatTime` tests to `lib/__tests__/time.test.ts`**

Append to the existing test file:

```typescript
describe('formatTime', () => {
  it('strips seconds from HH:MM:SS', () => {
    expect(formatTime('15:50:00')).toBe('15:50')
  })
  it('preserves HH:MM with no seconds', () => {
    expect(formatTime('09:05')).toBe('09:05')
  })
  it('handles leading zeros', () => {
    expect(formatTime('08:00:00')).toBe('08:00')
  })
})
```

Also add `formatTime` to the import at the top:

```typescript
import { timeToMinutes, adjustedEndMinutes, dayBounds, minutesToPx, PX_PER_MINUTE, formatTime } from '../time'
```

- [ ] **Step 2: Run tests — they should pass immediately**

```bash
npx vitest run lib/__tests__/time.test.ts
```

Expected: PASS — `formatTime` already exists and does `time.slice(0, 5)`.

- [ ] **Step 3: Add `overlapStart` to `ClashPair` in `types/index.ts`**

```typescript
export type ClashPair = {
  personA: { userId: string; nickname: string; colour: string; act: Act }
  personB: { userId: string; nickname: string; colour: string; act: Act }
  overlapStart: string   // "HH:MM" — max(actA.startTime, actB.startTime), the real conflict start
}
```

- [ ] **Step 4: Update `lib/clash-detection.ts` — add overlapStart**

```typescript
import { timeToMinutes, adjustedEndMinutes, formatTime } from './time'
import type { Act, UserWithSelections, ClashPair } from '@/types'

function actsOverlap(a: Act, b: Act): boolean {
  if (a.festivalDayId !== b.festivalDayId) return false
  if (a.stageId === b.stageId) return false

  const aStart = timeToMinutes(a.startTime)
  const aEnd   = adjustedEndMinutes(a.startTime, a.endTime)
  const bStart = timeToMinutes(b.startTime)
  const bEnd   = adjustedEndMinutes(b.startTime, b.endTime)

  return aStart < bEnd && aEnd > bStart
}

export function detectClashes(users: UserWithSelections[], acts: Act[]): ClashPair[] {
  const actMap = new Map(acts.map(a => [a.id, a]))
  const clashes: ClashPair[] = []

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const ua = users[i]
      const ub = users[j]

      for (const idA of ua.selections) {
        for (const idB of ub.selections) {
          const actA = actMap.get(idA)
          const actB = actMap.get(idB)
          if (!actA || !actB) continue
          if (actsOverlap(actA, actB)) {
            // overlapStart = the later of the two start times (real conflict onset)
            const overlapStartRaw = timeToMinutes(actA.startTime) > timeToMinutes(actB.startTime)
              ? actA.startTime
              : actB.startTime
            clashes.push({
              personA:      { userId: ua.id, nickname: ua.nickname, colour: ua.colour, act: actA },
              personB:      { userId: ub.id, nickname: ub.nickname, colour: ub.colour, act: actB },
              overlapStart: formatTime(overlapStartRaw),
            })
          }
        }
      }
    }
  }

  return clashes
}
```

- [ ] **Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: TypeScript will now error on any place that consumes `ClashPair` without `overlapStart`. The only consumer that uses `overlapStart` is `ClashBanner` (which will be deleted in Task 6) and any code that reads clash time for display. If there are errors, they'll be in files that destructure `ClashPair` — fix them by ignoring `overlapStart` (it's additive).

- [ ] **Step 6: Commit**

```bash
git add lib/__tests__/time.test.ts types/index.ts lib/clash-detection.ts
git commit -m "feat: add overlapStart to ClashPair, add formatTime tests"
```

---

## Task 3: Update Clash-Detection Tests for overlapStart

**Files:**
- Modify: `lib/__tests__/clash-detection.test.ts`

- [ ] **Step 1: Add `overlapStart` to all existing clash assertions and add the confirmed live-data test**

Open `lib/__tests__/clash-detection.test.ts`. Every test that calls `detectClashes` and checks a returned clash object needs `overlapStart` added. Also add a new test using the real data captured during live browser testing.

Replace the full file:

```typescript
import { describe, it, expect } from 'vitest'
import { detectClashes } from '../clash-detection'
import type { Act, UserWithSelections } from '@/types'

const makeAct = (overrides: Partial<Act> & { id: string }): Act => ({
  name: 'Test Act',
  stageId: 'main-stage',
  festivalDayId: 'friday',
  date: '2026-06-12',
  startTime: '13:00',
  endTime: '14:00',
  headliner: false,
  ...overrides,
})

const makeUser = (id: string, colour: string, selections: string[]): UserWithSelections => ({
  id,
  nickname: id,
  colour,
  createdAt: '2026-01-01T00:00:00Z',
  lastSeen: '2026-01-01T00:00:00Z',
  selections,
})

describe('detectClashes', () => {
  it('returns empty array when only one user', () => {
    const acts = [makeAct({ id: 'a1', startTime: '13:00', endTime: '14:00' })]
    expect(detectClashes([makeUser('u1', 'blue', ['a1'])], acts)).toHaveLength(0)
  })

  it('returns empty array when users pick same act on same stage', () => {
    const acts = [makeAct({ id: 'a1', stageId: 'main-stage' })]
    const users = [makeUser('u1', 'blue', ['a1']), makeUser('u2', 'green', ['a1'])]
    expect(detectClashes(users, acts)).toHaveLength(0)
  })

  it('detects a clash when acts on different stages overlap', () => {
    const acts = [
      makeAct({ id: 'a1', stageId: 'main-stage',   startTime: '13:00', endTime: '14:00' }),
      makeAct({ id: 'a2', stageId: 'second-stage', startTime: '13:30', endTime: '14:30' }),
    ]
    const users = [makeUser('u1', 'blue', ['a1']), makeUser('u2', 'green', ['a2'])]
    const clashes = detectClashes(users, acts)
    expect(clashes).toHaveLength(1)
    expect(clashes[0].personA.act.id).toBe('a1')
    expect(clashes[0].personB.act.id).toBe('a2')
    expect(clashes[0].overlapStart).toBe('13:30')
  })

  it('overlapStart is the later start time, not the earlier', () => {
    // act A starts 13:00, act B starts 13:45 — overlap starts at 13:45
    const acts = [
      makeAct({ id: 'a1', stageId: 'main-stage',   startTime: '13:00', endTime: '14:30' }),
      makeAct({ id: 'a2', stageId: 'second-stage', startTime: '13:45', endTime: '14:45' }),
    ]
    const users = [makeUser('u1', 'blue', ['a1']), makeUser('u2', 'green', ['a2'])]
    const [clash] = detectClashes(users, acts)
    expect(clash.overlapStart).toBe('13:45')
  })

  it('does not clash when acts are sequential', () => {
    const acts = [
      makeAct({ id: 'a1', stageId: 'main-stage',   startTime: '13:00', endTime: '14:00' }),
      makeAct({ id: 'a2', stageId: 'second-stage', startTime: '14:00', endTime: '15:00' }),
    ]
    expect(detectClashes(
      [makeUser('u1', 'blue', ['a1']), makeUser('u2', 'green', ['a2'])],
      acts
    )).toHaveLength(0)
  })

  it('does not clash when acts are on different festival days', () => {
    const acts = [
      makeAct({ id: 'a1', stageId: 'main-stage',   festivalDayId: 'friday',   startTime: '13:00', endTime: '14:00' }),
      makeAct({ id: 'a2', stageId: 'second-stage', festivalDayId: 'saturday', startTime: '13:30', endTime: '14:30' }),
    ]
    expect(detectClashes(
      [makeUser('u1', 'blue', ['a1']), makeUser('u2', 'green', ['a2'])],
      acts
    )).toHaveLength(0)
  })

  it('handles midnight-spanning acts', () => {
    const acts = [
      makeAct({ id: 'a1', stageId: 'main-stage',   startTime: '23:30', endTime: '00:30' }),
      makeAct({ id: 'a2', stageId: 'second-stage', startTime: '23:45', endTime: '00:15' }),
    ]
    const clashes = detectClashes(
      [makeUser('u1', 'blue', ['a1']), makeUser('u2', 'green', ['a2'])],
      acts
    )
    expect(clashes).toHaveLength(1)
    expect(clashes[0].overlapStart).toBe('23:45')
  })

  it('confirmed live clash: Creeper vs Pendulum — overlapStart 16:10 not 15:50', () => {
    // Real data captured during live browser testing (festipals-review-claude-2026-05-01.md)
    // Anonymous selected Creeper (fri-opus-4, Opus, 15:50–16:30)
    // Jonathan selected Pendulum (fri-apex-4, Apex, 16:10–17:00)
    // Actual overlap is 16:10–16:30; old code incorrectly showed 15:50:00
    const acts = [
      makeAct({ id: 'fri-opus-4', name: 'Creeper',  stageId: 'opus-stage',  startTime: '15:50', endTime: '16:30' }),
      makeAct({ id: 'fri-apex-4', name: 'Pendulum', stageId: 'apex-stage',  startTime: '16:10', endTime: '17:00' }),
    ]
    const users = [
      makeUser('anonymous', '#22c55e', ['fri-opus-4']),
      makeUser('jonathan',  '#3b82f6', ['fri-apex-4']),
    ]
    const [clash] = detectClashes(users, acts)
    expect(clash.overlapStart).toBe('16:10')
    expect(clash.personA.act.name).toBe('Creeper')
    expect(clash.personB.act.name).toBe('Pendulum')
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run lib/__tests__/clash-detection.test.ts
```

Expected: PASS (8 tests).

- [ ] **Step 3: Commit**

```bash
git add lib/__tests__/clash-detection.test.ts
git commit -m "test: update clash-detection tests for overlapStart, add confirmed live-data test"
```

---

## Task 4: Desktop Grid Column Flex-Grow

**Files:**
- Modify: `components/schedule/ScheduleGrid.tsx`

- [ ] **Step 1: Update stage column style in `ScheduleGrid.tsx`**

Find the stage column div (currently `style={{ minWidth: 140 }}`) and replace:

```typescript
// Old:
<div key={stage.id} className="flex flex-col" style={{ minWidth: 140 }}>

// New:
<div key={stage.id} className="flex flex-col" style={{ flex: '1 1 0', minWidth: 140, maxWidth: 280 }}>
```

- [ ] **Step 2: TypeScript check + test run**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: TS clean, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add components/schedule/ScheduleGrid.tsx
git commit -m "fix: stage columns flex-grow to fill desktop width (min 140px, max 280px)"
```

---

## Task 5: Symmetric Clash Borders (Both Acts Marked)

**Files:**
- Modify: `components/schedule/ScheduleGrid.tsx`
- Modify: `components/schedule/ActCard.tsx`

- [ ] **Step 1: Update `clashingActIds` and `clashColourMap` in `ScheduleGrid.tsx`**

Find the two `useMemo` blocks that build `clashingActIds` and `clashColourMap`. Replace both:

```typescript
// Mark BOTH acts in every clash pair (not just the current user's side)
const clashingActIds = useMemo(() => {
  const set = new Set<string>()
  for (const cp of clashPairs) {
    set.add(cp.personA.act.id)
    set.add(cp.personB.act.id)
  }
  return set
}, [clashPairs])

const clashColourMap = useMemo(() => {
  const map = new Map<string, string>()
  for (const cp of clashPairs) {
    map.set(cp.personA.act.id, cp.personB.colour)
    map.set(cp.personB.act.id, cp.personA.colour)
  }
  return map
}, [clashPairs])
```

Note: `currentUserId` is no longer needed in these two memos — remove it from the dependency arrays. It's still used elsewhere in the component (for `selectedByOthers`), so do not remove the prop.

- [ ] **Step 2: Update `ActCard.tsx` — replace dashed border with inset box-shadow and add ⚠ glyph**

Find the `borderStyle` object and the button's `style` prop. Replace:

```typescript
// Remove borderStyle entirely. In the button style object:
// Old:
const borderStyle = isClashing && clashColour
  ? { border: `2px dashed ${clashColour}` }
  : { border: '1px solid var(--colour-border)' }

// New — inline into the button style:
border: '1px solid var(--colour-border)',
boxShadow: isClashing && clashColour ? `inset 0 0 0 3px ${clashColour}` : undefined,
```

Add the ⚠ glyph inside the button, as the first child of the outer `<div>`:

```typescript
// Inside the button's JSX, before the <div> containing act name:
{isClashing && (
  <span style={{
    position: 'absolute',
    top: 3,
    right: 4,
    fontSize: 9,
    lineHeight: 1,
    opacity: 0.85,
    pointerEvents: 'none',
  }}>⚠</span>
)}
```

The button needs `position: 'relative'` in its style — verify it already has this (`position: 'absolute'` is for the card's positioning in the grid; the internal layout uses `display: 'flex'`). Actually the button is `position: absolute` (for grid placement), so the glyph's `position: absolute` is relative to the button. This is correct.

- [ ] **Step 3: Run TypeScript check + tests**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: TS clean. Tests that check ActCard rendering will pass since `isClashing` defaults to `false` in the test props.

- [ ] **Step 4: Commit**

```bash
git add components/schedule/ScheduleGrid.tsx components/schedule/ActCard.tsx
git commit -m "fix: symmetric clash borders — both acts in pair marked with inset box-shadow + glyph"
```

---

## Task 6: Remove ClashBanner

**Prerequisite: Task 5 must be deployed/committed first.**

**Files:**
- Delete: `components/schedule/ClashBanner.tsx`
- Modify: `app/u/[userId]/SchedulePageClient.tsx`

- [ ] **Step 1: Delete `ClashBanner.tsx`**

```bash
rm components/schedule/ClashBanner.tsx
```

- [ ] **Step 2: Remove ClashBanner from `SchedulePageClient.tsx`**

Remove the import line:
```typescript
import { ClashBanner } from '@/components/schedule/ClashBanner'
```

Remove the `<ClashBanner clashPairs={clashPairs} />` JSX (it is the first child of `<main>`).

The `clashPairs` variable must be kept — it still drives clash borders in `ScheduleGrid` and the clash count in the panel (Task 8).

- [ ] **Step 3: TypeScript check + tests**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: TS clean, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: remove ClashBanner — clash borders on act cards are now the sole signal"
```

---

## Task 7: +Invite Inline Result Block in Header

**Files:**
- Modify: `components/Header.tsx`

- [ ] **Step 1: Replace the full `Header.tsx`**

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { ColourPicker } from './ColourPicker'
import { useUpdateUser } from '@/lib/hooks/use-user'
import { useCreateInvite } from '@/lib/hooks/use-invite'

type Props = {
  userId: string
  nickname: string
  colour: string
}

export function Header({ userId, nickname, colour }: Props) {
  const [editing, setEditing]       = useState(false)
  const [draftName, setDraftName]   = useState(nickname)
  const [inviteResult, setInviteResult] = useState<{ url: string } | null>(null)
  const [copied, setCopied]         = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const updateUser   = useUpdateUser(userId)
  const createInvite = useCreateInvite()

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  // Close invite result block on outside click
  useEffect(() => {
    if (!inviteResult) return
    function handleClick(e: MouseEvent) {
      if (resultRef.current && !resultRef.current.contains(e.target as Node)) {
        setInviteResult(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [inviteResult])

  function commitNickname() {
    setEditing(false)
    const trimmed = draftName.trim().slice(0, 24) || 'Anonymous'
    if (trimmed !== nickname) updateUser.mutate({ nickname: trimmed })
  }

  async function handleInvite() {
    const url = await createInvite.mutateAsync(userId)
    setInviteResult({ url })
    // Fire native share sheet on mobile as a convenience — result block shown regardless
    if (navigator.share) {
      navigator.share({ title: 'Festipals — Download 2026', url }).catch(() => {})
    }
  }

  function handleCopy() {
    if (!inviteResult) return
    navigator.clipboard.writeText(inviteResult.url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'relative' }}>
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-4 h-14"
        style={{ backgroundColor: 'var(--colour-surface)', borderBottom: '1px solid var(--colour-border)' }}
      >
        <span
          className="font-display text-xl tracking-widest mr-auto"
          style={{ color: 'var(--colour-primary)', fontFamily: 'Barlow Condensed, sans-serif' }}
        >
          Festipals
        </span>

        <ColourPicker
          value={colour}
          onChange={hex => updateUser.mutate({ colour: hex })}
        />

        {editing ? (
          <input
            ref={inputRef}
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            onBlur={commitNickname}
            onKeyDown={e => {
              if (e.key === 'Enter') commitNickname()
              if (e.key === 'Escape') { setDraftName(nickname); setEditing(false) }
            }}
            maxLength={24}
            className="bg-transparent border-b text-sm outline-none w-32"
            style={{ borderColor: 'var(--colour-text)', color: 'var(--colour-text)' }}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            title="Click to edit your nickname"
            className="text-sm flex items-center gap-1 transition-colors"
            style={{ color: 'var(--colour-text-muted)' }}
          >
            {nickname}
            <span style={{ fontSize: 11, opacity: 0.5 }}>✏</span>
          </button>
        )}

        <button
          onClick={handleInvite}
          disabled={createInvite.isPending}
          className="text-xs px-3 py-1.5 uppercase tracking-wider font-medium transition-colors"
          style={{
            backgroundColor: 'var(--colour-primary)',
            color: '#fff',
            opacity: createInvite.isPending ? 0.6 : 1,
          }}
        >
          + Invite
        </button>
      </header>

      {/* Inline invite result block */}
      {inviteResult && (
        <div
          ref={resultRef}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 50,
            width: 300,
            backgroundColor: 'var(--colour-surface)',
            border: '1px solid var(--colour-border)',
            borderRadius: 4,
            padding: 14,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--colour-text-muted)' }}>
              Invite link ready
            </span>
            <button
              onClick={() => setInviteResult(null)}
              style={{ background: 'none', border: 'none', color: 'var(--colour-text-faint)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <div
              style={{
                flex: 1, background: 'var(--colour-surface-2)', border: '1px solid var(--colour-border)',
                borderRadius: 3, padding: '6px 8px', fontSize: 10, color: 'var(--colour-text-muted)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {inviteResult.url}
            </div>
            <button
              onClick={handleCopy}
              className="text-xs uppercase tracking-wide px-3"
              style={{
                backgroundColor: copied ? '#22c55e' : 'var(--colour-primary)',
                color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', flexShrink: 0,
              }}
            >
              {copied ? '✓' : 'Copy'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <a
              href={`https://wa.me/?text=${encodeURIComponent('Join my Download 2026 group on Festipals! ' + inviteResult.url)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, background: '#25D366', color: '#fff', borderRadius: 3, padding: '5px 0', textAlign: 'center', fontSize: 10, textDecoration: 'none' }}
            >WhatsApp</a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(inviteResult.url)}&text=${encodeURIComponent('Join my Download 2026 group on Festipals!')}`}
              target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, background: '#0088cc', color: '#fff', borderRadius: 3, padding: '5px 0', textAlign: 'center', fontSize: 10, textDecoration: 'none' }}
            >Telegram</a>
            <a
              href={`sms:?body=${encodeURIComponent('Join my Download 2026 group on Festipals! ' + inviteResult.url)}`}
              style={{ flex: 1, background: 'var(--colour-surface-2)', color: 'var(--colour-text-muted)', border: '1px solid var(--colour-border)', borderRadius: 3, padding: '5px 0', textAlign: 'center', fontSize: 10, textDecoration: 'none' }}
            >SMS</a>
          </div>

          <p style={{ fontSize: 10, color: 'var(--colour-text-faint)', margin: 0 }}>
            Anyone with this link can join your group. Expires 21 Jun.
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/Header.tsx
git commit -m "feat: +Invite shows inline result block with URL, copy, WhatsApp/Telegram/SMS links"
```

---

## Task 8: Panel Full Redesign (Your Plan, Share CTA, Inline Connect, Member ⎘)

**Files:**
- Modify: `components/people/PeoplePanel.tsx`
- Modify: `components/people/PersonRow.tsx`
- Modify: `app/u/[userId]/SchedulePageClient.tsx`

- [ ] **Step 1: Add `onCopyLink` prop to `PersonRow.tsx`**

```typescript
'use client'

import { useState } from 'react'

type Props = {
  userId: string
  nickname: string
  colour: string
  checked: boolean
  isCurrentUser: boolean
  onCheckChange: (checked: boolean) => void
  onRemove?: () => void
  onCopyLink?: () => void
}

export function PersonRow({ nickname, colour, checked, isCurrentUser, onCheckChange, onRemove, onCopyLink }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [copied, setCopied]         = useState(false)

  function handleCopyLink() {
    onCopyLink?.()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (confirming) {
    return (
      <div className="py-2">
        <p className="text-xs mb-2" style={{ color: 'var(--colour-text)', lineHeight: 1.5 }}>
          Remove <strong>{nickname}</strong> from your group?
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => { onRemove?.(); setConfirming(false) }}
            className="text-xs uppercase tracking-wide font-medium"
            style={{ flex: 1, padding: '5px 0', backgroundColor: 'var(--colour-primary)', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}
          >
            Yes, remove
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs uppercase tracking-wide"
            style={{ flex: 1, padding: '5px 0', backgroundColor: 'var(--colour-surface-2)', color: 'var(--colour-text-muted)', border: '1px solid var(--colour-border)', borderRadius: 3, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colour }} />
      <label className="flex items-center gap-2 flex-1 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onCheckChange(e.target.checked)}
          className="accent-[--colour-primary]"
        />
        <span style={{ color: 'var(--colour-text)' }}>
          {nickname}
          {isCurrentUser && <span className="ml-1 text-xs" style={{ color: 'var(--colour-text-faint)' }}>(you)</span>}
        </span>
      </label>
      {!isCurrentUser && onCopyLink && (
        <button
          onClick={handleCopyLink}
          title={`Copy ${nickname}'s schedule link`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '0 2px', color: copied ? '#22c55e' : 'var(--colour-text-faint)', lineHeight: 1 }}
        >
          {copied ? '✓' : '⎘'}
        </button>
      )}
      {!isCurrentUser && onRemove && (
        <button
          onClick={() => setConfirming(true)}
          style={{ color: 'var(--colour-primary)', fontSize: 16, lineHeight: 1, padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label={`Remove ${nickname}`}
        >
          ✕
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add `planSummary` computation to `SchedulePageClient.tsx`**

Add this import at the top:

```typescript
import { timeToMinutes } from '@/lib/time'
```

Add this computed value inside `SchedulePageClient` (after `dayActs` is defined):

```typescript
const stageMap = useMemo(
  () => new Map(lineup.stages.map(s => [s.id, s.name])),
  [lineup.stages]
)

const planSummary = useMemo(() => {
  const dayLabel = lineup.festivalDays.find(d => d.id === activeDay)?.label ?? activeDay
  const mySelectedDayActs = dayActs
    .filter(a => currentUser.selections.includes(a.id))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
  return {
    actCount:  currentUser.selections.length,
    dayLabel,
    nextActs:  mySelectedDayActs.slice(0, 2).map(a => ({
      name:  a.name,
      time:  a.startTime.slice(0, 5),
      stage: stageMap.get(a.stageId) ?? a.stageId,
    })),
  }
}, [dayActs, currentUser.selections, lineup.festivalDays, activeDay, stageMap])
```

Pass it to `PeoplePanel`:

```typescript
<PeoplePanel
  userId={userId}
  currentUser={currentUser}
  checkedUserIds={checkedUserIds}
  onCheckChange={handleCheckChange}
  planSummary={planSummary}
  clashPairCount={clashPairs.length}
/>
```

- [ ] **Step 3: Rewrite `PeoplePanel.tsx`**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { PersonRow } from './PersonRow'
import { useConnections, useRemoveConnection, useAddDirectConnection } from '@/lib/hooks/use-connections'
import { useCreateInvite } from '@/lib/hooks/use-invite'
import type { UserWithSelections } from '@/types'

type PlanSummary = {
  actCount: number
  dayLabel: string
  nextActs: { name: string; time: string; stage: string }[]
}

type Props = {
  userId: string
  currentUser: UserWithSelections
  checkedUserIds: Set<string>
  onCheckChange: (userId: string, checked: boolean) => void
  planSummary: PlanSummary
  clashPairCount: number
}

function parseConnectionInput(input: string): { type: 'userId' | 'token'; value: string } | null {
  const s = input.trim()
  const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  const scheduleMatch = s.match(new RegExp(`/u/(${UUID})`, 'i'))
  if (scheduleMatch) return { type: 'userId', value: scheduleMatch[1] }
  const inviteMatch = s.match(new RegExp(`/invite/(${UUID})`, 'i'))
  if (inviteMatch) return { type: 'token', value: inviteMatch[1] }
  const rawMatch = s.match(new RegExp(`^(${UUID})$`, 'i'))
  if (rawMatch) return { type: 'userId', value: rawMatch[1] }
  return null
}

export function PeoplePanel({ userId, currentUser, checkedUserIds, onCheckChange, planSummary, clashPairCount }: Props) {
  const [open, setOpen]                 = useState(false)
  const [isMobile, setIsMobile]         = useState(false)
  const [connectInput, setConnectInput] = useState('')
  const [connectFeedback, setConnectFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [inviteResult, setInviteResult] = useState<{ url: string } | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    setOpen(window.innerWidth >= 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const { data: connections = [] } = useConnections(userId)
  const removeConnection = useRemoveConnection(userId)
  const addDirect        = useAddDirectConnection(userId)
  const createInvite     = useCreateInvite()

  async function handleShare() {
    const url = await createInvite.mutateAsync(userId)
    setInviteResult({ url })
    if (navigator.share) {
      navigator.share({ title: 'Festipals — Download 2026', url }).catch(() => {})
    }
  }

  function handleCopyInvite() {
    if (!inviteResult) return
    navigator.clipboard.writeText(inviteResult.url).catch(() => {})
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  function handleCopyBookmark() {
    const url = `${window.location.origin}/u/${userId}`
    navigator.clipboard.writeText(url).catch(() => {})
  }

  function handleCopyMemberLink(memberId: string) {
    const url = `${window.location.origin}/u/${memberId}`
    if (navigator.share) {
      navigator.share({ title: 'Festipals', url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).catch(() => {})
    }
  }

  async function handleConnect() {
    setConnectFeedback(null)
    const parsed = parseConnectionInput(connectInput)
    if (!parsed) {
      setConnectFeedback({ ok: false, message: 'Paste a Festipals link (/u/… or /invite/…).' })
      return
    }
    try {
      const result = await addDirect.mutateAsync(
        parsed.type === 'token' ? { token: parsed.value } : { targetUserId: parsed.value }
      )
      setConnectFeedback({ ok: true, message: `Connected! ${result.nickname} has been added to your group.` })
      setConnectInput('')
    } catch (e) {
      setConnectFeedback({ ok: false, message: (e as Error).message })
    }
  }

  const panelContent = (
    <div style={{ width: isMobile ? '100%' : 256, display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* YOUR PLAN */}
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--colour-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--colour-text-muted)' }}>Your Plan</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: currentUser.colour }} />
            <span className="text-xs" style={{ color: 'var(--colour-text)' }}>{currentUser.nickname}</span>
          </div>
        </div>
        <div className="text-xs" style={{ color: 'var(--colour-text-muted)', marginBottom: 6 }}>
          {planSummary.actCount} act{planSummary.actCount !== 1 ? 's' : ''} · {planSummary.dayLabel.split(' ')[0]}
        </div>
        {planSummary.nextActs.length > 0 && (
          <>
            <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--colour-text-faint)', marginBottom: 3 }}>Next</div>
            {planSummary.nextActs.map((a, i) => (
              <div key={i} className="text-xs" style={{ padding: '2px 0', color: 'var(--colour-text)' }}>
                {a.name}
                <span style={{ color: 'var(--colour-text-muted)', marginLeft: 6 }}>{a.time} · {a.stage}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* SHARE CTAs */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--colour-border)', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {inviteResult ? (
          <div style={{ background: 'var(--colour-surface-2)', border: '1px solid var(--colour-border)', borderRadius: 3, padding: 10 }}>
            <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
              <div style={{ flex: 1, fontSize: 10, color: 'var(--colour-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {inviteResult.url}
              </div>
              <button
                onClick={handleCopyInvite}
                style={{ background: inviteCopied ? '#22c55e' : 'var(--colour-primary)', color: '#fff', border: 'none', borderRadius: 2, fontSize: 9, padding: '3px 7px', cursor: 'pointer', flexShrink: 0 }}
              >
                {inviteCopied ? '✓' : 'Copy'}
              </button>
              <button
                onClick={() => setInviteResult(null)}
                style={{ background: 'none', border: 'none', color: 'var(--colour-text-faint)', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}
              >×</button>
            </div>
            <p style={{ fontSize: 9, color: 'var(--colour-text-faint)', margin: 0 }}>Anyone with this link can join. Expires 21 Jun.</p>
          </div>
        ) : (
          <button
            onClick={handleShare}
            disabled={createInvite.isPending}
            className="w-full text-xs py-2 uppercase tracking-wide font-medium"
            style={{ backgroundColor: 'var(--colour-primary)', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', opacity: createInvite.isPending ? 0.6 : 1 }}
          >
            Share with friends
          </button>
        )}
        <button
          onClick={handleCopyBookmark}
          className="w-full text-xs py-1.5"
          style={{ backgroundColor: 'transparent', color: 'var(--colour-text-muted)', border: '1px solid var(--colour-border)', borderRadius: 3, cursor: 'pointer' }}
          title="Your private schedule link — save it to come back later"
        >
          Copy your bookmark URL
        </button>
      </div>

      {/* GROUP */}
      <div style={{ padding: '8px 14px', flex: 1, overflowY: 'auto' }}>
        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--colour-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Group <span style={{ fontWeight: 'normal', textTransform: 'none', letterSpacing: 0, color: 'var(--colour-text-faint)' }}>({connections.length})</span></span>
          {clashPairCount > 0 && (
            <span style={{ fontWeight: 'normal', textTransform: 'none', letterSpacing: 0, color: 'var(--colour-primary)' }}>
              {clashPairCount} clash{clashPairCount !== 1 ? 'es' : ''}
            </span>
          )}
        </div>

        <PersonRow
          userId={userId}
          nickname={currentUser.nickname}
          colour={currentUser.colour}
          checked={checkedUserIds.has(userId)}
          isCurrentUser={true}
          onCheckChange={checked => onCheckChange(userId, checked)}
        />

        {connections.map(conn => (
          <PersonRow
            key={conn.connectionId}
            userId={conn.user.id}
            nickname={conn.user.nickname}
            colour={conn.user.colour}
            checked={checkedUserIds.has(conn.user.id)}
            isCurrentUser={false}
            onCheckChange={checked => onCheckChange(conn.user.id, checked)}
            onRemove={() => removeConnection.mutate(conn.connectionId)}
            onCopyLink={() => handleCopyMemberLink(conn.user.id)}
          />
        ))}

        {connections.length === 0 && (
          <p className="text-xs py-1" style={{ color: 'var(--colour-text-faint)' }}>
            No friends yet — share the link above!
          </p>
        )}

        {/* Inline connect-by-paste */}
        <div style={{ marginTop: 10 }}>
          <input
            type="url"
            placeholder="Paste a friend's link to connect…"
            value={connectInput}
            onChange={e => { setConnectInput(e.target.value); setConnectFeedback(null) }}
            onKeyDown={e => { if (e.key === 'Enter') handleConnect() }}
            className="w-full text-xs px-2 py-2"
            style={{ backgroundColor: 'var(--colour-surface-2)', border: '1px solid var(--colour-border)', borderRadius: 3, color: 'var(--colour-text)', outline: 'none', fontFamily: 'inherit' }}
          />
          {connectInput.trim() && (
            <button
              onClick={handleConnect}
              disabled={addDirect.isPending}
              className="w-full text-xs py-1.5 mt-1 uppercase tracking-wide"
              style={{ backgroundColor: 'var(--colour-primary)', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', opacity: addDirect.isPending ? 0.6 : 1 }}
            >
              {addDirect.isPending ? 'Connecting…' : 'Connect'}
            </button>
          )}
          {connectFeedback && (
            <p className="text-xs mt-1" style={{ color: connectFeedback.ok ? '#22c55e' : 'var(--colour-primary)', lineHeight: 1.5 }}>
              {connectFeedback.message}
            </p>
          )}
        </div>
      </div>

    </div>
  )

  if (isMobile) {
    return (
      <>
        {/* Edge handle — only when closed */}
        {!open && (
          <button
            onClick={() => setOpen(true)}
            aria-label="Open group panel"
            style={{
              position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
              zIndex: 20, width: 36, height: 96,
              borderRadius: '10px 0 0 10px',
              backgroundColor: 'var(--colour-surface)',
              border: '1px solid var(--colour-border)', borderRight: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 22, color: 'var(--colour-primary)', lineHeight: 1, userSelect: 'none' }}>‹</span>
            <span style={{ fontSize: 13, color: 'var(--colour-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', writingMode: 'vertical-rl', userSelect: 'none' }}>Group</span>
          </button>
        )}

        {/* Bottom sheet */}
        {open && (
          <>
            <div
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 49 }}
            />
            <div
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                maxHeight: '70vh', zIndex: 50,
                backgroundColor: 'var(--colour-surface)',
                borderRadius: '12px 12px 0 0',
                borderTop: '1px solid var(--colour-border)',
                display: 'flex', flexDirection: 'column',
                overflowY: 'auto',
              }}
            >
              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                <div style={{ width: 36, height: 4, backgroundColor: 'var(--colour-border)', borderRadius: 2 }} />
              </div>
              {panelContent}
            </div>
          </>
        )}
      </>
    )
  }

  // Desktop: right-side sliding panel
  return (
    <div style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open group panel"
          style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateX(-100%) translateY(-50%)',
            zIndex: 20, width: 36, height: 96,
            borderRadius: '10px 0 0 10px',
            backgroundColor: 'var(--colour-surface)',
            border: '1px solid var(--colour-border)', borderRight: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 22, color: 'var(--colour-primary)', lineHeight: 1, userSelect: 'none' }}>‹</span>
          <span style={{ fontSize: 13, color: 'var(--colour-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', writingMode: 'vertical-rl', userSelect: 'none' }}>Group</span>
        </button>
      )}
      {open && (
        <button
          onClick={() => setOpen(false)}
          aria-label="Close group panel"
          style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateX(-100%) translateY(-50%)',
            zIndex: 20, width: 36, height: 96,
            borderRadius: '10px 0 0 10px',
            backgroundColor: 'var(--colour-surface)',
            border: '1px solid var(--colour-border)', borderRight: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 22, color: 'var(--colour-primary)', lineHeight: 1, userSelect: 'none' }}>›</span>
          <span style={{ fontSize: 13, color: 'var(--colour-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', writingMode: 'vertical-rl', userSelect: 'none' }}>Group</span>
        </button>
      )}

      <aside style={{ width: open ? 256 : 0, overflow: 'hidden', transition: 'width 0.2s ease', backgroundColor: 'var(--colour-surface)', borderLeft: open ? '1px solid var(--colour-border)' : 'none', flexShrink: 0 }}>
        {panelContent}
      </aside>
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check + tests**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: TS clean, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/people/PeoplePanel.tsx components/people/PersonRow.tsx \
  app/u/[userId]/SchedulePageClient.tsx
git commit -m "feat: panel redesign — Your Plan summary, share CTA, inline connect, member link copy, mobile bottom sheet"
```

---

## Task 9: Mobile Default — Artists View

**Files:**
- Modify: `app/u/[userId]/SchedulePageClient.tsx`

- [ ] **Step 1: Replace the `view` state initializer**

```typescript
// Old:
const [view, setView] = useState<'schedule' | 'artists'>('schedule')

// New:
const [view, setView] = useState<'schedule' | 'artists'>(() => {
  if (typeof window === 'undefined') return 'schedule'
  const saved = sessionStorage.getItem('festipals-view')
  if (saved === 'schedule' || saved === 'artists') return saved as 'schedule' | 'artists'
  return window.innerWidth < 768 ? 'artists' : 'schedule'
})
```

- [ ] **Step 2: Persist view changes to sessionStorage**

Find the two `onClick={() => setView('schedule')}` and `onClick={() => setView('artists')}` buttons in the tab bar. Replace with:

```typescript
onClick={() => { setView('schedule'); sessionStorage.setItem('festipals-view', 'schedule') }}
// and:
onClick={() => { setView('artists'); sessionStorage.setItem('festipals-view', 'artists') }}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/u/[userId]/SchedulePageClient.tsx
git commit -m "feat: default to Artists view on mobile, persist view preference in sessionStorage"
```

---

## Task 10: Mobile Quick Fixes — h-dvh, Day Labels, 44px Touch Targets

**Files:**
- Modify: `app/u/[userId]/SchedulePageClient.tsx`
- Modify: `components/DayTabs.tsx`
- Modify: `components/schedule/ActCard.tsx`

- [ ] **Step 1: Replace `h-screen` with `h-dvh` in `SchedulePageClient.tsx`**

```typescript
// Old:
<div className="flex flex-col h-screen">
// New:
<div className="flex flex-col h-dvh">
```

- [ ] **Step 2: Show full date in `DayTabs.tsx`**

```typescript
// Old:
{day.label.split(' ')[0]}
// New:
{day.label}
```

Add responsive font-size so the label doesn't overflow on very small screens:

```typescript
className="px-4 py-3 text-sm font-medium uppercase tracking-wide transition-colors whitespace-nowrap"
// Add to the outer container div:
style={{ fontSize: 'clamp(0.7rem, 2.2vw, 0.875rem)' }}
```

- [ ] **Step 3: Set 44px minimum touch target in `ActCard.tsx`**

```typescript
// In the button style height calculation:
// Old:
height: act.headliner ? Math.max(height, 120) : height,
minHeight: act.headliner ? '120px' : undefined,
// New:
height: act.headliner ? Math.max(height, 120) : Math.max(height, 44),
minHeight: act.headliner ? '120px' : '44px',
```

- [ ] **Step 4: TypeScript check + tests**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: TS clean, all tests pass. (The ActCard test that checks `minHeight: '120px'` for headliners still passes since headliners still get 120px.)

- [ ] **Step 5: Commit**

```bash
git add app/u/[userId]/SchedulePageClient.tsx components/DayTabs.tsx components/schedule/ActCard.tsx
git commit -m "fix: h-dvh for Safari iOS, full date in day tabs, 44px min touch target on act cards"
```

---

## Task 11: Festival-Aware Day Default + Now-Line Gate

**Files:**
- Modify: `app/u/[userId]/page.tsx`
- Modify: `components/schedule/ScheduleGrid.tsx`

- [ ] **Step 1: Update `app/u/[userId]/page.tsx` — land on today during festival**

```typescript
// Add after lineup fetch, before activeDay computation:
const FESTIVAL_DAYS_BY_DATE: Record<string, string> = {
  '2026-06-12': 'friday',
  '2026-06-13': 'saturday',
  '2026-06-14': 'sunday',
}
const todayDate = new Date().toISOString().slice(0, 10)
const todayFestivalDayId = FESTIVAL_DAYS_BY_DATE[todayDate]

// Replace the current defaultDay logic:
const daysWithActs = new Set(lineup.acts.map(a => a.festivalDayId))
const defaultDay = todayFestivalDayId && daysWithActs.has(todayFestivalDayId)
  ? todayFestivalDayId
  : lineup.festivalDays.find(d => daysWithActs.has(d.id))?.id ?? 'friday'
const activeDay = day ?? defaultDay
```

- [ ] **Step 2: Gate the "now" line in `ScheduleGrid.tsx`**

Find where the now-line is rendered in `ScheduleGrid.tsx`. Add this guard at the top of the component (after props are destructured):

```typescript
// Gate the now-line to festival dates only
const FESTIVAL_DATES = new Set(['2026-06-12', '2026-06-13', '2026-06-14'])
const todayStr = new Date().toISOString().slice(0, 10)
const showNowLine = FESTIVAL_DATES.has(todayStr)
```

Then wrap the now-line JSX: `{showNowLine && ( ... now line ... )}`.

If no explicit now-line exists yet in the code, skip this step (it may not have been implemented — check `ScheduleGrid.tsx` for any `new Date()` usage).

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/u/[userId]/page.tsx components/schedule/ScheduleGrid.tsx
git commit -m "feat: land on today's tab during festival, gate now-line to festival dates"
```

---

## Task 12: Swipe Between Days (JS Gesture)

**Files:**
- Modify: `app/u/[userId]/SchedulePageClient.tsx`

- [ ] **Step 1: Add touch refs and swipe handler**

Add near the top of `SchedulePageClient` (after existing state declarations):

```typescript
const touchStartX = useRef(0)
const touchStartY = useRef(0)
```

Add to the `useCallback` imports section and create the handler:

```typescript
const handleSwipe = useCallback((e: React.TouchEvent) => {
  const dx = e.changedTouches[0].clientX - touchStartX.current
  const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
  if (Math.abs(dx) <= 60 || dy > 30) return
  const daysWithActs = lineup.festivalDays.filter(d =>
    lineup.acts.some(a => a.festivalDayId === d.id)
  )
  const idx = daysWithActs.findIndex(d => d.id === activeDay)
  const next = dx < 0 ? daysWithActs[idx + 1] : daysWithActs[idx - 1]
  if (next) router.push(`/u/${userId}?day=${next.id}`)
}, [activeDay, lineup, userId, router])
```

Add `useRef` to the existing React import: `import { useState, useMemo, useCallback, useRef } from 'react'`. `useRouter` is already imported in `SchedulePageClient` — verify with `import { useRouter } from 'next/navigation'` at the top of the file.

- [ ] **Step 2: Attach gesture to `<main>` element**

```typescript
<main
  className="flex-1 overflow-auto"
  style={{ padding: view === 'schedule' ? 8 : 0 }}
  onTouchStart={e => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY }}
  onTouchEnd={handleSwipe}
>
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/u/[userId]/SchedulePageClient.tsx
git commit -m "feat: swipe left/right to navigate between days on mobile"
```

---

## Task 13: Auto-Assign Distinct Colour on Invite Accept

**Files:**
- Modify: `lib/db/queries/users.ts`
- Modify: `app/invite/[token]/page.tsx`

- [ ] **Step 1: Add `createUserWithColour` to `lib/db/queries/users.ts`**

```typescript
export async function createUserWithColour(id: string, colour: string) {
  const [user] = await db
    .insert(users)
    .values({ id, colour })
    .onConflictDoNothing()
    .returning()
  return user ?? null
}
```

- [ ] **Step 2: Update the `accept()` server action in `app/invite/[token]/page.tsx`**

Add imports at the top of the file:

```typescript
import { USER_COLOURS } from '@/constants/colours'
import { createUserWithColour } from '@/lib/db/queries/users'
import { getConnectionsForUser } from '@/lib/db/queries/connections'
```

Replace `accept()` server action:

```typescript
async function accept() {
  'use server'
  const visitorId = randomUUID()

  // Read existing group colours so the new user gets a distinct one
  const groupConnections = await getConnectionsForUser(invite.createdBy)
  const inviter = await getUserById(invite.createdBy)
  const usedColours = new Set([
    inviter?.colour,
    ...groupConnections.map(c => c.user.colour),
  ].filter(Boolean) as string[])
  const assignedColour = USER_COLOURS.find(c => !usedColours.has(c.hex))?.hex ?? '#3b82f6'

  await createUserWithColour(visitorId, assignedColour)
  const result = await redeemInvite(token, visitorId)
  if (!result.success) {
    redirect(`/invite/${token}?error=${result.reason}`)
  }
  redirect(`/u/${visitorId}`)
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add lib/db/queries/users.ts app/invite/[token]/page.tsx
git commit -m "feat: auto-assign distinct colour to new users on invite accept"
```

---

## Task 14: Member Initials Dots (ActCard + ScheduleGrid + ArtistsList)

These three files **must** be updated together to avoid a TypeScript build failure.

**Files:**
- Modify: `components/schedule/ActCard.tsx`
- Modify: `components/schedule/ScheduleGrid.tsx`
- Modify: `components/ArtistsList.tsx`

- [ ] **Step 1: Add `nickname` to `OtherUser` type in `ActCard.tsx` and update dot rendering**

Change the `OtherUser` type:

```typescript
type OtherUser = { userId: string; colour: string; nickname: string }
```

Replace the dot rendering section (currently renders 8px plain circles):

```typescript
{dotsToShow.map(u => (
  <div
    key={u.userId}
    data-testid="user-dot"
    title={u.nickname}
    style={{
      width: 18, height: 18, borderRadius: 10,
      backgroundColor: u.colour,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700, color: '#fff',
      flexShrink: 0,
    }}
  >
    {u.nickname.charAt(0).toUpperCase()}
  </div>
))}
```

- [ ] **Step 2: Update `selectedByOthers` mapping in `ScheduleGrid.tsx`**

Find the `selectedByOthers` computation inside the stage map:

```typescript
// Old:
const selectedByOthers = checkedUsers
  .filter(u => u.id !== currentUserId && u.selections.includes(act.id))
  .map(u => ({ userId: u.id, colour: u.colour }))

// New:
const selectedByOthers = checkedUsers
  .filter(u => u.id !== currentUserId && u.selections.includes(act.id))
  .map(u => ({ userId: u.id, colour: u.colour, nickname: u.nickname }))
```

- [ ] **Step 3: Update friend-dot rendering in `ArtistsList.tsx`**

Find the `othersSelected.slice(0, 4).map(u => ...)` section and replace the plain circle with the initials dot:

```typescript
{othersSelected.slice(0, 4).map(u => (
  <div
    key={u.id}
    title={u.nickname}
    style={{
      width: 18, height: 18, borderRadius: 10,
      backgroundColor: u.colour,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700, color: '#fff',
      flexShrink: 0,
    }}
  >
    {u.nickname.charAt(0).toUpperCase()}
  </div>
))}
```

- [ ] **Step 4: Update the ActCard test in `components/schedule/__tests__/ActCard.test.tsx`**

The `defaultProps.selectedByOthers` items now need a `nickname` field:

```typescript
const defaultProps = {
  // ...
  selectedByOthers: [],
  // ...
}

// In the dots test:
const props = {
  ...defaultProps,
  selectedByOthers: [
    { userId: 'u1', colour: '#22c55e', nickname: 'Alice' },
    { userId: 'u2', colour: '#ec4899', nickname: 'Bob' },
  ],
}
```

- [ ] **Step 5: TypeScript check + tests**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: TS clean, all 28+ tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/schedule/ActCard.tsx components/schedule/ScheduleGrid.tsx \
  components/ArtistsList.tsx components/schedule/__tests__/ActCard.test.tsx
git commit -m "feat: member presence dots show initials instead of plain circles"
```

---

## Task 15: Visual Polish — Headliner, Panel Handle, Colour Picker Ring

**Files:**
- Modify: `components/schedule/ActCard.tsx`
- Modify: `components/ColourPicker.tsx`

- [ ] **Step 1: Headliner top border in `ActCard.tsx`**

In the button's style object, add:

```typescript
borderTop: act.headliner ? '2px solid var(--colour-primary)' : undefined,
```

The `<strong>` wrapper on `act.name` when `act.headliner` already exists — also add `fontWeight: 700` to the `<p>` element containing the name:

```typescript
// On the act name <p> element:
style={{ color: isSelected ? '#fff' : 'var(--colour-text)', fontWeight: act.headliner ? 700 : 400 }}
```

- [ ] **Step 2: Thicker colour swatch ring in `ColourPicker.tsx`**

Read `components/ColourPicker.tsx`. Find the selected swatch button's style and update:

```typescript
// Change the selected-state border from thin to thick:
border: `${value === c.hex ? 3 : 2}px solid ${value === c.hex ? '#fff' : 'transparent'}`,
outline: value === c.hex ? '2px solid rgba(255,255,255,0.25)' : 'none',
outlineOffset: 1,
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/schedule/ActCard.tsx components/ColourPicker.tsx
git commit -m "style: headliner top border + bold, thicker colour picker selected ring"
```

---

## Task 16: Nickname Edit Affordance + Escape

Already implemented in Task 7 (the Header rewrite added ✏ icon and Escape handling). Verify:

- [ ] **Step 1: Confirm ✏ icon renders next to the nickname button**

Run the dev server and check the header. Nickname button should show `{nickname} ✏` with the pencil at reduced opacity.

- [ ] **Step 2: Confirm Escape cancels the edit**

Click the nickname to edit, type a new name, press Escape. The name should revert to the original.

- [ ] **Step 3: Commit (if any fix needed)**

```bash
git add components/Header.tsx
git commit -m "fix: confirm nickname Escape handling and edit affordance"
```

If nothing needed fixing, no commit required.

---

## Task 17: "Join as Existing Profile" on Invite-Accept Page

**Files:**
- Modify: `app/invite/[token]/page.tsx`

- [ ] **Step 1: Add `acceptAsExisting` server action and the collapsible form**

After the existing `accept()` server action (still keep it), add:

```typescript
async function acceptAsExisting(formData: FormData) {
  'use server'
  const pastedUrl = (formData.get('existingUrl') as string) ?? ''
  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  const match = pastedUrl.match(new RegExp(`/u/(${UUID_RE.source})`, 'i'))
  if (!match) redirect(`/invite/${token}?error=invalid_url`)
  const existingUserId = match[1]
  if (existingUserId === invite.createdBy) redirect(`/invite/${token}?error=self_invite`)
  const existingUser = await getUserById(existingUserId)
  if (!existingUser) redirect(`/invite/${token}?error=user_not_found`)
  await createDirectConnection(invite.createdBy, existingUserId)
  redirect(`/u/${existingUserId}`)
}
```

Add the import:

```typescript
import { createDirectConnection } from '@/lib/db/queries/connections'
```

- [ ] **Step 2: Add the "Already using Festipals?" UI section after the Accept button**

In the JSX, after the `<form action={accept}>` form, add:

```typescript
<details style={{ marginTop: 16, maxWidth: '100%' }}>
  <summary style={{ fontSize: '0.85rem', color: 'var(--colour-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
    Already using Festipals? Join as your existing profile
  </summary>
  <div style={{ marginTop: 10 }}>
    <p style={{ fontSize: '0.8rem', color: 'var(--colour-text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
      Paste your Festipals link to connect without losing your existing schedule.
    </p>
    <form action={acceptAsExisting} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        name="existingUrl"
        type="url"
        placeholder="https://festipals.live/u/…"
        required
        style={{
          width: '100%', padding: '8px 10px', background: 'var(--colour-surface-2)',
          border: '1px solid var(--colour-border)', borderRadius: 3,
          color: 'var(--colour-text)', fontSize: '0.875rem', outline: 'none',
        }}
      />
      <button
        type="submit"
        style={{ padding: '8px', background: 'var(--colour-surface-2)', border: '1px solid var(--colour-border)', borderRadius: 3, color: 'var(--colour-text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
      >
        Join as this profile
      </button>
    </form>
  </div>
</details>
```

Also handle the new error codes in the `InviteError` routing block:

```typescript
if (error === 'invalid_url') {
  return <InviteError message="That doesn't look like a valid Festipals link. Check the URL and try again." />
}
if (error === 'user_not_found') {
  return <InviteError message="That profile wasn't found. Make sure you pasted your own Festipals link." />
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/invite/[token]/page.tsx
git commit -m "feat: invite-accept page offers 'join as existing profile' to preserve selections"
```

---

## Task 18: Security — Colour Whitelist + UUID Validation

**Files:**
- Modify: `app/api/users/[userId]/route.ts`
- Modify: `app/api/selections/route.ts`
- Modify: `app/api/connections/[id]/route.ts`
- Modify: `app/api/invites/[token]/route.ts`
- Modify: `app/api/connections/direct/route.ts`

- [ ] **Step 1: Add colour whitelist to `app/api/users/[userId]/route.ts`**

Add import at top:

```typescript
import { USER_COLOURS } from '@/constants/colours'
const VALID_COLOURS = new Set(USER_COLOURS.map(c => c.hex))
```

In the PATCH handler, replace the colour guard:

```typescript
// Old:
if (typeof body.colour === 'string') {
  data.colour = body.colour
}
// New:
if (typeof body.colour === 'string' && VALID_COLOURS.has(body.colour)) {
  data.colour = body.colour
}
```

- [ ] **Step 2: Add UUID validation helper and apply to all routes**

Create a shared helper. Since this is a small utility, inline it at the top of each route file:

```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(s: unknown): s is string {
  return typeof s === 'string' && UUID_RE.test(s)
}
```

Add this guard at the start of each route handler's function body, before any DB call:

**`app/api/users/[userId]/route.ts`** — both GET and PATCH:
```typescript
const { userId } = await params
if (!isValidUUID(userId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
```

**`app/api/connections/[id]/route.ts`** — GET and DELETE:
```typescript
const { id } = await params
if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
```

**`app/api/invites/[token]/route.ts`** — GET:
```typescript
const { token } = await params
if (!isValidUUID(token)) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
```

**`app/api/invites/[token]/redeem/route.ts`** — POST (token from params + userId from body):
```typescript
const { token } = await params
if (!isValidUUID(token)) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
// ...after parsing body:
if (!isValidUUID(userId)) return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
```

**`app/api/selections/route.ts`** — POST and DELETE (validate userId + actId format: actId is a text slug, not UUID, so only validate userId):
```typescript
if (!isValidUUID(userId)) return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/api/
git commit -m "security: colour PATCH whitelist, UUID format validation on all routes"
```

---

## Task 19: Rate Limiting Middleware

**Files:**
- Create: `middleware.ts` (project root)

- [ ] **Step 1: Create `middleware.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'

// In-memory sliding-window rate limiter.
// NOTE: This is per-instance. For multi-instance production use, replace
// the Map with Upstash Redis: https://github.com/upstash/ratelimit
const windows = new Map<string, { count: number; resetAt: number }>()

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = windows.get(key)
  if (!entry || entry.resetAt < now) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const { pathname, method } = request

  if (method !== 'POST') return NextResponse.next()

  if (pathname === '/api/invites') {
    if (!rateLimit(`invites:${ip}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  if (pathname === '/api/selections') {
    if (!rateLimit(`selections:${ip}`, 60, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  if (pathname.startsWith('/api/connections')) {
    if (!rateLimit(`connections:${ip}`, 20, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/invites', '/api/selections', '/api/connections/:path*'],
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: rate limiting middleware for invites, selections, connections endpoints"
```

---

## Task 20: Performance — Parallel Queries + Lineup Cache

**Files:**
- Modify: `lib/db/queries/users.ts`
- Modify: `lib/db/queries/lineup.ts`

- [ ] **Step 1: Parallelise `getUserById` in `lib/db/queries/users.ts`**

Replace the sequential fetch in `getUserById`:

```typescript
export async function getUserById(id: string) {
  const [rows, selectionRows] = await Promise.all([
    db.select().from(users).where(eq(users.id, id)),
    db.select({ actId: selections.actId }).from(selections).where(eq(selections.userId, id)),
  ])
  const user = rows[0]
  if (!user) return null
  return { ...user, selections: selectionRows.map(s => s.actId) }
}
```

- [ ] **Step 2: Cache `getLineup` in `lib/db/queries/lineup.ts`**

```typescript
import { db } from '../index'
import { stages, festivalDays, acts } from '../schema'
import { asc } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'

const _getLineup = async () => {
  const [stageRows, dayRows, actRows] = await Promise.all([
    db.select().from(stages).orderBy(asc(stages.ordinal)),
    db.select().from(festivalDays).orderBy(asc(festivalDays.ordinal)),
    db.select().from(acts),
  ])
  return { stages: stageRows, festivalDays: dayRows, acts: actRows }
}

export const getLineup = unstable_cache(_getLineup, ['lineup'], { revalidate: 86400 })
```

- [ ] **Step 3: TypeScript check + tests**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add lib/db/queries/users.ts lib/db/queries/lineup.ts
git commit -m "perf: getUserById parallel queries, getLineup cached for 24h"
```

---

## Task 21: OpenGraph Metadata

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/invite/[token]/page.tsx`

- [ ] **Step 1: Update root metadata in `app/layout.tsx`**

```typescript
export const metadata: Metadata = {
  title: 'Festipals — Download 2026',
  description: 'Build your Download Festival schedule, share it with friends, see who clashes.',
  openGraph: {
    title: 'Festipals — Download 2026',
    description: 'Build your Download Festival schedule, share it with friends, see who clashes.',
    url: 'https://festipals.live',
    siteName: 'Festipals',
    images: [{ url: '/festipals-burst.webp', width: 1536, height: 1024, alt: 'Festipals — Download 2026' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Festipals — Download 2026',
    description: 'Build your Download Festival schedule, share it with friends, see who clashes.',
    images: ['/festipals-burst.webp'],
  },
}
```

- [ ] **Step 2: Add dynamic metadata to the invite page**

Add a `generateMetadata` export to `app/invite/[token]/page.tsx`:

```typescript
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const invite = await getInviteByToken(token)
  const creator = invite && !(invite.expiresAt && invite.expiresAt < new Date())
    ? await getUserById(invite.createdBy)
    : null
  const creatorName = creator?.nickname ?? 'Someone'
  return {
    title: `${creatorName} invited you to Festipals`,
    openGraph: {
      title: `${creatorName} invited you to Festipals`,
      description: 'Join their Download 2026 group — pick your acts, see who clashes.',
      images: [{ url: '/festipals-burst.webp', width: 1536, height: 1024 }],
    },
  }
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Final full test run**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Production build check**

```bash
npm run build
```

Expected: build succeeds, all routes listed.

- [ ] **Step 6: Final commit + push**

```bash
git add app/layout.tsx app/invite/[token]/page.tsx
git commit -m "feat: OpenGraph metadata for rich link previews in WhatsApp/Telegram/iMessage"
git push
```

---

## Post-Implementation Checklist

After all 21 tasks are complete:

- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — production build clean
- [ ] `npx tsc --noEmit` — TypeScript clean
- [ ] Test invite flow end-to-end: share to a group chat, verify multiple people can join
- [ ] Test on Android mobile: Artists view is default, bottom sheet opens/closes, vertical scroll works
- [ ] Test on iOS Safari: h-dvh doesn't have address-bar layout issues
- [ ] Test clash visualisation: confirm both acts in a clashing pair show the inset box-shadow
- [ ] Test today-aware default: visit on a non-festival day → lands on Friday; if you could test on June 13 → lands on Saturday
- [ ] Verify OpenGraph: use https://opengraph.xyz to preview the invite page card
- [ ] Run `npx tsx scripts/seed-lineup.ts` against production DB if you need to reseed (data unchanged but confirm it's idempotent)
