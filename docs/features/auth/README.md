# Authentication System

**Feature:** Cookie-based session authentication with Better Auth
**Status:** Implemented
**Last Updated:** 2026-02-20

---

## Overview

Planloo uses [Better Auth](https://www.better-auth.com/) for authentication, configured for Cloudflare Workers. The system is **cookie-based** (not JWT) — the server stores sessions in D1 and sends an HTTPOnly cookie to the browser. There are no refresh tokens; sessions auto-renew on activity.

### Key Capabilities

- Email/password sign-up with email verification
- OAuth sign-in (Google, extensible to other providers)
- Cookie-based sessions with 7-day expiry and 24-hour auto-renewal
- 5-minute cookie cache to reduce D1 reads
- Cross-subdomain cookies in production (`.planloo.com`)
- Role-based access control (user, operator, super_admin)
- Account suspension support
- Password reset via email
- Rate limiting on all auth endpoints

---

## Architecture Summary

```
Browser                          Cloudflare Workers              D1 Database
┌──────────────┐                ┌─────────────────────┐         ┌──────────────┐
│  Auth Client │──credentials──►│  Better Auth Handler │────────►│  user        │
│  (React)     │◄──HTTPOnly────│  /api/v1/auth/*      │         │  session     │
│              │   cookie       │                      │         │  account     │
│  useSession()│──cookie───────►│  Auth Middleware      │────────►│  verification│
│              │◄──user/session─│  (getSession)        │         └──────────────┘
└──────────────┘                └─────────────────────┘
```

**Request flow:**

1. User signs in via `authClient.signIn.email()` or `authClient.signIn.social()`
2. Better Auth validates credentials, creates a `session` row in D1
3. Server sets an HTTPOnly cookie (`better-auth.session_token`) on the response
4. Subsequent requests include the cookie automatically (`credentials: 'include'`)
5. `authMiddleware` calls `auth.api.getSession()` to resolve the user from the cookie
6. Protected routes use `requireAuth` to enforce authentication

---

## Session Lifecycle

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `expiresIn` | **7 days** | Session lifetime from creation |
| `updateAge` | **24 hours** | Server renews the session if older than this on each request |
| `cookieCache.maxAge` | **5 minutes** | Browser caches the session cookie payload to avoid hitting D1 on every request |

### Why No Refresh Token?

Better Auth's cookie model handles renewal server-side. When a request arrives with a session older than `updateAge` (24h), the server transparently extends the session expiry. The browser never needs to exchange a refresh token — the original session cookie is simply updated. This eliminates an entire class of token-theft and token-rotation bugs.

### Expired Session Cleanup

Better Auth creates a new `session` row on every sign-in but never deletes expired ones. To prevent unbounded table growth, a **Cloudflare Cron Trigger** runs daily at **3:00 AM UTC** and deletes all sessions where `expires_at < now()`.

**Implementation:** The `scheduled` handler is exported alongside `fetch` in `backend/src/index.ts`. It uses Drizzle's `db.delete()` with `lt(session.expiresAt, new Date())` and logs the number of purged rows.

**Cron configuration:** Defined in `backend/wrangler.toml` under `[env.<environment>.triggers]` for all three environments (development, staging, production).

**Local testing:** Requires the `--test-scheduled` flag:

```bash
npx wrangler dev src/index.ts --remote --env development --test-scheduled
curl "http://localhost:8787/__scheduled?cron=0+3+*+*+*"
```

### Cookie Attributes

| Attribute | Development | Production |
|-----------|------------|------------|
| `httpOnly` | `true` | `true` |
| `secure` | `false` | `true` |
| `sameSite` | `lax` | `lax` |
| Cross-subdomain | disabled | `.planloo.com` |

---

## File Manifest

### Backend

| File | Purpose |
|------|---------|
| `backend/src/lib/auth.ts` | Better Auth factory — creates per-request auth instance |
| `backend/src/middleware/auth.ts` | Middleware chain: `authMiddleware`, `requireAuth`, `requireVerifiedEmail`, `requireRole` |
| `backend/src/middleware/rate-limit.ts` | Rate limiters for auth endpoints |
| `backend/src/db/schema/auth.ts` | Drizzle schema for `user`, `session`, `account`, `verification` |
| `backend/src/index.ts` | Route mounting, CORS config, rate limit wiring |
| `backend/src/lib/password-pbkdf2.ts` | PBKDF2 password hashing (dev only, avoids Worker CPU limits) |
| `backend/src/lib/email.ts` | Verification, reset, and welcome email sending |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/lib/auth-client.ts` | Better Auth React client (`createAuthClient`) |
| `frontend/src/hooks/use-auth.ts` | TanStack Query hooks: `useSession`, `useSignIn`, `useSignUp`, `useSignOut`, `useOAuthSignIn`, `useForgotPassword`, `useResetPassword`, `useVerifyEmail` |
| `frontend/src/hooks/use-user.ts` | Profile hooks: `useUpdateProfile`, `useUploadAvatar`, `useDeleteAvatar`, `useChangePassword` |

---

## Backend Details

### Auth Factory (`backend/src/lib/auth.ts`)

Better Auth must be instantiated **per-request** because Cloudflare Workers don't have persistent module-level state. `createAuth(env)` builds the instance with:

- **Database adapter**: Drizzle + D1 (SQLite provider)
- **Base path**: `/api/v1/auth`
- **Trusted origins**: `env.FRONTEND_URL`
- **Email/password**: Enabled with email verification required
- **Social providers**: Google (conditionally, if env vars are set)
- **Password hashing**: PBKDF2 in development (scrypt exceeds Worker CPU limits), default scrypt in production
- **Custom user fields**: `platformRole`, `phone`, `isActive`, `suspendedAt`, `suspendedReason`
- **Database hooks**: Sends welcome email after user creation

### Middleware Chain (`backend/src/middleware/auth.ts`)

Four middleware functions, designed to be composed:

| Middleware | Blocks Request? | Purpose |
|------------|----------------|---------|
| `authMiddleware` | No | Resolves user/session from cookie, sets `c.get('user')` and `c.get('session')`. Silently continues if unauthenticated. |
| `requireAuth` | 401 | Rejects if no user/session. Also returns 403 if account is suspended. |
| `requireVerifiedEmail` | 403 | Rejects if `emailVerified` is false. Must follow `requireAuth`. |
| `requireRole(...roles)` | 403 | Rejects if user's `platformRole` is not in the allowed list. |

Shorthands: `requireSuperAdmin`, `requireOperator`.

### Rate Limiting

Auth endpoints are rate-limited via Cloudflare KV:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/v1/auth/sign-up/*` | 5 requests | 15 minutes |
| `/api/v1/auth/sign-in/email` | 10 requests | 15 minutes |
| `/api/v1/auth/forget-password` | 3 requests | 1 hour |

Rate limit state is keyed by IP (`CF-Connecting-IP`). Headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` are returned on every response. Exceeding the limit returns `429` with a `Retry-After` header.

### CORS

Configured in `backend/src/index.ts`:

- Allows `env.FRONTEND_URL` as origin
- Allows `localhost` / `127.0.0.1` in development
- `credentials: true` (required for cookie auth)
- Preflight cached for 24 hours (`maxAge: 86400`)

---

## Frontend Details

### Auth Client (`frontend/src/lib/auth-client.ts`)

```typescript
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: '<backend-origin>',   // e.g. http://localhost:8787
  basePath: '/api/v1/auth',
  fetchOptions: { credentials: 'include' },
});
```

The client extracts the origin from `PUBLIC_API_URL` and sets `credentials: 'include'` so cookies are sent cross-origin.

### Auth Hooks (`frontend/src/hooks/use-auth.ts`)

All hooks use TanStack Query with `authKeys` for cache management:

| Hook | Type | Description |
|------|------|-------------|
| `useSession()` | Query | Fetches current session. `staleTime: 5min`. Returns `AuthSession \| null`. |
| `useSignIn()` | Mutation | Email/password sign-in. Invalidates session cache on success. |
| `useSignUp()` | Mutation | Email/password registration. Accepts optional `callbackURL`. |
| `useSignOut()` | Mutation | Signs out. Clears session cache and invalidates all auth queries. |
| `useOAuthSignIn()` | Mutation | OAuth sign-in (currently Google). Redirects to provider. |
| `useForgotPassword()` | Mutation | Sends password reset email. |
| `useResetPassword()` | Mutation | Resets password with token from email link. |
| `useVerifyEmail()` | Mutation | Verifies email with token. Invalidates session to pick up verified status. |
| `useUser()` | Derived | Returns `session.user` or `null`. |
| `useIsAuthenticated()` | Derived | Returns `{ isAuthenticated, isLoading }`. |

### Profile Hooks (`frontend/src/hooks/use-user.ts`)

| Hook | Description |
|------|-------------|
| `useUpdateProfile(userId)` | PATCH name, phone, image |
| `useUploadAvatar()` | Upload avatar file, dispatches `user-avatar-changed` event for cross-island sync |
| `useDeleteAvatar()` | Remove avatar, dispatches `user-avatar-changed` event |
| `useChangePassword()` | Change password (requires current password) |

---

## Database Schema

Four tables in `backend/src/db/schema/auth.ts`, all managed by Better Auth:

### `user`

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | Better Auth generated |
| `email` | text, unique | Indexed |
| `name` | text | Optional |
| `emailVerified` | boolean | Default `false` |
| `image` | text | Avatar URL |
| `platformRole` | enum(`super_admin`, `operator`, `user`) | Default `user` |
| `phone` | text | Optional, custom field |
| `isActive` | boolean | Default `true`, indexed |
| `suspendedAt` | timestamp | Set when suspended |
| `suspendedReason` | text | Admin-provided reason |
| `createdAt` / `updatedAt` | timestamp | Auto-set via `unixepoch()` |

### `session`

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | |
| `token` | text, unique | Session token, indexed |
| `userId` | text FK → user | Cascades on delete |
| `expiresAt` | timestamp | 7 days from creation |
| `ipAddress` | text | Tracking |
| `userAgent` | text | Tracking |

### `account`

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | |
| `userId` | text FK → user | Cascades on delete |
| `providerId` | text | `credential` for email/password, `google` for OAuth |
| `accountId` | text | Provider-specific user ID |
| `password` | text | Hashed password (email/password only) |
| `accessToken` / `refreshToken` | text | OAuth tokens |
| `scope` / `idToken` | text | OAuth metadata |

### `verification`

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | |
| `identifier` | text | Email address or token identifier, indexed |
| `value` | text | Token value |
| `expiresAt` | timestamp | Token expiry |

---

## Email Verification Flow

1. User signs up → Better Auth creates user with `emailVerified: false`
2. `sendVerificationEmail` hook rewrites the callback URL from backend to frontend (`/verify-email?token=...`)
3. User clicks link → frontend page calls `useVerifyEmail()` with the token
4. Better Auth verifies the token, sets `emailVerified: true`
5. `autoSignInAfterVerification: true` creates a session automatically
6. Frontend invalidates session cache to pick up the verified status

## JWT Authentication (Not Used)

Better Auth offers an official [JWT plugin](https://www.better-auth.com/docs/plugins/jwt) that can be enabled alongside cookie-based sessions. Planloo does **not** use it — documented here for future reference.

### What the JWT plugin provides

- **Token endpoint** (`/api/auth/token`) — Clients exchange a valid session for a signed JWT
- **JWKS endpoint** (`/api/auth/jwks`) — Exposes the public key so downstream services can verify tokens without a DB call
- **Key rotation** — Configurable rotation intervals with grace periods so tokens signed by old keys remain valid briefly
- **Custom payloads** — By default the full user object is included; customize via the `definePayload` option

### When to consider enabling it

| Scenario | Recommended auth |
|----------|-----------------|
| Browser → Planloo API | Cookie sessions (current) |
| Service → Planloo API (microservices) | JWT |
| Third-party consumers calling Planloo API | JWT |
| Mobile app without cookie support | JWT (or Bearer token plugin) |

### Why Planloo uses cookies instead

Cookie-based sessions are the safer default for browser apps: HTTPOnly cookies can't be read by JavaScript (XSS-resistant), the server controls session lifetime and revocation via D1, and Better Auth handles renewal transparently. JWT would add complexity (token storage, refresh logic, revocation challenges) without a current need.

---

## Password Reset Flow

1. User submits email via `useForgotPassword()`
2. `sendResetPassword` hook rewrites the URL to frontend (`/reset-password?token=...`)
3. User clicks link → frontend page calls `useResetPassword()` with token + new password
4. Better Auth validates token and updates the password hash
