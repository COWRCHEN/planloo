# Limit Enforcement

**File:** `backend/src/lib/billing-checks.ts`

All limit check functions return `BillingLimitResult`:

```typescript
interface BillingLimitResult {
  ok: boolean;
  error?: BillingError;
}
```

On failure, route handlers return `c.json({ success: false, error: limitCheck.error }, 402)`.

---

## Middleware

### `loadSubscription`

**File:** `backend/src/middleware/subscription.ts`

Applied after `authMiddleware` on all routes in `routes/index.ts`. Performs one DB read per request and sets `c.get('subscription')`. No-ops silently for unauthenticated requests.

On DB error, falls back to `plan: 'free'` so the request can still proceed.

---

## Helper: `getEffectivePlan`

```typescript
function getEffectivePlan(plan: PlanId, status: SubscriptionStatus): PlanId
```

Returns the plan's tier if the subscription is active (`active` or `trialing`), otherwise returns `'free'`. Used in every route handler before calling a check function:

```typescript
const sub = c.get('subscription');
const plan = getEffectivePlan(sub?.plan ?? 'free', sub?.status ?? 'free');
```

---

## Check Functions

### `checkEventCreationLimit(db, userId, plan)`

Counts non-deleted personal events owned by `userId`.

**Route:** `POST /api/v1/events`
**Error code:** `EVENT_LIMIT_EXCEEDED`

### `checkGuestLimit(db, userId, plan)`

Counts non-deleted guests across all non-deleted events owned by `userId`.

**Route:** `POST /api/v1/events/:eventUuid/guests`
**Error code:** `GUEST_LIMIT_EXCEEDED`

### `checkCollaboratorLimit(db, eventId, plan)`

Counts all collaborators on a single event.

**Route:** `POST /api/v1/events/:eventUuid/collaborators`
**Error codes:**
- `COLLABORATORS_NOT_ALLOWED` — plan allows 0 collaborators
- `COLLABORATOR_LIMIT_EXCEEDED` — at the per-event cap

### `checkEmailQuota(emailsSentThisPeriod, plan)`

Synchronous check against `emailsSentThisPeriod` from the subscription context (no DB call).

**Route:** `POST /api/v1/events/:eventUuid/guests/send-invitations`
**Error codes:**
- `EMAIL_NOT_INCLUDED` — plan has no email pool (free tier)
- `EMAIL_QUOTA_EXCEEDED` — pool exhausted this period

### `checkFeatureAccess(plan, feature)`

Synchronous boolean check against `PLAN_LIMITS[plan][feature]`.

| Feature key | Error code | Routes protected |
|---|---|---|
| `csvImportExport` | `FEATURE_NOT_AVAILABLE` | `POST /guests/import`, `GET /guests/export` |
| `floorPlans` | `FEATURE_NOT_AVAILABLE` | `POST /floor-plans` |
| `budgetTracking` | `FEATURE_NOT_AVAILABLE` | `POST /budget` |
| `taskTemplates` | `FEATURE_NOT_AVAILABLE` | `POST /tasks/bulk` |
| `vendorManagement` | `FEATURE_NOT_AVAILABLE` | `POST /providers` |

### `checkOrganizationLimit(db, userId, plan)`

Counts organizations where `userId` has role `admin`.

**Route:** `POST /api/v1/organizations`
**Error codes:**
- `ORGANIZATIONS_NOT_ALLOWED` — plan allows 0 orgs
- `ORGANIZATION_LIMIT_EXCEEDED` — at the org cap

### `checkOrgMemberLimit(db, orgId, plan)`

Counts all members of a single organization.

**Route:** `POST /api/v1/organizations/:orgId/invitations`
**Error code:** `ORG_MEMBER_LIMIT_EXCEEDED`

---

## Usage Incrementors

### `incrementEmailCount(db, userId, count)`

Atomically increments `emailsSentThisPeriod` using a SQL expression:

```sql
UPDATE subscriptions
SET emails_sent_this_period = emails_sent_this_period + :count,
    updated_at = :now
WHERE user_id = :userId
```

Called after each successful RSVP email send inside the `send-invitations` loop.

---

## Route Coverage Summary

| Route | Check |
|---|---|
| `POST /events` | `checkEventCreationLimit` |
| `POST /events/:uuid/guests` | `checkGuestLimit` |
| `GET /events/:uuid/guests/export` | `checkFeatureAccess('csvImportExport')` |
| `POST /events/:uuid/guests/import` | `checkFeatureAccess('csvImportExport')` |
| `POST /events/:uuid/guests/send-invitations` | `checkEmailQuota` + `incrementEmailCount` |
| `POST /events/:uuid/collaborators` | `checkCollaboratorLimit` |
| `POST /events/:uuid/floor-plans` | `checkFeatureAccess('floorPlans')` |
| `POST /events/:uuid/budget` | `checkFeatureAccess('budgetTracking')` |
| `POST /events/:uuid/tasks/bulk` | `checkFeatureAccess('taskTemplates')` |
| `POST /events/:uuid/providers` | `checkFeatureAccess('vendorManagement')` |
| `POST /organizations` | `checkOrganizationLimit` |
| `POST /organizations/:orgId/invitations` | `checkOrgMemberLimit` |
