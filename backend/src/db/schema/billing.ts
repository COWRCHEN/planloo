import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';

export const ITEM_TYPES = [
  'basic_plan',
  'events', 'guests', 'emails', 'sms', 'collaborators',
  'custom_fields', 'org_members', 'floor_plans', 'organizations',
  'audit_history', 'sso',
] as const;

export type ItemType = typeof ITEM_TYPES[number];

/**
 * Subscriptions Table
 *
 * One row per user, tracks their current plan, Stripe IDs, and
 * monthly usage counters (emails + SMS sent this period).
 */
export const subscriptions = sqliteTable(
  'subscriptions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),

    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),

    plan: text('plan', {
      enum: ['free', 'personal', 'planner', 'agency', 'enterprise'],
    })
      .notNull()
      .default('free'),

    // Stripe identifiers
    stripeCustomerId: text('stripe_customer_id').unique(),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    stripePriceId: text('stripe_price_id'),

    status: text('status', {
      enum: ['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'free'],
    })
      .notNull()
      .default('free'),

    // Current billing period (Unix timestamps)
    currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }),
    currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }),

    cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' })
      .default(false)
      .notNull(),
    canceledAt: integer('canceled_at', { mode: 'timestamp' }),

    // Per-customer limits for enterprise plans (JSON string: Partial<PlanLimits> | null)
    customLimits: text('custom_limits'),

    // Monthly usage counters — reset each billing period
    emailsSentThisPeriod: integer('emails_sent_this_period').default(0).notNull(),
    smsSentThisPeriod: integer('sms_sent_this_period').default(0).notNull(),

    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    userIdIdx: index('subscriptions_user_id_idx').on(t.userId),
    stripeCustomerIdx: index('subscriptions_stripe_customer_idx').on(t.stripeCustomerId),
  })
);

/**
 * User Subscription Items
 *
 * Unit-based pricing: one row per purchased item type per user.
 * quantity = number of units (e.g. 3 = 3,000 emails, 3 = 3 extra events).
 * activeTo = NULL means currently active; set on cancellation/modification.
 */
export const userSubscriptionItems = sqliteTable(
  'user_subscription_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    itemType: text('item_type').notNull(),

    quantity: integer('quantity').notNull().default(1),

    stripeItemId: text('stripe_item_id'),

    activeFrom: integer('active_from', { mode: 'timestamp' }),
    activeTo: integer('active_to', { mode: 'timestamp' }),

    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    userIdIdx: index('sub_items_user_id_idx').on(t.userId),
    activeIdx: index('sub_items_active_idx').on(t.userId, t.activeTo),
  })
);
