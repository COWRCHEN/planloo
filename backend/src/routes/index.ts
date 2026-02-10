/**
 * API Routes Index
 *
 * Main API router that mounts all route handlers.
 */

import { Hono } from 'hono';
import type { HonoEnv } from '@/types/env';
import { authMiddleware, requireAuth } from '@/middleware/auth';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull, sql, count } from 'drizzle-orm';
import users from './users';
import uploads from './uploads';
import events from './events';
import guests from './guests';
import budget from './budget';
import providers from './providers';
import venues from './venues';
import eventProviders from './event-providers';
import rsvp from './rsvp';
import emailLog from './notification-settings';

const api = new Hono<HonoEnv>();

// Apply auth middleware to all routes
api.use('*', authMiddleware);

/**
 * GET /api/v1/me
 * Get current authenticated user
 */
api.get('/me', requireAuth, (c) => {
  const user = c.get('user')!;
  const session = c.get('session')!;

  return c.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        image: user.image,
        platformRole: user.platformRole,
        isActive: user.isActive,
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
    },
  });
});

/**
 * GET /api/v1/budget/summary
 * Cross-event budget summary for the authenticated user
 */
api.get('/budget/summary', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  // Get all user's non-deleted events that have budget items
  const userEvents = await db
    .select({
      id: schema.events.id,
      uuid: schema.events.uuid,
      title: schema.events.title,
      startDate: schema.events.startDate,
      budgetTotal: schema.events.budgetTotal,
    })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.userId, user.id),
        isNull(schema.events.deletedAt)
      )
    );

  if (userEvents.length === 0) {
    return c.json({
      success: true,
      data: {
        totalEstimated: 0,
        totalActual: 0,
        totalPaid: 0,
        totalItems: 0,
        events: [],
      },
    });
  }

  const eventIds = userEvents.map((e) => e.id);

  // Aggregate budget data per event
  const perEventBudget = await db
    .select({
      eventId: schema.budgetItems.eventId,
      totalEstimated: sql<number>`COALESCE(SUM(${schema.budgetItems.estimatedCost}), 0)`,
      totalActual: sql<number>`COALESCE(SUM(${schema.budgetItems.actualCost}), 0)`,
      itemCount: count(),
    })
    .from(schema.budgetItems)
    .where(
      and(
        sql`${schema.budgetItems.eventId} IN (${sql.join(eventIds.map(id => sql`${id}`), sql`, `)})`,
        isNull(schema.budgetItems.deletedAt)
      )
    )
    .groupBy(schema.budgetItems.eventId);

  // Get total paid per event (via payments joined to budget items)
  const perEventPaid = await db
    .select({
      eventId: schema.budgetItems.eventId,
      totalPaid: sql<number>`COALESCE(SUM(${schema.payments.amount}), 0)`,
    })
    .from(schema.payments)
    .innerJoin(schema.budgetItems, eq(schema.payments.budgetItemId, schema.budgetItems.id))
    .where(
      and(
        sql`${schema.budgetItems.eventId} IN (${sql.join(eventIds.map(id => sql`${id}`), sql`, `)})`,
        isNull(schema.budgetItems.deletedAt)
      )
    )
    .groupBy(schema.budgetItems.eventId);

  // Build lookup maps
  const budgetMap: Record<number, { totalEstimated: number; totalActual: number; itemCount: number }> = {};
  for (const row of perEventBudget) {
    budgetMap[row.eventId] = { totalEstimated: row.totalEstimated, totalActual: row.totalActual, itemCount: row.itemCount };
  }

  const paidMap: Record<number, number> = {};
  for (const row of perEventPaid) {
    paidMap[row.eventId] = row.totalPaid;
  }

  // Build per-event response
  let grandEstimated = 0;
  let grandActual = 0;
  let grandPaid = 0;
  let grandItems = 0;

  const eventsData = userEvents.map((evt) => {
    const b = budgetMap[evt.id] ?? { totalEstimated: 0, totalActual: 0, itemCount: 0 };
    const paid = paidMap[evt.id] ?? 0;

    grandEstimated += b.totalEstimated;
    grandActual += b.totalActual;
    grandPaid += paid;
    grandItems += b.itemCount;

    return {
      uuid: evt.uuid,
      title: evt.title,
      startDate: evt.startDate,
      budgetTotal: evt.budgetTotal,
      totalEstimated: b.totalEstimated,
      totalActual: b.totalActual,
      totalPaid: paid,
      itemCount: b.itemCount,
    };
  });

  return c.json({
    success: true,
    data: {
      totalEstimated: grandEstimated,
      totalActual: grandActual,
      totalPaid: grandPaid,
      totalItems: grandItems,
      events: eventsData,
    },
  });
});

// Mount route handlers
api.route('/users', users);
api.route('/uploads', uploads);
api.route('/events', events);
api.route('/events/:eventUuid/guests', guests);
api.route('/events/:eventUuid/budget', budget);
api.route('/providers', providers);
api.route('/venues', venues);
api.route('/events/:eventUuid/providers', eventProviders);
api.route('/events/:eventUuid/email-log', emailLog);
api.route('/rsvp', rsvp); // Public routes (auth middleware is applied but not required)

export default api;
