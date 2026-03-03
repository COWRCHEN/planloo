# Enterprise Plan

**Status:** Implemented (migration 0039)
**Last Updated:** 2026-03-03

---

## Overview

The enterprise tier is the highest plan in Planloo. Unlike Free → Agency, enterprise deals are sales-negotiated — pricing, limits, and contract terms are custom per customer. There is no self-serve checkout for enterprise; provisioning is done manually by an admin.

**Key properties:**
- `plan = 'enterprise'` in the `subscriptions` table
- Billing managed via manually-created Stripe subscriptions
- Per-customer limits stored in `custom_limits` (JSON column on `subscriptions`)
- Never auto-downgraded on `past_due` — manual invoicing handles disputes
- "Contact sales" CTA on the pricing page, no Stripe Checkout redirect

---

## Default Limits

If `custom_limits` is `null` or an empty object, the following defaults apply:

| Limit | Default |
|---|---|
| Active events | Unlimited |
| Guests (total) | Unlimited |
| Email pool / mo | `maxGuests × 10` (auto-derived — see below) |
| SMS pool / mo | `maxGuests × 0.5` (auto-derived — see below) |
| Collaborators / event | Unlimited |
| Custom guest fields | 999 (effectively unlimited) |
| Organizations | 999 (effectively unlimited) |
| Org members | Unlimited |
| CSV import / export | ✓ |
| Floor plans | ✓ |
| Budget tracking | ✓ |
| Task templates | ✓ |
| Vendor management | ✓ |
| SSO / SAML | ✓ (flag only — not enforced yet) |

**Source:** `PLAN_LIMITS.enterprise` + `resolveEnterpriseLimits()` in `backend/src/lib/plan-limits.ts`

### Email and SMS pool auto-derivation

Email and SMS have direct COGS impact (Resend/Twilio costs), so they are **never unlimited by default**.

`resolveEnterpriseLimits()` auto-derives the pools when not explicitly set in `custom_limits`:

```
emailPoolPerMonth = ceil(maxGuests × 10)  // matches agency ratio: 30,000 / 3,000
smsPoolPerMonth   = ceil(maxGuests × 1)   // 1 SMS/guest — every guest gets at least one
```

| Guest cap | Auto email pool | Email COGS/mo | Auto SMS pool | SMS COGS/mo |
|---|---|---|---|---|
| 1,000 | 10,000 | $4 | 1,000 | $8 |
| 10,000 | 100,000 | $40 | 10,000 | $80 |
| 50,000 | 500,000 | $200 | 50,000 | $400 |

If `maxGuests` is `null` (a truly unlimited deal), pools also remain `null` — sales **must** explicitly negotiate and set `emailPoolPerMonth` and `smsPoolPerMonth` for those deals, otherwise sending will be blocked by the quota check.

To override the auto-derived pools, set them explicitly in `custom_limits`:

```sql
UPDATE subscriptions
SET custom_limits = '{"maxGuests": 10000, "emailPoolPerMonth": 200000, "smsPoolPerMonth": 10000}'
WHERE user_id = '<user-id>';
```

---

## Per-Customer Custom Limits

The `custom_limits` column holds a JSON string of type `Partial<PlanLimits>`. Any field present in this object overrides the corresponding default. Fields not present inherit the enterprise default.

### Example

A customer negotiated a deal of $600/mo for 10,000 guests and 100 active events:

```sql
UPDATE subscriptions
SET custom_limits = '{"maxGuests": 10000, "maxActiveEvents": 100}'
WHERE user_id = '<user-id>';
```

At runtime, `resolveEnterpriseLimits` merges the stored JSON with the defaults:

```
defaults:        { maxGuests: null, maxActiveEvents: null, ... }
custom override: { maxGuests: 10000, maxActiveEvents: 100 }
result:          { maxGuests: 10000, maxActiveEvents: 100, ... (all others null/true) }
```

Billing checks then enforce `maxGuests: 10000` and `maxActiveEvents: 100` instead of unlimited.

### Supported Override Fields

All fields of `PlanLimits` can be overridden. Numeric limits use `null` for unlimited:

```typescript
interface PlanLimits {
  maxActiveEvents: number | null;
  maxGuests: number | null;
  emailPoolPerMonth: number | null;
  smsPoolPerMonth: number | null;
  maxCollaboratorsPerEvent: number | null;
  maxCustomFieldsPerEvent: number;
  maxOrganizations: number;
  maxOrgMembers: number | null;
  csvImportExport: boolean;
  floorPlans: boolean;
  budgetTracking: boolean;
  taskTemplates: boolean;
  vendorManagement: boolean;
  sso: boolean;
}
```

---

## Limit Resolution at Runtime

`loadSubscription` middleware computes effective limits once per request:

```typescript
const effectivePlan = getEffectivePlan(sub.plan, sub.status);
const effectiveLimits =
  effectivePlan === 'enterprise'
    ? resolveEnterpriseLimits(JSON.parse(sub.customLimits ?? 'null'))
    : getPlanLimits(effectivePlan);

c.set('planLimits', effectiveLimits);
```

Route handlers read `c.get('planLimits')` — they never re-read the plan string or call `getEffectivePlan`. This means custom limit changes in the DB take effect immediately on the next request after the change (no deploy required).

**File:** `backend/src/middleware/subscription.ts`

---

## `getEffectivePlan` Behaviour

Enterprise subscriptions are **never downgraded to free**, even if `status` is `past_due`, `canceled`, or `incomplete`. Enterprise billing is managed through manual invoicing outside the standard Stripe webhook cycle.

```typescript
export function getEffectivePlan(plan: PlanId, status: SubscriptionStatus): PlanId {
  if (plan === 'enterprise') return 'enterprise'; // never downgrade
  if (isSubscriptionActive(status, plan)) return plan;
  return 'free';
}
```

**File:** `backend/src/lib/billing-checks.ts`

---

## Provisioning Flow

### 1. Sales closes a deal

Agree on price, guest cap, event cap, and contract term. Document the negotiated limits.

### 2. Create a Stripe Price (in Stripe Dashboard)

Use a one-off custom price or a reusable product with a custom amount.

- **Product:** e.g. "Planloo Enterprise – Acme Corp"
- **Price:** e.g. $600/mo recurring
- Note the `price_xxx` ID for step 3.

### 3. Create a Stripe Subscription (in Stripe Dashboard)

1. Find or create the customer's Stripe Customer (`cus_xxx`).
2. Create a subscription for the customer using the Price ID from step 2.
3. Set the subscription **metadata**:
   ```json
   {
     "userId": "<planloo-user-id>",
     "plan": "enterprise"
   }
   ```
   This is required so the webhook correctly sets `plan = 'enterprise'` in the DB.

### 4. Webhook syncs the row

The existing `customer.subscription.updated` webhook handler reads `metadata.plan` and writes it to the `subscriptions` table:

```
plan = 'enterprise', status = 'active', stripeSubscriptionId = 'sub_xxx', ...
```

No code changes are needed — standard webhook handling covers enterprise the same as other plans.

### 5. Admin sets custom limits in D1

After the webhook fires, update the row with the negotiated limits:

```sql
UPDATE subscriptions
SET custom_limits = '{"maxGuests": 10000, "maxActiveEvents": 100}'
WHERE user_id = '<planloo-user-id>';
```

Use Drizzle Studio (`npm run db:studio` in `/backend`) for a GUI alternative, or `wrangler d1 execute` for remote:

```bash
wrangler d1 execute planloo-db \
  --command "UPDATE subscriptions SET custom_limits = '{\"maxGuests\": 10000}' WHERE user_id = 'xxx'"
```

---

## API Behaviour

### `GET /api/v1/billing`

Returns the resolved limits. For enterprise users, the response also includes the raw `customLimits` object so the frontend can display the negotiated values:

```json
{
  "subscription": {
    "plan": "enterprise",
    "status": "active",
    "customLimits": { "maxGuests": 10000, "maxActiveEvents": 100 }
  },
  "limits": {
    "maxGuests": 10000,
    "maxActiveEvents": 100,
    "emailPoolPerMonth": null,
    ...
  }
}
```

### `POST /api/v1/billing/checkout`

Rejects `enterprise` — the Zod schema only accepts `personal | planner | agency`. Attempting to submit `enterprise` returns a 400 validation error.

### `POST /api/v1/billing/portal`

Works normally — the enterprise customer has a real Stripe Customer ID and can access the portal to update payment methods and view invoices.

---

## Database Schema

**Column added by migration `0039_enterprise_custom_limits.sql`:**

```sql
ALTER TABLE `subscriptions` ADD COLUMN `custom_limits` text;
```

The `plan` enum in `billing.ts` now includes `'enterprise'`. SQLite doesn't enforce CHECK constraints at the DB level, so the enum is a Drizzle-layer validation only.

| Column | Type | Notes |
|---|---|---|
| `plan` | TEXT | Added `'enterprise'` to Drizzle enum |
| `custom_limits` | TEXT | Nullable JSON string (`Partial<PlanLimits>`) |

---

## Frontend

The pricing table (`frontend/src/components/billing/PricingTable.tsx`) shows an Enterprise column with:
- "Contact us" in the price cell (no monthly/annual variant)
- "Contact sales" CTA — `<a href="mailto:sales@planloo.com">` (no checkout mutation)
- SSO and Dedicated support rows marked ✓ for enterprise only

The `PricingTable` accepts `currentPlan?: 'free' | 'personal' | 'planner' | 'agency' | 'enterprise'`. If an enterprise user views the pricing page, the Enterprise column renders with "Current plan" instead of "Contact sales".

---

## Admin Operations Reference

### Check a user's current plan and limits

```sql
SELECT user_id, plan, status, custom_limits
FROM subscriptions
WHERE user_id = '<user-id>';
```

### Set custom limits

```sql
UPDATE subscriptions
SET custom_limits = '{"maxGuests": 5000, "maxActiveEvents": 50, "emailPoolPerMonth": 50000}'
WHERE user_id = '<user-id>';
```

### Remove a specific custom limit (revert to unlimited default)

Omit the field from the JSON — missing fields inherit the enterprise default:

```sql
UPDATE subscriptions
SET custom_limits = '{"maxActiveEvents": 50}'  -- maxGuests becomes null (unlimited)
WHERE user_id = '<user-id>';
```

### Remove all custom limits (full unlimited defaults)

```sql
UPDATE subscriptions
SET custom_limits = NULL
WHERE user_id = '<user-id>';
```

### Downgrade an enterprise customer to a standard plan

```sql
UPDATE subscriptions
SET plan = 'agency', custom_limits = NULL
WHERE user_id = '<user-id>';
```

Then cancel the custom Stripe subscription in the Stripe Dashboard.

---

## Files

| Path | Role |
|---|---|
| `backend/src/db/schema/billing.ts` | `customLimits` column + `enterprise` in plan enum |
| `backend/drizzle/0039_enterprise_custom_limits.sql` | Migration |
| `backend/src/lib/plan-limits.ts` | `PLAN_LIMITS.enterprise`, `resolveEnterpriseLimits()` |
| `backend/src/lib/billing-checks.ts` | `getEffectivePlan()` — enterprise guard |
| `backend/src/middleware/subscription.ts` | Selects `customLimits`, computes `planLimits` |
| `backend/src/routes/billing.ts` | `GET /billing` returns `customLimits` for enterprise |
| `backend/src/types/env.ts` | `planLimits?: PlanLimits` context variable |
| `frontend/src/components/billing/PricingTable.tsx` | Enterprise column with "Contact sales" CTA |
