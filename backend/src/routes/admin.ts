/**
 * Admin Routes
 *
 * Platform administration endpoints for user management,
 * statistics, and audit logging.
 */

import { Hono } from 'hono';
import type { HonoEnv } from '@/types/env';
import { requireAuth, requireOperator, requireSuperAdmin } from '@/middleware/auth';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, sql, count, like, or, desc, asc, isNull } from 'drizzle-orm';
import { createAuditLogEntry } from '@/lib/audit-log';

const admin = new Hono<HonoEnv>();

// All admin routes require auth + operator role
admin.use('*', requireAuth, requireOperator);

// ==================== STATS ====================

/**
 * GET /admin/stats
 * Platform statistics
 */
admin.get('/stats', async (c) => {
  const db = createDbClient(c.env.DB);

  const userStatsResult = await db
    .select({
      totalUsers: count(),
      activeUsers: sql<number>`SUM(CASE WHEN ${schema.user.isActive} = 1 THEN 1 ELSE 0 END)`,
      suspendedUsers: sql<number>`SUM(CASE WHEN ${schema.user.isActive} = 0 THEN 1 ELSE 0 END)`,
    })
    .from(schema.user);

  const eventStatsResult = await db
    .select({
      totalEvents: count(),
    })
    .from(schema.events)
    .where(isNull(schema.events.deletedAt));

  return c.json({
    success: true,
    data: {
      totalUsers: userStatsResult[0]?.totalUsers ?? 0,
      activeUsers: userStatsResult[0]?.activeUsers ?? 0,
      suspendedUsers: userStatsResult[0]?.suspendedUsers ?? 0,
      totalEvents: eventStatsResult[0]?.totalEvents ?? 0,
    },
  });
});

// ==================== USERS ====================

/**
 * GET /admin/users
 * Paginated user list with search/filter
 */
admin.get('/users', async (c) => {
  const db = createDbClient(c.env.DB);

  const search = c.req.query('search');
  const platformRole = c.req.query('platformRole') as 'super_admin' | 'operator' | 'user' | undefined;
  const isActive = c.req.query('isActive'); // 'true' | 'false'
  const sortBy = c.req.query('sortBy') || 'createdAt';
  const sortOrder = c.req.query('sortOrder') || 'desc';
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  // Build conditions
  const conditions = [];

  if (search) {
    conditions.push(
      or(
        like(schema.user.name, `%${search}%`),
        like(schema.user.email, `%${search}%`)
      )
    );
  }

  if (platformRole) {
    conditions.push(eq(schema.user.platformRole, platformRole));
  }

  if (isActive === 'true') {
    conditions.push(eq(schema.user.isActive, true));
  } else if (isActive === 'false') {
    conditions.push(eq(schema.user.isActive, false));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Sort column mapping
  const sortColumn = sortBy === 'name' ? schema.user.name
    : sortBy === 'email' ? schema.user.email
    : schema.user.createdAt;
  const orderFn = sortOrder === 'asc' ? asc : desc;

  const [users, totalResult] = await Promise.all([
    db
      .select({
        id: schema.user.id,
        email: schema.user.email,
        name: schema.user.name,
        image: schema.user.image,
        platformRole: schema.user.platformRole,
        isActive: schema.user.isActive,
        suspendedAt: schema.user.suspendedAt,
        suspendedReason: schema.user.suspendedReason,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(schema.user)
      .where(whereClause),
  ]);

  return c.json({
    success: true,
    data: users,
    meta: {
      total: totalResult[0]?.total ?? 0,
      limit,
      offset,
    },
  });
});

/**
 * GET /admin/users/:id
 * User detail with event count
 */
admin.get('/users/:id', async (c) => {
  const db = createDbClient(c.env.DB);
  const userId = c.req.param('id');

  const userResult = await db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      name: schema.user.name,
      image: schema.user.image,
      emailVerified: schema.user.emailVerified,
      phone: schema.user.phone,
      platformRole: schema.user.platformRole,
      isActive: schema.user.isActive,
      suspendedAt: schema.user.suspendedAt,
      suspendedReason: schema.user.suspendedReason,
      createdAt: schema.user.createdAt,
      updatedAt: schema.user.updatedAt,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  if (userResult.length === 0) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }

  const eventCountResult = await db
    .select({ count: count() })
    .from(schema.events)
    .where(and(eq(schema.events.userId, userId), isNull(schema.events.deletedAt)));

  return c.json({
    success: true,
    data: {
      ...userResult[0],
      eventCount: eventCountResult[0]?.count ?? 0,
    },
  });
});

/**
 * PATCH /admin/users/:id/role
 * Change user platformRole (super_admin only)
 */
admin.patch('/users/:id/role', requireSuperAdmin, async (c) => {
  const db = createDbClient(c.env.DB);
  const actor = c.get('user')!;
  const userId = c.req.param('id');

  if (userId === actor.id) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot change your own role' } }, 403);
  }

  const body = await c.req.json<{ platformRole: 'super_admin' | 'operator' | 'user' }>();
  const { platformRole } = body;

  if (!['super_admin', 'operator', 'user'].includes(platformRole)) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid role' } }, 400);
  }

  // Fetch target user
  const [target] = await db
    .select({ id: schema.user.id, email: schema.user.email, platformRole: schema.user.platformRole })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  if (!target) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }

  const previousRole = target.platformRole;

  await db
    .update(schema.user)
    .set({ platformRole, updatedAt: new Date() })
    .where(eq(schema.user.id, userId));

  await createAuditLogEntry({
    db,
    actorId: actor.id,
    actorRole: actor.platformRole as 'super_admin' | 'operator',
    action: 'user.role_change',
    targetType: 'user',
    targetId: userId,
    targetName: target.email,
    details: { previousRole, newRole: platformRole },
    ipAddress: c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? undefined,
    userAgent: c.req.header('user-agent') ?? undefined,
  });

  return c.json({ success: true, data: { id: userId, platformRole } });
});

/**
 * PATCH /admin/users/:id/suspend
 * Suspend a user
 */
admin.patch('/users/:id/suspend', async (c) => {
  const db = createDbClient(c.env.DB);
  const actor = c.get('user')!;
  const userId = c.req.param('id');

  if (userId === actor.id) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot suspend yourself' } }, 403);
  }

  const body = await c.req.json<{ reason: string }>();
  const { reason } = body;

  if (!reason || reason.trim().length === 0) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Reason is required' } }, 400);
  }

  // Fetch target user
  const [target] = await db
    .select({ id: schema.user.id, email: schema.user.email, platformRole: schema.user.platformRole, isActive: schema.user.isActive })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  if (!target) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }

  // Operators cannot suspend super_admins
  if (actor.platformRole === 'operator' && target.platformRole === 'super_admin') {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Operators cannot suspend super admins' } }, 403);
  }

  if (!target.isActive) {
    return c.json({ success: false, error: { code: 'CONFLICT', message: 'User is already suspended' } }, 409);
  }

  await db
    .update(schema.user)
    .set({ isActive: false, suspendedAt: new Date(), suspendedReason: reason.trim(), updatedAt: new Date() })
    .where(eq(schema.user.id, userId));

  await createAuditLogEntry({
    db,
    actorId: actor.id,
    actorRole: actor.platformRole as 'super_admin' | 'operator',
    action: 'user.suspend',
    targetType: 'user',
    targetId: userId,
    targetName: target.email,
    details: { reason: reason.trim() },
    ipAddress: c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? undefined,
    userAgent: c.req.header('user-agent') ?? undefined,
  });

  return c.json({ success: true, data: { id: userId, isActive: false } });
});

/**
 * PATCH /admin/users/:id/unsuspend
 * Unsuspend a user
 */
admin.patch('/users/:id/unsuspend', async (c) => {
  const db = createDbClient(c.env.DB);
  const actor = c.get('user')!;
  const userId = c.req.param('id');

  // Fetch target user
  const [target] = await db
    .select({ id: schema.user.id, email: schema.user.email, isActive: schema.user.isActive })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  if (!target) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }

  if (target.isActive) {
    return c.json({ success: false, error: { code: 'CONFLICT', message: 'User is not suspended' } }, 409);
  }

  await db
    .update(schema.user)
    .set({ isActive: true, suspendedAt: null, suspendedReason: null, updatedAt: new Date() })
    .where(eq(schema.user.id, userId));

  await createAuditLogEntry({
    db,
    actorId: actor.id,
    actorRole: actor.platformRole as 'super_admin' | 'operator',
    action: 'user.unsuspend',
    targetType: 'user',
    targetId: userId,
    targetName: target.email,
    ipAddress: c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? undefined,
    userAgent: c.req.header('user-agent') ?? undefined,
  });

  return c.json({ success: true, data: { id: userId, isActive: true } });
});

// ==================== AUDIT LOG ====================

/**
 * GET /admin/audit-log
 * Paginated audit log with filters
 */
admin.get('/audit-log', async (c) => {
  const db = createDbClient(c.env.DB);

  const action = c.req.query('action');
  const targetType = c.req.query('targetType');
  const actorId = c.req.query('actorId');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const conditions = [];

  if (action) {
    conditions.push(eq(schema.auditLog.action, action));
  }
  if (targetType) {
    conditions.push(eq(schema.auditLog.targetType, targetType));
  }
  if (actorId) {
    conditions.push(eq(schema.auditLog.actorId, actorId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [entries, totalResult] = await Promise.all([
    db
      .select({
        id: schema.auditLog.id,
        actorId: schema.auditLog.actorId,
        actorRole: schema.auditLog.actorRole,
        actorEmail: schema.user.email,
        action: schema.auditLog.action,
        targetType: schema.auditLog.targetType,
        targetId: schema.auditLog.targetId,
        targetName: schema.auditLog.targetName,
        details: schema.auditLog.details,
        ipAddress: schema.auditLog.ipAddress,
        createdAt: schema.auditLog.createdAt,
      })
      .from(schema.auditLog)
      .leftJoin(schema.user, eq(schema.auditLog.actorId, schema.user.id))
      .where(whereClause)
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(schema.auditLog)
      .where(whereClause),
  ]);

  return c.json({
    success: true,
    data: entries,
    meta: {
      total: totalResult[0]?.total ?? 0,
      limit,
      offset,
    },
  });
});

export default admin;
