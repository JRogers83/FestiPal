# Download Festival 2026 — Lineup Collaboration App
## Technical Specification v0.2

---

## 1. Project Overview

A web application that lets Download Festival attendees build their personal act schedule, share it with friends, and view combined schedules — all without accounts or sign-up. Identity is anonymous, persistent per device via a URL-embedded UUID, and linked between people via invite tokens.

**Core UX loop:**
1. User arrives → UUID generated → stored in DB + URL
2. User sets a nickname and picks a colour
3. User browses the schedule and selects acts they want to see
4. User shares a link → friend opens it → both are now linked
5. Either person can view a combined schedule showing both sets of choices

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | Vercel-native, RSC for fast initial load |
| Styling | Tailwind CSS | Utility-first, good for dynamic colour handling |
| UI Components | shadcn/ui | Accessible, unstyled-first, easy to customise |
| Schedule View | Custom CSS Grid component | Full control over multi-colour overlays and clash logic |
| Database | Neon (PostgreSQL) | Serverless Postgres, Vercel integration |
| ORM | Drizzle ORM | Lightweight, type-safe, plays well with Neon |
| Deployment | Vercel | |
| Lineup Data | Static JSON → DB seed | Operator-supplied JSON, seeded into DB on deploy |

---

## 3. Data Model

### 3.1 Lineup Tables (seeded, read-only at runtime)

#### `festival_days`

```sql
CREATE TABLE festival_days (
  id      TEXT PRIMARY KEY,          -- e.g. "friday"
  label   TEXT NOT NULL,             -- e.g. "Friday 12 June"
  date    DATE NOT NULL,             -- e.g. 2026-06-12
  ordinal SMALLINT NOT NULL          -- 1, 2, 3 for sort order
);
```

- Decoupled from `acts` via FK so future years or additional days require only a data change
- `id` is a stable slug used throughout the codebase

#### `stages`

```sql
CREATE TABLE stages (
  id      TEXT PRIMARY KEY,          -- e.g. "main-stage"
  name    TEXT NOT NULL,             -- e.g. "Main Stage"
  ordinal SMALLINT NOT NULL          -- display order left-to-right in schedule view
);
```

#### `acts`

```sql
CREATE TABLE acts (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  stage_id        TEXT NOT NULL REFERENCES stages(id),
  festival_day_id TEXT NOT NULL REFERENCES festival_days(id),
  date            DATE NOT NULL,     -- physical calendar date the act starts
  start_time      TIME NOT NULL,     -- 24h, e.g. 23:30
  end_time        TIME NOT NULL,     -- 24h — if < start_time, act spans midnight
  headliner       BOOLEAN NOT NULL DEFAULT false
);
```

**On the midnight-span pattern:**

`festival_day_id` is the explicit grouping key — a 02:00 act tagged to `saturday` always renders in the Saturday tab regardless of clock date. The `date` field holds the physical calendar date the act starts. The schedule renderer treats any `end_time < start_time` as `end_time + 24h` for positioning arithmetic only.

### 3.2 User Tables

#### `users`

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname    TEXT NOT NULL DEFAULT 'Anonymous',
  colour      TEXT NOT NULL DEFAULT '#3b82f6',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `selections`

```sql
CREATE TABLE selections (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  act_id     TEXT NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, act_id)
);
```

#### `invite_tokens`

```sql
CREATE TABLE invite_tokens (
  token       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at     TIMESTAMPTZ,
  used_by     UUID REFERENCES users(id)
);
```

Single-use: once redeemed, `used_at` and `used_by` are set.

#### `connections`

```sql
CREATE TABLE connections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)
);
```

- Fully symmetric — one row represents a bidirectional link
- Queries use `WHERE user_a = $id OR user_b = $id`
- Deleting the row severs the connection for both parties

---

## 4. Lineup Data & Seeding

### 4.1 Source JSON Format

Stored at `/data/lineup-2026.json`. Operator-supplied before first deploy.

```ts
type LineupSeed = {
  festivalDays: {
    id: string;            // "friday"
    label: string;         // "Friday 12 June"
    date: string;          // "2026-06-12"
    ordinal: number;       // 1
  }[];
  stages: {
    id: string;            // "main-stage"
    name: string;          // "Main Stage"
    ordinal: number;       // 1
  }[];
  acts: {
    id: string;            // "bmth-saturday"
    name: string;          // "Bring Me The Horizon"
    stageId: string;
    festivalDayId: string; // ALWAYS explicit — never derived from date/time
    date: string;          // "2026-06-13" — physical calendar date of start
    startTime: string;     // "22:30"
    endTime: string;       // "00:00" — if < startTime, act spans midnight
    headliner?: boolean;
  }[];
};
```

### 4.2 Seeding Mechanism

Seed script at `/scripts/seed-lineup.ts` reads the JSON and upserts into all three lineup tables.

```bash
npx tsx scripts/seed-lineup.ts
```

- Uses `INSERT ... ON CONFLICT DO UPDATE` — idempotent and safe to re-run
- Run order: `festival_days` → `stages` → `acts` (respects FK dependencies)
- Can be prepended to the Vercel build command if lineup may change pre-launch: `npm run seed && next build`
- At runtime the app reads lineup from DB only — the JSON file is never imported by application code

---

## 5. User Identity & URL Architecture

### URL Structure

| Route | Description |
|---|---|
| `/` | Landing page |
| `/u/[userId]` | User's personal schedule view |
| `/invite/[token]` | Invite redemption page |

### Identity Lifecycle

1. User hits `/` → server generates UUID → redirects to `/u/[uuid]`
2. UUID is embedded in the URL — the user bookmarks or saves it to return
3. On first meaningful action (nickname edit or act selection) the user row is committed to DB
4. Returning users who visit their `/u/[uuid]` URL are recognised and state is loaded

### Provisional Record Handling

- On `/` redirect, UUID is in the URL only — no DB write yet
- DB write occurs on the first mutating API call
- All read routes handle "user not found" gracefully with empty responses

---

## 6. Sharing & Linking

### Generating a Share Link

1. User clicks **Invite someone**
2. `POST /api/invites` → inserts row in `invite_tokens`
3. Returns `https://festipals.live/invite/[token]`
4. UI shows URL with one-click copy button

### Redeeming a Share Link

1. Recipient opens `/invite/[token]`
2. Server validates: token must exist and `used_at IS NULL`
3. If visitor has a userId in their URL: use existing UUID
4. If not: generate UUID, redirect to `/invite/[token]?userId=[newUuid]`, commit user row
5. Insert into `connections` (user_a = min UUID, user_b = max UUID)
6. Mark token used
7. Redirect to `/u/[visitorId]`

### Edge Cases

| Scenario | Handling |
|---|---|
| User opens their own invite link | Detect `created_by == userId`, show friendly error |
| Token already redeemed | Show message; suggest asking sender for a new link |
| Users already connected | Detect before insert, no-op, redirect normally |
| Re-connecting after removal | Allowed — fresh connection row |
| A invites B twice | Second redemption hits the already-connected no-op path |

---

## 7. Feature Specification

### 7.1 Landing Page (`/`)

- Festival-branded hero with app name and one-line description
- Single CTA: **"Build your schedule"** → generates UUID, redirects to `/u/[uuid]`
- Brief explainer of the no-login model ("Your link is your identity — bookmark it")

### 7.2 Personal Schedule Page (`/u/[userId]`)

**Header bar**
- App name / logo (left)
- Nickname (editable inline, debounced PATCH)
- Colour swatch (opens palette picker)
- Invite button (right)

**Day tabs** — Friday / Saturday / Sunday, active day in `?day=` query param

**Schedule view** (see Section 8)

**People panel** — collapsible sidebar on desktop, bottom sheet on mobile

### 7.3 Combined Schedule View

Active when one or more linked users are checked in the people panel.

- All checked users' selections overlaid on the grid
- Clash detection runs client-side
- Clash summary banner displayed above the schedule when clashes exist

### 7.4 People Panel Detail

```
┌──────────────────────────────┐
│  Your Group                  │
│                              │
│  ● You (Jonathan)       —    │  <- cannot remove self
│  ● Alice            □   ✕   │
│  ● Ben              □   ✕   │
│                              │
│  [ + Invite someone ]        │
└──────────────────────────────┘
```

- Checkboxes drive combined view overlay
- User can include/exclude themselves
- Remove: `DELETE /api/connections/[connectionId]` with optimistic UI update

---

## 8. Schedule View Component

### 8.1 Layout Structure

```
         Main Stage    Second Stage    Opus/Dogma    ...
11:00  ┌─────────────┬──────────────┬────────────┐
       │             │   Act A      │            │
12:00  │  Act B      │              │   Act C    │
       │             ├──────────────┤            │
13:00  ├─────────────┤   Act D      ├────────────┤
       ...
```

- Horizontally scrollable on mobile
- Sticky time label column (leftmost) and sticky stage header row (topmost)
- Stage column min-width: 140px desktop / 120px mobile
- Acts absolutely positioned — `top` and `height` derived from time arithmetic
- Vertical scale: **2px per minute** (120px per hour)
- Time bounds per day: `MIN(start_time)` → `MAX(adjusted end_time)` for that `festival_day_id`

### 8.2 Act Card States

| State | Appearance |
|---|---|
| Unselected | Muted background (`#1e1e1e`), white text |
| Selected (self only) | Filled with user's colour |
| Selected by others only | Neutral background, colour dots shown |
| Selected by self + others | User colour fill + colour dots for others |
| Headliner | Enforced min-height 120px, bold name |
| Clashing | Dashed border in the other person's colour |

Click toggles selection via `POST` / `DELETE /api/selections`.

### 8.3 Multi-person Colour Rendering

- Up to 4 colour dots at bottom of card; overflow shown as `+N`
- User's own colour takes background fill priority
- In combined view, act cards show dots for all checked users who selected that act

### 8.4 Clash Detection

Runs client-side when combined view is active.

```ts
type ClashPair = {
  personA: { userId: string; nickname: string; colour: string; act: Act };
  personB: { userId: string; nickname: string; colour: string; act: Act };
};

function detectClashes(users: UserWithSelections[]): ClashPair[]
```

- Acts overlap if: `actA.startTime < actB.adjustedEndTime && actA.adjustedEndTime > actB.startTime`
- Only flagged if acts are on **different stages**
- Clashing cards: dashed border in the other person's colour
- Summary banner: "2 clashes — Alice vs Ben at 21:30" with jump links to time slots

---

## 9. Visual Design & Theming

### 9.1 Brand Colours

Inspired by the Download Festival aesthetic: dark/industrial base, bold red accent.

```css
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
```

### 9.2 User Colour Palette

12 curated colours — vivid, readable against `#1e1e1e`, distinct from brand red/orange.

```ts
const USER_COLOURS = [
  { id: "blue",   hex: "#3b82f6", label: "Blue"   },
  { id: "cyan",   hex: "#06b6d4", label: "Cyan"   },
  { id: "teal",   hex: "#14b8a6", label: "Teal"   },
  { id: "green",  hex: "#22c55e", label: "Green"  },
  { id: "lime",   hex: "#a3e635", label: "Lime"   },
  { id: "yellow", hex: "#eab308", label: "Yellow" },
  { id: "amber",  hex: "#f97316", label: "Amber"  },
  { id: "pink",   hex: "#ec4899", label: "Pink"   },
  { id: "rose",   hex: "#f43f5e", label: "Rose"   },
  { id: "purple", hex: "#8b5cf6", label: "Purple" },
  { id: "violet", hex: "#a855f7", label: "Violet" },
  { id: "white",  hex: "#e5e5e5", label: "White"  },
] as const;
```

- Red and orange excluded to avoid conflict with brand accents
- Colour picker UI: 4×3 grid of swatch buttons
- Default: `#3b82f6` (Blue)

### 9.3 Typography

```
Display / headings:  Barlow Condensed, 700–800 weight, uppercase, letter-spacing 0.05em
Body / UI:           Barlow, 400–500 weight
Source:              Google Fonts
```

Barlow Condensed suits the festival aesthetic without directly referencing the Download wordmark.

### 9.4 Schedule Grid Details

- Act card border-radius: `4px`
- Time labels: `--colour-text-muted`, `font-variant-numeric: tabular-nums`
- Hour gridlines: `1px solid var(--colour-border)`
- Half-hour gridlines: `1px dashed var(--colour-border)` at reduced opacity
- Stage header: sticky top, `background: var(--colour-surface)`, bottom border `--colour-primary`

---

## 10. API Routes

All routes are Next.js Route Handlers under `/app/api/`.

| Method | Route | Description |
|---|---|---|
| GET | `/api/lineup` | Returns all stages, festival days, and acts |
| POST | `/api/users` | Create user on first meaningful action |
| GET | `/api/users/[userId]` | Get user profile and selections |
| PATCH | `/api/users/[userId]` | Update nickname or colour |
| POST | `/api/selections` | Add act selection `{ userId, actId }` |
| DELETE | `/api/selections` | Remove act selection `{ userId, actId }` |
| GET | `/api/connections/[userId]` | List connected users with profiles and selections |
| DELETE | `/api/connections/[connectionId]` | Remove a connection |
| POST | `/api/invites` | Generate invite token `{ createdBy: userId }` |
| GET | `/api/invites/[token]` | Validate token, return creator info |
| POST | `/api/invites/[token]/redeem` | Redeem token `{ userId }` → creates connection |

---

## 11. State Management

- **Server Components** for initial page render
- **TanStack Query** for client-side mutations and cache invalidation
- URL is identity source of truth — no localStorage required
- Active day in `?day=` query param
- Combined view checkbox state: ephemeral `useState`

---

## 12. Project Structure

```
/
├── app/
│   ├── page.tsx
│   ├── u/[userId]/page.tsx
│   ├── invite/[token]/page.tsx
│   └── api/
│       ├── lineup/route.ts
│       ├── users/route.ts
│       ├── users/[userId]/route.ts
│       ├── selections/route.ts
│       ├── connections/[userId]/route.ts
│       ├── connections/[connectionId]/route.ts
│       ├── invites/route.ts
│       ├── invites/[token]/route.ts
│       └── invites/[token]/redeem/route.ts
├── components/
│   ├── schedule/
│   │   ├── ScheduleGrid.tsx
│   │   ├── StageColumn.tsx
│   │   ├── ActCard.tsx
│   │   ├── TimeAxis.tsx
│   │   └── ClashBanner.tsx
│   ├── people/
│   │   ├── PeoplePanel.tsx
│   │   └── PersonRow.tsx
│   ├── ui/                      (shadcn/ui components)
│   └── ColourPicker.tsx
├── lib/
│   ├── db/
│   │   ├── schema.ts
│   │   └── index.ts
│   ├── lineup.ts
│   ├── clash-detection.ts
│   └── time.ts
├── data/
│   └── lineup-2026.json
├── scripts/
│   └── seed-lineup.ts
├── drizzle/migrations/
└── constants/
    └── colours.ts
```

---

## 13. Security & Privacy

- UUID in the URL is the only credential — treat the URL like a password
- No PII stored: nickname (user-supplied), colour (palette value), and act selections only
- Connection consent: both parties must participate — no forced linking
- Rate limiting on invite generation and selections via Vercel Edge Middleware
- `/api/users/[userId]` returns 404 for unknown UUIDs — no user enumeration

---

## 14. Deployment & Environment

```bash
# Environment variables
DATABASE_URL=           # Neon pooled connection string
DATABASE_URL_UNPOOLED=  # Neon direct connection (migrations only)
NEXT_PUBLIC_BASE_URL=   # https://festipals.live
```

**First deploy:**
1. Provision Neon, connect via Vercel integration
2. `drizzle-kit push` to apply schema
3. `npx tsx scripts/seed-lineup.ts` to populate lineup
4. Deploy to Vercel

**Lineup updates:** edit JSON, re-run seed script (idempotent), no redeploy needed unless schema changed.

---

## 15. Nickname Constraints

- Max 24 characters
- Any Unicode permitted (non-Latin scripts, emoji)
- No profanity filter in v1
- Leading/trailing whitespace trimmed
- Empty input falls back to "Anonymous"

---

## 16. Out of Scope (v1)

- Real-time sync (refresh to see others' changes)
- Open Graph preview images
- Admin / moderation interface
- Lineup editing UI
- Native mobile app
- Act ratings, comments, voting
- Monetisation

---

## 17. Open Questions

| # | Question | Status |
|---|---|---|
| 1 | Domain | `festipals.live` ✓ |
| 2 | Acts run past midnight | Confirmed ✓ — grid bounds calculated dynamically per day from lineup data |
