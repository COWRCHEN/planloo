# Test Data Seed Script

Generates a complete set of test data for local development: one user with login credentials, five events covering all event types, and 500 guests with randomized names.

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



Make sure you've run migrations first (npm run db:migrate:local) if it's a fresh database.

Note from earlier: On your machine, node isn't on the default PATH — it's installed via conda at C:\Programs\miniconda3\envs\nodejs24\node.exe. If node isn't recognized, either activate the conda environment first or use the full path:

```bash
C:\Programs\miniconda3\envs\nodejs24\node.exe scripts/seed-test-data.mjs
```



## Test User Credentials

| Field    | Value                  |
|----------|------------------------|
| Email    | `testuser@planloo.dev` |
| Password | `password123`          |

The user is created with `emailVerified = true` so no verification step is needed to log in.

## Generated Data

### User

- Inserted into `user` table with a random UUID
- A matching `account` record is created with `providerId = 'credential'` and a PBKDF2-hashed password (same format as `backend/src/lib/password-pbkdf2.ts`)

### Events (5)

| Event                        | Type       | Status    | Start           | Location                       | Budget   |
|------------------------------|------------|-----------|-----------------|--------------------------------|----------|
| Annual Company Gala 2026     | corporate  | confirmed | now + 30 days   | Grand Ballroom, New York, NY   | $25,000  |
| Sarah & Tom Wedding          | wedding    | planning  | now + 90 days   | Rosewood Gardens, Austin, TX   | $45,000  |
| Tech Innovation Conference   | conference | draft     | now + 60 days   | Convention Center, San Francisco, CA | $15,000 |
| Maya's 30th Birthday Bash    | birthday   | confirmed | now + 14 days   | Skyline Rooftop Lounge, Los Angeles, CA | $5,000 |
| Community Volunteer Day      | other      | planning  | now + 45 days   | Riverside Community Center, Portland, OR | $2,000 |

Each event lasts 6 hours and uses the `America/New_York` timezone.

### Guests (100 per event, 500 total)

Each guest has:
- **Random first + last name** drawn from pools of 100 first names and 100 last names (unique per event)
- **Email** in format `firstname.lastnameN@example.com`
- **RSVP status** randomly assigned: `pending`, `invited`, `confirmed`, `declined`, or `maybe`
- **Plus-ones allowed**: 0, 1, or 2 (random)
- Event ID resolved via subquery on the event's UUID (safe even with existing data)

## Script Details

**Location:** `backend/scripts/seed-test-data.mjs`

**Output:** `backend/seed-data.sql` (regenerated on each run with fresh UUIDs)

**Tables affected:**
- `user` — 1 row
- `account` — 1 row (credential provider)
- `events` — 5 rows
- `guests` — 500 rows

### How password hashing works

The script uses Node.js `crypto.pbkdf2Sync` to produce a hash in the same format as the backend's `password-pbkdf2.ts`:

```
pbkdf2:<iterations>:<saltBase64>:<keyBase64>
```

Parameters: 100,000 iterations, SHA-256, 16-byte salt, 32-byte key. This is compatible with Better Auth's custom password verifier configured in `backend/src/lib/auth.ts` for the development environment.

## Re-seeding

Each run generates new UUIDs and timestamps. To re-seed, either:

1. **Clear existing data first** — delete the local D1 state directory (`.wrangler/state/`) and re-run migrations, then seed
2. **Delete just the test user's data** before re-running:

```sql
DELETE FROM guests WHERE event_id IN (SELECT id FROM events WHERE user_id IN (SELECT id FROM user WHERE email = 'testuser@planloo.dev'));
DELETE FROM events WHERE user_id IN (SELECT id FROM user WHERE email = 'testuser@planloo.dev');
DELETE FROM account WHERE user_id IN (SELECT id FROM user WHERE email = 'testuser@planloo.dev');
DELETE FROM user WHERE email = 'testuser@planloo.dev';
```
