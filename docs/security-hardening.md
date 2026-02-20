# Security Hardening

This document describes the security measures implemented across the Planloo backend and frontend, organized by severity.

## High Severity Fixes

### H1: Hashed Event Page Passwords

**Problem:** Event page passwords were stored in plain text in the `eventPrivacySettings` table and returned as-is in GET responses.

**Solution:**

- Created `backend/src/lib/page-password.ts` with SHA-256 + random salt hashing
- Passwords are hashed before storage (both insert and update paths in `events.ts`)
- GET `/events/:uuid/privacy-settings` now returns `hasPassword: boolean` instead of the raw password
- Frontend `EventPrivacySettings` interface uses `hasPassword` instead of `pagePassword`
- The settings UI no longer displays existing passwords; it shows a placeholder and only sends a new password when the user types one

**Files:**
- `backend/src/lib/page-password.ts` (new) — `hashPagePassword()`, `verifyPagePassword()`
- `backend/src/routes/events.ts` — PATCH handler hashes before storing; GET/PATCH responses strip password hash
- `frontend/src/hooks/use-events.ts` — `EventPrivacySettings` type updated
- `frontend/src/components/events/PrivacySharingSettings.tsx` — UI updated for `hasPassword`

**Hash format:** `<salt-hex>:<sha256-hex>` (16-byte random salt)

---

### H2: SSR Auth Guard (Astro Middleware)

**Problem:** Dashboard pages relied solely on client-side auth checks (`DashboardAuthCheck`), meaning unauthenticated users briefly received page HTML before being redirected.

**Solution:**

- Created `frontend/src/middleware.ts` using Astro's `defineMiddleware`
- Intercepts all `/dashboard/*` requests server-side
- Forwards the request cookie to `GET {API_URL}/auth/get-session`
- Redirects to `/login?returnUrl=...` if no valid session
- Sets `Astro.locals.user` and `Astro.locals.session` for downstream SSR pages
- The existing `DashboardAuthCheck` component is kept as a client-side fallback for session expiry during SPA navigation

**Files:**
- `frontend/src/middleware.ts` (new)
- `frontend/src/env.d.ts` — Added `App.Locals` type declaration

All 24 dashboard pages already use `prerender = false` (SSR), so no individual page changes were needed.

---

### H3: Security Headers

**Problem:** No security headers were set on frontend responses, leaving the app vulnerable to clickjacking, MIME sniffing, and other browser-based attacks.

**Solution:**

Created `frontend/public/_headers` (Cloudflare Pages headers file) with two rule sets:

**`/dashboard/*` (authenticated pages):**
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- `Content-Security-Policy` — restricts script/style/img/connect sources, blocks framing

**`/*` (all pages):**
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

**Files:**
- `frontend/public/_headers` (new)

**Note:** CSP uses `'unsafe-inline'` for scripts and styles, which is required for Astro/React inline styles. This can be tightened with nonce-based CSP in a future iteration.

---

## Medium Severity Fixes

### M1: Constant-Time Password Comparison

**Problem:** `verifyPassword()` in `password-pbkdf2.ts` used an early-return byte loop, enabling timing side-channel attacks.

**Solution:**

Replaced:
```ts
for (let i = 0; i < derivedKey.length; i++) {
  if (derivedKey[i] !== expectedKey[i]) return false;
}
return true;
```

With constant-time XOR comparison:
```ts
let diff = 0;
for (let i = 0; i < derivedKey.length; i++) {
  diff |= derivedKey[i]! ^ expectedKey[i]!;
}
return diff === 0;
```

**File:** `backend/src/lib/password-pbkdf2.ts`

---

### M2: Rate Limiting for RSVP and Upload Endpoints

**Problem:** RSVP and upload endpoints had no rate limiting, allowing abuse (spam submissions, storage exhaustion).

**Solution:**

Added two new rate limiter configurations in `backend/src/middleware/rate-limit.ts`:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/v1/rsvp/*` | 20 requests | 15 minutes |
| `/api/v1/uploads/*` | 10 requests | 1 hour |

Applied in `backend/src/index.ts` alongside existing auth rate limiters.

**Files:**
- `backend/src/middleware/rate-limit.ts` — Added `rsvpLimiter`, `uploadLimiter` exports
- `backend/src/index.ts` — Applied new limiters

---

### M3: Magic Byte Verification for Uploads

**Problem:** File uploads only validated the declared MIME type (`Content-Type`), which can be spoofed. A malicious file could be uploaded with a fake image MIME type.

**Solution:**

Added `verifyImageMagicBytes(buffer, mimeType)` to `uploads.ts` that inspects the first bytes of the file:

| Format | Magic Bytes |
|--------|-------------|
| JPEG | `FF D8 FF` |
| PNG | `89 50 4E 47` |
| GIF | `47 49 46 38` |
| WebP | `52 49 46 46 ... 57 45 42 50` |

Called before the R2 `bucket.put()`. Returns HTTP 400 with `INVALID_FILE_CONTENT` if bytes don't match.

**File:** `backend/src/routes/uploads.ts`

---

### M4: Dependency Updates

**Changes:**
- Updated `hono` from `4.11.7` to `4.12.0` in backend
- Ran `npm audit fix` in both `backend/` and `frontend/`

**Remaining vulnerabilities** are in dev-only tooling (eslint, wrangler, esbuild) and do not affect production builds. These will be resolved as upstream packages release patches.

---

### M5: Guarded Console Error Statements

**Problem:** `console.error()` calls in production could leak internal error details to anyone inspecting the browser console.

**Solution:**

Wrapped three `console.error` calls with `import.meta.env.DEV` guards so they only execute in development:

| File | Line | Guard |
|------|------|-------|
| `frontend/src/hooks/use-auth.ts` | 56 | `if (import.meta.env.DEV) console.error(...)` |
| `frontend/src/hooks/use-auth.ts` | 91 | `if (import.meta.env.DEV) console.error(...)` |
| `frontend/src/components/guests/GuestExportButton.tsx` | 24 | `if (import.meta.env.DEV) console.error(...)` |

Vite/Astro tree-shakes `import.meta.env.DEV` blocks in production builds, so these calls are completely removed from the bundle.

---

### M6: Root .gitignore

**Problem:** No root-level `.gitignore` existed, risking accidental commits of secrets, keys, or large generated files.

**Solution:**

Created `/.gitignore` covering:
```
.env / .env.*     (except .env.example)
*.key / *.pem
credentials.json
node_modules/
.wrangler/
.DS_Store
```

**Note:** Subdirectory `.gitignore` files in `backend/` and `frontend/` remain in place and continue to apply.

---

## Verification Checklist

- [x] `cd backend && npm run type-check` — no new TypeScript errors
- [x] `cd frontend && npm run type-check` — no new TypeScript errors
- [x] Manual: GET `/events/:uuid/privacy-settings` returns `hasPassword` boolean, not the hash
- [x] Manual: PATCH privacy settings stores a hashed password (format `<salt>:<hash>`)
- [x] Manual: `/dashboard` without session cookie returns 302 redirect to `/login`
- [x] `_headers` file deployed with Cloudflare Pages serves correct headers
