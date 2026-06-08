# Go-Live Plan — Modular Unit Pricing

This covers what must happen before the unit-pricing changes (currently uncommitted on `dev`) can ship to staging and production on Cloudflare Workers/Pages, plus the deploy steps and smoke tests.

Related: [README](./README.md) · [stripe-integration.md](./stripe-integration.md) · [data-model.md](./data-model.md) · [migration.md](./migration.md)

---

## 1. Current Implementation Status

| Area | Status |
|------|--------|
| `user_subscription_items` table + Drizzle schema | Done — `backend/drizzle/0040_user_subscription_items.sql` (not yet applied to any remote DB) |
| `computeLimits()` / `FREE_BASE_LIMITS` in `plan-limits.ts` | Done |
| `loadSubscription` middleware (items → enterprise → legacy tier → free fallback) | Done |
| `POST /billing/checkout` (multi-item line items) | Done |
| `POST /billing/items` (add/update/remove with proration) | Done |
| Webhook sync (`customer.subscription.created/updated/deleted` → `user_subscription_items`) | Done — **new** `customer.subscription.created` handler added |
| Frontend (`PricingTable`, `BillingView`, `use-billing` hooks) | Done |
| Stripe Products/Prices for the 11 unit types | **Not created** — all 22 `STRIPE_PRICE_*` vars are empty strings |
| Migration wizard for legacy tier subscribers | **Not built** — per `migration.md` this is scoped to v2; legacy subscribers stay on `PLAN_LIMITS[plan]` via the middleware fallback |

Net: this is a **v1 launch** — unit pricing for new signups, legacy tier subscribers untouched and frozen.

---

## 2. Pre-Launch Requirements

### 2.1 Stripe Dashboard (do this first — everything else depends on the price IDs)

Create **11 Products**, each with a **monthly** and **annual** recurring Price (22 prices total), per the table in [stripe-integration.md](./stripe-integration.md#stripe-product-setup):

`events`, `guests`, `emails`, `sms`, `collaborators`, `custom_fields`, `org_members`, `floor_plans`, `organizations`, `audit_history`, `sso`

Do this **twice** — once in Stripe **test mode** (for staging) and once in **live mode** (for production). Record every Price ID (`price_...`).

> ⚠️ While creating these, spot-check the existing legacy `STRIPE_PRICE_*` values in `[env.production.vars]` — they currently read `prod_U5EGZea0ylRtAq` etc. (a `prod_` prefix is a **Product** ID, not a **Price** ID, which Stripe Checkout requires). Confirm whether `getStripePriceId()` is actually working in production today, or whether this has been silently broken — fix it as part of this rollout if so.

### 2.2 Stripe Webhook Endpoint

The webhook handler in `backend/src/index.ts` now listens for `customer.subscription.created` in addition to `.updated`, `.deleted`, `checkout.session.completed`, `invoice.payment_failed`, and `invoice.payment_succeeded`. **Add `customer.subscription.created` to the subscribed events list** on each environment's webhook endpoint in the Stripe Dashboard (it's a new requirement introduced by this change — easy to miss since the endpoint URL itself doesn't change).

### 2.3 Environment Variables (`wrangler.toml`)

- Fill in all 22 `STRIPE_PRICE_*_MONTHLY` / `STRIPE_PRICE_*_ANNUAL` vars under `[env.development.vars]` with the **test-mode** price IDs from 2.1.
- **Add the same 22 vars to `[env.staging.vars]`** (test-mode IDs) and **`[env.production.vars]`** (live-mode IDs) — they don't exist in those blocks yet; only `development` has the (currently empty) placeholders.
- Revert the local-network leftovers before merging:
  - `FRONTEND_URL = "http://10.0.48.174:4321"` in `[env.development.vars]` → back to `http://localhost:4321`
  - the `origin?.startsWith('http://10.0.48.174:')` CORS allowance and the `[dev] ip = "0.0.0.0"` entry in `backend/src/index.ts` / `wrangler.toml` — these look like local-LAN testing changes, not something to ship.

### 2.4 Secrets

Confirm `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set for **staging** and **production** (test-mode key for staging, live-mode key for production):

```bash
wrangler secret put STRIPE_SECRET_KEY --env staging
wrangler secret put STRIPE_WEBHOOK_SECRET --env staging
wrangler secret put STRIPE_SECRET_KEY --env production
wrangler secret put STRIPE_WEBHOOK_SECRET --env production
```

### 2.5 Code review sanity checks

- Confirm `UNIT_SIZES`/`computeLimits()` quantities (100 guests, 1,000 emails, 100 SMS, etc.) match the published price list in [unit-pricing.md](./unit-pricing.md) — a mismatch here means customers get billed for one quantity but granted a different limit.
- `npm run type-check` and `npm run lint` clean in both `backend/` and `frontend/`.
- `npm run test` passing in `backend/` (webhook sync + `computeLimits` are good candidates for unit tests if not already covered).

---

## 3. Database Migration

Review `backend/drizzle/0040_user_subscription_items.sql` (per [[Drizzle migrations]] convention, check it only contains the new table + indexes, no stale diffs), then apply remotely:

```bash
cd backend
npm run db:migrate:staging      # wrangler d1 migrations apply planloo-db-staging --remote --env staging
npm run db:migrate:production   # wrangler d1 migrations apply planloo-db --remote --env production
```

Verify in `wrangler d1 execute ... --command "SELECT name FROM sqlite_master WHERE type='table'"` that `user_subscription_items` and its two indexes (`sub_items_user_id_idx`, `sub_items_active_idx`) exist before deploying app code that depends on them.

---

## 4. Deployment Steps

Deploy the **database migration before the backend code** (the new `loadSubscription` queries `user_subscription_items` unconditionally), and the **backend before the frontend** (new `/billing/items` endpoint and `items` field in `GET /billing`).

### Staging

```bash
cd backend
npm run db:migrate:staging
npm run deploy:staging
```

```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=<staging-project>   # or your existing staging deploy command
```

Then run the full smoke test checklist (§5) against staging using Stripe **test mode** (use `stripe listen --forward-to <staging-url>/api/v1/billing/webhook` if you need to trigger events manually, or trigger them via real test-mode checkouts).

### Production

Only after staging smoke tests pass:

```bash
cd backend
npm run db:migrate:production
npm run deploy:production
```

```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=<production-project>
```

Re-run the critical-path smoke tests (checkout → webhook → limits) in production with a real low-cost purchase (e.g., 1× `events` unit), then refund/cancel it.

---

## 5. Smoke Test / QA Checklist

- [ ] **New signup checkout**: select multiple unit items (e.g., 2 events + 1 email block) → Stripe Checkout completes → `customer.subscription.created` webhook fires → `user_subscription_items` has matching rows with correct `quantity` and `stripeItemId`
- [ ] **`GET /billing`** returns `items[]` and `limits` reflecting the purchased quantities (e.g., `maxActiveEvents = 1 (free base) + 2 = 3`)
- [ ] **Add a unit** via `/billing/items` (existing subscriber, new item type) → Stripe subscription item created, prorated invoice issued, `customer.subscription.updated` webhook resyncs `user_subscription_items`
- [ ] **Update quantity** of an existing unit → Stripe item quantity updated, proration invoiced, DB resynced
- [ ] **Remove a unit** (`quantity: 0`) → Stripe subscription item deleted, row's `activeTo` set, limits drop accordingly
- [ ] **Cancel subscription** → `customer.subscription.deleted` deactivates all `user_subscription_items` rows (`activeTo = now`), user falls back to `FREE_BASE_LIMITS` (1 event, 50 guests, CSV/budget/tasks/vendor still free)
- [ ] **Legacy tier subscriber** (existing Personal/Planner/Agency on the seed/staging data): confirm they have **no** `user_subscription_items` rows, middleware falls back to `PLAN_LIMITS[plan]`, and nothing in their billing experience changes
- [ ] **Free user, no subscription row**: `FREE_BASE_LIMITS` applied correctly
- [ ] **Frontend**: `PricingTable` renders the unit-selection UI and submits the `items[]` payload correctly; `BillingView` displays active items, usage, and the checkout/portal/item-management flows without console errors
- [ ] **Email/SMS period reset**: `invoice.payment_succeeded` still resets `emailsSentThisPeriod` for unit-based subscribers (cap now derived from purchased `emails` quantity rather than `PLAN_LIMITS`)

---

## 6. Rollback Plan

Because the new `loadSubscription` path only activates for users who actually have rows in `user_subscription_items` (everyone else falls through to the existing legacy/free logic unchanged), a rollback is low-risk:

1. **Backend**: `wrangler rollback --env production` (or redeploy the previous commit) — legacy and free users are unaffected since their code path is untouched.
2. **Any users who purchased unit items during the bad window**: their Stripe subscriptions remain valid; `user_subscription_items` rows stay in the DB (the table isn't dropped on rollback) so re-deploying the fixed version picks them back up via `loadSubscription`.
3. **Database**: do **not** roll back migration `0040` — it only adds a new table and is additive/non-destructive to existing data.

---

## 7. Post-Launch Roadmap (from [migration.md](./migration.md))

- **v2** — Build the "Switch to flexible pricing" migration wizard (`POST /billing/migrate`) so legacy tier subscribers can voluntarily convert.
- **v3** — Announce end-of-life for grandfathered tier pricing (minimum 6 months notice).
