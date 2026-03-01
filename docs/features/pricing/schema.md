# Billing Database Schema

## Tables

### `subscriptions`

**File:** `backend/src/db/schema/billing.ts`
**Migration:** `backend/drizzle/0038_add_subscriptions.sql`

One row per user. Auto-created with `plan='free'` when a new user registers (via `databaseHooks.user.create.after` in `auth.ts`).

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | INTEGER PK | auto | Internal primary key |
| `user_id` | TEXT UNIQUE FK | — | References `user.id` (cascade delete) |
| `plan` | TEXT enum | `'free'` | `free` \| `personal` \| `planner` \| `agency` |
| `stripe_customer_id` | TEXT UNIQUE | `null` | Stripe Customer ID (set on first checkout) |
| `stripe_subscription_id` | TEXT UNIQUE | `null` | Stripe Subscription ID |
| `stripe_price_id` | TEXT | `null` | Active Stripe Price ID |
| `status` | TEXT enum | `'free'` | `active` \| `trialing` \| `past_due` \| `canceled` \| `incomplete` \| `free` |
| `current_period_start` | TIMESTAMP | `null` | Start of current billing period |
| `current_period_end` | TIMESTAMP | `null` | End of current billing period (renewal date) |
| `cancel_at_period_end` | BOOLEAN | `false` | Scheduled to cancel at period end |
| `canceled_at` | TIMESTAMP | `null` | When the subscription was canceled |
| `emails_sent_this_period` | INTEGER | `0` | Email sends consumed this billing period |
| `sms_sent_this_period` | INTEGER | `0` | SMS sends consumed (reserved for future use) |
| `created_at` | TIMESTAMP | `unixepoch()` | Row creation time |
| `updated_at` | TIMESTAMP | `unixepoch()` | Last update time |

**Indexes:**
- `subscriptions_user_id_idx` on `user_id`
- `subscriptions_stripe_customer_idx` on `stripe_customer_id`

---

## TypeScript Types

**File:** `backend/src/db/types.ts`

```typescript
export type Subscription    = InferSelectModel<typeof schema.subscriptions>;
export type NewSubscription = InferInsertModel<typeof schema.subscriptions>;
export type SubscriptionPlan   = 'free' | 'personal' | 'planner' | 'agency';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'free';
```

---

## Relationships

```
user (1) ──── (1) subscriptions
```

---

## Usage Counter Lifecycle

`emails_sent_this_period` is incremented atomically after each successful email send via `incrementEmailCount(db, userId, count)`. It is reset to `0`:

- On `checkout.session.completed` (new subscription)
- On `invoice.payment_succeeded` (renewal)
- On `customer.subscription.updated` when `current_period_start` changes (new billing period)
- On `customer.subscription.deleted` (downgrade to free)

---

## Context Variable (`HonoEnv.Variables.subscription`)

**File:** `backend/src/types/env.ts`

Populated by `loadSubscription` middleware on every authenticated request:

```typescript
subscription?: {
  plan: 'free' | 'personal' | 'planner' | 'agency';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'free';
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  emailsSentThisPeriod: number;
};
```

Access in route handlers: `c.get('subscription')`
