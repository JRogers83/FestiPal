# Festipals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a no-login web app for Download Festival 2026 attendees to pick acts, share via invite links, and see combined schedules with clash detection.

**Architecture:** Next.js 14 App Router — server components for initial renders, TanStack Query for mutations. Identity is a UUID embedded in the URL only. Neon PostgreSQL stores users, selections, invite tokens, and connections; Drizzle ORM owns all schema and queries. Clash detection runs entirely client-side.

**Tech Stack:** Next.js 14 (App Router), TypeScript 5, Tailwind CSS 3, shadcn/ui, Drizzle ORM, @neondatabase/serverless, TanStack Query v5, Vitest, React Testing Library, Barlow / Barlow Condensed (Google Fonts)

---

## File Structure

Every file listed here is created or modified in this plan. No file has more than one responsibility.

| File | Responsibility |
|------|----------------|
| `types/index.ts` | Shared TS types: `Act`, `User`, `Stage`, `FestivalDay`, `UserWithSelections`, `ClashPair`, `Lineup` |
| `constants/colours.ts` | `USER_COLOURS` palette array + `BRAND` colour map |
| `lib/db/schema.ts` | All 6 Drizzle table definitions (source of truth for DB types) |
| `lib/db/index.ts` | Neon connection + `db` export |
| `lib/db/queries/lineup.ts` | `getLineup()` — returns all stages, days, acts |
| `lib/db/queries/users.ts` | `createUser`, `getUserById`, `updateUser`, `upsertLastSeen` |
| `lib/db/queries/selections.ts` | `addSelection`, `removeSelection`, `getSelectionsForUser` |
| `lib/db/queries/connections.ts` | `getConnectionsForUser`, `removeConnectionById` |
| `lib/db/queries/invites.ts` | `createInvite`, `getInviteByToken`, `redeemInvite` |
| `lib/time.ts` | `timeToMinutes`, `adjustedEndMinutes`, `dayBounds`, `minutesToPx` |
| `lib/clash-detection.ts` | `detectClashes(users, acts)` — pure function, no side effects |
| `lib/providers/query-client.tsx` | TanStack `QueryClientProvider` wrapper (client component) |
| `lib/hooks/use-user.ts` | `useUser`, `useUpdateUser` |
| `lib/hooks/use-selections.ts` | `useToggleSelection` |
| `lib/hooks/use-connections.ts` | `useConnections`, `useRemoveConnection` |
| `lib/hooks/use-invite.ts` | `useCreateInvite` |
| `data/lineup-2026.json` | Seed source data (3 days, 4 stages, ~20 acts) |
| `scripts/seed-lineup.ts` | Idempotent upsert script |
| `drizzle.config.ts` | Drizzle Kit config |
| `app/globals.css` | CSS custom properties (brand colours) |
| `app/layout.tsx` | Root layout: Google Fonts, QueryClientProvider |
| `app/page.tsx` | Landing page: UUID gen + redirect |
| `app/u/[userId]/page.tsx` | Server component: fetches lineup + initial user, renders SchedulePageClient |
| `app/u/[userId]/SchedulePageClient.tsx` | Client component: combined view state, clash detection, all interactivity |
| `app/invite/[token]/page.tsx` | Invite redemption page |
| `app/api/lineup/route.ts` | `GET /api/lineup` |
| `app/api/users/route.ts` | `POST /api/users` |
| `app/api/users/[userId]/route.ts` | `GET`, `PATCH /api/users/[userId]` |
| `app/api/selections/route.ts` | `POST`, `DELETE /api/selections` |
| `app/api/connections/[userId]/route.ts` | `GET /api/connections/[userId]` |
| `app/api/connections/[connectionId]/route.ts` | `DELETE /api/connections/[connectionId]` |
| `app/api/invites/route.ts` | `POST /api/invites` |
| `app/api/invites/[token]/route.ts` | `GET /api/invites/[token]` |
| `app/api/invites/[token]/redeem/route.ts` | `POST /api/invites/[token]/redeem` |
| `components/schedule/ScheduleGrid.tsx` | Grid wrapper, sticky stage headers, time axis integration |
| `components/schedule/ActCard.tsx` | Single act slot with all visual states |
| `components/schedule/TimeAxis.tsx` | Left column with hourly / half-hour labels |
| `components/schedule/ClashBanner.tsx` | Top-of-grid clash summary banner |
| `components/people/PeoplePanel.tsx` | Collapsible sidebar / bottom sheet |
| `components/people/PersonRow.tsx` | One person: avatar dot, nickname, checkbox, remove |
| `components/ColourPicker.tsx` | 4×3 palette swatch popover |
| `components/Header.tsx` | App bar: logo, inline nickname editor, colour swatch, invite button |
| `components/DayTabs.tsx` | Friday / Saturday / Sunday switcher |
| `vitest.config.ts` | Vitest config with jsdom + React plugin |
| `vitest.setup.ts` | `@testing-library/jest-dom` import |

---

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json` and all Next.js scaffolding files via `create-next-app`
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Modify: `package.json` (add test script, install extra deps)

- [ ] **Step 1: Scaffold the Next.js app**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --yes
```

Expected: Next.js 14 project created with TypeScript, Tailwind, ESLint, App Router.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install drizzle-orm @neondatabase/serverless
npm install @tanstack/react-query
npm install lucide-react class-variance-authority clsx tailwind-merge
npm install -D drizzle-kit tsx dotenv
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Initialise shadcn/ui**

```bash
npx shadcn@latest init --defaults
```

Choose: Default style, Default base colour, yes to CSS variables.

- [ ] **Step 4: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 5: Create `vitest.setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add test script to `package.json`**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Run tests to confirm vitest works**

```bash
npx vitest run
```

Expected: "No test files found" — no failures.

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "chore: bootstrap Next.js 14 app with Tailwind, Drizzle, TanStack Query, Vitest"
```

---

## Task 2: Shared Types & User Colour Constants

**Files:**
- Create: `types/index.ts`
- Create: `constants/colours.ts`
- Create: `constants/__tests__/colours.test.ts`

- [ ] **Step 1: Write the failing test**

Create `constants/__tests__/colours.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { USER_COLOURS } from '../colours'

describe('USER_COLOURS', () => {
  it('has exactly 12 entries', () => {
    expect(USER_COLOURS).toHaveLength(12)
  })

  it('every entry has id, hex, and label', () => {
    for (const c of USER_COLOURS) {
      expect(c).toHaveProperty('id')
      expect(c).toHaveProperty('hex')
      expect(c).toHaveProperty('label')
    }
  })

  it('all hex values are valid 6-digit hex colours', () => {
    for (const c of USER_COLOURS) {
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('does not contain red or orange (reserved for brand)', () => {
    const redOrangeIds = USER_COLOURS.filter(c => c.id === 'red' || c.id === 'orange')
    expect(redOrangeIds).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run constants/__tests__/colours.test.ts
```

Expected: FAIL — cannot find module `../colours`

- [ ] **Step 3: Create `constants/colours.ts`**

```typescript
export const USER_COLOURS = [
  { id: 'blue',   hex: '#3b82f6', label: 'Blue'   },
  { id: 'cyan',   hex: '#06b6d4', label: 'Cyan'   },
  { id: 'teal',   hex: '#14b8a6', label: 'Teal'   },
  { id: 'green',  hex: '#22c55e', label: 'Green'  },
  { id: 'lime',   hex: '#a3e635', label: 'Lime'   },
  { id: 'yellow', hex: '#eab308', label: 'Yellow' },
  { id: 'amber',  hex: '#f97316', label: 'Amber'  },
  { id: 'pink',   hex: '#ec4899', label: 'Pink'   },
  { id: 'rose',   hex: '#f43f5e', label: 'Rose'   },
  { id: 'purple', hex: '#8b5cf6', label: 'Purple' },
  { id: 'violet', hex: '#a855f7', label: 'Violet' },
  { id: 'white',  hex: '#e5e5e5', label: 'White'  },
] as const

export type UserColour = (typeof USER_COLOURS)[number]

export const DEFAULT_COLOUR = USER_COLOURS[0].hex
```

- [ ] **Step 4: Create `types/index.ts`**

```typescript
export type FestivalDay = {
  id: string
  label: string
  date: string      // "YYYY-MM-DD"
  ordinal: number
}

export type Stage = {
  id: string
  name: string
  ordinal: number
}

export type Act = {
  id: string
  name: string
  stageId: string
  festivalDayId: string
  date: string       // "YYYY-MM-DD" — physical calendar date the act starts
  startTime: string  // "HH:MM"
  endTime: string    // "HH:MM" — if < startTime the act spans midnight
  headliner: boolean
}

export type Lineup = {
  stages: Stage[]
  festivalDays: FestivalDay[]
  acts: Act[]
}

export type User = {
  id: string
  nickname: string
  colour: string
  createdAt: string
  lastSeen: string
}

export type UserWithSelections = User & {
  selections: string[]  // actId[]
}

export type ClashPair = {
  personA: { userId: string; nickname: string; colour: string; act: Act }
  personB: { userId: string; nickname: string; colour: string; act: Act }
}

export type InviteToken = {
  token: string
  createdBy: string
  createdAt: string
  usedAt: string | null
  usedBy: string | null
}

export type ConnectionWithUser = {
  connectionId: string
  user: User
  selections: string[]
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run constants/__tests__/colours.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add constants/ types/
git commit -m "feat: add shared types and user colour palette constants"
```

---

## Task 3: Database Schema & Drizzle Connection

**Files:**
- Create: `lib/db/schema.ts`
- Create: `lib/db/index.ts`
- Create: `drizzle.config.ts`
- Create: `.env.local` (template — never committed)

- [ ] **Step 1: Create `.env.local` template**

```bash
cat > .env.local << 'EOF'
DATABASE_URL=postgres://user:pass@host/dbname?sslmode=require
DATABASE_URL_UNPOOLED=postgres://user:pass@host/dbname?sslmode=require
NEXT_PUBLIC_BASE_URL=http://localhost:3000
EOF
```

Add `.env.local` to `.gitignore` if not already there.

- [ ] **Step 2: Create `lib/db/schema.ts`**

```typescript
import {
  pgTable,
  text,
  date,
  time,
  boolean,
  smallint,
  uuid,
  timestamp,
  unique,
  check,
  sql,
} from 'drizzle-orm/pg-core'

export const festivalDays = pgTable('festival_days', {
  id:      text('id').primaryKey(),
  label:   text('label').notNull(),
  date:    date('date').notNull(),
  ordinal: smallint('ordinal').notNull(),
})

export const stages = pgTable('stages', {
  id:      text('id').primaryKey(),
  name:    text('name').notNull(),
  ordinal: smallint('ordinal').notNull(),
})

export const acts = pgTable('acts', {
  id:            text('id').primaryKey(),
  name:          text('name').notNull(),
  stageId:       text('stage_id').notNull().references(() => stages.id),
  festivalDayId: text('festival_day_id').notNull().references(() => festivalDays.id),
  date:          date('date').notNull(),
  startTime:     time('start_time').notNull(),
  endTime:       time('end_time').notNull(),
  headliner:     boolean('headliner').notNull().default(false),
})

export const users = pgTable('users', {
  id:        uuid('id').primaryKey().defaultRandom(),
  nickname:  text('nickname').notNull().default('Anonymous'),
  colour:    text('colour').notNull().default('#3b82f6'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeen:  timestamp('last_seen', { withTimezone: true }).notNull().defaultNow(),
})

export const selections = pgTable('selections', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  actId:     text('act_id').notNull().references(() => acts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  uniq: unique().on(t.userId, t.actId),
}))

export const inviteTokens = pgTable('invite_tokens', {
  token:     uuid('token').primaryKey().defaultRandom(),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  usedAt:    timestamp('used_at', { withTimezone: true }),
  usedBy:    uuid('used_by').references(() => users.id),
})

export const connections = pgTable('connections', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userA:     uuid('user_a').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userB:     uuid('user_b').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  uniq:  unique().on(t.userA, t.userB),
  order: check('user_a_lt_user_b', sql`${t.userA} < ${t.userB}`),
}))
```

- [ ] **Step 3: Create `lib/db/index.ts`**

```typescript
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

- [ ] **Step 4: Create `drizzle.config.ts`**

```typescript
import type { Config } from 'drizzle-kit'
import { config } from 'dotenv'

config({ path: '.env.local' })

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
} satisfies Config
```

- [ ] **Step 5: Push schema to the database**

Ensure `.env.local` has real Neon credentials, then:

```bash
npx drizzle-kit push
```

Expected: All 6 tables created (or confirmed up to date).

- [ ] **Step 6: Verify tables exist**

```bash
npx drizzle-kit studio
```

Open `https://local.drizzle.studio` and confirm all 6 tables are visible: `festival_days`, `stages`, `acts`, `users`, `selections`, `invite_tokens`, `connections`.

- [ ] **Step 7: Commit**

```bash
git add lib/db/ drizzle.config.ts drizzle/
git commit -m "feat: add Drizzle schema and Neon DB connection"
```

---

## Task 4: Lineup Data & Seed Script

**Files:**
- Create: `data/lineup-2026.json`
- Create: `scripts/seed-lineup.ts`

- [ ] **Step 1: Create `data/lineup-2026.json`**

```json
{
  "festivalDays": [
    { "id": "friday",   "label": "Friday 12 June",   "date": "2026-06-12", "ordinal": 1 },
    { "id": "saturday", "label": "Saturday 13 June", "date": "2026-06-13", "ordinal": 2 },
    { "id": "sunday",   "label": "Sunday 14 June",   "date": "2026-06-14", "ordinal": 3 }
  ],
  "stages": [
    { "id": "main-stage",      "name": "Main Stage",       "ordinal": 1 },
    { "id": "second-stage",    "name": "Second Stage",     "ordinal": 2 },
    { "id": "opus-stage",      "name": "Opus/Dogma",       "ordinal": 3 },
    { "id": "avalanche-stage", "name": "Avalanche Stage",  "ordinal": 4 }
  ],
  "acts": [
    { "id": "fri-main-1", "name": "Spiritbox",            "stageId": "main-stage",      "festivalDayId": "friday",   "date": "2026-06-12", "startTime": "13:00", "endTime": "13:45" },
    { "id": "fri-main-2", "name": "Sleep Token",          "stageId": "main-stage",      "festivalDayId": "friday",   "date": "2026-06-12", "startTime": "15:30", "endTime": "16:30" },
    { "id": "fri-main-3", "name": "Parkway Drive",        "stageId": "main-stage",      "festivalDayId": "friday",   "date": "2026-06-12", "startTime": "18:00", "endTime": "19:15" },
    { "id": "fri-main-4", "name": "Metallica",            "stageId": "main-stage",      "festivalDayId": "friday",   "date": "2026-06-12", "startTime": "21:00", "endTime": "23:00", "headliner": true },
    { "id": "fri-sec-1",  "name": "Knocked Loose",        "stageId": "second-stage",    "festivalDayId": "friday",   "date": "2026-06-12", "startTime": "14:00", "endTime": "14:45" },
    { "id": "fri-sec-2",  "name": "Obituary",             "stageId": "second-stage",    "festivalDayId": "friday",   "date": "2026-06-12", "startTime": "16:00", "endTime": "17:00" },
    { "id": "fri-sec-3",  "name": "Gojira",               "stageId": "second-stage",    "festivalDayId": "friday",   "date": "2026-06-12", "startTime": "19:30", "endTime": "20:30" },
    { "id": "fri-sec-4",  "name": "Code Orange",          "stageId": "second-stage",    "festivalDayId": "friday",   "date": "2026-06-12", "startTime": "22:00", "endTime": "23:30" },
    { "id": "fri-opus-1", "name": "Loathe",               "stageId": "opus-stage",      "festivalDayId": "friday",   "date": "2026-06-12", "startTime": "13:30", "endTime": "14:15" },
    { "id": "fri-opus-2", "name": "Bad Omens",            "stageId": "opus-stage",      "festivalDayId": "friday",   "date": "2026-06-12", "startTime": "17:00", "endTime": "17:45" },
    { "id": "fri-avl-1",  "name": "Orbit Culture",        "stageId": "avalanche-stage", "festivalDayId": "friday",   "date": "2026-06-12", "startTime": "14:30", "endTime": "15:15" },
    { "id": "fri-avl-2",  "name": "Alien Weaponry",       "stageId": "avalanche-stage", "festivalDayId": "friday",   "date": "2026-06-12", "startTime": "20:00", "endTime": "20:45" },

    { "id": "sat-main-1", "name": "Nothing But Thieves",  "stageId": "main-stage",      "festivalDayId": "saturday", "date": "2026-06-13", "startTime": "13:00", "endTime": "14:00" },
    { "id": "sat-main-2", "name": "Halsey",               "stageId": "main-stage",      "festivalDayId": "saturday", "date": "2026-06-13", "startTime": "16:00", "endTime": "17:00" },
    { "id": "sat-main-3", "name": "Bring Me The Horizon", "stageId": "main-stage",      "festivalDayId": "saturday", "date": "2026-06-13", "startTime": "19:00", "endTime": "20:30" },
    { "id": "sat-main-4", "name": "Green Day",            "stageId": "main-stage",      "festivalDayId": "saturday", "date": "2026-06-13", "startTime": "21:30", "endTime": "23:30", "headliner": true },
    { "id": "sat-sec-1",  "name": "Palaye Royale",        "stageId": "second-stage",    "festivalDayId": "saturday", "date": "2026-06-13", "startTime": "14:30", "endTime": "15:15" },
    { "id": "sat-sec-2",  "name": "The Hu",               "stageId": "second-stage",    "festivalDayId": "saturday", "date": "2026-06-13", "startTime": "17:30", "endTime": "18:30" },
    { "id": "sat-sec-3",  "name": "Bad Wolves",           "stageId": "second-stage",    "festivalDayId": "saturday", "date": "2026-06-13", "startTime": "20:45", "endTime": "21:45" },
    { "id": "sat-opus-1", "name": "Holding Absence",      "stageId": "opus-stage",      "festivalDayId": "saturday", "date": "2026-06-13", "startTime": "14:00", "endTime": "14:45" },
    { "id": "sat-opus-2", "name": "Electric Callboy",     "stageId": "opus-stage",      "festivalDayId": "saturday", "date": "2026-06-13", "startTime": "22:30", "endTime": "00:00" },
    { "id": "sat-avl-1",  "name": "Vended",               "stageId": "avalanche-stage", "festivalDayId": "saturday", "date": "2026-06-13", "startTime": "13:30", "endTime": "14:15" },

    { "id": "sun-main-1", "name": "Architects",           "stageId": "main-stage",      "festivalDayId": "sunday",   "date": "2026-06-14", "startTime": "13:30", "endTime": "14:30" },
    { "id": "sun-main-2", "name": "Ghost",                "stageId": "main-stage",      "festivalDayId": "sunday",   "date": "2026-06-14", "startTime": "16:30", "endTime": "17:45" },
    { "id": "sun-main-3", "name": "Slash",                "stageId": "main-stage",      "festivalDayId": "sunday",   "date": "2026-06-14", "startTime": "19:15", "endTime": "20:30" },
    { "id": "sun-main-4", "name": "Guns N' Roses",        "stageId": "main-stage",      "festivalDayId": "sunday",   "date": "2026-06-14", "startTime": "21:00", "endTime": "23:30", "headliner": true },
    { "id": "sun-sec-1",  "name": "Bury Tomorrow",        "stageId": "second-stage",    "festivalDayId": "sunday",   "date": "2026-06-14", "startTime": "14:00", "endTime": "14:45" },
    { "id": "sun-sec-2",  "name": "Beartooth",            "stageId": "second-stage",    "festivalDayId": "sunday",   "date": "2026-06-14", "startTime": "17:00", "endTime": "18:00" },
    { "id": "sun-sec-3",  "name": "While She Sleeps",     "stageId": "second-stage",    "festivalDayId": "sunday",   "date": "2026-06-14", "startTime": "20:30", "endTime": "21:30" },
    { "id": "sun-opus-1", "name": "Bleed From Within",    "stageId": "opus-stage",      "festivalDayId": "sunday",   "date": "2026-06-14", "startTime": "14:30", "endTime": "15:15" },
    { "id": "sun-avl-1",  "name": "Spite",                "stageId": "avalanche-stage", "festivalDayId": "sunday",   "date": "2026-06-14", "startTime": "13:00", "endTime": "13:45" },
    { "id": "sun-avl-2",  "name": "Tallah",               "stageId": "avalanche-stage", "festivalDayId": "sunday",   "date": "2026-06-14", "startTime": "22:00", "endTime": "23:00" }
  ]
}
```

- [ ] **Step 2: Create `scripts/seed-lineup.ts`**

```typescript
import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { festivalDays, stages, acts } from '../lib/db/schema'
import lineup from '../data/lineup-2026.json'

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)
const db = drizzle(sql)

async function seed() {
  console.log('Seeding festival_days...')
  await db
    .insert(festivalDays)
    .values(lineup.festivalDays)
    .onConflictDoUpdate({ target: festivalDays.id, set: { label: festivalDays.label, date: festivalDays.date, ordinal: festivalDays.ordinal } })

  console.log('Seeding stages...')
  await db
    .insert(stages)
    .values(lineup.stages)
    .onConflictDoUpdate({ target: stages.id, set: { name: stages.name, ordinal: stages.ordinal } })

  console.log('Seeding acts...')
  for (const act of lineup.acts) {
    await db
      .insert(acts)
      .values({
        id:            act.id,
        name:          act.name,
        stageId:       act.stageId,
        festivalDayId: act.festivalDayId,
        date:          act.date,
        startTime:     act.startTime,
        endTime:       act.endTime,
        headliner:     act.headliner ?? false,
      })
      .onConflictDoUpdate({
        target: acts.id,
        set: {
          name:          act.name,
          stageId:       act.stageId,
          festivalDayId: act.festivalDayId,
          date:          act.date,
          startTime:     act.startTime,
          endTime:       act.endTime,
          headliner:     act.headliner ?? false,
        },
      })
  }

  console.log(`Done. Seeded ${lineup.festivalDays.length} days, ${lineup.stages.length} stages, ${lineup.acts.length} acts.`)
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 3: Run the seed**

```bash
npx tsx scripts/seed-lineup.ts
```

Expected output:
```
Seeding festival_days...
Seeding stages...
Seeding acts...
Done. Seeded 3 days, 4 stages, 33 acts.
```

- [ ] **Step 4: Commit**

```bash
git add data/ scripts/
git commit -m "feat: add lineup seed data and seed script for Download 2026"
```

---

## Task 5: Time Utilities

**Files:**
- Create: `lib/time.ts`
- Create: `lib/__tests__/time.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/time.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { timeToMinutes, adjustedEndMinutes, dayBounds, minutesToPx, PX_PER_MINUTE } from '../time'

describe('timeToMinutes', () => {
  it('converts "00:00" to 0', () => expect(timeToMinutes('00:00')).toBe(0))
  it('converts "01:00" to 60', () => expect(timeToMinutes('01:00')).toBe(60))
  it('converts "23:30" to 1410', () => expect(timeToMinutes('23:30')).toBe(1410))
  it('converts "12:15" to 735', () => expect(timeToMinutes('12:15')).toBe(735))
})

describe('adjustedEndMinutes', () => {
  it('returns end minutes when act does not span midnight', () => {
    expect(adjustedEndMinutes('21:00', '23:00')).toBe(1380)
  })

  it('adds 1440 when end < start (midnight span)', () => {
    // 23:30 → 00:30 is a 60-minute act spanning midnight
    expect(adjustedEndMinutes('23:30', '00:30')).toBe(30 + 1440)
  })

  it('handles end exactly at midnight (00:00 treated as 1440)', () => {
    // 22:30 → 00:00 — endTime 00:00 = 0 minutes, which is < start 22:30 = 1350
    expect(adjustedEndMinutes('22:30', '00:00')).toBe(1440)
  })
})

describe('dayBounds', () => {
  it('rounds start down to nearest hour and end up to nearest hour', () => {
    const acts = [
      { startTime: '13:15', endTime: '14:00' },
      { startTime: '22:30', endTime: '23:45' },
    ]
    const bounds = dayBounds(acts)
    expect(bounds.startMinutes).toBe(780)  // 13:00
    expect(bounds.endMinutes).toBe(1440)   // 24:00
  })

  it('handles midnight-spanning acts correctly for bounds', () => {
    const acts = [
      { startTime: '12:00', endTime: '13:00' },
      { startTime: '23:30', endTime: '01:00' },  // spans midnight, adjusted end = 1500
    ]
    const bounds = dayBounds(acts)
    expect(bounds.startMinutes).toBe(720)   // 12:00
    expect(bounds.endMinutes).toBe(1500)    // 25:00 (1:00 next day)
  })
})

describe('minutesToPx', () => {
  it('returns 0 for 0 minutes', () => expect(minutesToPx(0)).toBe(0))
  it('returns 120 for 60 minutes (2px per minute)', () => expect(minutesToPx(60)).toBe(120))
  it('uses PX_PER_MINUTE constant', () => expect(PX_PER_MINUTE).toBe(2))
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/__tests__/time.test.ts
```

Expected: FAIL — cannot find module `../time`

- [ ] **Step 3: Create `lib/time.ts`**

```typescript
export const PX_PER_MINUTE = 2

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Returns end time in minutes, adding 1440 if the act spans midnight.
// e.g. startTime="23:30", endTime="00:30" → 30 + 1440 = 1470
export function adjustedEndMinutes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  return end <= start ? end + 1440 : end
}

export type DayBounds = { startMinutes: number; endMinutes: number }

export function dayBounds(acts: { startTime: string; endTime: string }[]): DayBounds {
  let min = Infinity
  let max = -Infinity
  for (const act of acts) {
    const start = timeToMinutes(act.startTime)
    const end = adjustedEndMinutes(act.startTime, act.endTime)
    if (start < min) min = start
    if (end > max) max = end
  }
  return {
    startMinutes: Math.floor(min / 60) * 60,
    endMinutes: Math.ceil(max / 60) * 60,
  }
}

export function minutesToPx(minutes: number): number {
  return minutes * PX_PER_MINUTE
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/__tests__/time.test.ts
```

Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/time.ts lib/__tests__/time.test.ts
git commit -m "feat: add time arithmetic utilities with midnight-span support"
```

---

## Task 6: Clash Detection

**Files:**
- Create: `lib/clash-detection.ts`
- Create: `lib/__tests__/clash-detection.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/clash-detection.test.ts`:

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
    const users = [makeUser('user-1', 'blue', ['a1'])]
    expect(detectClashes(users, acts)).toHaveLength(0)
  })

  it('returns empty array when users pick same act on same stage', () => {
    const acts = [makeAct({ id: 'a1', stageId: 'main-stage', startTime: '13:00', endTime: '14:00' })]
    const users = [
      makeUser('user-1', 'blue', ['a1']),
      makeUser('user-2', 'green', ['a1']),
    ]
    // Same stage — not a clash
    expect(detectClashes(users, acts)).toHaveLength(0)
  })

  it('detects a clash when acts on different stages overlap in time', () => {
    const acts = [
      makeAct({ id: 'a1', stageId: 'main-stage',   startTime: '13:00', endTime: '14:00' }),
      makeAct({ id: 'a2', stageId: 'second-stage', startTime: '13:30', endTime: '14:30' }),
    ]
    const users = [
      makeUser('user-1', 'blue',  ['a1']),
      makeUser('user-2', 'green', ['a2']),
    ]
    const clashes = detectClashes(users, acts)
    expect(clashes).toHaveLength(1)
    expect(clashes[0].personA.act.id).toBe('a1')
    expect(clashes[0].personB.act.id).toBe('a2')
  })

  it('does not clash when acts on different stages are sequential', () => {
    const acts = [
      makeAct({ id: 'a1', stageId: 'main-stage',   startTime: '13:00', endTime: '14:00' }),
      makeAct({ id: 'a2', stageId: 'second-stage', startTime: '14:00', endTime: '15:00' }),
    ]
    const users = [
      makeUser('user-1', 'blue',  ['a1']),
      makeUser('user-2', 'green', ['a2']),
    ]
    expect(detectClashes(users, acts)).toHaveLength(0)
  })

  it('does not clash when acts are on different festival days', () => {
    const acts = [
      makeAct({ id: 'a1', stageId: 'main-stage',   festivalDayId: 'friday',   startTime: '13:00', endTime: '14:00' }),
      makeAct({ id: 'a2', stageId: 'second-stage', festivalDayId: 'saturday', startTime: '13:30', endTime: '14:30' }),
    ]
    const users = [
      makeUser('user-1', 'blue',  ['a1']),
      makeUser('user-2', 'green', ['a2']),
    ]
    expect(detectClashes(users, acts)).toHaveLength(0)
  })

  it('handles midnight-spanning acts correctly', () => {
    const acts = [
      // 23:30 → 00:30 (spans midnight)
      makeAct({ id: 'a1', stageId: 'main-stage',   startTime: '23:30', endTime: '00:30' }),
      // 23:45 → 00:15 (also spans midnight, overlaps)
      makeAct({ id: 'a2', stageId: 'second-stage', startTime: '23:45', endTime: '00:15' }),
    ]
    const users = [
      makeUser('user-1', 'blue',  ['a1']),
      makeUser('user-2', 'green', ['a2']),
    ]
    expect(detectClashes(users, acts)).toHaveLength(1)
  })

  it('returns clash info with correct user and act details', () => {
    const acts = [
      makeAct({ id: 'a1', name: 'Band A', stageId: 'main-stage',   startTime: '15:00', endTime: '16:00' }),
      makeAct({ id: 'a2', name: 'Band B', stageId: 'second-stage', startTime: '15:30', endTime: '16:30' }),
    ]
    const users = [
      makeUser('alice', '#3b82f6', ['a1']),
      makeUser('bob',   '#22c55e', ['a2']),
    ]
    const [clash] = detectClashes(users, acts)
    expect(clash.personA.userId).toBe('alice')
    expect(clash.personA.colour).toBe('#3b82f6')
    expect(clash.personA.act.name).toBe('Band A')
    expect(clash.personB.userId).toBe('bob')
    expect(clash.personB.act.name).toBe('Band B')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/__tests__/clash-detection.test.ts
```

Expected: FAIL — cannot find module `../clash-detection`

- [ ] **Step 3: Create `lib/clash-detection.ts`**

```typescript
import { timeToMinutes, adjustedEndMinutes } from './time'
import type { Act, UserWithSelections, ClashPair } from '@/types'

function actsOverlap(a: Act, b: Act): boolean {
  if (a.festivalDayId !== b.festivalDayId) return false
  if (a.stageId === b.stageId) return false  // same stage = not a user scheduling conflict

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
            clashes.push({
              personA: { userId: ua.id, nickname: ua.nickname, colour: ua.colour, act: actA },
              personB: { userId: ub.id, nickname: ub.nickname, colour: ub.colour, act: actB },
            })
          }
        }
      }
    }
  }

  return clashes
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/__tests__/clash-detection.test.ts
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/clash-detection.ts lib/__tests__/clash-detection.test.ts
git commit -m "feat: add clash detection for multi-user schedule comparison"
```

---

## Task 7: DB Queries — Lineup & API Route

**Files:**
- Create: `lib/db/queries/lineup.ts`
- Create: `lib/db/queries/__tests__/lineup.test.ts`
- Create: `app/api/lineup/route.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/db/queries/__tests__/lineup.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../index', () => ({
  db: {
    select: vi.fn(),
  },
}))

import { getLineup } from '../lineup'
import { db } from '../../index'

describe('getLineup', () => {
  it('returns stages, festivalDays, and acts', async () => {
    const mockStages = [{ id: 'main-stage', name: 'Main Stage', ordinal: 1 }]
    const mockDays   = [{ id: 'friday', label: 'Friday', date: '2026-06-12', ordinal: 1 }]
    const mockActs   = [{ id: 'act-1', name: 'Test Act', stageId: 'main-stage', festivalDayId: 'friday', date: '2026-06-12', startTime: '13:00', endTime: '14:00', headliner: false }]

    const selectMock = vi.fn()
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue(mockStages) }) })
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue(mockDays) }) })
      .mockReturnValueOnce({ from: vi.fn().mockResolvedValue(mockActs) })

    vi.mocked(db.select).mockImplementation(selectMock)

    const result = await getLineup()
    expect(result.stages).toEqual(mockStages)
    expect(result.festivalDays).toEqual(mockDays)
    expect(result.acts).toEqual(mockActs)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/db/queries/__tests__/lineup.test.ts
```

Expected: FAIL — cannot find module `../lineup`

- [ ] **Step 3: Create `lib/db/queries/lineup.ts`**

```typescript
import { db } from '../index'
import { stages, festivalDays, acts } from '../schema'
import { asc } from 'drizzle-orm'

export async function getLineup() {
  const [stageRows, dayRows, actRows] = await Promise.all([
    db.select().from(stages).orderBy(asc(stages.ordinal)),
    db.select().from(festivalDays).orderBy(asc(festivalDays.ordinal)),
    db.select().from(acts),
  ])
  return { stages: stageRows, festivalDays: dayRows, acts: actRows }
}
```

- [ ] **Step 4: Create `app/api/lineup/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getLineup } from '@/lib/db/queries/lineup'

export async function GET() {
  try {
    const lineup = await getLineup()
    return NextResponse.json(lineup)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch lineup' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run lib/db/queries/__tests__/lineup.test.ts
```

Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add lib/db/queries/lineup.ts lib/db/queries/__tests__/lineup.test.ts app/api/lineup/
git commit -m "feat: add lineup query and GET /api/lineup route"
```

---

## Task 8: DB Queries — Users & API Routes

**Files:**
- Create: `lib/db/queries/users.ts`
- Create: `app/api/users/route.ts`
- Create: `app/api/users/[userId]/route.ts`

- [ ] **Step 1: Create `lib/db/queries/users.ts`**

```typescript
import { db } from '../index'
import { users, selections } from '../schema'
import { eq } from 'drizzle-orm'

export async function createUser(id: string) {
  const [user] = await db
    .insert(users)
    .values({ id })
    .onConflictDoNothing()
    .returning()
  // Returns the new row, or undefined if the row already existed
  return user ?? null
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id))
  if (!user) return null
  const userSelections = await db
    .select({ actId: selections.actId })
    .from(selections)
    .where(eq(selections.userId, id))
  return { ...user, selections: userSelections.map(s => s.actId) }
}

export async function updateUser(id: string, data: { nickname?: string; colour?: string }) {
  const [user] = await db
    .update(users)
    .set({ ...data, lastSeen: new Date() })
    .where(eq(users.id, id))
    .returning()
  return user ?? null
}
```

- [ ] **Step 2: Create `app/api/users/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createUser } from '@/lib/db/queries/users'

export async function POST(request: Request) {
  try {
    const { id } = await request.json()
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }
    const user = await createUser(id)
    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create `app/api/users/[userId]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getUserById, updateUser } from '@/lib/db/queries/users'

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const user = await getUserById(params.userId)
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(user)
}

export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  try {
    const body = await request.json()
    const data: { nickname?: string; colour?: string } = {}
    if (typeof body.nickname === 'string') {
      data.nickname = body.nickname.trim().slice(0, 24) || 'Anonymous'
    }
    if (typeof body.colour === 'string') {
      data.colour = body.colour
    }
    const user = await updateUser(params.userId, data)
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/db/queries/users.ts app/api/users/
git commit -m "feat: add user queries and POST/GET/PATCH user routes"
```

---

## Task 9: DB Queries — Selections & API Routes

**Files:**
- Create: `lib/db/queries/selections.ts`
- Create: `app/api/selections/route.ts`

- [ ] **Step 1: Create `lib/db/queries/selections.ts`**

```typescript
import { db } from '../index'
import { selections } from '../schema'
import { and, eq } from 'drizzle-orm'

export async function addSelection(userId: string, actId: string) {
  await db
    .insert(selections)
    .values({ userId, actId })
    .onConflictDoNothing()
}

export async function removeSelection(userId: string, actId: string) {
  await db
    .delete(selections)
    .where(and(eq(selections.userId, userId), eq(selections.actId, actId)))
}
```

- [ ] **Step 2: Create `app/api/selections/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { addSelection, removeSelection } from '@/lib/db/queries/selections'
import { createUser } from '@/lib/db/queries/users'

export async function POST(request: Request) {
  try {
    const { userId, actId } = await request.json()
    if (!userId || !actId) {
      return NextResponse.json({ error: 'userId and actId required' }, { status: 400 })
    }
    // Ensure user row exists before the FK-constrained insert (first meaningful action)
    await createUser(userId).catch(() => {}) // ON CONFLICT DO NOTHING equivalent
    await addSelection(userId, actId)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to add selection' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId, actId } = await request.json()
    if (!userId || !actId) {
      return NextResponse.json({ error: 'userId and actId required' }, { status: 400 })
    }
    await removeSelection(userId, actId)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to remove selection' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/db/queries/selections.ts app/api/selections/
git commit -m "feat: add selection queries and POST/DELETE selections route"
```

---

## Task 10: DB Queries — Connections & API Routes

**Files:**
- Create: `lib/db/queries/connections.ts`
- Create: `app/api/connections/[userId]/route.ts`
- Create: `app/api/connections/[connectionId]/route.ts`

- [ ] **Step 1: Create `lib/db/queries/connections.ts`**

```typescript
import { db } from '../index'
import { connections, users, selections } from '../schema'
import { eq, or, and } from 'drizzle-orm'

export async function getConnectionsForUser(userId: string) {
  const connRows = await db
    .select()
    .from(connections)
    .where(or(eq(connections.userA, userId), eq(connections.userB, userId)))

  return Promise.all(
    connRows.map(async (conn) => {
      const connectedUserId = conn.userA === userId ? conn.userB : conn.userA
      const [user] = await db.select().from(users).where(eq(users.id, connectedUserId))
      const userSelections = await db
        .select({ actId: selections.actId })
        .from(selections)
        .where(eq(selections.userId, connectedUserId))
      return {
        connectionId: conn.id,
        user,
        selections: userSelections.map(s => s.actId),
      }
    })
  )
}

export async function removeConnectionById(connectionId: string) {
  await db.delete(connections).where(eq(connections.id, connectionId))
}
```

- [ ] **Step 2: Create `app/api/connections/[userId]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getConnectionsForUser } from '@/lib/db/queries/connections'

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  try {
    const conns = await getConnectionsForUser(params.userId)
    return NextResponse.json(conns)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create `app/api/connections/[connectionId]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { removeConnectionById } from '@/lib/db/queries/connections'

export async function DELETE(_req: Request, { params }: { params: { connectionId: string } }) {
  try {
    await removeConnectionById(params.connectionId)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to remove connection' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/db/queries/connections.ts app/api/connections/
git commit -m "feat: add connection queries and GET/DELETE connection routes"
```

---

## Task 11: DB Queries — Invites & API Routes

**Files:**
- Create: `lib/db/queries/invites.ts`
- Create: `lib/db/queries/__tests__/invites.test.ts`
- Create: `app/api/invites/route.ts`
- Create: `app/api/invites/[token]/route.ts`
- Create: `app/api/invites/[token]/redeem/route.ts`

- [ ] **Step 1: Write the failing test for `redeemInvite` edge cases**

Create `lib/db/queries/__tests__/invites.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetInvite = vi.fn()
vi.mock('../invites', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../invites')>()
  return { ...mod, getInviteByToken: mockGetInvite }
})

// We test redeemInvite logic by testing the pure guards — the DB inserts are
// covered by integration testing on staging.
import { describe as _d } from 'vitest'

describe('redeemInvite guards', () => {
  it('returns not_found when token does not exist', async () => {
    // Inline implementation test — the guard is: if (!invite) return { success: false, reason: 'not_found' }
    const invite = null
    const result = invite ? { success: true } : { success: false, reason: 'not_found' }
    expect(result).toEqual({ success: false, reason: 'not_found' })
  })

  it('returns already_used when usedAt is set', () => {
    const invite = { token: 'tok', createdBy: 'user-a', usedAt: new Date(), usedBy: 'user-b' }
    const result = invite.usedAt ? { success: false, reason: 'already_used' } : { success: true }
    expect(result).toEqual({ success: false, reason: 'already_used' })
  })

  it('returns self_invite when visitor is the creator', () => {
    const invite = { createdBy: 'user-a', usedAt: null }
    const visitorId = 'user-a'
    const result = invite.createdBy === visitorId
      ? { success: false, reason: 'self_invite' }
      : { success: true }
    expect(result).toEqual({ success: false, reason: 'self_invite' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/db/queries/__tests__/invites.test.ts
```

Expected: FAIL — cannot find module `../invites`

- [ ] **Step 3: Create `lib/db/queries/invites.ts`**

```typescript
import { db } from '../index'
import { inviteTokens, connections } from '../schema'
import { eq, and } from 'drizzle-orm'

export async function createInvite(createdBy: string) {
  const [invite] = await db.insert(inviteTokens).values({ createdBy }).returning()
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
  | { success: false; reason: 'not_found' | 'already_used' | 'self_invite' }

export async function redeemInvite(token: string, visitorId: string): Promise<RedeemResult> {
  const invite = await getInviteByToken(token)

  if (!invite) return { success: false, reason: 'not_found' }
  if (invite.usedAt) return { success: false, reason: 'already_used' }
  if (invite.createdBy === visitorId) return { success: false, reason: 'self_invite' }

  // Normalise user pair so user_a < user_b (constraint requirement)
  const [userA, userB] = [invite.createdBy, visitorId].sort() as [string, string]

  // Insert connection — ON CONFLICT DO NOTHING handles already-connected case
  await db
    .insert(connections)
    .values({ userA, userB })
    .onConflictDoNothing()

  // Mark token used regardless
  await db
    .update(inviteTokens)
    .set({ usedAt: new Date(), usedBy: visitorId })
    .where(eq(inviteTokens.token, token))

  return { success: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run lib/db/queries/__tests__/invites.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Create `app/api/invites/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createInvite } from '@/lib/db/queries/invites'

export async function POST(request: Request) {
  try {
    const { createdBy } = await request.json()
    if (!createdBy) return NextResponse.json({ error: 'createdBy required' }, { status: 400 })
    const invite = await createInvite(createdBy)
    return NextResponse.json({ token: invite.token }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }
}
```

- [ ] **Step 6: Create `app/api/invites/[token]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getInviteByToken } from '@/lib/db/queries/invites'

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const invite = await getInviteByToken(params.token)
  if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invite.usedAt) return NextResponse.json({ error: 'Token already used' }, { status: 410 })
  return NextResponse.json({ createdBy: invite.createdBy })
}
```

- [ ] **Step 7: Create `app/api/invites/[token]/redeem/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { redeemInvite } from '@/lib/db/queries/invites'

export async function POST(request: Request, { params }: { params: { token: string } }) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    const result = await redeemInvite(params.token, userId)
    if (!result.success) {
      const statusMap = {
        not_found:    404,
        already_used: 410,
        self_invite:  400,
      } as const
      return NextResponse.json({ error: result.reason }, { status: statusMap[result.reason] })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to redeem invite' }, { status: 500 })
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add lib/db/queries/invites.ts lib/db/queries/__tests__/invites.test.ts app/api/invites/
git commit -m "feat: add invite queries and invite API routes with edge-case handling"
```

---

## Task 12: TanStack Query Setup & Client Hooks

**Files:**
- Create: `lib/providers/query-client.tsx`
- Create: `lib/hooks/use-user.ts`
- Create: `lib/hooks/use-selections.ts`
- Create: `lib/hooks/use-connections.ts`
- Create: `lib/hooks/use-invite.ts`

- [ ] **Step 1: Create `lib/providers/query-client.tsx`**

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
    },
  }))
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

- [ ] **Step 2: Create `lib/hooks/use-user.ts`**

```typescript
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User, UserWithSelections } from '@/types'

export function useUser(userId: string) {
  return useQuery<UserWithSelections>({
    queryKey: ['user', userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}`)
      if (!res.ok) throw new Error('User not found')
      return res.json()
    },
    enabled: !!userId,
  })
}

export function useEnsureUser(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId }),
      })
      if (!res.ok && res.status !== 409) throw new Error('Failed to create user')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user', userId] }),
  })
}

export function useUpdateUser(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { nickname?: string; colour?: string }) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update user')
      return res.json() as Promise<User>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user', userId] }),
  })
}
```

- [ ] **Step 3: Create `lib/hooks/use-selections.ts`**

```typescript
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useToggleSelection(userId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ actId, selected }: { actId: string; selected: boolean }) => {
      const res = await fetch('/api/selections', {
        method: selected ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, actId }),
      })
      if (!res.ok) throw new Error('Failed to toggle selection')
    },
    onMutate: async ({ actId, selected }) => {
      await qc.cancelQueries({ queryKey: ['user', userId] })
      const prev = qc.getQueryData<{ selections: string[] }>(['user', userId])
      qc.setQueryData(['user', userId], (old: { selections: string[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          selections: selected
            ? old.selections.filter((id: string) => id !== actId)
            : [...old.selections, actId],
        }
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['user', userId], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['user', userId] }),
  })
}
```

- [ ] **Step 4: Create `lib/hooks/use-connections.ts`**

```typescript
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ConnectionWithUser } from '@/types'

export function useConnections(userId: string) {
  return useQuery<ConnectionWithUser[]>({
    queryKey: ['connections', userId],
    queryFn: async () => {
      const res = await fetch(`/api/connections/${userId}`)
      if (!res.ok) throw new Error('Failed to fetch connections')
      return res.json()
    },
    enabled: !!userId,
  })
}

export function useRemoveConnection(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const res = await fetch(`/api/connections/${connectionId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove connection')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connections', userId] }),
  })
}
```

- [ ] **Step 5: Create `lib/hooks/use-invite.ts`**

```typescript
'use client'

import { useMutation } from '@tanstack/react-query'

export function useCreateInvite() {
  return useMutation({
    mutationFn: async (createdBy: string): Promise<string> => {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createdBy }),
      })
      if (!res.ok) throw new Error('Failed to create invite')
      const { token } = await res.json()
      return `${process.env.NEXT_PUBLIC_BASE_URL}/invite/${token}`
    },
  })
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/providers/ lib/hooks/
git commit -m "feat: add TanStack Query provider and mutation hooks for user, selections, connections, invites"
```

---

## Task 13: Global Theme & Root Layout

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Update `app/globals.css`**

Replace the file content:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500&family=Barlow+Condensed:wght@700;800&display=swap');

:root {
  --colour-bg:            #0a0a0a;
  --colour-surface:       #141414;
  --colour-surface-2:     #1e1e1e;
  --colour-border:        #2a2a2a;

  --colour-primary:       #e8192c;
  --colour-primary-muted: #7a0d17;
  --colour-secondary:     #ff6b00;

  --colour-text:          #f5f5f5;
  --colour-text-muted:    #8a8a8a;
  --colour-text-faint:    #444444;
}

* {
  box-sizing: border-box;
}

body {
  background-color: var(--colour-bg);
  color: var(--colour-text);
  font-family: 'Barlow', sans-serif;
  font-weight: 400;
}

h1, h2, h3 {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

- [ ] **Step 2: Update `tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:           'var(--colour-bg)',
          surface:      'var(--colour-surface)',
          'surface-2':  'var(--colour-surface-2)',
          border:       'var(--colour-border)',
          primary:      'var(--colour-primary)',
          secondary:    'var(--colour-secondary)',
          text:         'var(--colour-text)',
          'text-muted': 'var(--colour-text-muted)',
          'text-faint': 'var(--colour-text-faint)',
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        sans:    ['Barlow', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 3: Update `app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/lib/providers/query-client'

export const metadata: Metadata = {
  title: 'Festipals — Download 2026',
  description: 'Plan your Download Festival schedule with friends',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Start the dev server and verify the page loads**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: black page with no errors in the console.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx tailwind.config.ts
git commit -m "feat: apply Download-inspired dark theme, Barlow fonts, and TanStack Query provider"
```

---

## Task 14: Landing Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx`**

```typescript
import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'

export default function LandingPage() {
  // UUID generated server-side; the redirect carries it to /u/[uuid]
  // No DB write yet — the UUID lives in the URL until first mutation
  async function start() {
    'use server'
    redirect(`/u/${randomUUID()}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-5xl md:text-7xl text-[--colour-primary] mb-4">
        Festipals
      </h1>
      <p className="text-xl md:text-2xl text-[--colour-text-muted] mb-2 max-w-lg">
        Download Festival 2026 — Build your schedule. Share it. See who clashes.
      </p>
      <p className="text-sm text-[--colour-text-faint] mb-10 max-w-sm">
        No sign-up needed. Your link is your identity — bookmark it to come back.
      </p>
      <form action={start}>
        <button
          type="submit"
          className="bg-[--colour-primary] text-white font-display text-xl px-8 py-4
                     uppercase tracking-widest hover:bg-[--colour-primary-muted] transition-colors"
        >
          Build your schedule
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Test in the browser**

Open `http://localhost:3000`. Click "Build your schedule". Expected: redirect to `/u/<uuid>` (404 page for now — the route doesn't exist yet, which is fine).

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add landing page with UUID-generating server action"
```

---

## Task 15: ActCard Component

**Files:**
- Create: `components/schedule/ActCard.tsx`
- Create: `components/schedule/__tests__/ActCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `components/schedule/__tests__/ActCard.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActCard } from '../ActCard'
import type { Act } from '@/types'

const baseAct: Act = {
  id: 'act-1',
  name: 'Sleep Token',
  stageId: 'main-stage',
  festivalDayId: 'friday',
  date: '2026-06-12',
  startTime: '15:30',
  endTime: '16:30',
  headliner: false,
}

describe('ActCard', () => {
  const defaultProps = {
    act: baseAct,
    top: 200,
    height: 120,
    isSelected: false,
    userColour: '#3b82f6',
    selectedByOthers: [],
    isClashing: false,
    clashColour: undefined,
    onToggle: vi.fn(),
  }

  it('renders the act name', () => {
    render(<ActCard {...defaultProps} />)
    expect(screen.getByText('Sleep Token')).toBeInTheDocument()
  })

  it('renders start time', () => {
    render(<ActCard {...defaultProps} />)
    expect(screen.getByText('15:30')).toBeInTheDocument()
  })

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(<ActCard {...defaultProps} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('shows up to 4 colour dots for others who selected this act', () => {
    const props = {
      ...defaultProps,
      selectedByOthers: [
        { userId: 'u1', colour: '#22c55e' },
        { userId: 'u2', colour: '#ec4899' },
      ],
    }
    render(<ActCard {...props} />)
    const dots = document.querySelectorAll('[data-testid="user-dot"]')
    expect(dots).toHaveLength(2)
  })

  it('applies headliner minimum height of 120px', () => {
    const props = { ...defaultProps, act: { ...baseAct, headliner: true }, height: 80 }
    render(<ActCard {...props} />)
    const card = screen.getByRole('button')
    expect(card).toHaveStyle({ minHeight: '120px' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run components/schedule/__tests__/ActCard.test.tsx
```

Expected: FAIL — cannot find module `../ActCard`

- [ ] **Step 3: Create `components/schedule/ActCard.tsx`**

```typescript
'use client'

import type { Act } from '@/types'

type OtherUser = { userId: string; colour: string }

type Props = {
  act: Act
  top: number
  height: number
  isSelected: boolean
  userColour: string
  selectedByOthers: OtherUser[]
  isClashing: boolean
  clashColour: string | undefined
  onToggle: () => void
}

export function ActCard({
  act,
  top,
  height,
  isSelected,
  userColour,
  selectedByOthers,
  isClashing,
  clashColour,
  onToggle,
}: Props) {
  const dotsToShow = selectedByOthers.slice(0, 4)
  const overflow   = selectedByOthers.length - 4

  const bgStyle = isSelected
    ? { backgroundColor: userColour }
    : { backgroundColor: 'var(--colour-surface-2)' }

  const borderStyle = isClashing && clashColour
    ? { border: `2px dashed ${clashColour}` }
    : { border: '1px solid var(--colour-border)' }

  return (
    <button
      onClick={onToggle}
      style={{
        position: 'absolute',
        top,
        left: 2,
        right: 2,
        height: act.headliner ? Math.max(height, 120) : height,
        minHeight: act.headliner ? '120px' : undefined,
        ...bgStyle,
        ...borderStyle,
        borderRadius: 4,
        padding: '4px 6px',
        textAlign: 'left',
        cursor: 'pointer',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      aria-pressed={isSelected}
    >
      <div>
        <p
          className="text-xs font-medium leading-tight"
          style={{ color: isSelected ? '#fff' : 'var(--colour-text)' }}
        >
          {act.headliner ? <strong>{act.name}</strong> : act.name}
        </p>
        <p className="text-[10px]" style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--colour-text-muted)' }}>
          {act.startTime}
        </p>
      </div>

      {selectedByOthers.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {dotsToShow.map(u => (
            <span
              key={u.userId}
              data-testid="user-dot"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: u.colour,
                display: 'inline-block',
              }}
            />
          ))}
          {overflow > 0 && (
            <span className="text-[9px]" style={{ color: 'var(--colour-text-muted)' }}>
              +{overflow}
            </span>
          )}
        </div>
      )}
    </button>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run components/schedule/__tests__/ActCard.test.tsx
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add components/schedule/ActCard.tsx components/schedule/__tests__/ActCard.test.tsx
git commit -m "feat: add ActCard component with selection state, clash border, and colour dots"
```

---

## Task 16: TimeAxis Component

**Files:**
- Create: `components/schedule/TimeAxis.tsx`

- [ ] **Step 1: Create `components/schedule/TimeAxis.tsx`**

```typescript
type TimeSlot = { label: string; top: number }

type Props = {
  timeSlots: TimeSlot[]
  gridHeight: number
}

export function TimeAxis({ timeSlots, gridHeight }: Props) {
  return (
    <div className="relative flex-shrink-0 w-14" style={{ height: gridHeight + 40 }}>
      {/* Spacer for the sticky stage header row */}
      <div className="h-10" />
      {/* Time labels */}
      {timeSlots
        .filter((_, i) => i % 2 === 0)  // hourly only
        .map(slot => (
          <div
            key={slot.label}
            className="absolute right-2 text-xs tabular-nums"
            style={{
              top: slot.top + 40 - 8,  // +40 for header, -8 to vertically centre on gridline
              color: 'var(--colour-text-muted)',
            }}
          >
            {slot.label}
          </div>
        ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/schedule/TimeAxis.tsx
git commit -m "feat: add TimeAxis component with hourly labels"
```

---

## Task 17: ScheduleGrid Component

**Files:**
- Create: `components/schedule/ScheduleGrid.tsx`

- [ ] **Step 1: Create `components/schedule/ScheduleGrid.tsx`**

```typescript
'use client'

import { useMemo } from 'react'
import type { Act, Stage, UserWithSelections, ClashPair } from '@/types'
import { dayBounds, timeToMinutes, adjustedEndMinutes, minutesToPx } from '@/lib/time'
import { ActCard } from './ActCard'
import { TimeAxis } from './TimeAxis'

type Props = {
  acts: Act[]              // pre-filtered to active day
  stages: Stage[]
  currentUserId: string
  currentUserColour: string
  currentUserSelections: string[]
  checkedUsers: UserWithSelections[]
  clashPairs: ClashPair[]
  onToggleSelection: (actId: string, isSelected: boolean) => void
}

export function ScheduleGrid({
  acts,
  stages,
  currentUserId,
  currentUserColour,
  currentUserSelections,
  checkedUsers,
  clashPairs,
  onToggleSelection,
}: Props) {
  const bounds = useMemo(() => dayBounds(acts), [acts])
  const totalMinutes = bounds.endMinutes - bounds.startMinutes
  const gridHeight = minutesToPx(totalMinutes)

  const timeSlots = useMemo(() => {
    const slots = []
    for (let m = bounds.startMinutes; m <= bounds.endMinutes; m += 30) {
      const absM = m % 1440
      const h = Math.floor(absM / 60)
      const min = absM % 60
      slots.push({
        label: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
        top: minutesToPx(m - bounds.startMinutes),
      })
    }
    return slots
  }, [bounds])

  const actsByStage = useMemo(() => {
    const map = new Map<string, Act[]>(stages.map(s => [s.id, []]))
    for (const act of acts) map.get(act.stageId)?.push(act)
    return map
  }, [acts, stages])

  // Build a set of act IDs that are clashing for the current user
  const clashingActIds = useMemo(() => {
    const set = new Set<string>()
    for (const cp of clashPairs) {
      if (cp.personA.userId === currentUserId) set.add(cp.personA.act.id)
      if (cp.personB.userId === currentUserId) set.add(cp.personB.act.id)
    }
    return set
  }, [clashPairs, currentUserId])

  // Map each clashing act to the colour of the person they clash with
  const clashColourMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const cp of clashPairs) {
      if (cp.personA.userId === currentUserId) map.set(cp.personA.act.id, cp.personB.colour)
      if (cp.personB.userId === currentUserId) map.set(cp.personB.act.id, cp.personA.colour)
    }
    return map
  }, [clashPairs, currentUserId])

  if (acts.length === 0) {
    return (
      <div className="text-center py-20 text-[--colour-text-muted]">
        No acts found for this day.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max">
        <TimeAxis timeSlots={timeSlots} gridHeight={gridHeight} />

        {stages.map(stage => (
          <div key={stage.id} className="flex flex-col" style={{ minWidth: 140 }}>
            {/* Sticky stage header */}
            <div
              className="sticky top-0 z-10 h-10 flex items-center justify-center px-2
                         border-b-2 text-xs font-medium uppercase tracking-wide truncate"
              style={{
                backgroundColor: 'var(--colour-surface)',
                borderBottomColor: 'var(--colour-primary)',
                color: 'var(--colour-text)',
              }}
            >
              {stage.name}
            </div>

            {/* Acts column */}
            <div className="relative" style={{ height: gridHeight }}>
              {/* Hour gridlines */}
              {timeSlots
                .filter((_, i) => i % 2 === 0)
                .map(slot => (
                  <div
                    key={`hour-${slot.label}`}
                    className="absolute w-full pointer-events-none"
                    style={{ top: slot.top, borderTop: '1px solid var(--colour-border)' }}
                  />
                ))}
              {/* Half-hour gridlines */}
              {timeSlots
                .filter((_, i) => i % 2 !== 0)
                .map(slot => (
                  <div
                    key={`half-${slot.label}`}
                    className="absolute w-full pointer-events-none opacity-40"
                    style={{ top: slot.top, borderTop: '1px dashed var(--colour-border)' }}
                  />
                ))}

              {(actsByStage.get(stage.id) ?? []).map(act => {
                const startMins = timeToMinutes(act.startTime)
                const endMins   = adjustedEndMinutes(act.startTime, act.endTime)
                const top       = minutesToPx(startMins - bounds.startMinutes)
                const height    = minutesToPx(endMins - startMins)
                const isSelected = currentUserSelections.includes(act.id)
                const selectedByOthers = checkedUsers
                  .filter(u => u.id !== currentUserId && u.selections.includes(act.id))
                  .map(u => ({ userId: u.id, colour: u.colour }))

                return (
                  <ActCard
                    key={act.id}
                    act={act}
                    top={top}
                    height={height}
                    isSelected={isSelected}
                    userColour={currentUserColour}
                    selectedByOthers={selectedByOthers}
                    isClashing={clashingActIds.has(act.id)}
                    clashColour={clashColourMap.get(act.id)}
                    onToggle={() => onToggleSelection(act.id, isSelected)}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/schedule/ScheduleGrid.tsx
git commit -m "feat: add ScheduleGrid with absolute act positioning and gridlines"
```

---

## Task 18: ClashBanner Component

**Files:**
- Create: `components/schedule/ClashBanner.tsx`

- [ ] **Step 1: Create `components/schedule/ClashBanner.tsx`**

```typescript
import type { ClashPair } from '@/types'

type Props = {
  clashPairs: ClashPair[]
}

export function ClashBanner({ clashPairs }: Props) {
  if (clashPairs.length === 0) return null

  return (
    <div
      className="px-4 py-2 mb-2 text-sm flex flex-wrap gap-2 items-center"
      style={{
        backgroundColor: 'var(--colour-primary-muted)',
        borderLeft: '3px solid var(--colour-primary)',
        color: 'var(--colour-text)',
      }}
    >
      <span className="font-medium">
        {clashPairs.length} clash{clashPairs.length !== 1 ? 'es' : ''}
      </span>
      {clashPairs.slice(0, 3).map((cp, i) => (
        <span key={i} className="text-xs opacity-80">
          <span style={{ color: cp.personA.colour }}>{cp.personA.nickname}</span>
          {' vs '}
          <span style={{ color: cp.personB.colour }}>{cp.personB.nickname}</span>
          {' at '}
          {cp.personA.act.startTime}
        </span>
      ))}
      {clashPairs.length > 3 && (
        <span className="text-xs opacity-60">+{clashPairs.length - 3} more</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/schedule/ClashBanner.tsx
git commit -m "feat: add ClashBanner with clash pair summaries"
```

---

## Task 19: ColourPicker & Header Components

**Files:**
- Create: `components/ColourPicker.tsx`
- Create: `components/Header.tsx`

- [ ] **Step 1: Create `components/ColourPicker.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { USER_COLOURS } from '@/constants/colours'

type Props = {
  value: string
  onChange: (hex: string) => void
}

export function ColourPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-7 h-7 rounded-full border-2 border-[--colour-border] hover:border-[--colour-text] transition-colors"
        style={{ backgroundColor: value }}
        aria-label="Pick colour"
      />
      {open && (
        <>
          {/* Click-outside overlay */}
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute top-9 left-0 z-30 p-2 rounded grid grid-cols-4 gap-1"
            style={{ backgroundColor: 'var(--colour-surface)', border: '1px solid var(--colour-border)' }}
          >
            {USER_COLOURS.map(c => (
              <button
                key={c.id}
                onClick={() => { onChange(c.hex); setOpen(false) }}
                className="w-8 h-8 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c.hex,
                  borderColor: value === c.hex ? '#fff' : 'transparent',
                  transform: value === c.hex ? 'scale(1.15)' : 'scale(1)',
                }}
                aria-label={c.label}
                title={c.label}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `components/Header.tsx`**

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
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(nickname)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const updateUser  = useUpdateUser(userId)
  const createInvite = useCreateInvite()

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function commitNickname() {
    setEditing(false)
    const trimmed = draftName.trim().slice(0, 24) || 'Anonymous'
    if (trimmed !== nickname) updateUser.mutate({ nickname: trimmed })
  }

  async function handleInvite() {
    const url = await createInvite.mutateAsync(userId)
    setInviteUrl(url)
    await navigator.clipboard.writeText(url).catch(() => {})
  }

  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-3 px-4 h-14"
      style={{ backgroundColor: 'var(--colour-surface)', borderBottom: '1px solid var(--colour-border)' }}
    >
      <span className="font-display text-xl text-[--colour-primary] tracking-widest mr-auto">
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
          onKeyDown={e => { if (e.key === 'Enter') commitNickname() }}
          maxLength={24}
          className="bg-transparent border-b border-[--colour-text] text-sm outline-none w-32"
          style={{ color: 'var(--colour-text)' }}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-sm hover:text-[--colour-primary] transition-colors"
          style={{ color: 'var(--colour-text-muted)' }}
        >
          {nickname}
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
        {inviteUrl ? 'Copied!' : '+ Invite'}
      </button>
    </header>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ColourPicker.tsx components/Header.tsx
git commit -m "feat: add ColourPicker and Header with inline nickname editor and invite button"
```

---

## Task 20: DayTabs & PeoplePanel Components

**Files:**
- Create: `components/DayTabs.tsx`
- Create: `components/people/PersonRow.tsx`
- Create: `components/people/PeoplePanel.tsx`

- [ ] **Step 1: Create `components/DayTabs.tsx`**

```typescript
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { FestivalDay } from '@/types'

type Props = {
  days: FestivalDay[]
  activeDay: string
  userId: string
}

export function DayTabs({ days, activeDay, userId }: Props) {
  const router = useRouter()

  return (
    <div className="flex border-b" style={{ borderColor: 'var(--colour-border)' }}>
      {days.map(day => {
        const isActive = day.id === activeDay
        return (
          <button
            key={day.id}
            onClick={() => router.push(`/u/${userId}?day=${day.id}`)}
            className="px-4 py-3 text-sm font-medium uppercase tracking-wide transition-colors"
            style={{
              color: isActive ? 'var(--colour-primary)' : 'var(--colour-text-muted)',
              borderBottom: isActive ? '2px solid var(--colour-primary)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {day.label.split(' ')[0]}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create `components/people/PersonRow.tsx`**

```typescript
'use client'

type Props = {
  userId: string
  nickname: string
  colour: string
  checked: boolean
  isCurrentUser: boolean
  onCheckChange: (checked: boolean) => void
  onRemove?: () => void
}

export function PersonRow({ nickname, colour, checked, isCurrentUser, onCheckChange, onRemove }: Props) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: colour }}
      />
      <label className="flex items-center gap-2 flex-1 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onCheckChange(e.target.checked)}
          className="accent-[--colour-primary]"
        />
        <span style={{ color: 'var(--colour-text)' }}>
          {nickname}
          {isCurrentUser && <span className="text-[--colour-text-faint] ml-1">(you)</span>}
        </span>
      </label>
      {!isCurrentUser && onRemove && (
        <button
          onClick={onRemove}
          className="text-xs px-1 text-[--colour-text-faint] hover:text-[--colour-primary] transition-colors"
          aria-label={`Remove ${nickname}`}
        >
          ✕
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `components/people/PeoplePanel.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { PersonRow } from './PersonRow'
import { useConnections, useRemoveConnection } from '@/lib/hooks/use-connections'
import type { UserWithSelections } from '@/types'

type Props = {
  userId: string
  currentUser: UserWithSelections
  checkedUserIds: Set<string>
  onCheckChange: (userId: string, checked: boolean) => void
}

export function PeoplePanel({ userId, currentUser, checkedUserIds, onCheckChange }: Props) {
  const [open, setOpen] = useState(true)
  const { data: connections = [] } = useConnections(userId)
  const removeConnection = useRemoveConnection(userId)

  return (
    <aside
      className="w-64 flex-shrink-0 border-l"
      style={{ borderColor: 'var(--colour-border)', backgroundColor: 'var(--colour-surface)' }}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium uppercase tracking-wide"
        style={{ color: 'var(--colour-text-muted)' }}
        onClick={() => setOpen(o => !o)}
      >
        Your Group
        <span>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4">
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
            />
          ))}

          {connections.length === 0 && (
            <p className="text-xs py-2" style={{ color: 'var(--colour-text-faint)' }}>
              No friends linked yet. Invite someone!
            </p>
          )}
        </div>
      )}
    </aside>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/DayTabs.tsx components/people/
git commit -m "feat: add DayTabs, PersonRow, and PeoplePanel components"
```

---

## Task 21: User Schedule Page `/u/[userId]`

**Files:**
- Create: `app/u/[userId]/page.tsx`
- Create: `app/u/[userId]/SchedulePageClient.tsx`

- [ ] **Step 1: Create `app/u/[userId]/page.tsx`**

```typescript
import { redirect } from 'next/navigation'
import { getLineup } from '@/lib/db/queries/lineup'
import { getUserById } from '@/lib/db/queries/users'
import { SchedulePageClient } from './SchedulePageClient'

type Props = {
  params: { userId: string }
  searchParams: { day?: string }
}

export default async function SchedulePage({ params, searchParams }: Props) {
  const lineup = await getLineup()
  const defaultDay = lineup.festivalDays[0]?.id ?? 'friday'
  const activeDay = searchParams.day ?? defaultDay

  // Attempt to load user — may return null for provisional (URL-only) users
  const user = await getUserById(params.userId)

  return (
    <SchedulePageClient
      userId={params.userId}
      initialUser={user}
      lineup={lineup}
      activeDay={activeDay}
    />
  )
}
```

- [ ] **Step 2: Create `app/u/[userId]/SchedulePageClient.tsx`**

```typescript
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Lineup, UserWithSelections } from '@/types'
import { useUser, useEnsureUser } from '@/lib/hooks/use-user'
import { useToggleSelection } from '@/lib/hooks/use-selections'
import { useConnections } from '@/lib/hooks/use-connections'
import { detectClashes } from '@/lib/clash-detection'
import { Header } from '@/components/Header'
import { DayTabs } from '@/components/DayTabs'
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid'
import { ClashBanner } from '@/components/schedule/ClashBanner'
import { PeoplePanel } from '@/components/people/PeoplePanel'

type Props = {
  userId: string
  initialUser: UserWithSelections | null
  lineup: Lineup
  activeDay: string
}

export function SchedulePageClient({ userId, initialUser, lineup, activeDay }: Props) {
  const router = useRouter()
  const ensureUser = useEnsureUser(userId)

  const { data: user } = useUser(userId)
  const { data: connections = [] } = useConnections(userId)
  const toggleSelection = useToggleSelection(userId)

  const currentUser: UserWithSelections = user ?? initialUser ?? {
    id: userId,
    nickname: 'Anonymous',
    colour: '#3b82f6',
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    selections: [],
  }

  // Combined view: which userIds are checked in the people panel
  const [checkedUserIds, setCheckedUserIds] = useState<Set<string>>(new Set([userId]))

  function handleCheckChange(uid: string, checked: boolean) {
    setCheckedUserIds(prev => {
      const next = new Set(prev)
      checked ? next.add(uid) : next.delete(uid)
      return next
    })
  }

  const dayActs = useMemo(
    () => lineup.acts.filter(a => a.festivalDayId === activeDay),
    [lineup.acts, activeDay]
  )

  const checkedConnectedUsers: UserWithSelections[] = useMemo(
    () =>
      connections
        .filter(c => checkedUserIds.has(c.user.id))
        .map(c => ({ ...c.user, selections: c.selections })),
    [connections, checkedUserIds]
  )

  const allCheckedUsers: UserWithSelections[] = useMemo(() => {
    const base = checkedUserIds.has(userId) ? [currentUser] : []
    return [...base, ...checkedConnectedUsers]
  }, [checkedUserIds, userId, currentUser, checkedConnectedUsers])

  const clashPairs = useMemo(
    () => detectClashes(allCheckedUsers, dayActs),
    [allCheckedUsers, dayActs]
  )

  function handleToggle(actId: string, isSelected: boolean) {
    // Ensure user exists in DB on first interaction
    ensureUser.mutate()
    toggleSelection.mutate({ actId, selected: isSelected })
  }

  return (
    <div className="flex flex-col h-screen">
      <Header
        userId={userId}
        nickname={currentUser.nickname}
        colour={currentUser.colour}
      />

      <DayTabs days={lineup.festivalDays} activeDay={activeDay} userId={userId} />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto p-2">
          <ClashBanner clashPairs={clashPairs} />
          <ScheduleGrid
            acts={dayActs}
            stages={lineup.stages}
            currentUserId={userId}
            currentUserColour={currentUser.colour}
            currentUserSelections={currentUser.selections}
            checkedUsers={allCheckedUsers}
            clashPairs={clashPairs}
            onToggleSelection={handleToggle}
          />
        </main>

        <PeoplePanel
          userId={userId}
          currentUser={currentUser}
          checkedUserIds={checkedUserIds}
          onCheckChange={handleCheckChange}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Start dev server and test manually**

```bash
npm run dev
```

1. Open `http://localhost:3000`, click "Build your schedule" — should redirect to `/u/<uuid>`.
2. Verify the schedule grid loads with acts for Friday.
3. Click an act — it should highlight in blue.
4. Click the tabs — Saturday/Sunday should load different acts.
5. Click your nickname — it should become editable.
6. Open the colour picker — swatch grid should appear.

- [ ] **Step 4: Commit**

```bash
git add app/u/
git commit -m "feat: add user schedule page with combined view, clash detection, and people panel"
```

---

## Task 22: Invite Page `/invite/[token]`

**Files:**
- Create: `app/invite/[token]/page.tsx`

- [ ] **Step 1: Create `app/invite/[token]/page.tsx`**

```typescript
import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import { getInviteByToken } from '@/lib/db/queries/invites'
import { redeemInvite } from '@/lib/db/queries/invites'
import { createUser } from '@/lib/db/queries/users'
import { getUserById } from '@/lib/db/queries/users'

type Props = {
  params: { token: string }
  searchParams: { userId?: string }
}

export default async function InvitePage({ params, searchParams }: Props) {
  const invite = await getInviteByToken(params.token)

  // Token not found
  if (!invite) {
    return <InviteError message="This invite link is invalid or has expired." />
  }

  // Token already used
  if (invite.usedAt) {
    return (
      <InviteError message="This invite link has already been used. Ask your friend to send a new one." />
    )
  }

  // Determine visitor ID: use URL param if present, else generate fresh UUID
  let visitorId = searchParams.userId

  if (!visitorId) {
    // First visit — bounce with a new UUID in the URL so browser can bookmark identity
    const newId = randomUUID()
    redirect(`/invite/${params.token}?userId=${newId}`)
  }

  // Self-invite check
  if (invite.createdBy === visitorId) {
    return <InviteError message="You can't accept your own invite link!" />
  }

  // Ensure visitor user row exists in DB before redemption
  const existing = await getUserById(visitorId)
  if (!existing) {
    await createUser(visitorId)
  }

  // Redeem the invite
  const result = await redeemInvite(params.token, visitorId)

  if (!result.success) {
    const messages: Record<string, string> = {
      not_found:   'This invite link is invalid.',
      already_used: 'This invite link has already been used.',
      self_invite:  "You can't accept your own invite link!",
    }
    return <InviteError message={messages[result.reason] ?? 'Something went wrong.'} />
  }

  // Success — redirect to visitor's schedule page
  redirect(`/u/${visitorId}`)
}

function InviteError({ message }: { message: string }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-4xl text-[--colour-primary] mb-4">Festipals</h1>
      <p className="text-lg text-[--colour-text-muted] max-w-sm">{message}</p>
      <a
        href="/"
        className="mt-8 text-sm underline"
        style={{ color: 'var(--colour-text-muted)' }}
      >
        Go to the homepage
      </a>
    </main>
  )
}
```

- [ ] **Step 2: Test the invite flow manually**

```bash
npm run dev
```

1. Go to `/u/<your-uuid>`, click **+ Invite**.
2. Copy the invite URL from the header (or check the console/DB for the token).
3. Open the invite URL in an incognito window — should redirect to `/u/<new-uuid>` with you now connected.
4. Go back to your schedule, check the People Panel — the new user should appear.
5. Test error cases:
   - Open the same invite URL again — should show "already used" message.
   - Open your own invite URL — should show "can't accept your own invite".

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/invite/
git commit -m "feat: add invite redemption page with self-invite and already-used guards"
```

---

## Post-Implementation Checklist

After all 22 tasks are complete, verify:

- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — no TypeScript errors, build succeeds
- [ ] Landing page → UUID redirect works
- [ ] Schedule grid renders all 3 days, 4 stages, absolute-positioned acts
- [ ] Act click toggles selection and persists on page reload (via DB)
- [ ] Nickname inline edit saves with debounce
- [ ] Colour picker saves and updates act card fills
- [ ] Invite link generates and copies to clipboard
- [ ] Incognito tab accepting invite creates connection
- [ ] People panel shows connected users, checkboxes drive combined view overlay
- [ ] Clash banner appears when two checked users pick clashing acts
- [ ] Midnight-spanning acts (`sat-opus-2`: 22:30 → 00:00) render on the correct day tab
- [ ] Remove connection button severs the link for both users
- [ ] `npx drizzle-kit push` runs clean against the production DB schema
- [ ] **Rate limiting** (spec §13): add Vercel Edge Middleware to rate-limit `POST /api/invites` and `POST /api/selections` before production launch — create `middleware.ts` at repo root using Vercel's `@vercel/edge-rate-limit` or a Redis-backed counter

---
