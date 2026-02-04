# Cloudflare API Token

This doc explains what `CLOUDFLARE_API_TOKEN` is and how to create it for use with Wrangler (Workers, D1, etc.).

## What it is

**CLOUDFLARE_API_TOKEN** is a Cloudflare API token used to authenticate with Cloudflare’s APIs (deploy Workers, manage D1, manage account resources). It is **not** a secret your Worker code reads at runtime.

- **Used by:** Wrangler and other tooling (e.g. CI/CD), not your app.
- **Used for:** `wrangler dev`, `wrangler deploy`, `wrangler d1 migrations`, etc.
- If you use **`wrangler login`** (browser OAuth) for local dev, you often don’t need this in `.env`. It’s required for **CI/CD** or headless environments.

| Variable                 | Used by        | Purpose                                      |
|--------------------------|----------------|----------------------------------------------|
| **CLOUDFLARE_API_TOKEN** | Wrangler/tooling | Auth for Cloudflare API — **tooling only**   |
| **CLOUDFLARE_ACCOUNT_ID**| Wrangler/tooling | Which Cloudflare account — **tooling only**  |

---

## How to create the token

### 1. Open the token page

- **User token:** [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens/) → **My Profile** → **API Tokens**
- Or: **Manage Account** → **API Tokens** (for account-level tokens)

### 2. Create the token

1. Click **Create Token**.
2. Use a template (easiest for Wrangler):
   - **“Edit Cloudflare Workers”** – covers Workers, KV, R2, etc.
   - For **D1**, either use that template and add **D1** permissions, or create a **custom token** (see below).
3. Optionally rename the token (e.g. “Planloo Wrangler”).
4. Under **Account Resources**, choose **Include** → **Your account** (or the specific account).
5. If you use D1 and the template doesn’t include it, under **Account** add:
   - **D1** → **Edit** (or the permissions you need for migrations/deploy).
6. Click **Continue to summary** → **Create Token**.

### 3. Copy and store the token

- Copy the token **immediately** (it’s shown only once).
- Put it in `backend/.env`:
  - `CLOUDFLARE_API_TOKEN=<paste here>`
- Never commit this value to git; keep `.env` in `.gitignore`.

### 4. Get your Account ID (for `CLOUDFLARE_ACCOUNT_ID`)

- In the dashboard: **Workers & Pages** (or any product) → right-hand sidebar → **Account ID**.
- Or: [Find Account and Zone IDs](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/).

Add to `backend/.env`:

- `CLOUDFLARE_ACCOUNT_ID=<your_account_id>`

---

## Custom token (minimal permissions)

If you create a **custom token** instead of a template, use at least:

| Permission       | Level | Scope        |
|------------------|-------|-------------|
| Account Settings | Read  | Your account |
| Workers Scripts  | Edit  | Your account |
| D1               | Edit  | Your account (if using D1) |
| User Details     | Read  | (often needed by Wrangler) |

Restrict **Account resources** to **Your account** (or the account you use for this project).

---

## References

- [Create API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- [Find Account and Zone IDs](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/)
- [API token templates](https://developers.cloudflare.com/fundamentals/api/reference/template/)
