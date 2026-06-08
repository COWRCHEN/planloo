# Migration — Existing Tier Subscribers

Existing Personal, Planner, and Agency subscribers must not be forced off their plans. The migration is **voluntary and self-service**, with no hard cutoff date in v1.

---

## Strategy

1. **No forced migration.** Legacy tier subscribers keep their current plan and limits unchanged.
2. **Opt-in conversion.** A migration wizard in the billing dashboard lets customers see their equivalent unit-based cost and switch voluntarily.
3. **Legacy plan detection.** The `loadSubscription` middleware checks whether a user has rows in `user_subscription_items`. If none exist and `subscriptions.plan` is a legacy tier, it uses `PLAN_LIMITS[plan]` as before.
4. **One-way conversion.** Once a customer converts to unit pricing, they cannot revert to a legacy tier. Grandfathered pricing is not re-selectable.

---

## Legacy Plan Support in Middleware

```typescript
// backend/src/middleware/subscription.ts

const items = await db.select()
  .from(schema.userSubscriptionItems)
  .where(and(
    eq(schema.userSubscriptionItems.userId, userId),
    isNull(schema.userSubscriptionItems.activeTo)
  ));

let limits: PlanLimits;
if (items.length > 0) {
  limits = computeLimits(items);               // new unit-based path
} else {
  limits = resolveEffectiveLimits(sub);        // existing legacy path
}
c.set('planLimits', limits);
```

No other route code changes — `billing-checks.ts` already receives `limits: PlanLimits` and is agnostic to how those limits were computed.

---

## Migration Wizard (Frontend)

A "Switch to flexible pricing" card appears in `/dashboard/billing` for customers on legacy tiers.

**Step 1 — Show current cost**: Your current plan: Planner — $39.99/mo.

**Step 2 — Show equivalent unit cost**: Based on your last 3 months of usage, your equivalent unit-based cost would be approximately $X/mo. Here's the breakdown: [item list].

**Step 3 — Confirm**: Switch now. Your billing will be prorated. You cannot return to the Planner tier after switching.

The wizard calls `POST /api/v1/billing/migrate` which:
1. Cancels the existing Stripe subscription at period end (`cancel_at_period_end: true`).
2. Creates a new Stripe subscription with the selected unit items.
3. Sets `activeTo = new Date(periodEnd)` on the legacy subscription row.
4. Inserts new `user_subscription_items` rows with `activeFrom = periodEnd` so limits switch at the same time billing switches.

---

## Equivalent Unit Mapping (for Wizard Suggestions)

When suggesting a unit configuration to a migrating customer, use their actual usage from the last billing period where available, or the limits of their current plan as a ceiling.

| Legacy plan | Suggested units |
|-------------|-----------------|
| Personal | 3 events, 200 guests, 1 email block (1,000), 2 collaborators, 3 custom fields |
| Planner | 25 events, 600 guests, 3 email blocks, 10 collaborators, 10 custom fields, floor plans unlock |
| Agency | 100 events, 2,000 guests, 20 email blocks, 5 collaborator blocks, 10 custom fields, floor plans, orgs, audit history |

Customers can adjust the suggested quantities up or down before confirming.

---

## Enterprise

Enterprise subscribers are not migrated to unit pricing — they have custom limits negotiated via sales. Enterprise plans continue to use the `customLimits` JSON column on `subscriptions` and are handled by `resolveEnterpriseLimits()` as today.

---

## Timeline

| Phase | Scope |
|-------|-------|
| v1 | Unit pricing available for new signups; legacy plans frozen |
| v2 | Migration wizard added to billing dashboard |
| v3 | Grandfathered pricing end-of-life announcement (minimum 6 months notice) |
