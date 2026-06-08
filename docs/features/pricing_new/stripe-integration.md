# Stripe Integration

Unit pricing maps naturally to **Stripe Subscription Items**. One customer, one Stripe subscription, multiple line items — one per purchased unit type.

---

## Concepts

| Concept | Current | Unit pricing |
|---------|---------|-------------|
| Products | 3 (Personal, Planner, Agency) | ~12 (one per item type) |
| Prices | 6 (monthly + annual × 3 plans) | ~22 (monthly + annual × 11 paid items) |
| Subscription items | 1 per customer | N per customer (one per active item type) |
| Quantity | Always 1 | 1–N depending on units purchased |

---

## Stripe Product Setup

Create one Stripe Product per item type. Each product has two Prices: monthly and annual.

```
Product: "Events"
  Price: events_monthly   — $3.00/mo,  per_unit, recurring monthly
  Price: events_annual    — $30.60/yr, per_unit, recurring yearly

Product: "Guests"
  Price: guests_monthly   — $2.00/mo,  per_unit, recurring monthly
  Price: guests_annual    — $20.40/yr, per_unit, recurring yearly

Product: "Emails"
  Price: emails_monthly   — $2.00/mo,  per_unit, recurring monthly
  Price: emails_annual    — $20.40/yr, per_unit, recurring yearly

Product: "SMS"
  Price: sms_monthly      — $5.00/mo,  per_unit, recurring monthly
  Price: sms_annual       — $51.00/yr, per_unit, recurring yearly

Product: "Collaborators"
  Price: collabs_monthly  — $1.00/mo,  per_unit, recurring monthly
  Price: collabs_annual   — $10.20/yr, per_unit, recurring yearly

Product: "Custom Guest Fields"
  Price: fields_monthly   — $3.00/mo,  per_unit, recurring monthly
  Price: fields_annual    — $30.60/yr, per_unit, recurring yearly

Product: "Org Members"
  Price: org_members_monthly — $5.00/mo,  per_unit, recurring monthly
  Price: org_members_annual  — $51.00/yr, per_unit, recurring yearly

Product: "Floor Plans"
  Price: floor_plans_monthly — $10.00/mo, recurring monthly
  Price: floor_plans_annual  — $102.00/yr, recurring yearly

Product: "Organizations"
  Price: orgs_monthly     — $10.00/mo, recurring monthly
  Price: orgs_annual      — $102.00/yr, recurring yearly

Product: "Guest Audit History"
  Price: audit_monthly    — $8.00/mo,  recurring monthly
  Price: audit_annual     — $81.60/yr, recurring yearly
```

Store all Price IDs in `wrangler.toml` vars (same pattern as current `STRIPE_PRICE_*` vars).

---

## Checkout Flow

Replace the current single-price checkout with a **multi-item checkout session**.

```typescript
// POST /api/v1/billing/checkout
// Body: { items: Array<{ itemType: string; quantity: number }>, interval: 'monthly' | 'annual' }

const lineItems = items.map(({ itemType, quantity }) => ({
  price: getStripePriceId(env, itemType, interval),
  quantity,
}));

const session = await stripe.checkout.sessions.create({
  customer: stripeCustomerId,
  mode: 'subscription',
  line_items: lineItems,
  success_url: `${env.FRONTEND_URL}/dashboard/billing?success=1`,
  cancel_url:  `${env.FRONTEND_URL}/dashboard/billing`,
});
```

---

## Modifying Units (Add / Remove)

Customers change their unit mix via the billing dashboard (not Stripe portal, which doesn't support item-level editing well).

```typescript
// POST /api/v1/billing/items
// Body: { itemType: string; quantity: number }  — quantity 0 = remove item

const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
const existingItem = subscription.items.data.find(
  i => i.price.id === targetPriceId
);

if (quantity === 0 && existingItem) {
  await stripe.subscriptionItems.del(existingItem.id);
} else if (existingItem) {
  await stripe.subscriptionItems.update(existingItem.id, { quantity });
} else {
  await stripe.subscriptionItems.create({
    subscription: stripeSubscriptionId,
    price: targetPriceId,
    quantity,
  });
}
```

Stripe automatically prorates charges for mid-period changes.

---

## Webhook Handling

The existing webhook handler in `backend/src/index.ts` handles `customer.subscription.updated`. After unit pricing, this event must sync the new item quantities into `user_subscription_items`.

```typescript
case 'customer.subscription.updated': {
  const sub = event.data.object as Stripe.Subscription;
  const userId = await getUserIdByStripeCustomer(db, sub.customer as string);

  // Deactivate all current items
  await db.update(schema.userSubscriptionItems)
    .set({ activeTo: new Date() })
    .where(and(
      eq(schema.userSubscriptionItems.userId, userId),
      isNull(schema.userSubscriptionItems.activeTo)
    ));

  // Insert fresh rows from Stripe's item list
  for (const item of sub.items.data) {
    const itemType = getPriceItemType(item.price.id); // reverse lookup from env vars
    await db.insert(schema.userSubscriptionItems).values({
      userId,
      itemType,
      quantity: item.quantity ?? 1,
      stripeItemId: item.id,
      activeFrom: new Date(sub.current_period_start * 1000),
    });
  }

  // Reset email/SMS counters if period rolled over (same logic as today)
  break;
}
```

`customer.subscription.deleted` deactivates all items (sets `activeTo = now`), effectively dropping the user back to free base limits.

---

## Email / SMS Period Reset

The current reset logic (triggered by `invoice.payment_succeeded`) is unchanged — `emailsSentThisPeriod` and `smsSentThisPeriod` columns on `subscriptions` still track usage. The purchased quantity (`emails` units × 1,000) becomes the cap, computed from `user_subscription_items` instead of `PLAN_LIMITS[plan].maxEmailsPerMonth`.

---

## Environment Variables (additions to `wrangler.toml`)

```toml
[vars]
# Existing Stripe price vars removed in favor of unit-based vars:
STRIPE_PRICE_EVENTS_MONTHLY        = "price_..."
STRIPE_PRICE_EVENTS_ANNUAL         = "price_..."
STRIPE_PRICE_GUESTS_MONTHLY        = "price_..."
STRIPE_PRICE_GUESTS_ANNUAL         = "price_..."
STRIPE_PRICE_EMAILS_MONTHLY        = "price_..."
STRIPE_PRICE_EMAILS_ANNUAL         = "price_..."
STRIPE_PRICE_SMS_MONTHLY           = "price_..."
STRIPE_PRICE_SMS_ANNUAL            = "price_..."
STRIPE_PRICE_COLLABS_MONTHLY       = "price_..."
STRIPE_PRICE_COLLABS_ANNUAL        = "price_..."
STRIPE_PRICE_FIELDS_MONTHLY        = "price_..."
STRIPE_PRICE_FIELDS_ANNUAL         = "price_..."
STRIPE_PRICE_ORG_MEMBERS_MONTHLY   = "price_..."
STRIPE_PRICE_ORG_MEMBERS_ANNUAL    = "price_..."
STRIPE_PRICE_FLOOR_PLANS_MONTHLY   = "price_..."
STRIPE_PRICE_FLOOR_PLANS_ANNUAL    = "price_..."
STRIPE_PRICE_ORGS_MONTHLY          = "price_..."
STRIPE_PRICE_ORGS_ANNUAL           = "price_..."
STRIPE_PRICE_AUDIT_MONTHLY         = "price_..."
STRIPE_PRICE_AUDIT_ANNUAL          = "price_..."
```
