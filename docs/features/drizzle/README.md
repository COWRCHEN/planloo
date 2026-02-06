# Drizzle + D1: Migrations and Drizzle Studio

This doc explains how database migrations and Drizzle Studio work with Cloudflare D1 in the Planloo backend, and which database each command uses.

## Two databases in development

When working with the backend you effectively have two D1/SQLite targets:

| Database | Used by | Location |
|----------|--------|----------|
| **Remote (Cloudflare D1)** | `npm run dev`, Drizzle Studio | Cloudflare — `planloo-db-dev` (development env) |
| **Local (Wrangler local)** | `npm run dev:local` only | `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite` |

- **`npm run dev`** runs with `--remote`, so the API uses the **remote** D1 database.
- **`npm run dev:local`** uses the **local** SQLite file under `.wrangler/state/...`.
- **Drizzle Studio** (`npm run db:studio`) loads `drizzle.config.ts` with `driver: 'd1-http'` and env from `.env.local` (e.g. `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, `CLOUDFLARE_API_TOKEN`), so it connects to the **remote** D1 database, not the local file.

## Migration commands (backend)

From the `backend/` directory:

| Command | Target | When to use |
|---------|--------|-------------|
| `npm run db:migrate` | **Remote** dev D1 | Default for day-to-day dev. Use when you run `npm run dev` and/or inspect data in Drizzle Studio. |
| `npm run db:migrate:local` | **Local** SQLite (`.wrangler/state/...`) | Only when you run `npm run dev:local` and want that local DB to have the latest schema. |
| `npm run db:migrate:staging` | Remote staging D1 | After deploying to staging or when preparing staging DB. |
| `npm run db:migrate:production` | Remote production D1 | After deploying to production or when preparing production DB. |

- **Schema changes:** edit `backend/src/db/schema/*.ts`, then run `npm run db:generate` to create migration files in `backend/drizzle/`.
- **Applying:** run the appropriate `db:migrate*` for the database you actually use (see table above).

## Drizzle Studio

- **Run:** `npm run db:studio` (uses `dotenv -e .env.local` so Cloudflare credentials are loaded).
- **Connects to:** the **remote** development D1 database (same as `npm run dev`).
- **Config:** `backend/drizzle.config.ts` uses `dialect: 'sqlite'`, `driver: 'd1-http'`, and credentials from env. Studio does **not** connect to the local `.wrangler` SQLite file.

If you use **`npm run dev:local`**, the app and Studio point at different databases: app = local file, Studio = remote. Prefer `npm run dev` + `npm run db:migrate` so app and Studio use the same remote dev DB.

## Common gotcha: “No migrations to apply” but table missing in Studio

**Symptom:** You run `npm run db:migrate:local` and see “No migrations to apply!” but in [Drizzle Studio](https://local.drizzle.studio/) the new table (e.g. `guest_audit`) does not appear.

**Cause:** Migrations were applied only to the **local** SQLite DB. The app (when run with `npm run dev`) and Drizzle Studio both use the **remote** D1 database, which never had the migration applied.

**Fix:** Apply migrations to the remote dev database:

```bash
cd backend
npm run db:migrate
```

Then refresh Drizzle Studio; the new tables will appear and the API will see the same schema.

## Quick reference

- **Daily dev (app + Studio on same DB):** `npm run dev` and `npm run db:migrate` (remote).
- **Inspect data:** `npm run db:studio` — same remote DB as `npm run dev`.
- **Local-only dev:** `npm run dev:local` and `npm run db:migrate:local`; note Studio still shows remote DB.
