/**
 * Subscription Middleware
 *
 * Loads the current user's subscription and active unit items from DB,
 * then attaches `subscription` and `planLimits` to the Hono context.
 *
 * Priority:
 *   1. If user has active unit items → computeLimits(items)
 *   2. Enterprise plan → resolveEnterpriseLimits()
 *   3. Legacy tier → PLAN_LIMITS[plan]
 *   4. No subscription / inactive → FREE_BASE_LIMITS
 */

import { createMiddleware } from 'hono/factory';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull } from 'drizzle-orm';
import {
  getPlanLimits,
  resolveEnterpriseLimits,
  computeLimits,
  FREE_BASE_LIMITS,
} from '@/lib/plan-limits';

export const loadSubscription = createMiddleware<HonoEnv>(async (c, next) => {
  const user = c.get('user');

  if (!user) {
    await next();
    return;
  }

  try {
    const db = createDbClient(c.env.DB);

    const [[sub], items] = await Promise.all([
      db
        .select({
          plan: schema.subscriptions.plan,
          status: schema.subscriptions.status,
          currentPeriodEnd: schema.subscriptions.currentPeriodEnd,
          cancelAtPeriodEnd: schema.subscriptions.cancelAtPeriodEnd,
          emailsSentThisPeriod: schema.subscriptions.emailsSentThisPeriod,
          customLimits: schema.subscriptions.customLimits,
        })
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.userId, user.id))
        .limit(1),
      db
        .select({
          itemType: schema.userSubscriptionItems.itemType,
          quantity: schema.userSubscriptionItems.quantity,
        })
        .from(schema.userSubscriptionItems)
        .where(
          and(
            eq(schema.userSubscriptionItems.userId, user.id),
            isNull(schema.userSubscriptionItems.activeTo)
          )
        ),
    ]);

    const subStatus = sub?.status ?? 'free';
    const subPlan = sub?.plan ?? 'free';
    const isActive = subStatus === 'active' || subStatus === 'trialing';

    c.set('subscription', {
      plan: subPlan,
      status: subStatus,
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      emailsSentThisPeriod: sub?.emailsSentThisPeriod ?? 0,
    });

    let limits;
    if (items.length > 0 && isActive) {
      limits = computeLimits(items);
    } else if (isActive && subPlan === 'enterprise') {
      limits = resolveEnterpriseLimits(
        sub?.customLimits ? JSON.parse(sub.customLimits) : null
      );
    } else if (isActive) {
      limits = getPlanLimits(subPlan);
    } else {
      limits = FREE_BASE_LIMITS;
    }

    c.set('planLimits', limits);
  } catch (err) {
    console.error('loadSubscription: failed to load subscription', err);
    c.set('subscription', {
      plan: 'free',
      status: 'free',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      emailsSentThisPeriod: 0,
    });
    c.set('planLimits', FREE_BASE_LIMITS);
  }

  await next();
});
