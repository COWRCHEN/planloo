# Stripe Subscription Billing

**Feature:** 4-tier subscription system with Stripe Checkout, usage enforcement, and Customer Portal
**Status:** Implemented (Phase 1–3 + Frontend)
**Last Updated:** 2026-02-27
**SMS:** Not yet implemented (Phase 4 deferred)

---

## Overview

Planloo monetizes through a freemium model with four tiers. Access to features and resources is gated per-plan. Stripe powers checkout, renewals, and the Customer Portal. Every API mutation that touches a limited resource checks the user's plan before proceeding and returns HTTP 402 on violation.

### Key Capabilities

- 4 tiers: Free, Personal ($19.99/mo), Planner ($39.99/mo), Agency ($199.99/mo)
- 20% annual discount across all paid tiers
- Stripe Checkout for new subscriptions
- Stripe Customer Portal for plan changes, cancellations, and invoices
- Webhook-driven subscription sync (no polling)
- Per-request subscription load via middleware (single DB read)
- HTTP 402 errors with `upgradeTo` hint and upgrade URL
- Email quota tracking per billing period (auto-reset on renewal)
- Free subscription row auto-provisioned on every new user signup

---

## Table of Contents

1. [Pricing Tiers & Limits](./tiers.md)
2. [Database Schema](./schema.md)
3. [API Endpoints](./api.md)
4. [Limit Enforcement (Backend)](./limits.md)
5. [Plan Limit Enforcement (Frontend)](./plan-limit.md)
6. [Stripe Integration](./stripe.md)
7. [Frontend Components & Hooks](./frontend.md)

---

## Architecture Summary

```
New user signup
  └─▶ auth.ts databaseHooks.user.create.after
        └─▶ INSERT subscriptions (plan='free', status='free')

Every authenticated API request
  └─▶ authMiddleware (sets c.user)
  └─▶ loadSubscription (single DB read → c.subscription)

Mutation route (e.g. POST /events)
  └─▶ checkEventCreationLimit(db, userId, plan) → 402 if exceeded
  └─▶ proceed with insert

Stripe Checkout
  ├─▶ POST /api/v1/billing/checkout → Stripe session → redirect URL
  └─▶ Stripe webhook → /api/v1/billing/webhook (raw body, no auth)
        ├─▶ checkout.session.completed   → update plan + Stripe IDs
        ├─▶ customer.subscription.updated → sync status + period
        ├─▶ customer.subscription.deleted → downgrade to free
        ├─▶ invoice.payment_failed        → set past_due
        └─▶ invoice.payment_succeeded    → set active, reset email counter
```

---

## Files

| Path | Role |
|---|---|
| `backend/src/db/schema/billing.ts` | `subscriptions` table definition |
| `backend/drizzle/0038_add_subscriptions.sql` | Migration |
| `backend/src/lib/plan-limits.ts` | All tier limits + feature flags as constants |
| `backend/src/lib/billing-checks.ts` | Limit check functions + `incrementEmailCount` |
| `backend/src/lib/stripe.ts` | Stripe client factory (`createFetchHttpClient`) |
| `backend/src/middleware/subscription.ts` | `loadSubscription` middleware |
| `backend/src/routes/billing.ts` | `GET /billing`, `POST /billing/checkout`, `POST /billing/portal` |
| `backend/src/index.ts` | Stripe webhook handler (registered before auth middleware) |
| `backend/src/types/env.ts` | Stripe env vars + `subscription` context variable |
| `backend/src/lib/auth.ts` | Auto-provision free subscription on user create |
| `frontend/src/hooks/use-billing.ts` | TanStack Query billing hooks |
| `frontend/src/components/billing/BillingView.tsx` | Full billing page component |
| `frontend/src/components/billing/PricingTable.tsx` | 4-tier comparison table |
| `frontend/src/components/billing/UsageMeter.tsx` | Quota progress bars |
| `frontend/src/components/billing/CurrentPlanBadge.tsx` | Plan badge for nav/sidebar |
| `frontend/src/components/billing/UpgradePrompt.tsx` | Inline 402 error CTA |
| `frontend/src/pages/dashboard/billing.astro` | `/dashboard/billing` page (SSR) |
