# Stripe Integration

---

## Initial Setup

### 1. Create Products & Prices in Stripe Dashboard

Go to **Stripe Dashboard → Products → Add product** and create 3 products (Personal, Planner, Agency). For each product, add two prices (monthly + annual recurring).

| Product | Monthly env var | Annual env var |
|---|---|---|
| Personal | `STRIPE_PRICE_PERSONAL_MONTHLY` | `STRIPE_PRICE_PERSONAL_ANNUAL` |
| Planner | `STRIPE_PRICE_PLANNER_MONTHLY` | `STRIPE_PRICE_PLANNER_ANNUAL` |
| Agency | `STRIPE_PRICE_AGENCY_MONTHLY` | `STRIPE_PRICE_AGENCY_ANNUAL` |

For each price: set **Billing model** to Recurring, choose Monthly or Annual period, then copy the `price_xxx` ID.

### 2. Create the Webhook Endpoint

**Stripe Dashboard → Developers → Webhooks → Add endpoint**

- **URL**: `https://api.planloo.com/api/v1/billing/webhook`
- **Events to select**:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.payment_succeeded`

After saving, click **Reveal signing secret** — use that value for `STRIPE_WEBHOOK_SECRET`.

### 3. Configure Customer Portal

**Stripe Dashboard → Settings → Billing → Customer portal** — enable:
- Cancellation
- Invoice history
- Payment method updates

---

## Environment Variables

### Secrets (set via `wrangler secret put`)

```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
```

Apply per environment:
```bash
wrangler secret put STRIPE_SECRET_KEY --env staging
wrangler secret put STRIPE_SECRET_KEY --env production
```

### Price IDs (in `wrangler.toml` — not secret)

Add under `[vars]` for each environment:

```toml
STRIPE_PRICE_PERSONAL_MONTHLY = "price_xxx"
STRIPE_PRICE_PERSONAL_ANNUAL  = "price_xxx"
STRIPE_PRICE_PLANNER_MONTHLY  = "price_xxx"
STRIPE_PRICE_PLANNER_ANNUAL   = "price_xxx"
STRIPE_PRICE_AGENCY_MONTHLY   = "price_xxx"
STRIPE_PRICE_AGENCY_ANNUAL    = "price_xxx"
```

---

## Stripe Client Factory

**File:** `backend/src/lib/stripe.ts`

```typescript
import Stripe from 'stripe';

export function createStripeClient(env: Env): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
    httpClient: Stripe.createFetchHttpClient(), // Required for Workers
  });
}
```

> **Critical:** The standard Node.js HTTP client is not available in Cloudflare Workers. `Stripe.createFetchHttpClient()` must be used.

`getStripePriceId(env, plan, interval)` reads the correct price ID from env vars based on plan + interval.

---

## Checkout Flow

```
Browser                   Backend                    Stripe
  │                          │                          │
  ├─ POST /billing/checkout ─▶│                          │
  │                          ├─ customers.create ───────▶│
  │                          │◀─ { id: "cus_xxx" } ─────┤
  │                          ├─ UPDATE subscriptions     │
  │                          ├─ sessions.create ────────▶│
  │                          │◀─ { url: "https://..." } ─┤
  │◀─ { url } ───────────────┤                          │
  │                          │                          │
  ├─ redirect to Stripe ────────────────────────────────▶│
  │                          │                          │
  │◀──────────────── redirect to /dashboard/billing?success=1
  │                          │                          │
  │                          │◀─ webhook: checkout.session.completed
  │                          ├─ UPDATE subscriptions     │
```

---

## Webhook Setup

The webhook route is registered **before** `app.route('/api/v1', api)` in `backend/src/index.ts`. This is required because:

1. Stripe signature verification needs the **raw request body** — consuming it as JSON first would break verification.
2. The auth middleware inside `api` would run unnecessarily (Stripe sends no cookies).

**Stripe Dashboard configuration:**
- URL: `https://api.planloo.com/api/v1/billing/webhook`
- Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.payment_succeeded`

**Local testing:**
```bash
stripe listen --forward-to localhost:8787/api/v1/billing/webhook
stripe trigger checkout.session.completed
```

---

## Metadata Strategy

Metadata is stored on both the Checkout session and subscription to ensure the `userId` is always recoverable in webhook handlers:

| Object | Metadata field | Value |
|---|---|---|
| `checkout.session` | `metadata.userId` | User's DB ID |
| `subscription_data` | `metadata.userId` | User's DB ID |
| `subscription_data` | `metadata.plan` | `personal` \| `planner` \| `agency` |

This allows both `checkout.session.completed` and `customer.subscription.updated` to look up the correct `subscriptions` row without an extra Stripe API call.

---

## Customer Portal

The Customer Portal is configured in the Stripe Dashboard under **Settings → Billing → Customer portal**. Configure:
- Allow plan upgrades/downgrades (optional — managed by Planloo checkout flow instead)
- Allow cancellation
- Show invoice history
- Allow payment method updates

The portal session's `return_url` is set to `{FRONTEND_URL}/dashboard/billing`.
