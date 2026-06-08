/**
 * Billing Routes
 *
 * Unit-based pricing: checkout accepts an items array instead of a plan name.
 * Legacy tier subscriptions continue to work via the middleware path.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { requireAuth } from '@/middleware/auth';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull, count } from 'drizzle-orm';
import { createStripeClient, getStripeItemPriceId } from '@/lib/stripe';
import { computeLimits, FREE_BASE_LIMITS, resolveEnterpriseLimits } from '@/lib/plan-limits';
import { getEffectivePlan } from '@/lib/billing-checks';
import { ITEM_TYPES } from '@/db/schema/billing';

const billing = new Hono<HonoEnv>();

// ==================== SCHEMAS ====================

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        itemType: z.enum(ITEM_TYPES),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
  interval: z.enum(['monthly', 'annual']).default('monthly'),
});

const updateItemSchema = z.object({
  itemType: z.enum(ITEM_TYPES),
  quantity: z.number().int().min(0), // 0 = remove item
  interval: z.enum(['monthly', 'annual']).default('monthly'),
});

// ==================== ROUTES ====================

/**
 * GET /billing
 * Return current subscription state, active items, limits, and usage.
 */
billing.get('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  const [[sub], items, [eventCountRow], [guestCountRow], [orgCountRow]] = await Promise.all([
    db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, user.id))
      .limit(1),
    db
      .select({
        itemType: schema.userSubscriptionItems.itemType,
        quantity: schema.userSubscriptionItems.quantity,
        stripeItemId: schema.userSubscriptionItems.stripeItemId,
        activeFrom: schema.userSubscriptionItems.activeFrom,
      })
      .from(schema.userSubscriptionItems)
      .where(
        and(
          eq(schema.userSubscriptionItems.userId, user.id),
          isNull(schema.userSubscriptionItems.activeTo)
        )
      ),
    db
      .select({ total: count() })
      .from(schema.events)
      .where(and(eq(schema.events.userId, user.id), isNull(schema.events.deletedAt))),
    db
      .select({ total: count() })
      .from(schema.guests)
      .innerJoin(schema.events, eq(schema.guests.eventId, schema.events.id))
      .where(
        and(
          eq(schema.events.userId, user.id),
          isNull(schema.guests.deletedAt),
          isNull(schema.events.deletedAt)
        )
      ),
    db
      .select({ total: count() })
      .from(schema.organizationMember)
      .innerJoin(schema.organization, eq(schema.organizationMember.organizationId, schema.organization.id))
      .where(
        and(
          eq(schema.organizationMember.userId, user.id),
          eq(schema.organizationMember.role, 'admin'),
          isNull(schema.organization.deletedAt)
        )
      ),
  ]);

  const rawPlan = sub?.plan ?? 'free';
  const rawStatus = sub?.status ?? 'free';
  const isActive = rawStatus === 'active' || rawStatus === 'trialing';

  let limits;
  if (items.length > 0 && isActive) {
    limits = computeLimits(items);
  } else if (isActive && rawPlan === 'enterprise') {
    limits = resolveEnterpriseLimits(sub?.customLimits ? JSON.parse(sub.customLimits) : null);
  } else if (isActive) {
    const effectivePlan = getEffectivePlan(rawPlan, rawStatus);
    const { getPlanLimits } = await import('@/lib/plan-limits');
    limits = getPlanLimits(effectivePlan);
  } else {
    limits = FREE_BASE_LIMITS;
  }

  return c.json({
    success: true,
    data: {
      subscription: sub
        ? {
            plan: sub.plan,
            status: sub.status,
            stripeCustomerId: sub.stripeCustomerId,
            stripeSubscriptionId: sub.stripeSubscriptionId,
            currentPeriodStart: sub.currentPeriodStart,
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            canceledAt: sub.canceledAt,
            emailsSentThisPeriod: sub.emailsSentThisPeriod,
          }
        : null,
      items,
      limits,
      usage: {
        totalEvents: eventCountRow?.total ?? 0,
        totalGuests: guestCountRow?.total ?? 0,
        totalOrganizations: orgCountRow?.total ?? 0,
        emailsSentThisPeriod: sub?.emailsSentThisPeriod ?? 0,
        emailPoolPerMonth: limits.emailPoolPerMonth,
        smsSentThisPeriod: sub?.smsSentThisPeriod ?? 0,
        smsPoolPerMonth: limits.smsPoolPerMonth,
      },
    },
  });
});

/**
 * POST /billing/checkout
 * Create a Stripe Checkout session with unit-based line items.
 */
billing.post('/checkout', requireAuth, zValidator('json', checkoutSchema), async (c) => {
  const user = c.get('user')!;
  const { items, interval } = c.req.valid('json');
  const db = createDbClient(c.env.DB);
  const stripe = createStripeClient(c.env);

  const [sub] = await db
    .select({ stripeCustomerId: schema.subscriptions.stripeCustomerId })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, user.id))
    .limit(1);

  let customerId = sub?.stripeCustomerId ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      ...(user.name ? { name: user.name } : {}),
      metadata: { userId: user.id },
    });
    customerId = customer.id;

    await db
      .update(schema.subscriptions)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(schema.subscriptions.userId, user.id));
  }

  const lineItems = items.map(({ itemType, quantity }) => ({
    price: getStripeItemPriceId(c.env, itemType, interval),
    quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: lineItems,
    success_url: `${c.env.FRONTEND_URL}/dashboard/billing?success=1`,
    cancel_url: `${c.env.FRONTEND_URL}/dashboard/billing?canceled=1`,
    metadata: { userId: user.id },
    subscription_data: {
      metadata: { userId: user.id },
    },
  });

  return c.json({ success: true, data: { url: session.url } });
});

/**
 * POST /billing/items
 * Add, update (change quantity), or remove a unit from an active subscription.
 * quantity = 0 removes the item.
 */
billing.post('/items', requireAuth, zValidator('json', updateItemSchema), async (c) => {
  const user = c.get('user')!;
  const { itemType, quantity, interval } = c.req.valid('json');
  const db = createDbClient(c.env.DB);
  const stripe = createStripeClient(c.env);

  const [sub] = await db
    .select({
      stripeCustomerId: schema.subscriptions.stripeCustomerId,
      stripeSubscriptionId: schema.subscriptions.stripeSubscriptionId,
    })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, user.id))
    .limit(1);

  if (!sub?.stripeSubscriptionId) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NO_SUBSCRIPTION',
          message: 'No active subscription found. Use /billing/checkout to subscribe.',
        },
      },
      400
    );
  }

  const [existingItem] = await db
    .select({ stripeItemId: schema.userSubscriptionItems.stripeItemId })
    .from(schema.userSubscriptionItems)
    .where(
      and(
        eq(schema.userSubscriptionItems.userId, user.id),
        eq(schema.userSubscriptionItems.itemType, itemType),
        isNull(schema.userSubscriptionItems.activeTo)
      )
    )
    .limit(1);

  if (quantity === 0) {
    if (existingItem?.stripeItemId) {
      await stripe.subscriptionItems.del(existingItem.stripeItemId, {
        proration_behavior: 'always_invoice',
      });
    }
  } else if (existingItem?.stripeItemId) {
    await stripe.subscriptionItems.update(existingItem.stripeItemId, {
      quantity,
      proration_behavior: 'always_invoice',
    });
  } else {
    const priceId = getStripeItemPriceId(c.env, itemType, interval);
    await stripe.subscriptionItems.create({
      subscription: sub.stripeSubscriptionId,
      price: priceId,
      quantity,
      proration_behavior: 'always_invoice',
    });
  }

  // DB sync happens via customer.subscription.updated webhook
  return c.json({ success: true });
});

/**
 * POST /billing/portal
 * Create a Stripe Customer Portal session.
 */
billing.post('/portal', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);
  const stripe = createStripeClient(c.env);

  const [sub] = await db
    .select({ stripeCustomerId: schema.subscriptions.stripeCustomerId })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, user.id))
    .limit(1);

  if (!sub?.stripeCustomerId) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NO_STRIPE_CUSTOMER',
          message: 'No billing account found. Please start a subscription first.',
        },
      },
      400
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${c.env.FRONTEND_URL}/dashboard/billing`,
  });

  return c.json({ success: true, data: { url: session.url } });
});

export default billing;
