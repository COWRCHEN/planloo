import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';

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
      enum: ['free', 'personal', 'planner', 'agency'],
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
