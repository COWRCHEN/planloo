/**
 * Billing Routes
 *
 * Stripe Checkout, Customer Portal, and subscription management.
 * Webhook handler is registered separately in index.ts (needs raw body).
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { requireAuth } from '@/middleware/auth';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq } from 'drizzle-orm';
import { createStripeClient, getStripePriceId } from '@/lib/stripe';
import { getPlanLimits } from '@/lib/plan-limits';

const billing = new Hono<HonoEnv>();

// ==================== SCHEMAS ====================

const checkoutSchema = z.object({
  plan: z.enum(['personal', 'planner', 'agency']),
  interval: z.enum(['monthly', 'annual']).default('monthly'),
});

// ==================== ROUTES ====================

/**
 * GET /billing
 * Return current subscription state, plan limits, and usage.
 */
billing.get('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  const [sub] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, user.id))
    .limit(1);

  const plan = sub?.plan ?? 'free';
  const limits = getPlanLimits(plan);

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
      limits,
      usage: {
        emailsSentThisPeriod: sub?.emailsSentThisPeriod ?? 0,
        emailPoolPerMonth: limits.emailPoolPerMonth,
      },
    },
  });
});

/**
 * POST /billing/checkout
 * Create a Stripe Checkout session and return the redirect URL.
 */
billing.post(
  '/checkout',
  requireAuth,
  zValidator('json', checkoutSchema),
  async (c) => {
    const user = c.get('user')!;
    const { plan, interval } = c.req.valid('json');
    const db = createDbClient(c.env.DB);
    const stripe = createStripeClient(c.env);

    // Get or create Stripe customer
    const [sub] = await db
      .select({
        stripeCustomerId: schema.subscriptions.stripeCustomerId,
      })
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

      // Persist customer ID immediately
      await db
        .update(schema.subscriptions)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(schema.subscriptions.userId, user.id));
    }

    const priceId = getStripePriceId(c.env, plan, interval);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${c.env.FRONTEND_URL}/dashboard/billing?success=1`,
      cancel_url: `${c.env.FRONTEND_URL}/dashboard/billing?canceled=1`,
      metadata: { userId: user.id },
      subscription_data: {
        metadata: { plan, userId: user.id },
      },
    });

    return c.json({ success: true, data: { url: session.url } });
  }
);

/**
 * POST /billing/portal
 * Create a Stripe Customer Portal session and return the redirect URL.
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
