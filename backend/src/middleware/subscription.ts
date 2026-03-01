/**
 * Subscription Middleware
 *
 * Loads the current user's subscription from DB and attaches it to the
 * Hono context as `c.get('subscription')`. Must run after authMiddleware.
 *
 * No-ops silently for unauthenticated requests (so public routes still work).
 */

import { createMiddleware } from 'hono/factory';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq } from 'drizzle-orm';

export const loadSubscription = createMiddleware<HonoEnv>(async (c, next) => {
  const user = c.get('user');

  // No user — skip silently (public routes, unauthenticated requests)
  if (!user) {
    await next();
    return;
  }

  try {
    const db = createDbClient(c.env.DB);
    const [sub] = await db
      .select({
        plan: schema.subscriptions.plan,
        status: schema.subscriptions.status,
        currentPeriodEnd: schema.subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: schema.subscriptions.cancelAtPeriodEnd,
        emailsSentThisPeriod: schema.subscriptions.emailsSentThisPeriod,
      })
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, user.id))
      .limit(1);

    if (sub) {
      c.set('subscription', {
        plan: sub.plan,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        emailsSentThisPeriod: sub.emailsSentThisPeriod,
      });
    } else {
      // No subscription row yet — treat as free
      c.set('subscription', {
        plan: 'free',
        status: 'free',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        emailsSentThisPeriod: 0,
      });
    }
  } catch (err) {
    // On error, fall back to free so the request can still proceed
    console.error('loadSubscription: failed to load subscription', err);
    c.set('subscription', {
      plan: 'free',
      status: 'free',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      emailsSentThisPeriod: 0,
    });
  }

  await next();
});
