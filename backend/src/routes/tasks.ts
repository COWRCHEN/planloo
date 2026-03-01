/**
 * Task Routes
 *
 * CRUD endpoints for task/checklist management within events.
 * Routes are scoped to /events/:eventUuid/tasks
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull, desc, asc, sql, count, lt } from 'drizzle-orm';
import { requireAuth, requireVerifiedEmail } from '@/middleware/auth';
import { resolveEventAccess } from '@/lib/event-access';
import { getTemplateList, resolveTemplate, resolveTemplateFromStartDate } from '@/lib/task-templates';
import { checkFeatureAccess, getEffectivePlan } from '@/lib/billing-checks';

const tasks = new Hono<HonoEnv>();

// ==================== ENUMS ====================

const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
const TASK_STATUSES = ['pending', 'in_progress', 'completed'] as const;

// ==================== SCHEMAS ====================

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  assignedToUserId: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  assignedToUserId: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  linkedEventProviderLinkId: z.number().int().nullable().optional(),
  linkedEventVenueLinkId: z.number().int().nullable().optional(),
});

const listTasksQuerySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  category: z.string().optional(),
  assignedToUserId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['title', 'priority', 'status', 'dueDate', 'sortOrder', 'createdAt']).default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const bulkCreateTasksSchema = z.object({
  templateId: z.string().min(1),
  startDate: z.string().optional(),
});

const addDependencySchema = z.object({
  dependsOnTaskUuid: z.string().min(1),
});

const reorderTasksSchema = z.object({
  tasks: z.array(z.object({
    uuid: z.string().min(1),
    sortOrder: z.coerce.number().int().min(0),
  })).min(1),
});

// ==================== ROUTES ====================

/**
 * GET /events/:eventUuid/tasks/summary
 * Task stats (total, by status, by priority, overdue count)
 */
tasks.get('/summary', requireAuth, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
  }

  const baseCondition = and(
    eq(schema.tasks.eventId, access.event.id),
    isNull(schema.tasks.deletedAt)
  );

  const [totals] = await db
    .select({ total: count() })
    .from(schema.tasks)
    .where(baseCondition);

  const byStatus = await db
    .select({ status: schema.tasks.status, count: count() })
    .from(schema.tasks)
    .where(baseCondition)
    .groupBy(schema.tasks.status);

  const byPriority = await db
    .select({ priority: schema.tasks.priority, count: count() })
    .from(schema.tasks)
    .where(baseCondition)
    .groupBy(schema.tasks.priority);

  const now = new Date();
  const [overdueResult] = await db
    .select({ count: count() })
    .from(schema.tasks)
    .where(and(
      baseCondition,
      lt(schema.tasks.dueDate, now),
      sql`${schema.tasks.status} != 'completed'`
    ));

  return c.json({
    success: true,
    data: {
      total: totals?.total ?? 0,
      byStatus: byStatus.map((r) => ({ status: r.status, count: r.count })),
      byPriority: byPriority.map((r) => ({ priority: r.priority, count: r.count })),
      overdueCount: overdueResult?.count ?? 0,
    },
  });
});

/**
 * GET /events/:eventUuid/tasks/templates
 * Returns available task templates
 */
tasks.get('/templates', requireAuth, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
  }

  return c.json({ success: true, data: getTemplateList() });
});

/**
 * GET /events/:eventUuid/tasks
 * List tasks (paginated, filterable by status/priority/category/assignee)
 */
tasks.get(
  '/',
  requireAuth,
  zValidator('query', listTasksQuerySchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const query = c.req.valid('query');
    const { status, priority, category, assignedToUserId, limit, offset, sortBy, sortOrder } = query;
    const db = createDbClient(c.env.DB);

    const access = await resolveEventAccess(db, eventUuid, user.id);
    if (!access) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
    }

    const conditions = [
      eq(schema.tasks.eventId, access.event.id),
      isNull(schema.tasks.deletedAt),
    ];

    if (status) conditions.push(eq(schema.tasks.status, status));
    if (priority) conditions.push(eq(schema.tasks.priority, priority));
    if (category) conditions.push(eq(schema.tasks.category, category));
    if (assignedToUserId) conditions.push(eq(schema.tasks.assignedToUserId, assignedToUserId));

    const [countResult] = await db
      .select({ count: count() })
      .from(schema.tasks)
      .where(and(...conditions));

    const sortColumnMap = {
      title: schema.tasks.title,
      priority: schema.tasks.priority,
      status: schema.tasks.status,
      dueDate: schema.tasks.dueDate,
      sortOrder: schema.tasks.sortOrder,
      createdAt: schema.tasks.createdAt,
    } as const;
    const sortColumn = sortColumnMap[sortBy as keyof typeof sortColumnMap];
    const orderFn = sortOrder === 'desc' ? desc : asc;

    const items = await db
      .select({
        id: schema.tasks.id,
        uuid: schema.tasks.uuid,
        title: schema.tasks.title,
        description: schema.tasks.description,
        category: schema.tasks.category,
        assignedToUserId: schema.tasks.assignedToUserId,
        dueDate: schema.tasks.dueDate,
        priority: schema.tasks.priority,
        status: schema.tasks.status,
        completedAt: schema.tasks.completedAt,
        sortOrder: schema.tasks.sortOrder,
        createdAt: schema.tasks.createdAt,
        updatedAt: schema.tasks.updatedAt,
        linkedEventProviderLinkId: schema.tasks.linkedEventProviderLinkId,
        linkedEventVenueLinkId: schema.tasks.linkedEventVenueLinkId,
      })
      .from(schema.tasks)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    // Fetch assigned user names
    const userIds = [...new Set(items.map((i) => i.assignedToUserId).filter(Boolean))] as string[];
    let userNameMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const users = await db
        .select({ id: schema.user.id, name: schema.user.name })
        .from(schema.user)
        .where(sql`${schema.user.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
      userNameMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
    }

    // Fetch dependency counts per task
    const taskIds = items.map((i) => i.id);
    let depCountMap: Record<number, number> = {};
    if (taskIds.length > 0) {
      const depCounts = await db
        .select({
          taskId: schema.taskDependencies.taskId,
          count: count(),
        })
        .from(schema.taskDependencies)
        .where(sql`${schema.taskDependencies.taskId} IN (${sql.join(taskIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(schema.taskDependencies.taskId);
      depCountMap = Object.fromEntries(depCounts.map((r) => [r.taskId, r.count]));
    }

    // Fetch linked provider data
    const providerLinkIds = [...new Set(items.map((i) => i.linkedEventProviderLinkId).filter((id): id is number => id !== null))];
    let providerLinkMap: Record<number, { linkId: number; name: string; category: string; bookingStatus: string }> = {};
    if (providerLinkIds.length > 0) {
      const providerLinks = await db
        .select({
          id: schema.eventServiceProviders.id,
          status: schema.eventServiceProviders.status,
          businessName: schema.serviceProviders.businessName,
          category: schema.serviceProviders.category,
        })
        .from(schema.eventServiceProviders)
        .innerJoin(schema.serviceProviders, eq(schema.eventServiceProviders.serviceProviderId, schema.serviceProviders.id))
        .where(sql`${schema.eventServiceProviders.id} IN (${sql.join(providerLinkIds.map((id) => sql`${id}`), sql`, `)})`);
      providerLinkMap = Object.fromEntries(providerLinks.map((p) => [
        p.id,
        { linkId: p.id, name: p.businessName, category: p.category, bookingStatus: p.status },
      ]));
    }

    // Fetch linked venue data
    const venueLinkIds = [...new Set(items.map((i) => i.linkedEventVenueLinkId).filter((id): id is number => id !== null))];
    let venueLinkMap: Record<number, { linkId: number; name: string; bookingStatus: string }> = {};
    if (venueLinkIds.length > 0) {
      const venueLinks = await db
        .select({
          id: schema.eventVenues.id,
          status: schema.eventVenues.status,
          name: schema.venues.name,
        })
        .from(schema.eventVenues)
        .innerJoin(schema.venues, eq(schema.eventVenues.venueId, schema.venues.id))
        .where(sql`${schema.eventVenues.id} IN (${sql.join(venueLinkIds.map((id) => sql`${id}`), sql`, `)})`);
      venueLinkMap = Object.fromEntries(venueLinks.map((v) => [
        v.id,
        { linkId: v.id, name: v.name, bookingStatus: v.status },
      ]));
    }

    const responseData = items.map((item) => ({
      uuid: item.uuid,
      title: item.title,
      description: item.description,
      category: item.category,
      assignedToUserId: item.assignedToUserId,
      assignedToName: item.assignedToUserId ? (userNameMap[item.assignedToUserId] ?? null) : null,
      dueDate: item.dueDate,
      priority: item.priority,
      status: item.status,
      completedAt: item.completedAt,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      dependencyCount: depCountMap[item.id] ?? 0,
      linkedProvider: item.linkedEventProviderLinkId ? (providerLinkMap[item.linkedEventProviderLinkId] ?? null) : null,
      linkedVenue: item.linkedEventVenueLinkId ? (venueLinkMap[item.linkedEventVenueLinkId] ?? null) : null,
    }));

    return c.json({
      success: true,
      data: responseData,
      meta: { total: countResult?.count ?? 0, limit, offset },
    });
  }
);

/**
 * POST /events/:eventUuid/tasks
 * Create a single task
 */
tasks.post(
  '/',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', createTaskSchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const data = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    const access = await resolveEventAccess(db, eventUuid, user.id);
    if (!access) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
    }
    if (!access.canEdit) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
    }

    // Auto-compute sortOrder if not provided
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const [maxSort] = await db
        .select({ maxSort: sql<number>`COALESCE(MAX(${schema.tasks.sortOrder}), -1)` })
        .from(schema.tasks)
        .where(and(
          eq(schema.tasks.eventId, access.event.id),
          isNull(schema.tasks.deletedAt)
        ));
      sortOrder = (maxSort?.maxSort ?? -1) + 1;
    }

    const uuid = crypto.randomUUID();
    const [newTask] = await db
      .insert(schema.tasks)
      .values({
        uuid,
        eventId: access.event.id,
        title: data.title,
        description: data.description ?? null,
        category: data.category ?? null,
        assignedToUserId: data.assignedToUserId ?? null,
        dueDate: data.dueDate ?? null,
        priority: data.priority,
        status: 'pending',
        sortOrder,
      })
      .returning();

    return c.json({
      success: true,
      data: {
        uuid: newTask!.uuid,
        title: newTask!.title,
        description: newTask!.description,
        category: newTask!.category,
        assignedToUserId: newTask!.assignedToUserId,
        assignedToName: null,
        dueDate: newTask!.dueDate,
        priority: newTask!.priority,
        status: newTask!.status,
        completedAt: newTask!.completedAt,
        sortOrder: newTask!.sortOrder,
        createdAt: newTask!.createdAt,
        updatedAt: newTask!.updatedAt,
        linkedProvider: null,
        linkedVenue: null,
      },
    }, 201);
  }
);

/**
 * POST /events/:eventUuid/tasks/bulk
 * Bulk create tasks from a template
 */
tasks.post(
  '/bulk',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', bulkCreateTasksSchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const { templateId, startDate: startDateStr } = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    // Enforce task templates feature access
    const sub = c.get('subscription');
    const plan = getEffectivePlan(sub?.plan ?? 'free', sub?.status ?? 'free');
    const featureCheck = checkFeatureAccess(plan, 'taskTemplates');
    if (!featureCheck.ok) {
      return c.json({ success: false, error: featureCheck.error }, 402);
    }

    const access = await resolveEventAccess(db, eventUuid, user.id);
    if (!access) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
    }
    if (!access.canEdit) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
    }

    // Always fetch event date — used as the ceiling for task due dates
    const [event] = await db
      .select({ startDate: schema.events.startDate })
      .from(schema.events)
      .where(eq(schema.events.id, access.event.id))
      .limit(1);

    if (!event) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
    }

    let resolvedTasks;
    if (startDateStr) {
      const parsed = new Date(startDateStr);
      if (isNaN(parsed.getTime())) {
        return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid startDate format' } }, 400);
      }
      resolvedTasks = resolveTemplateFromStartDate(templateId, parsed, event.startDate);
    } else {
      resolvedTasks = resolveTemplate(templateId, event.startDate);
    }
    if (!resolvedTasks) {
      return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Unknown template ID' } }, 400);
    }

    // Get current max sortOrder
    const [maxSort] = await db
      .select({ maxSort: sql<number>`COALESCE(MAX(${schema.tasks.sortOrder}), -1)` })
      .from(schema.tasks)
      .where(and(
        eq(schema.tasks.eventId, access.event.id),
        isNull(schema.tasks.deletedAt)
      ));
    const baseSort = (maxSort?.maxSort ?? -1) + 1;

    // Batch insert (D1 has a 100-param limit, so chunk if needed)
    const CHUNK_SIZE = 10;
    const allValues = resolvedTasks.map((task, index) => ({
      uuid: crypto.randomUUID(),
      eventId: access.event.id,
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority as 'low' | 'medium' | 'high',
      dueDate: task.dueDate,
      status: 'pending' as const,
      sortOrder: baseSort + index,
      sourceTemplateId: templateId,
    }));

    const chunks = [];
    for (let i = 0; i < allValues.length; i += CHUNK_SIZE) {
      chunks.push(allValues.slice(i, i + CHUNK_SIZE));
    }

    const insertStatements = chunks.map((chunk) =>
      db.insert(schema.tasks).values(chunk)
    );

    await db.batch(insertStatements as [typeof insertStatements[0], ...typeof insertStatements]);

    return c.json({
      success: true,
      data: { created: allValues.length },
    }, 201);
  }
);

/**
 * GET /events/:eventUuid/tasks/:uuid
 * Get a single task with dependencies
 */
tasks.get('/:uuid', requireAuth, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const taskUuid = c.req.param('uuid')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
  }

  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(and(
      eq(schema.tasks.uuid, taskUuid),
      eq(schema.tasks.eventId, access.event.id),
      isNull(schema.tasks.deletedAt)
    ))
    .limit(1);

  if (!task) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } }, 404);
  }

  // Fetch dependencies (tasks this task depends on)
  const deps = await db
    .select({
      uuid: schema.tasks.uuid,
      title: schema.tasks.title,
      status: schema.tasks.status,
    })
    .from(schema.taskDependencies)
    .innerJoin(schema.tasks, eq(schema.taskDependencies.dependsOnTaskId, schema.tasks.id))
    .where(eq(schema.taskDependencies.taskId, task.id));

  // Fetch assigned user name
  let assignedToName: string | null = null;
  if (task.assignedToUserId) {
    const [u] = await db
      .select({ name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, task.assignedToUserId))
      .limit(1);
    assignedToName = u?.name ?? null;
  }

  // Fetch linked provider
  let linkedProvider: { linkId: number; name: string; category: string; bookingStatus: string } | null = null;
  if (task.linkedEventProviderLinkId) {
    const [pl] = await db
      .select({
        id: schema.eventServiceProviders.id,
        status: schema.eventServiceProviders.status,
        businessName: schema.serviceProviders.businessName,
        category: schema.serviceProviders.category,
      })
      .from(schema.eventServiceProviders)
      .innerJoin(schema.serviceProviders, eq(schema.eventServiceProviders.serviceProviderId, schema.serviceProviders.id))
      .where(eq(schema.eventServiceProviders.id, task.linkedEventProviderLinkId))
      .limit(1);
    if (pl) {
      linkedProvider = { linkId: pl.id, name: pl.businessName, category: pl.category, bookingStatus: pl.status };
    }
  }

  // Fetch linked venue
  let linkedVenue: { linkId: number; name: string; bookingStatus: string } | null = null;
  if (task.linkedEventVenueLinkId) {
    const [vl] = await db
      .select({
        id: schema.eventVenues.id,
        status: schema.eventVenues.status,
        name: schema.venues.name,
      })
      .from(schema.eventVenues)
      .innerJoin(schema.venues, eq(schema.eventVenues.venueId, schema.venues.id))
      .where(eq(schema.eventVenues.id, task.linkedEventVenueLinkId))
      .limit(1);
    if (vl) {
      linkedVenue = { linkId: vl.id, name: vl.name, bookingStatus: vl.status };
    }
  }

  return c.json({
    success: true,
    data: {
      uuid: task.uuid,
      title: task.title,
      description: task.description,
      category: task.category,
      assignedToUserId: task.assignedToUserId,
      assignedToName,
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      completedAt: task.completedAt,
      sortOrder: task.sortOrder,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      dependencies: deps.map((d) => ({
        uuid: d.uuid,
        title: d.title,
        status: d.status,
      })),
      linkedProvider,
      linkedVenue,
    },
  });
});

/**
 * PATCH /events/:eventUuid/tasks/reorder
 * Bulk update sortOrder
 */
tasks.patch(
  '/reorder',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', reorderTasksSchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const { tasks: reorderItems } = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    const access = await resolveEventAccess(db, eventUuid, user.id);
    if (!access) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
    }
    if (!access.canEdit) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
    }

    const updateStatements = reorderItems.map((item) =>
      db
        .update(schema.tasks)
        .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
        .where(and(
          eq(schema.tasks.uuid, item.uuid),
          eq(schema.tasks.eventId, access.event.id),
          isNull(schema.tasks.deletedAt)
        ))
    );

    if (updateStatements.length > 0) {
      await db.batch(updateStatements as [typeof updateStatements[0], ...typeof updateStatements]);
    }

    return c.json({ success: true, data: { updated: reorderItems.length } });
  }
);

/**
 * PATCH /events/:eventUuid/tasks/:uuid
 * Update a task (including mark complete)
 */
tasks.patch(
  '/:uuid',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', updateTaskSchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const taskUuid = c.req.param('uuid')!;
    const updates = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    const access = await resolveEventAccess(db, eventUuid, user.id);
    if (!access) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
    }
    if (!access.canEdit) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
    }

    const [existing] = await db
      .select({ id: schema.tasks.id, status: schema.tasks.status })
      .from(schema.tasks)
      .where(and(
        eq(schema.tasks.uuid, taskUuid),
        eq(schema.tasks.eventId, access.event.id),
        isNull(schema.tasks.deletedAt)
      ))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.assignedToUserId !== undefined) updateData.assignedToUserId = updates.assignedToUserId;
    if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;

    // Handle status changes: auto-set/clear completedAt
    if (updates.status !== undefined) {
      updateData.status = updates.status;
      if (updates.status === 'completed' && existing.status !== 'completed') {
        updateData.completedAt = new Date();
      } else if (updates.status !== 'completed' && existing.status === 'completed') {
        updateData.completedAt = null;
      }
    }

    // Validate and set linked provider link
    if (updates.linkedEventProviderLinkId !== undefined) {
      if (updates.linkedEventProviderLinkId !== null) {
        const [provLink] = await db
          .select({ id: schema.eventServiceProviders.id })
          .from(schema.eventServiceProviders)
          .where(and(
            eq(schema.eventServiceProviders.id, updates.linkedEventProviderLinkId),
            eq(schema.eventServiceProviders.eventId, access.event.id)
          ))
          .limit(1);
        if (!provLink) {
          return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Provider link does not belong to this event' } }, 400);
        }
      }
      updateData.linkedEventProviderLinkId = updates.linkedEventProviderLinkId;
    }

    // Validate and set linked venue link
    if (updates.linkedEventVenueLinkId !== undefined) {
      if (updates.linkedEventVenueLinkId !== null) {
        const [venueLink] = await db
          .select({ id: schema.eventVenues.id })
          .from(schema.eventVenues)
          .where(and(
            eq(schema.eventVenues.id, updates.linkedEventVenueLinkId),
            eq(schema.eventVenues.eventId, access.event.id)
          ))
          .limit(1);
        if (!venueLink) {
          return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Venue link does not belong to this event' } }, 400);
        }
      }
      updateData.linkedEventVenueLinkId = updates.linkedEventVenueLinkId;
    }

    const [freshTask] = await db
      .update(schema.tasks)
      .set(updateData)
      .where(eq(schema.tasks.id, existing.id))
      .returning();

    // Fetch assigned user name
    let assignedToName: string | null = null;
    if (freshTask!.assignedToUserId) {
      const [u] = await db
        .select({ name: schema.user.name })
        .from(schema.user)
        .where(eq(schema.user.id, freshTask!.assignedToUserId))
        .limit(1);
      assignedToName = u?.name ?? null;
    }

    // Fetch linked provider
    let patchLinkedProvider: { linkId: number; name: string; category: string; bookingStatus: string } | null = null;
    if (freshTask!.linkedEventProviderLinkId) {
      const [pl] = await db
        .select({
          id: schema.eventServiceProviders.id,
          status: schema.eventServiceProviders.status,
          businessName: schema.serviceProviders.businessName,
          category: schema.serviceProviders.category,
        })
        .from(schema.eventServiceProviders)
        .innerJoin(schema.serviceProviders, eq(schema.eventServiceProviders.serviceProviderId, schema.serviceProviders.id))
        .where(eq(schema.eventServiceProviders.id, freshTask!.linkedEventProviderLinkId))
        .limit(1);
      if (pl) {
        patchLinkedProvider = { linkId: pl.id, name: pl.businessName, category: pl.category, bookingStatus: pl.status };
      }
    }

    // Fetch linked venue
    let patchLinkedVenue: { linkId: number; name: string; bookingStatus: string } | null = null;
    if (freshTask!.linkedEventVenueLinkId) {
      const [vl] = await db
        .select({
          id: schema.eventVenues.id,
          status: schema.eventVenues.status,
          name: schema.venues.name,
        })
        .from(schema.eventVenues)
        .innerJoin(schema.venues, eq(schema.eventVenues.venueId, schema.venues.id))
        .where(eq(schema.eventVenues.id, freshTask!.linkedEventVenueLinkId))
        .limit(1);
      if (vl) {
        patchLinkedVenue = { linkId: vl.id, name: vl.name, bookingStatus: vl.status };
      }
    }

    return c.json({
      success: true,
      data: {
        uuid: freshTask!.uuid,
        title: freshTask!.title,
        description: freshTask!.description,
        category: freshTask!.category,
        assignedToUserId: freshTask!.assignedToUserId,
        assignedToName,
        dueDate: freshTask!.dueDate,
        priority: freshTask!.priority,
        status: freshTask!.status,
        completedAt: freshTask!.completedAt,
        sortOrder: freshTask!.sortOrder,
        createdAt: freshTask!.createdAt,
        updatedAt: freshTask!.updatedAt,
        linkedProvider: patchLinkedProvider,
        linkedVenue: patchLinkedVenue,
      },
    });
  }
);

/**
 * DELETE /events/:eventUuid/tasks/bulk
 * Soft delete all tasks in a category
 */
const bulkDeleteSchema = z.object({
  category: z.string().min(1),
});

tasks.delete(
  '/bulk',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', bulkDeleteSchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const { category } = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    const access = await resolveEventAccess(db, eventUuid, user.id);
    if (!access) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
    }
    if (!access.canEdit) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
    }

    const [countResult] = await db
      .select({ count: count() })
      .from(schema.tasks)
      .where(and(
        eq(schema.tasks.eventId, access.event.id),
        eq(schema.tasks.category, category),
        isNull(schema.tasks.deletedAt)
      ));

    const total = countResult?.count ?? 0;
    if (total === 0) {
      return c.json({ success: true, data: { deleted: 0 } });
    }

    await db
      .update(schema.tasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(schema.tasks.eventId, access.event.id),
        eq(schema.tasks.category, category),
        isNull(schema.tasks.deletedAt)
      ));

    return c.json({ success: true, data: { deleted: total } });
  }
);

/**
 * DELETE /events/:eventUuid/tasks/:uuid
 * Soft delete a task
 */
tasks.delete('/:uuid', requireAuth, requireVerifiedEmail, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const taskUuid = c.req.param('uuid')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
  }
  if (!access.canEdit) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
  }

  const [existing] = await db
    .select({ id: schema.tasks.id })
    .from(schema.tasks)
    .where(and(
      eq(schema.tasks.uuid, taskUuid),
      eq(schema.tasks.eventId, access.event.id),
      isNull(schema.tasks.deletedAt)
    ))
    .limit(1);

  if (!existing) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } }, 404);
  }

  await db
    .update(schema.tasks)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.tasks.id, existing.id));

  return c.json({ success: true, data: { deleted: true } });
});

/**
 * POST /events/:eventUuid/tasks/:uuid/dependencies
 * Add a dependency
 */
tasks.post(
  '/:uuid/dependencies',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', addDependencySchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const taskUuid = c.req.param('uuid')!;
    const { dependsOnTaskUuid } = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    const access = await resolveEventAccess(db, eventUuid, user.id);
    if (!access) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
    }
    if (!access.canEdit) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
    }

    // Look up both tasks
    const [task] = await db
      .select({ id: schema.tasks.id })
      .from(schema.tasks)
      .where(and(
        eq(schema.tasks.uuid, taskUuid),
        eq(schema.tasks.eventId, access.event.id),
        isNull(schema.tasks.deletedAt)
      ))
      .limit(1);

    const [dependsOnTask] = await db
      .select({ id: schema.tasks.id })
      .from(schema.tasks)
      .where(and(
        eq(schema.tasks.uuid, dependsOnTaskUuid),
        eq(schema.tasks.eventId, access.event.id),
        isNull(schema.tasks.deletedAt)
      ))
      .limit(1);

    if (!task || !dependsOnTask) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } }, 404);
    }

    if (task.id === dependsOnTask.id) {
      return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'A task cannot depend on itself' } }, 400);
    }

    try {
      await db.insert(schema.taskDependencies).values({
        taskId: task.id,
        dependsOnTaskId: dependsOnTask.id,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('UNIQUE constraint failed')) {
        return c.json({ success: false, error: { code: 'CONFLICT', message: 'Dependency already exists' } }, 409);
      }
      throw e;
    }

    return c.json({ success: true, data: { added: true } }, 201);
  }
);

/**
 * DELETE /events/:eventUuid/tasks/:uuid/dependencies/:depUuid
 * Remove a dependency
 */
tasks.delete('/:uuid/dependencies/:depUuid', requireAuth, requireVerifiedEmail, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const taskUuid = c.req.param('uuid')!;
  const depUuid = c.req.param('depUuid')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
  }
  if (!access.canEdit) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
  }

  const [task] = await db
    .select({ id: schema.tasks.id })
    .from(schema.tasks)
    .where(and(
      eq(schema.tasks.uuid, taskUuid),
      eq(schema.tasks.eventId, access.event.id),
      isNull(schema.tasks.deletedAt)
    ))
    .limit(1);

  const [depTask] = await db
    .select({ id: schema.tasks.id })
    .from(schema.tasks)
    .where(and(
      eq(schema.tasks.uuid, depUuid),
      eq(schema.tasks.eventId, access.event.id),
      isNull(schema.tasks.deletedAt)
    ))
    .limit(1);

  if (!task || !depTask) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } }, 404);
  }

  await db
    .delete(schema.taskDependencies)
    .where(and(
      eq(schema.taskDependencies.taskId, task.id),
      eq(schema.taskDependencies.dependsOnTaskId, depTask.id)
    ));

  return c.json({ success: true, data: { deleted: true } });
});

export default tasks;
