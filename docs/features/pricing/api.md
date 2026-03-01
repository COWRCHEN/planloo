# Billing API Endpoints

**Base path:** `/api/v1/billing`
**File:** `backend/src/routes/billing.ts`

---

## GET `/api/v1/billing`

Returns the current user's subscription details, plan limits, and usage.

**Auth:** Required (`requireAuth`)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "plan": "personal",
      "status": "active",
      "stripeCustomerId": "cus_xxx",
      "stripeSubscriptionId": "sub_xxx",
      "currentPeriodStart": "2026-02-01T00:00:00.000Z",
      "currentPeriodEnd": "2026-03-01T00:00:00.000Z",
      "cancelAtPeriodEnd": false,
      "canceledAt": null,
      "emailsSentThisPeriod": 42
    },
    "limits": {
      "maxActiveEvents": 3,
      "maxGuests": 300,
      "emailPoolPerMonth": 1500,
      "smsPoolPerMonth": 300,
      "maxCollaboratorsPerEvent": 2,
      "maxCustomFieldsPerEvent": 3,
      "maxOrganizations": 0,
      "maxOrgMembers": null,
      "csvImportExport": true,
      "floorPlans": true,
      "budgetTracking": true,
      "taskTemplates": false,
      "vendorManagement": false
    },
    "usage": {
      "emailsSentThisPeriod": 42,
      "emailPoolPerMonth": 1500
    }
  }
}
```

> `subscription` is `null` for users whose subscription row doesn't exist yet (shouldn't happen post-Phase 1). `null` limit values mean unlimited.

---

## POST `/api/v1/billing/checkout`

Creates a Stripe Checkout session and returns a redirect URL.

**Auth:** Required (`requireAuth`)

**Request body:**
```json
{
  "plan": "personal",
  "interval": "monthly"
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `plan` | string | Yes | `personal` \| `planner` \| `agency` |
| `interval` | string | No | `monthly` (default) \| `annual` |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "url": "https://checkout.stripe.com/c/pay/..."
  }
}
```

**Behavior:**
1. Looks up or creates a Stripe Customer for the user (persists `stripeCustomerId` immediately).
2. Creates a Checkout session with `mode: 'subscription'`.
3. Embeds `userId` and `plan` in session/subscription metadata for webhook processing.
4. Returns the session URL — the frontend redirects the browser to it.

**Success URL:** `{FRONTEND_URL}/dashboard/billing?success=1`
**Cancel URL:** `{FRONTEND_URL}/dashboard/billing?canceled=1`

---

## POST `/api/v1/billing/portal`

Creates a Stripe Customer Portal session and returns a redirect URL.

**Auth:** Required (`requireAuth`)

**Request body:** None

**Response (200):**
```json
{
  "success": true,
  "data": {
    "url": "https://billing.stripe.com/session/..."
  }
}
```

**Error (400) — no Stripe customer yet:**
```json
{
  "success": false,
  "error": {
    "code": "NO_STRIPE_CUSTOMER",
    "message": "No billing account found. Please start a subscription first."
  }
}
```

The Customer Portal lets users change plans, download invoices, update payment methods, and cancel.

**Return URL:** `{FRONTEND_URL}/dashboard/billing`

---

## POST `/api/v1/billing/webhook`

Stripe webhook receiver. Handles subscription lifecycle events.

**Auth:** None — uses Stripe signature verification instead.
**File:** `backend/src/index.ts` (registered before `app.route('/api/v1', api)` to access raw body)

**Required header:** `stripe-signature`

**Handled events:**

| Event | Action |
|---|---|
| `checkout.session.completed` | Update plan + Stripe IDs, reset `emailsSentThisPeriod` |
| `customer.subscription.updated` | Sync plan, status, period dates; reset counter on new period |
| `customer.subscription.deleted` | Downgrade to free, clear Stripe IDs, reset counter |
| `invoice.payment_failed` | Set `status = 'past_due'` |
| `invoice.payment_succeeded` | Set `status = 'active'`, reset `emailsSentThisPeriod` |

**Response (200):**
```json
{ "received": true }
```

**Testing locally:**
```bash
stripe listen --forward-to localhost:8787/api/v1/billing/webhook
stripe trigger checkout.session.completed
```

---

## 402 Error Format

All limit/quota violations across the API return HTTP 402 with this shape:

```json
{
  "success": false,
  "error": {
    "code": "GUEST_LIMIT_EXCEEDED",
    "message": "Your personal plan allows up to 300 guests across all events.",
    "limit": 300,
    "current": 300,
    "upgradeTo": "planner",
    "upgradeUrl": "/dashboard/billing"
  }
}
```

| Field | Description |
|-------|-------------|
| `code` | Machine-readable error code (see [Limit Enforcement](./limits.md)) |
| `message` | Human-readable explanation |
| `limit` | The plan's limit for this resource |
| `current` | The user's current count |
| `upgradeTo` | Next plan tier that resolves the limit (omitted if already on agency) |
| `upgradeUrl` | Always `/dashboard/billing` |
