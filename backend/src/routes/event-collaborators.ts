/**
 * Event Collaborators Routes
 *
 * CRUD endpoints for managing event collaborators.
 * Mounted at /events/:eventUuid/collaborators
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requireVerifiedEmail } from '@/middleware/auth';
import { resolveEventAccess } from '@/lib/event-access';

const eventCollaborators = new Hono<HonoEnv>();

// ==================== SCHEMAS ====================

const inviteCollaboratorSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['owner', 'editor', 'viewer']).default('editor'),
});

const updateCollaboratorRoleSchema = z.object({
  role: z.enum(['owner', 'editor', 'viewer']),
});

// ==================== ROUTES ====================

/**
 * GET /events/:eventUuid/collaborators
 * List collaborators for an event
 */
eventCollaborators.get('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  const collaborators = await db
    .select({
      id: schema.eventCollaborators.id,
      userId: schema.eventCollaborators.userId,
      userName: schema.user.name,
      userEmail: schema.user.email,
      userImage: schema.user.image,
      role: schema.eventCollaborators.role,
      invitedAt: schema.eventCollaborators.invitedAt,
      acceptedAt: schema.eventCollaborators.acceptedAt,
      createdAt: schema.eventCollaborators.createdAt,
    })
    .from(schema.eventCollaborators)
    .innerJoin(schema.user, eq(schema.eventCollaborators.userId, schema.user.id))
    .where(eq(schema.eventCollaborators.eventId, access.event.id));

  return c.json({ success: true, data: collaborators });
});

/**
 * POST /events/:eventUuid/collaborators
 * Invite a collaborator (auto-accepted)
 */
eventCollaborators.post(
  '/',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', inviteCollaboratorSchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const body = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    const access = await resolveEventAccess(db, eventUuid, user.id);
    if (!access) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        404
      );
    }

    if (!access.canManageCollaborators) {
      return c.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        403
      );
    }

    // Look up user by email
    const [targetUser] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, body.email))
      .limit(1);

    if (!targetUser) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found with that email' } },
        404
      );
    }

    // Check not already a collaborator
    const [existing] = await db
      .select({ id: schema.eventCollaborators.id })
      .from(schema.eventCollaborators)
      .where(
        and(
          eq(schema.eventCollaborators.eventId, access.event.id),
          eq(schema.eventCollaborators.userId, targetUser.id)
        )
      )
      .limit(1);

    if (existing) {
      return c.json(
        { success: false, error: { code: 'CONFLICT', message: 'User is already a collaborator on this event' } },
        409
      );
    }

    // Check not inviting the event owner
    if (access.event.userId && access.event.userId === targetUser.id) {
      return c.json(
        { success: false, error: { code: 'CONFLICT', message: 'Cannot add the event owner as a collaborator' } },
        409
      );
    }

    const now = new Date();

    await db.insert(schema.eventCollaborators).values({
      eventId: access.event.id,
      userId: targetUser.id,
      role: body.role,
      invitedByUserId: user.id,
      invitedAt: now,
      acceptedAt: now,
    });

    // Re-fetch with user info
    const [collaborator] = await db
      .select({
        id: schema.eventCollaborators.id,
        userId: schema.eventCollaborators.userId,
        userName: schema.user.name,
        userEmail: schema.user.email,
        userImage: schema.user.image,
        role: schema.eventCollaborators.role,
        invitedAt: schema.eventCollaborators.invitedAt,
        acceptedAt: schema.eventCollaborators.acceptedAt,
        createdAt: schema.eventCollaborators.createdAt,
      })
      .from(schema.eventCollaborators)
      .innerJoin(schema.user, eq(schema.eventCollaborators.userId, schema.user.id))
      .where(
        and(
          eq(schema.eventCollaborators.eventId, access.event.id),
          eq(schema.eventCollaborators.userId, targetUser.id)
        )
      )
      .limit(1);

    return c.json({ success: true, data: collaborator }, 201);
  }
);

/**
 * PATCH /events/:eventUuid/collaborators/:collaboratorId
 * Update collaborator role
 */
eventCollaborators.patch(
  '/:collaboratorId',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', updateCollaboratorRoleSchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const collaboratorId = parseInt(c.req.param('collaboratorId')!, 10);
    const body = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    const access = await resolveEventAccess(db, eventUuid, user.id);
    if (!access) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        404
      );
    }

    if (!access.canManageCollaborators) {
      return c.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        403
      );
    }

    const [existing] = await db
      .select({ id: schema.eventCollaborators.id })
      .from(schema.eventCollaborators)
      .where(
        and(
          eq(schema.eventCollaborators.id, collaboratorId),
          eq(schema.eventCollaborators.eventId, access.event.id)
        )
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Collaborator not found' } },
        404
      );
    }

    await db
      .update(schema.eventCollaborators)
      .set({ role: body.role })
      .where(eq(schema.eventCollaborators.id, collaboratorId));

    // Re-fetch with user info
    const [updated] = await db
      .select({
        id: schema.eventCollaborators.id,
        userId: schema.eventCollaborators.userId,
        userName: schema.user.name,
        userEmail: schema.user.email,
        userImage: schema.user.image,
        role: schema.eventCollaborators.role,
        invitedAt: schema.eventCollaborators.invitedAt,
        acceptedAt: schema.eventCollaborators.acceptedAt,
        createdAt: schema.eventCollaborators.createdAt,
      })
      .from(schema.eventCollaborators)
      .innerJoin(schema.user, eq(schema.eventCollaborators.userId, schema.user.id))
      .where(eq(schema.eventCollaborators.id, collaboratorId))
      .limit(1);

    return c.json({ success: true, data: updated });
  }
);

/**
 * DELETE /events/:eventUuid/collaborators/:collaboratorId
 * Remove collaborator (or self-leave)
 */
eventCollaborators.delete('/:collaboratorId', requireAuth, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const collaboratorId = parseInt(c.req.param('collaboratorId')!, 10);
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  const [existing] = await db
    .select({
      id: schema.eventCollaborators.id,
      userId: schema.eventCollaborators.userId,
    })
    .from(schema.eventCollaborators)
    .where(
      and(
        eq(schema.eventCollaborators.id, collaboratorId),
        eq(schema.eventCollaborators.eventId, access.event.id)
      )
    )
    .limit(1);

  if (!existing) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Collaborator not found' } },
      404
    );
  }

  // Allow self-leave or require canManageCollaborators
  const isSelf = existing.userId === user.id;
  if (!isSelf && !access.canManageCollaborators) {
    return c.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      403
    );
  }

  await db
    .delete(schema.eventCollaborators)
    .where(eq(schema.eventCollaborators.id, collaboratorId));

  return c.json({ success: true, data: { deleted: true } });
});

export default eventCollaborators;
