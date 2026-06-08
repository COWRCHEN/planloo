# Data Model Changes

The current billing system stores a single `plan` enum value per user and computes limits from the static `PLAN_LIMITS` constant in `backend/src/lib/plan-limits.ts`. Unit pricing requires storing per-user, per-unit quantities and computing limits dynamically from those quantities.

---

## Current Schema (reference)

**File**: `backend/src/db/schema/billing.ts`

```
subscriptions
├── id                    INT PK
├── userId                TEXT FK → user.id  (UNIQUE)
├── plan                  ENUM free|personal|planner|agency|enterprise
├── status                ENUM active|trialing|past_due|canceled|incomplete|free
├── stripeCustomerId      TEXT (UNIQUE)
├── stripeSubscriptionId  TEXT (UNIQUE)
├── stripePriceId         TEXT  ← single price ID (becomes obsolete)
├── currentPeriodStart    TIMESTAMP
├── currentPeriodEnd      TIMESTAMP
├── cancelAtPeriodEnd     BOOLEAN
├── canceledAt            TIMESTAMP
├── customLimits          TEXT  ← JSON, enterprise-only override
├── emailsSentThisPeriod  INT
├── smsSentThisPeriod     INT
├── createdAt             TIMESTAMP
└── updatedAt             TIMESTAMP
```

---

## New Table: `user_subscription_items`

Each row represents one type of purchased unit. `quantity` is the number of units bought (e.g., `quantity = 3` for 3,000 emails).

```sql
CREATE TABLE user_subscription_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  item_type       TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  stripe_item_id  TEXT,
  active_from     INTEGER,  -- Unix timestamp, milliseconds
  active_to       INTEGER,  -- NULL = currently active
  created_at      INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX idx_subscription_items_user ON user_subscription_items(user_id);
CREATE INDEX idx_subscription_items_active ON user_subscription_items(user_id, active_to)
  WHERE active_to IS NULL;
```

### `item_type` Values

| item_type | Unit | Stacks? |
|-----------|------|---------|
| `events` | 1 event | Yes |
| `guests` | 100 guests | Yes |
| `emails` | 1,000 emails | Yes |
| `sms` | 100 SMS | Yes |
| `collaborators` | 1 collab/event | Yes |
| `custom_fields` | 1 field | Yes |
| `org_members` | 1 member (beyond 2) | Yes |
| `floor_plans` | unlock (qty always 1) | No |
| `organizations` | unlock (qty always 1) | No |
| `audit_history` | unlock (qty always 1) | No |
| `sso` | unlock (qty always 1) | No |

---

## Changes to `subscriptions` Table

The `plan` and `stripePriceId` columns become unused for new subscribers. They remain in the schema for backward compatibility with legacy tier subscribers during migration.

No columns need to be added to `subscriptions`. The `stripeSubscriptionId` is reused — the customer still has one Stripe subscription, but now with multiple items.

---

## `computeLimits(items)` — Replaces `PLAN_LIMITS[plan]`

**File to modify**: `backend/src/lib/plan-limits.ts`

New function signature:
```typescript
function computeLimits(items: UserSubscriptionItem[]): PlanLimits
```

Logic:
1. Start with the **free base** limits (1 event, 50 guests, 0 emails, etc.).
2. For each active item, add `quantity × unitSize` to the relevant limit.
3. Feature unlocks (`floor_plans`, `organizations`, etc.) flip the boolean flags.

```typescript
const FREE_BASE: PlanLimits = {
  maxEvents: 1,
  maxGuests: 50,
  maxEmailsPerMonth: 0,
  maxSmsPerMonth: 0,
  maxCollaboratorsPerEvent: 0,
  maxCustomFields: 0,
  maxOrganizations: 0,
  maxOrgMembers: 2,   // 2 included per org (owner + 1)
  csvImportExport: true,   // always free
  floorPlans: false,
  budgetTracking: true,    // always free
  taskTemplates: true,     // always free
  vendorManagement: true,  // always free
  guestAuditHistory: false,
  sso: false,
};

const UNIT_SIZES: Record<string, Partial<PlanLimits>> = {
  events:        { maxEvents: 1 },
  guests:        { maxGuests: 100 },
  emails:        { maxEmailsPerMonth: 1000 },
  sms:           { maxSmsPerMonth: 100 },
  collaborators: { maxCollaboratorsPerEvent: 1 },
  custom_fields: { maxCustomFields: 1 },
  org_members:   { maxOrgMembers: 1 },
  floor_plans:   { floorPlans: true },
  organizations: { maxOrganizations: 1 },
  audit_history: { guestAuditHistory: true },
  sso:           { sso: true },
};
```

---

## Middleware Changes

**File**: `backend/src/middleware/subscription.ts`

`loadSubscription` middleware currently looks up `subscriptions` and calls `resolveEnterpriseLimits()`. After this change it:
1. Loads `user_subscription_items WHERE active_to IS NULL` for the user.
2. Calls `computeLimits(items)` to produce `PlanLimits`.
3. For legacy tier users (no items row, has `plan` set): falls back to current `PLAN_LIMITS[plan]` behavior.
4. Sets `c.set('planLimits', limits)` as before.

The `billing-checks.ts` functions (`checkEventCreationLimit`, `checkGuestLimit`, etc.) are unchanged — they already receive `limits: PlanLimits`.

---

## Drizzle Schema (Drizzle ORM definition)

```typescript
// backend/src/db/schema/billing.ts — add below existing subscriptions table

export const userSubscriptionItems = sqliteTable(
  'user_subscription_items',
  {
    id:           integer('id').primaryKey({ autoIncrement: true }),
    userId:       text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    itemType:     text('item_type').notNull(),
    quantity:     integer('quantity').notNull().default(1),
    stripeItemId: text('stripe_item_id'),
    activeFrom:   integer('active_from', { mode: 'timestamp' }),
    activeTo:     integer('active_to', { mode: 'timestamp' }),
    createdAt:    integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt:    integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    index('idx_sub_items_user').on(t.userId),
  ]
);
```

Run `npm run db:generate` then `npm run db:migrate:local` to apply.
