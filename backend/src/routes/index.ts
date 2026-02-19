/**
 * API Routes Index
 *
 * Main API router that mounts all route handlers.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
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
import eventCollaborators from './event-collaborators';
import organizations from './organizations';
import rsvp from './rsvp';
import emailLog from './notification-settings';
import admin from './admin';
import floorPlanRoutes from './floor-plans';
import objectTemplateRoutes from './object-templates';
import taskRoutes from './tasks';
import dashboard from './dashboard';

const api = new Hono<HonoEnv>();

// Apply auth middleware to all routes
api.use('*', authMiddleware);

/**
 * GET /api/v1/me
 * Get current authenticated user (includes organizations)
 */
api.get('/me', requireAuth, async (c) => {
  const user = c.get('user')!;
  const session = c.get('session')!;
  const db = createDbClient(c.env.DB);

  // Fetch user's organizations
  const userOrgs = await db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      role: schema.organizationMember.role,
    })
    .from(schema.organizationMember)
    .innerJoin(schema.organization, eq(schema.organizationMember.organizationId, schema.organization.id))
    .where(
      and(
        eq(schema.organizationMember.userId, user.id),
        isNull(schema.organization.deletedAt)
      )
    );

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
      organizations: userOrgs,
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

  // Get all accessible events (personal + org + collaborator)
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
        sql`(
          ${schema.events.userId} = ${user.id}
          OR ${schema.events.organizationId} IN (
            SELECT ${schema.organizationMember.organizationId} FROM ${schema.organizationMember}
            WHERE ${schema.organizationMember.userId} = ${user.id}
          )
          OR ${schema.events.id} IN (
            SELECT ${schema.eventCollaborators.eventId} FROM ${schema.eventCollaborators}
            WHERE ${schema.eventCollaborators.userId} = ${user.id}
            AND ${schema.eventCollaborators.acceptedAt} IS NOT NULL
          )
        )`,
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

// ==================== INVITATION ROUTES ====================

/**
 * GET /api/v1/invitations/pending
 * List pending (non-expired, non-accepted) invitations for the authenticated user's email.
 * Used to show a banner on the dashboard so users don't miss invitations.
 */
api.get('/invitations/pending', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);
  const nowUnix = Math.floor(Date.now() / 1000);

  const invitations = await db
    .select({
      id: schema.organizationInvitation.id,
      token: schema.organizationInvitation.token,
      role: schema.organizationInvitation.role,
      expiresAt: schema.organizationInvitation.expiresAt,
      orgName: schema.organization.name,
      invitedByName: schema.user.name,
    })
    .from(schema.organizationInvitation)
    .innerJoin(
      schema.organization,
      eq(schema.organizationInvitation.organizationId, schema.organization.id)
    )
    .innerJoin(
      schema.user,
      eq(schema.organizationInvitation.invitedBy, schema.user.id)
    )
    .where(
      and(
        eq(schema.organizationInvitation.email, user.email),
        isNull(schema.organizationInvitation.acceptedAt),
        sql`${schema.organizationInvitation.expiresAt} > ${nowUnix}`
      )
    );

  return c.json({
    success: true,
    data: invitations.map((inv) => ({
      id: inv.id,
      token: inv.token,
      role: inv.role,
      organizationName: inv.orgName,
      invitedByName: inv.invitedByName,
      expiresAt: inv.expiresAt,
    })),
  });
});

/**
 * GET /api/v1/invitations/:token
 * Get invitation details by token (public — no auth required so email
 * recipients can view the invitation before logging in / signing up)
 */
api.get('/invitations/:token', async (c) => {
  const token = c.req.param('token');
  const db = createDbClient(c.env.DB);

  const [invitation] = await db
    .select({
      id: schema.organizationInvitation.id,
      email: schema.organizationInvitation.email,
      role: schema.organizationInvitation.role,
      expiresAt: schema.organizationInvitation.expiresAt,
      acceptedAt: schema.organizationInvitation.acceptedAt,
      orgName: schema.organization.name,
      orgType: schema.organization.type,
      invitedByName: schema.user.name,
    })
    .from(schema.organizationInvitation)
    .innerJoin(schema.organization, eq(schema.organizationInvitation.organizationId, schema.organization.id))
    .innerJoin(schema.user, eq(schema.organizationInvitation.invitedBy, schema.user.id))
    .where(eq(schema.organizationInvitation.token, token))
    .limit(1);

  if (!invitation) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Invitation not found' } },
      404
    );
  }

  if (invitation.acceptedAt) {
    return c.json(
      { success: false, error: { code: 'ALREADY_ACCEPTED', message: 'Invitation has already been accepted' } },
      410
    );
  }

  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    return c.json(
      { success: false, error: { code: 'EXPIRED', message: 'Invitation has expired' } },
      410
    );
  }

  return c.json({
    success: true,
    data: {
      id: invitation.id,
      organizationName: invitation.orgName,
      organizationType: invitation.orgType,
      email: invitation.email,
      role: invitation.role,
      invitedByName: invitation.invitedByName,
      expiresAt: invitation.expiresAt,
    },
  });
});

/**
 * POST /api/v1/invitations/accept
 * Accept an organization invitation
 */
api.post(
  '/invitations/accept',
  requireAuth,
  zValidator('json', z.object({ token: z.string().min(1) })),
  async (c) => {
    const user = c.get('user')!;
    const { token } = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    const [invitation] = await db
      .select()
      .from(schema.organizationInvitation)
      .where(eq(schema.organizationInvitation.token, token))
      .limit(1);

    if (!invitation) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Invitation not found' } },
        404
      );
    }

    if (invitation.acceptedAt) {
      return c.json(
        { success: false, error: { code: 'ALREADY_ACCEPTED', message: 'Invitation has already been accepted' } },
        410
      );
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      return c.json(
        { success: false, error: { code: 'EXPIRED', message: 'Invitation has expired' } },
        410
      );
    }

    // Verify email matches
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return c.json(
        { success: false, error: { code: 'EMAIL_MISMATCH', message: 'This invitation was sent to a different email address' } },
        403
      );
    }

    // Check not already a member
    const [existingMember] = await db
      .select({ id: schema.organizationMember.id })
      .from(schema.organizationMember)
      .where(
        and(
          eq(schema.organizationMember.organizationId, invitation.organizationId),
          eq(schema.organizationMember.userId, user.id)
        )
      )
      .limit(1);

    if (existingMember) {
      return c.json(
        { success: false, error: { code: 'ALREADY_MEMBER', message: 'You are already a member of this organization' } },
        409
      );
    }

    const now = new Date();

    // Use batch for atomicity
    await db.batch([
      // Mark invitation as accepted
      db
        .update(schema.organizationInvitation)
        .set({ acceptedAt: now })
        .where(eq(schema.organizationInvitation.id, invitation.id)),
      // Create member
      db
        .insert(schema.organizationMember)
        .values({
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role,
          invitedBy: invitation.invitedBy,
          invitedAt: invitation.createdAt,
          acceptedAt: now,
        }),
    ]);

    return c.json({
      success: true,
      data: { organizationId: invitation.organizationId },
    });
  }
);

// Mount route handlers
api.route('/users', users);
api.route('/uploads', uploads);
api.route('/organizations', organizations);
api.route('/events', events);
api.route('/events/:eventUuid/guests', guests);
api.route('/events/:eventUuid/budget', budget);
api.route('/events/:eventUuid/collaborators', eventCollaborators);
api.route('/providers', providers);
api.route('/venues', venues);
api.route('/events/:eventUuid/providers', eventProviders);
api.route('/events/:eventUuid/email-log', emailLog);
api.route('/events/:eventUuid/tasks', taskRoutes);
api.route('/events/:eventUuid/floor-plans', floorPlanRoutes);
api.route('/events/:eventUuid/floor-plans/:planUuid/object-templates', objectTemplateRoutes);
api.route('/dashboard', dashboard);
api.route('/rsvp', rsvp); // Public routes (auth middleware is applied but not required)
api.route('/admin', admin);

export default api;
