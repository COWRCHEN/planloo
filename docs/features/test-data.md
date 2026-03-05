# Test Data Seed Script

Generates a complete set of test data for local development: four users covering all plan tiers, with realistic events, guests, tasks, and budget items per tier.

## Quick Start

```bash
cd backend

# 1. Generate the SQL file
node scripts/seed-test-data.mjs

# 2. Apply to local D1
npx wrangler d1 execute planloo-db-dev --local --env development --file=seed-data.sql

# 2. Apply to remote D1
npx wrangler d1 execute planloo-db-dev --remote --env development --file=seed-data.sql
```

> **Important:** Run migrations first (`npm run db:migrate:local`) if you haven't already.

Note: On some machines, node isn't on the default PATH — if installed via conda at `C:\Programs\miniconda3\envs\nodejs24\node.exe`, either activate the conda environment first or use the full path:

```bash
C:\Programs\miniconda3\envs\nodejs24\node.exe scripts/seed-test-data.mjs
```



## Test Users

All users share password `password123` and have `emailVerified = true` (no verification step needed to log in).

| Plan | Email | Password | Events | Guests |
|---|---|---|---|---|
| `free` | `free@planloo.dev` | `password123` | 1 | 25 |
| `personal` | `personal@planloo.dev` | `password123` | 3 | 140 |
| `agency` | `agency@planloo.dev` | `password123` | 8 | 665 |
| `enterprise` | `enterprise@planloo.dev` | `password123` | 15 | 1,875 |

## Generated Data

### Users & Auth

Each user gets:
- A row in `user` with a random UUID
- A matching `account` row with `providerId = 'credential'` and a PBKDF2-hashed password (same format as `backend/src/lib/password-pbkdf2.ts`)
- A `subscriptions` row reflecting their plan tier

### Subscriptions

| Plan | Status | Period |
|---|---|---|
| `free` | `free` | NULL (no billing period) |
| `personal` | `active` | now → now + 30 days |
| `agency` | `active` | now → now + 30 days |
| `enterprise` | `active` | now → now + 30 days |

### Events

#### Free Fiona — 1 event

| Event | Type | Status | Days Out | Guests |
|---|---|---|---|---|
| My Birthday Party | birthday | planning | +14 | 25 |

#### Personal Pete — 3 events

| Event | Type | Status | Days Out | Guests |
|---|---|---|---|---|
| Summer BBQ Bash | other | confirmed | +21 | 70 |
| Office Team Retreat | corporate | planning | +60 | 40 |
| Mom's 60th Birthday | birthday | draft | +90 | 30 |

#### Agency Alice — 8 events

| Event | Type | Status | Days Out | Guests |
|---|---|---|---|---|
| Riverside Wedding — Chen & Park | wedding | confirmed | +45 | 120 |
| TechConf 2026 | conference | planning | +75 | 100 |
| Martinez Quinceañera | birthday | confirmed | +30 | 90 |
| Spring Corporate Gala | corporate | planning | +90 | 110 |
| Startup Networking Night | other | draft | +20 | 60 |
| Charity Fundraiser Gala | fundraiser | confirmed | +120 | 80 |
| Johnson Baby Shower | baby_shower | planning | +25 | 35 |
| Product Launch Party | corporate | planning | +55 | 70 |

#### Enterprise Eve — 15 events

| Event | Type | Status | Days Out | Guests |
|---|---|---|---|---|
| Grand Estate Wedding — Williams & Chen | wedding | confirmed | +30 | 150 |
| National Leadership Summit 2026 | conference | planning | +45 | 130 |
| Thompson Corporate Anniversary Gala | corporate | confirmed | +60 | 120 |
| Rodriguez Quinceañera Extravaganza | birthday | planning | +25 | 140 |
| Children's Hospital Charity Gala | fundraiser | confirmed | +75 | 110 |
| Davis & Miller Wedding Celebration | wedding | planning | +90 | 125 |
| Annual Tech Awards Ceremony | corporate | confirmed | +35 | 130 |
| Grand Masquerade Ball | fundraiser | planning | +50 | 100 |
| Executive Leadership Retreat | corporate | planning | +40 | 100 |
| Healthcare Industry Conference | conference | draft | +85 | 120 |
| Anderson Family Reunion | other | planning | +65 | 110 |
| Celebrity Birthday Bash | birthday | confirmed | +15 | 150 |
| Innovation Expo 2026 | conference | planning | +95 | 130 |
| New Year's Eve Grand Gala | corporate | confirmed | +302 | 120 |
| Summer Music Festival Kickoff | other | planning | +120 | 140 |

### Guests

Per-event count varies by tier (25–150). Each guest has:
- Random first + last name drawn from pools of 100 first/last names (unique per event)
- Email in format `firstname.lastnameN@example.com`
- RSVP status randomly assigned: `pending`, `invited`, `confirmed`, `declined`, or `maybe`
- Plus-ones allowed: 0, 1, or 2 (random)
- Event ID resolved via subquery on the event's UUID (safe even with existing data)

### Tasks

Tasks are drawn from templates keyed by event type (up to 10 tasks available per type). Each tier slices a different number:

| Tier | Tasks per event |
|---|---|
| free | 4 |
| personal | 6 |
| agency | 8 |
| enterprise | 10 |

Task templates cover categories: **Venue**, **Catering**, **Logistics**, **Decor**, **Admin** — with a realistic mix of `completed`, `in_progress`, and `pending` statuses and `low`/`medium`/`high` priorities.

### Budget Items

Budget items are drawn from templates keyed by event type. Each tier slices a different number:

| Tier | Budget items per event |
|---|---|
| free | 2 |
| personal | 4 |
| agency | 5 |
| enterprise | 6 |

Categories used: `venue`, `catering`, `entertainment`, `decorations`, `photography`, `other`. Items include realistic `estimated_cost`/`actual_cost` amounts and a mix of `pending`, `partial`, and `paid` payment statuses.

## Script Details

**Location:** `backend/scripts/seed-test-data.mjs`

**Output:** `backend/seed-data.sql` (regenerated on each run with fresh UUIDs)

**Tables affected:**
- `user` — 4 rows
- `account` — 4 rows (credential provider)
- `subscriptions` — 4 rows
- `events` — 27 rows
- `guests` — ~2,705 rows
- `tasks` — 236 rows
- `budget_items` — 144 rows

### How password hashing works

The script uses Node.js `crypto.pbkdf2Sync` to produce a hash in the same format as the backend's `password-pbkdf2.ts`:

```
pbkdf2:<iterations>:<saltBase64>:<keyBase64>
```

Parameters: 100,000 iterations, SHA-256, 16-byte salt, 32-byte key. Compatible with Better Auth's custom password verifier in `backend/src/lib/auth.ts`.

## Re-seeding

Each run generates new UUIDs and timestamps. To re-seed, either:

1. **Clear existing data first** — delete the local D1 state directory (`.wrangler/state/`) and re-run migrations, then seed
2. **Delete just the test users' data** before re-running:

```sql
DELETE FROM guests WHERE event_id IN (SELECT id FROM events WHERE user_id IN (SELECT id FROM user WHERE email IN ('free@planloo.dev', 'personal@planloo.dev', 'agency@planloo.dev', 'enterprise@planloo.dev')));
DELETE FROM tasks WHERE event_id IN (SELECT id FROM events WHERE user_id IN (SELECT id FROM user WHERE email IN ('free@planloo.dev', 'personal@planloo.dev', 'agency@planloo.dev', 'enterprise@planloo.dev')));
DELETE FROM budget_items WHERE event_id IN (SELECT id FROM events WHERE user_id IN (SELECT id FROM user WHERE email IN ('free@planloo.dev', 'personal@planloo.dev', 'agency@planloo.dev', 'enterprise@planloo.dev')));
DELETE FROM events WHERE user_id IN (SELECT id FROM user WHERE email IN ('free@planloo.dev', 'personal@planloo.dev', 'agency@planloo.dev', 'enterprise@planloo.dev'));
DELETE FROM subscriptions WHERE user_id IN (SELECT id FROM user WHERE email IN ('free@planloo.dev', 'personal@planloo.dev', 'agency@planloo.dev', 'enterprise@planloo.dev'));
DELETE FROM account WHERE user_id IN (SELECT id FROM user WHERE email IN ('free@planloo.dev', 'personal@planloo.dev', 'agency@planloo.dev', 'enterprise@planloo.dev'));
DELETE FROM user WHERE email IN ('free@planloo.dev', 'personal@planloo.dev', 'agency@planloo.dev', 'enterprise@planloo.dev');
```
