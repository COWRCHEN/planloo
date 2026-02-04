# Backend local development setup

This doc covers running the Planloo API (Hono on Cloudflare Workers + D1) on your machine.

## Prerequisites

- Node.js 18+
- Cloudflare account (for remote dev and D1)
- Optional: [Cloudflare API token](CLOUDFLARE_API_TOKEN.md) for CI or headless use; for interactive dev, `npx wrangler login` is enough.

## One-time: create the dev D1 database

The dev server uses **remote** mode by default (see below). Remote mode requires a real D1 database in your Cloudflare account and its ID in `wrangler.toml`.

1. From the repo root, go to the backend:
   ```bash
   cd backend
   ```

2. Create the development D1 database:
   ```bash
   npx wrangler d1 create planloo-db-dev
   ```

3. Copy the `database_id` from the output (a UUID), e.g.:
   ```text
   ✅ Successfully created DB 'planloo-db-dev'
   database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
   ```

4. Open `backend/wrangler.toml` and set that ID for the development environment:
   - Find the `[env.development]` section.
   - Under `[[env.development.d1_databases]]`, set `database_id` to the UUID (replace the empty string or placeholder):
   ```toml
   [[env.development.d1_databases]]
   binding = "DB"
   database_name = "planloo-db-dev"
   database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
   ```

5. Apply migrations to the remote dev database (once, or after schema changes):
   ```bash
   npx wrangler d1 migrations apply planloo-db-dev --remote --env development
   ```
   You must use `--env development` because the D1 database is defined under `[env.development]` in `wrangler.toml`. From `backend/` you can also run `npm run db:migrate`. Migrations are read from the `drizzle/` folder (Drizzle output); `migrations_dir = "drizzle"` is set in `wrangler.toml`.

Without a valid `database_id`, `npm run dev` will fail with:
`binding DB of type d1 must have an 'id' specified [code: 10021]`.

## Running the dev server

### "write EOF" on Windows

If you see **`✘ [ERROR] write EOF`** when running `npm run dev` or `npm run dev:local` on Windows, the cause is usually a missing **Visual C++ runtime** (Wrangler shows a generic stream error instead).

**Fix:** Install **Microsoft Visual C++ 2015–2022 Redistributable** (x64 and x86):

- [Latest supported VC++ downloads](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist)
- Or: `winget install Microsoft.VCRedist.2015+.x64` and `winget install Microsoft.VCRedist.2015+.x86`

Restart the terminal and run `npm run dev` again. You do **not** need Visual Studio Build Tools or Python. For more detail, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md#write-eof-on-windows).

From `backend/`:

```bash
npm run dev
```

This runs **remote** dev: your Worker runs in Cloudflare's edge preview and uses the D1 database you created above. The API is available at the URL Wrangler prints (e.g. `http://localhost:8787` or a workers.dev preview URL).

### Optional: local dev

```bash
npm run dev:local
```

This runs the Worker **locally** (Miniflare) with a local D1 database (no Cloudflare upload). If you see the write EOF error, see the Windows section above.

## Scripts summary

| Script        | Command / behavior |
|---------------|--------------------|
| `npm run dev` | Remote dev (default). Needs D1 `database_id` in `wrangler.toml`. |
| `npm run dev:local` | Local dev (Miniflare + local D1). No remote upload. |

## Environment and secrets

- **`.env`** (or `.env.local`) in `backend/`: used by Wrangler for `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` if you use them. Do not commit secrets.
- **Secrets** (e.g. `BETTER_AUTH_SECRET`): set per environment with:
  ```bash
  npx wrangler secret put BETTER_AUTH_SECRET --env development
  ```

## See also

- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) – "write EOF" on Windows and other common issues
- [CLOUDFLARE_API_TOKEN.md](CLOUDFLARE_API_TOKEN.md) – Creating and using a Cloudflare API token
- Root [CLAUDE.md](../../CLAUDE.md) – Commands, architecture, env vars
- `backend/CLAUDE.md` – Backend-specific patterns and DB usage
