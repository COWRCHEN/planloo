/**
 * Floor Plans Routes
 *
 * CRUD endpoints for floor plan management, table/element objects,
 * seat assignments, auto-assign, conflicts, and guest relationships.
 *
 * Routes are scoped to /events/:eventUuid/floor-plans
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { requireAuth } from '@/middleware/auth';
import { resolveEventAccess } from '@/lib/event-access';
import { checkFeatureAccess, getEffectivePlan } from '@/lib/billing-checks';

const floorPlans = new Hono<HonoEnv>();

// ==================== SCHEMAS ====================

const TABLE_SHAPES = ['round', 'rectangular', 'square', 'oval', 'semicircle', 'head_table'] as const;
const ELEMENT_TYPES = [
  'dance_floor', 'bar', 'buffet', 'stage', 'dj_booth', 'photo_booth',
  'entrance', 'exit', 'restroom', 'dessert_station', 'gift_table', 'custom',
] as const;
const RELATIONSHIP_TYPES = ['prefer_together', 'avoid'] as const;

const createFloorPlanSchema = z.object({
  name: z.string().min(1).max(100),
  widthFt: z.number().min(10).max(5000).optional(),
  heightFt: z.number().min(10).max(5000).optional(),
  gridSnap: z.number().min(0).max(10).optional(),
  isDefault: z.boolean().optional(),
});

const updateFloorPlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  widthFt: z.number().min(10).max(5000).optional(),
  heightFt: z.number().min(10).max(5000).optional(),
  gridSnap: z.number().min(0).max(10).optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().min(0).optional(),
});

const createObjectSchema = z.object({
  objectType: z.enum(['table', 'element']),
  tableShape: z.enum(TABLE_SHAPES).optional(),
  elementType: z.enum(ELEMENT_TYPES).optional(),
  label: z.string().min(1).max(100),
  posX: z.number().min(0).optional(),
  posY: z.number().min(0).optional(),
  widthFt: z.number().min(1).max(1000).optional(),
  heightFt: z.number().min(1).max(1000).optional(),
  rotation: z.number().min(0).max(359).optional(),
  seatCount: z.number().min(1).max(50).optional(),
  seatTop: z.number().min(0).max(50).optional(),
  seatBottom: z.number().min(0).max(50).optional(),
  seatLeft: z.number().min(0).max(50).optional(),
  seatRight: z.number().min(0).max(50).optional(),
  style: z.string().optional(),
}).refine(
  (data) => {
    if (data.objectType === 'table') return !!data.tableShape;
    if (data.objectType === 'element') return !!data.elementType;
    return true;
  },
  { message: 'tableShape required for tables, elementType required for elements' }
);

const updateObjectSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  posX: z.number().min(0).optional(),
  posY: z.number().min(0).optional(),
  widthFt: z.number().min(1).max(1000).optional(),
  heightFt: z.number().min(1).max(1000).optional(),
  rotation: z.number().min(0).max(359).optional(),
  seatCount: z.number().min(1).max(50).optional(),
  seatTop: z.number().min(0).max(50).optional(),
  seatBottom: z.number().min(0).max(50).optional(),
  seatLeft: z.number().min(0).max(50).optional(),
  seatRight: z.number().min(0).max(50).optional(),
  tableShape: z.enum(TABLE_SHAPES).optional(),
  elementType: z.enum(ELEMENT_TYPES).optional(),
  style: z.string().optional(),
  isLocked: z.boolean().optional(),
  tableNumber: z.number().min(1).optional(),
});

const bulkPositionsSchema = z.object({
  updates: z.array(z.object({
    uuid: z.string(),
    posX: z.number().min(0),
    posY: z.number().min(0),
    rotation: z.number().min(0).max(359).optional(),
  })),
});

const assignGuestsSchema = z.object({
  assignments: z.array(z.object({
    guestUuid: z.string(),
    seatNumber: z.number().min(1),
  })),
});

const autoAssignSchema = z.object({
  guestUuids: z.array(z.string()).min(1),
});

const createRelationshipSchema = z.object({
  guestUuid1: z.string(),
  guestUuid2: z.string(),
  relationshipType: z.enum(RELATIONSHIP_TYPES),
  notes: z.string().max(500).optional(),
});

// ==================== FLOOR PLAN CRUD ====================

/**
 * GET / — List floor plans for event
 */
floorPlans.get('/', requireAuth, async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
  }

  const plans = await db
    .select()
    .from(schema.floorPlans)
    .where(
      and(
        eq(schema.floorPlans.eventId, access.event.id),
        isNull(schema.floorPlans.deletedAt)
      )
    )
    .orderBy(schema.floorPlans.sortOrder);

  return c.json({ success: true, data: plans });
});

/**
 * POST / — Create floor plan
 */
floorPlans.post('/', requireAuth, zValidator('json', createFloorPlanSchema), async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);
  const body = c.req.valid('json');

  // Enforce floor plan feature access
  const sub = c.get('subscription');
  const userPlan = getEffectivePlan(sub?.plan ?? 'free', sub?.status ?? 'free');
  const featureCheck = checkFeatureAccess(userPlan, 'floorPlans');
  if (!featureCheck.ok) {
    return c.json({ success: false, error: featureCheck.error }, 402);
  }

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
  }
  if (!access.canEdit) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No edit permission' } }, 403);
  }

  // Count existing plans
  const existingPlans = await db
    .select({ id: schema.floorPlans.id })
    .from(schema.floorPlans)
    .where(and(eq(schema.floorPlans.eventId, access.event.id), isNull(schema.floorPlans.deletedAt)));

  const uuid = crypto.randomUUID();
  const isDefault = body.isDefault ?? existingPlans.length === 0;

  // If setting as default, unset existing defaults
  if (isDefault && existingPlans.length > 0) {
    await db
      .update(schema.floorPlans)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(and(eq(schema.floorPlans.eventId, access.event.id), eq(schema.floorPlans.isDefault, true)));
  }

  const [plan] = await db
    .insert(schema.floorPlans)
    .values({
      uuid,
      eventId: access.event.id,
      name: body.name,
      widthFt: body.widthFt ?? 1000,
      heightFt: body.heightFt ?? 800,
      gridSnap: body.gridSnap ?? 10,
      isDefault,
      sortOrder: existingPlans.length,
    })
    .returning();

  return c.json({ success: true, data: plan }, 201);
});

/**
 * GET /:planUuid — Get floor plan with all objects + seat assignments + guest info
 */
floorPlans.get('/:planUuid', requireAuth, async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const planUuid = c.req.param('planUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
  }

  const [plan] = await db
    .select()
    .from(schema.floorPlans)
    .where(
      and(
        eq(schema.floorPlans.uuid, planUuid),
        eq(schema.floorPlans.eventId, access.event.id),
        isNull(schema.floorPlans.deletedAt)
      )
    )
    .limit(1);

  if (!plan) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  }

  // Get all objects
  const objects = await db
    .select()
    .from(schema.floorPlanObjects)
    .where(eq(schema.floorPlanObjects.floorPlanId, plan.id))
    .orderBy(schema.floorPlanObjects.sortOrder);

  // Get all seat assignments with guest info
  const objectIds = objects.map((o) => o.id);
  let assignments: Array<{
    id: number;
    floorPlanObjectId: number;
    guestId: number;
    seatNumber: number;
    guestUuid: string;
    guestFirstName: string;
    guestLastName: string | null;
    guestRsvpStatus: string | null;
    guestDietaryRestrictions: string | null;
  }> = [];

  if (objectIds.length > 0) {
    assignments = await db
      .select({
        id: schema.seatAssignments.id,
        floorPlanObjectId: schema.seatAssignments.floorPlanObjectId,
        guestId: schema.seatAssignments.guestId,
        seatNumber: schema.seatAssignments.seatNumber,
        guestUuid: schema.guests.uuid,
        guestFirstName: schema.guests.firstName,
        guestLastName: schema.guests.lastName,
        guestRsvpStatus: schema.guests.rsvpStatus,
        guestDietaryRestrictions: schema.guests.dietaryRestrictions,
      })
      .from(schema.seatAssignments)
      .innerJoin(schema.guests, eq(schema.seatAssignments.guestId, schema.guests.id))
      .where(
        inArray(schema.seatAssignments.floorPlanObjectId, objectIds)
      );
  }

  // Group assignments by object
  const assignmentsByObject: Record<number, typeof assignments> = {};
  for (const a of assignments) {
    if (!assignmentsByObject[a.floorPlanObjectId]) {
      assignmentsByObject[a.floorPlanObjectId] = [];
    }
    assignmentsByObject[a.floorPlanObjectId]!.push(a);
  }

  const objectsWithAssignments = objects.map((obj) => ({
    ...obj,
    assignments: (assignmentsByObject[obj.id] ?? []).map((a) => ({
      id: a.id,
      seatNumber: a.seatNumber,
      guestId: a.guestId,
      guestUuid: a.guestUuid,
      guestFirstName: a.guestFirstName,
      guestLastName: a.guestLastName,
      guestRsvpStatus: a.guestRsvpStatus,
      guestDietaryRestrictions: a.guestDietaryRestrictions,
    })),
  }));

  return c.json({
    success: true,
    data: {
      ...plan,
      objects: objectsWithAssignments,
    },
  });
});

/**
 * PATCH /:planUuid — Update floor plan metadata
 */
floorPlans.patch('/:planUuid', requireAuth, zValidator('json', updateFloorPlanSchema), async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const planUuid = c.req.param('planUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);
  const body = c.req.valid('json');

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access || !access.canEdit) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No edit permission' } }, 403);
  }

  const [plan] = await db
    .select()
    .from(schema.floorPlans)
    .where(
      and(
        eq(schema.floorPlans.uuid, planUuid),
        eq(schema.floorPlans.eventId, access.event.id),
        isNull(schema.floorPlans.deletedAt)
      )
    )
    .limit(1);

  if (!plan) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  }

  // If setting as default, unset others
  if (body.isDefault === true) {
    await db
      .update(schema.floorPlans)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(and(
        eq(schema.floorPlans.eventId, access.event.id),
        eq(schema.floorPlans.isDefault, true),
      ));
  }

  const [updated] = await db
    .update(schema.floorPlans)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(schema.floorPlans.id, plan.id))
    .returning();

  return c.json({ success: true, data: updated });
});

/**
 * DELETE /:planUuid — Soft-delete floor plan
 */
floorPlans.delete('/:planUuid', requireAuth, async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const planUuid = c.req.param('planUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access || !access.canEdit) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No edit permission' } }, 403);
  }

  const [plan] = await db
    .select()
    .from(schema.floorPlans)
    .where(
      and(
        eq(schema.floorPlans.uuid, planUuid),
        eq(schema.floorPlans.eventId, access.event.id),
        isNull(schema.floorPlans.deletedAt)
      )
    )
    .limit(1);

  if (!plan) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  }

  await db
    .update(schema.floorPlans)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.floorPlans.id, plan.id));

  return c.json({ success: true, data: { deleted: true } });
});

// ==================== FLOOR PLAN OBJECTS ====================

/**
 * POST /:planUuid/objects — Create object (table or element)
 */
floorPlans.post('/:planUuid/objects', requireAuth, zValidator('json', createObjectSchema), async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const planUuid = c.req.param('planUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);
  const body = c.req.valid('json');

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access || !access.canEdit) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No edit permission' } }, 403);
  }

  const [plan] = await db
    .select()
    .from(schema.floorPlans)
    .where(
      and(
        eq(schema.floorPlans.uuid, planUuid),
        eq(schema.floorPlans.eventId, access.event.id),
        isNull(schema.floorPlans.deletedAt)
      )
    )
    .limit(1);

  if (!plan) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  }

  // Auto-assign table number for tables
  let tableNumber: number | undefined;
  if (body.objectType === 'table') {
    const [maxRow] = await db
      .select({ max: sql<number>`COALESCE(MAX(${schema.floorPlanObjects.tableNumber}), 0)` })
      .from(schema.floorPlanObjects)
      .where(
        and(
          eq(schema.floorPlanObjects.floorPlanId, plan.id),
          eq(schema.floorPlanObjects.objectType, 'table')
        )
      );
    tableNumber = (maxRow?.max ?? 0) + 1;
  }

  // Set default dimensions based on shape/type
  let widthFt = body.widthFt ?? 60;
  let heightFt = body.heightFt ?? 60;
  if (body.objectType === 'table') {
    if (body.tableShape === 'rectangular' || body.tableShape === 'head_table') {
      widthFt = body.widthFt ?? 100;
      heightFt = body.heightFt ?? 40;
    }
  } else if (body.objectType === 'element') {
    if (body.elementType === 'dance_floor') {
      widthFt = body.widthFt ?? 200;
      heightFt = body.heightFt ?? 200;
    } else if (body.elementType === 'stage') {
      widthFt = body.widthFt ?? 160;
      heightFt = body.heightFt ?? 80;
    }
  }

  const uuid = crypto.randomUUID();
  const [obj] = await db
    .insert(schema.floorPlanObjects)
    .values({
      uuid,
      floorPlanId: plan.id,
      objectType: body.objectType,
      tableShape: body.objectType === 'table' ? body.tableShape! : null,
      elementType: body.objectType === 'element' ? body.elementType! : null,
      label: body.label,
      posX: body.posX ?? 100,
      posY: body.posY ?? 100,
      widthFt,
      heightFt,
      rotation: body.rotation ?? 0,
      seatCount: body.objectType === 'table' ? (body.seatCount ?? 8) : null,
      seatTop: body.objectType === 'table' ? (body.seatTop ?? null) : null,
      seatBottom: body.objectType === 'table' ? (body.seatBottom ?? null) : null,
      seatLeft: body.objectType === 'table' ? (body.seatLeft ?? null) : null,
      seatRight: body.objectType === 'table' ? (body.seatRight ?? null) : null,
      tableNumber: tableNumber ?? null,
      style: body.style ?? null,
    })
    .returning();

  return c.json({ success: true, data: { ...obj, assignments: [] } }, 201);
});

/**
 * PATCH /:planUuid/objects/:objectUuid — Update single object
 */
floorPlans.patch('/:planUuid/objects/:objectUuid', requireAuth, zValidator('json', updateObjectSchema), async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const planUuid = c.req.param('planUuid')!;
  const objectUuid = c.req.param('objectUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);
  const body = c.req.valid('json');

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access || !access.canEdit) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No edit permission' } }, 403);
  }

  // Verify plan exists and object belongs to it
  const [plan] = await db
    .select({ id: schema.floorPlans.id })
    .from(schema.floorPlans)
    .where(
      and(
        eq(schema.floorPlans.uuid, planUuid),
        eq(schema.floorPlans.eventId, access.event.id),
        isNull(schema.floorPlans.deletedAt)
      )
    )
    .limit(1);

  if (!plan) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  }

  const [obj] = await db
    .select()
    .from(schema.floorPlanObjects)
    .where(
      and(
        eq(schema.floorPlanObjects.uuid, objectUuid),
        eq(schema.floorPlanObjects.floorPlanId, plan.id)
      )
    )
    .limit(1);

  if (!obj) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Object not found' } }, 404);
  }

  const [updated] = await db
    .update(schema.floorPlanObjects)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(schema.floorPlanObjects.id, obj.id))
    .returning();

  return c.json({ success: true, data: updated });
});

/**
 * DELETE /:planUuid/objects/:objectUuid — Delete object
 */
floorPlans.delete('/:planUuid/objects/:objectUuid', requireAuth, async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const planUuid = c.req.param('planUuid')!;
  const objectUuid = c.req.param('objectUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access || !access.canEdit) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No edit permission' } }, 403);
  }

  const [plan] = await db
    .select({ id: schema.floorPlans.id })
    .from(schema.floorPlans)
    .where(
      and(
        eq(schema.floorPlans.uuid, planUuid),
        eq(schema.floorPlans.eventId, access.event.id),
        isNull(schema.floorPlans.deletedAt)
      )
    )
    .limit(1);

  if (!plan) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  }

  const [obj] = await db
    .select({ id: schema.floorPlanObjects.id })
    .from(schema.floorPlanObjects)
    .where(
      and(
        eq(schema.floorPlanObjects.uuid, objectUuid),
        eq(schema.floorPlanObjects.floorPlanId, plan.id)
      )
    )
    .limit(1);

  if (!obj) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Object not found' } }, 404);
  }

  // Cascade delete will handle seat_assignments
  await db.delete(schema.floorPlanObjects).where(eq(schema.floorPlanObjects.id, obj.id));

  return c.json({ success: true, data: { deleted: true } });
});

/**
 * PUT /:planUuid/objects/bulk-positions — Bulk update positions after drag
 */
floorPlans.put('/:planUuid/objects/bulk-positions', requireAuth, zValidator('json', bulkPositionsSchema), async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const planUuid = c.req.param('planUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);
  const body = c.req.valid('json');

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access || !access.canEdit) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No edit permission' } }, 403);
  }

  const [plan] = await db
    .select({ id: schema.floorPlans.id })
    .from(schema.floorPlans)
    .where(
      and(
        eq(schema.floorPlans.uuid, planUuid),
        eq(schema.floorPlans.eventId, access.event.id),
        isNull(schema.floorPlans.deletedAt)
      )
    )
    .limit(1);

  if (!plan) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  }

  const now = new Date();
  const statements = body.updates.map((update) =>
    db
      .update(schema.floorPlanObjects)
      .set({
        posX: update.posX,
        posY: update.posY,
        ...(update.rotation !== undefined ? { rotation: update.rotation } : {}),
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.floorPlanObjects.uuid, update.uuid),
          eq(schema.floorPlanObjects.floorPlanId, plan.id)
        )
      )
  );

  if (statements.length > 0) {
    await db.batch(statements as any);
  }

  return c.json({ success: true, data: { updated: body.updates.length } });
});

// ==================== SEAT ASSIGNMENTS ====================

/**
 * POST /:planUuid/objects/:objectUuid/assign — Assign guest(s) to specific seats
 */
floorPlans.post('/:planUuid/objects/:objectUuid/assign', requireAuth, zValidator('json', assignGuestsSchema), async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const planUuid = c.req.param('planUuid')!;
  const objectUuid = c.req.param('objectUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);
  const body = c.req.valid('json');

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access || !access.canManageGuests) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No guest management permission' } }, 403);
  }

  const [plan] = await db
    .select({ id: schema.floorPlans.id })
    .from(schema.floorPlans)
    .where(
      and(
        eq(schema.floorPlans.uuid, planUuid),
        eq(schema.floorPlans.eventId, access.event.id),
        isNull(schema.floorPlans.deletedAt)
      )
    )
    .limit(1);

  if (!plan) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  }

  const [obj] = await db
    .select()
    .from(schema.floorPlanObjects)
    .where(
      and(
        eq(schema.floorPlanObjects.uuid, objectUuid),
        eq(schema.floorPlanObjects.floorPlanId, plan.id),
        eq(schema.floorPlanObjects.objectType, 'table')
      )
    )
    .limit(1);

  if (!obj) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Table not found' } }, 404);
  }

  // Resolve guest UUIDs to IDs
  const guestUuids = body.assignments.map((a) => a.guestUuid);
  const guestsData = await db
    .select({ id: schema.guests.id, uuid: schema.guests.uuid })
    .from(schema.guests)
    .where(
      and(
        inArray(schema.guests.uuid, guestUuids),
        eq(schema.guests.eventId, access.event.id),
        isNull(schema.guests.deletedAt)
      )
    );

  const guestMap = new Map(guestsData.map((g) => [g.uuid, g.id]));

  const values = body.assignments
    .filter((a) => guestMap.has(a.guestUuid))
    .map((a) => ({
      floorPlanObjectId: obj.id,
      guestId: guestMap.get(a.guestUuid)!,
      seatNumber: a.seatNumber,
    }));

  if (values.length === 0) {
    return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'No valid guests found' } }, 400);
  }

  // Remove existing assignments for these guests at this table, then insert
  const guestIds = values.map((v) => v.guestId);
  await db.delete(schema.seatAssignments).where(
    and(
      eq(schema.seatAssignments.floorPlanObjectId, obj.id),
      inArray(schema.seatAssignments.guestId, guestIds)
    )
  );

  await db.insert(schema.seatAssignments).values(values);

  // Sync tableAssignment text field on guests
  const tableLabel = obj.label || `Table ${obj.tableNumber}`;
  await db
    .update(schema.guests)
    .set({ tableAssignment: tableLabel, updatedAt: new Date() })
    .where(inArray(schema.guests.id, guestIds));

  return c.json({ success: true, data: { assigned: values.length } }, 201);
});

/**
 * DELETE /:planUuid/objects/:objectUuid/assign/:guestUuid — Unassign guest
 */
floorPlans.delete('/:planUuid/objects/:objectUuid/assign/:guestUuid', requireAuth, async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const planUuid = c.req.param('planUuid')!;
  const objectUuid = c.req.param('objectUuid')!;
  const guestUuid = c.req.param('guestUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access || !access.canManageGuests) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No guest management permission' } }, 403);
  }

  const [plan] = await db
    .select({ id: schema.floorPlans.id })
    .from(schema.floorPlans)
    .where(
      and(
        eq(schema.floorPlans.uuid, planUuid),
        eq(schema.floorPlans.eventId, access.event.id),
        isNull(schema.floorPlans.deletedAt)
      )
    )
    .limit(1);

  if (!plan) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  }

  const [obj] = await db
    .select({ id: schema.floorPlanObjects.id })
    .from(schema.floorPlanObjects)
    .where(
      and(
        eq(schema.floorPlanObjects.uuid, objectUuid),
        eq(schema.floorPlanObjects.floorPlanId, plan.id)
      )
    )
    .limit(1);

  if (!obj) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Object not found' } }, 404);
  }

  const [guest] = await db
    .select({ id: schema.guests.id })
    .from(schema.guests)
    .where(
      and(
        eq(schema.guests.uuid, guestUuid),
        eq(schema.guests.eventId, access.event.id)
      )
    )
    .limit(1);

  if (!guest) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Guest not found' } }, 404);
  }

  await db.delete(schema.seatAssignments).where(
    and(
      eq(schema.seatAssignments.floorPlanObjectId, obj.id),
      eq(schema.seatAssignments.guestId, guest.id)
    )
  );

  // Clear tableAssignment if guest has no other assignments in this plan
  const remaining = await db
    .select({ id: schema.seatAssignments.id })
    .from(schema.seatAssignments)
    .innerJoin(schema.floorPlanObjects, eq(schema.seatAssignments.floorPlanObjectId, schema.floorPlanObjects.id))
    .where(
      and(
        eq(schema.seatAssignments.guestId, guest.id),
        eq(schema.floorPlanObjects.floorPlanId, plan.id)
      )
    )
    .limit(1);

  if (remaining.length === 0) {
    await db
      .update(schema.guests)
      .set({ tableAssignment: null, updatedAt: new Date() })
      .where(eq(schema.guests.id, guest.id));
  }

  return c.json({ success: true, data: { unassigned: true } });
});

// ==================== UNASSIGNED GUESTS ====================

/**
 * GET /:planUuid/unassigned-guests — Guests not assigned in this plan
 */
floorPlans.get('/:planUuid/unassigned-guests', requireAuth, async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const planUuid = c.req.param('planUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
  }

  const [plan] = await db
    .select({ id: schema.floorPlans.id })
    .from(schema.floorPlans)
    .where(
      and(
        eq(schema.floorPlans.uuid, planUuid),
        eq(schema.floorPlans.eventId, access.event.id),
        isNull(schema.floorPlans.deletedAt)
      )
    )
    .limit(1);

  if (!plan) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  }

  // Get all guest IDs that ARE assigned in this plan
  const assignedGuestIds = await db
    .select({ guestId: schema.seatAssignments.guestId })
    .from(schema.seatAssignments)
    .innerJoin(schema.floorPlanObjects, eq(schema.seatAssignments.floorPlanObjectId, schema.floorPlanObjects.id))
    .where(eq(schema.floorPlanObjects.floorPlanId, plan.id));

  const assignedIds = assignedGuestIds.map((r) => r.guestId);

  // Get all event guests minus assigned ones
  let query = db
    .select({
      id: schema.guests.id,
      uuid: schema.guests.uuid,
      firstName: schema.guests.firstName,
      lastName: schema.guests.lastName,
      rsvpStatus: schema.guests.rsvpStatus,
      dietaryRestrictions: schema.guests.dietaryRestrictions,
      category: schema.guests.category,
    })
    .from(schema.guests)
    .where(
      and(
        eq(schema.guests.eventId, access.event.id),
        isNull(schema.guests.deletedAt),
        ...(assignedIds.length > 0
          ? [sql`${schema.guests.id} NOT IN (${sql.join(assignedIds.map(id => sql`${id}`), sql`, `)})`]
          : [])
      )
    )
    .orderBy(schema.guests.firstName);

  const unassigned = await query;

  return c.json({ success: true, data: unassigned });
});

// ==================== AUTO-ASSIGN ====================

/**
 * POST /:planUuid/auto-assign — Randomly assign selected guests to available seats
 */
floorPlans.post('/:planUuid/auto-assign', requireAuth, zValidator('json', autoAssignSchema), async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const planUuid = c.req.param('planUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);
  const body = c.req.valid('json');

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access || !access.canManageGuests) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No guest management permission' } }, 403);
  }

  const [plan] = await db
    .select({ id: schema.floorPlans.id })
    .from(schema.floorPlans)
    .where(
      and(
        eq(schema.floorPlans.uuid, planUuid),
        eq(schema.floorPlans.eventId, access.event.id),
        isNull(schema.floorPlans.deletedAt)
      )
    )
    .limit(1);

  if (!plan) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  }

  // Get all tables with their current assignment counts
  const tables = await db
    .select()
    .from(schema.floorPlanObjects)
    .where(
      and(
        eq(schema.floorPlanObjects.floorPlanId, plan.id),
        eq(schema.floorPlanObjects.objectType, 'table')
      )
    );

  // Get existing assignments for this plan
  const existingAssignments = await db
    .select({
      floorPlanObjectId: schema.seatAssignments.floorPlanObjectId,
      seatNumber: schema.seatAssignments.seatNumber,
    })
    .from(schema.seatAssignments)
    .innerJoin(schema.floorPlanObjects, eq(schema.seatAssignments.floorPlanObjectId, schema.floorPlanObjects.id))
    .where(eq(schema.floorPlanObjects.floorPlanId, plan.id));

  // Build available seats per table
  const usedSeats: Record<number, Set<number>> = {};
  for (const a of existingAssignments) {
    if (!usedSeats[a.floorPlanObjectId]) usedSeats[a.floorPlanObjectId] = new Set();
    usedSeats[a.floorPlanObjectId]!.add(a.seatNumber);
  }

  const availableSeats: Array<{ tableId: number; seatNumber: number; label: string; tableNumber: number | null }> = [];
  for (const table of tables) {
    const seatCount = table.seatCount ?? 8;
    const used = usedSeats[table.id] ?? new Set();
    for (let s = 1; s <= seatCount; s++) {
      if (!used.has(s)) {
        availableSeats.push({ tableId: table.id, seatNumber: s, label: table.label, tableNumber: table.tableNumber });
      }
    }
  }

  // Shuffle available seats (Fisher-Yates)
  for (let i = availableSeats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = availableSeats[i]!;
    availableSeats[i] = availableSeats[j]!;
    availableSeats[j] = temp;
  }

  // Resolve guest UUIDs
  const guestsData = await db
    .select({ id: schema.guests.id, uuid: schema.guests.uuid })
    .from(schema.guests)
    .where(
      and(
        inArray(schema.guests.uuid, body.guestUuids),
        eq(schema.guests.eventId, access.event.id),
        isNull(schema.guests.deletedAt)
      )
    );

  const newAssignments: Array<{ floorPlanObjectId: number; guestId: number; seatNumber: number }> = [];
  const tableAssignmentUpdates: Array<{ guestId: number; label: string }> = [];

  for (let i = 0; i < guestsData.length && i < availableSeats.length; i++) {
    const seat = availableSeats[i]!;
    const guest = guestsData[i]!;
    newAssignments.push({
      floorPlanObjectId: seat.tableId,
      guestId: guest.id,
      seatNumber: seat.seatNumber,
    });
    tableAssignmentUpdates.push({
      guestId: guest.id,
      label: seat.label || `Table ${seat.tableNumber}`,
    });
  }

  if (newAssignments.length > 0) {
    await db.insert(schema.seatAssignments).values(newAssignments);

    // Sync table assignment text
    const now = new Date();
    const updates = tableAssignmentUpdates.map((u) =>
      db
        .update(schema.guests)
        .set({ tableAssignment: u.label, updatedAt: now })
        .where(eq(schema.guests.id, u.guestId))
    );
    if (updates.length > 0) {
      await db.batch(updates as any);
    }
  }

  return c.json({
    success: true,
    data: {
      assigned: newAssignments.length,
      totalRequested: body.guestUuids.length,
      availableSeatsRemaining: availableSeats.length - newAssignments.length,
    },
  });
});

// ==================== CONFLICTS ====================

/**
 * GET /:planUuid/conflicts — Check for over-capacity tables and avoid-pair violations
 */
floorPlans.get('/:planUuid/conflicts', requireAuth, async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const planUuid = c.req.param('planUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
  }

  const [plan] = await db
    .select({ id: schema.floorPlans.id })
    .from(schema.floorPlans)
    .where(
      and(
        eq(schema.floorPlans.uuid, planUuid),
        eq(schema.floorPlans.eventId, access.event.id),
        isNull(schema.floorPlans.deletedAt)
      )
    )
    .limit(1);

  if (!plan) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  }

  const conflicts: Array<{ type: string; message: string; objectUuid?: string | undefined; guestUuids?: string[] | undefined }> = [];

  // 1. Over-capacity check
  const tables = await db
    .select()
    .from(schema.floorPlanObjects)
    .where(
      and(
        eq(schema.floorPlanObjects.floorPlanId, plan.id),
        eq(schema.floorPlanObjects.objectType, 'table')
      )
    );

  for (const table of tables) {
    const [countRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.seatAssignments)
      .where(eq(schema.seatAssignments.floorPlanObjectId, table.id));

    const assignedCount = countRow?.count ?? 0;
    const capacity = table.seatCount ?? 8;
    if (assignedCount > capacity) {
      conflicts.push({
        type: 'over_capacity',
        message: `${table.label} has ${assignedCount} guests but only ${capacity} seats`,
        objectUuid: table.uuid,
      });
    }
  }

  // 2. Avoid-pair violations
  const avoidRelationships = await db
    .select()
    .from(schema.guestRelationships)
    .where(
      and(
        eq(schema.guestRelationships.eventId, access.event.id),
        eq(schema.guestRelationships.relationshipType, 'avoid')
      )
    );

  if (avoidRelationships.length > 0) {
    // Get all assignments grouped by table
    const allAssignments = await db
      .select({
        objectId: schema.seatAssignments.floorPlanObjectId,
        guestId: schema.seatAssignments.guestId,
      })
      .from(schema.seatAssignments)
      .innerJoin(schema.floorPlanObjects, eq(schema.seatAssignments.floorPlanObjectId, schema.floorPlanObjects.id))
      .where(eq(schema.floorPlanObjects.floorPlanId, plan.id));

    const guestsByTable: Record<number, number[]> = {};
    for (const a of allAssignments) {
      if (!guestsByTable[a.objectId]) guestsByTable[a.objectId] = [];
      guestsByTable[a.objectId]!.push(a.guestId);
    }

    // Get guest uuid map
    const allGuestIds = [...new Set(allAssignments.map((a) => a.guestId))];
    let guestUuidMap: Map<number, string> = new Map();
    if (allGuestIds.length > 0) {
      const guestRows = await db
        .select({ id: schema.guests.id, uuid: schema.guests.uuid })
        .from(schema.guests)
        .where(inArray(schema.guests.id, allGuestIds));
      guestUuidMap = new Map(guestRows.map((g) => [g.id, g.uuid]));
    }

    for (const rel of avoidRelationships) {
      for (const [objectId, guestIds] of Object.entries(guestsByTable)) {
        const ids = guestIds as number[];
        if (ids.includes(rel.guestId1) && ids.includes(rel.guestId2)) {
          const tableObj = tables.find((t) => t.id === Number(objectId));
          conflicts.push({
            type: 'avoid_pair',
            message: `Avoid-pair seated at same table: ${tableObj?.label ?? `Table ${objectId}`}`,
            objectUuid: tableObj?.uuid,
            guestUuids: [
              guestUuidMap.get(rel.guestId1) ?? '',
              guestUuidMap.get(rel.guestId2) ?? '',
            ].filter(Boolean),
          });
        }
      }
    }
  }

  return c.json({ success: true, data: conflicts });
});

// ==================== GUEST RELATIONSHIPS ====================

/**
 * GET /relationships — List all prefer/avoid pairs for event
 */
floorPlans.get('/relationships', requireAuth, async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
  }

  const relationships = await db
    .select({
      id: schema.guestRelationships.id,
      relationshipType: schema.guestRelationships.relationshipType,
      notes: schema.guestRelationships.notes,
      guestId1: schema.guestRelationships.guestId1,
      guestId2: schema.guestRelationships.guestId2,
    })
    .from(schema.guestRelationships)
    .where(eq(schema.guestRelationships.eventId, access.event.id));

  // Resolve guest names
  const allGuestIds = [...new Set(relationships.flatMap((r) => [r.guestId1, r.guestId2]))];
  let guestInfoMap: Map<number, { uuid: string; firstName: string; lastName: string | null }> = new Map();
  if (allGuestIds.length > 0) {
    const guestRows = await db
      .select({
        id: schema.guests.id,
        uuid: schema.guests.uuid,
        firstName: schema.guests.firstName,
        lastName: schema.guests.lastName,
      })
      .from(schema.guests)
      .where(inArray(schema.guests.id, allGuestIds));
    guestInfoMap = new Map(guestRows.map((g) => [g.id, { uuid: g.uuid, firstName: g.firstName, lastName: g.lastName }]));
  }

  const data = relationships.map((r) => ({
    id: r.id,
    relationshipType: r.relationshipType,
    notes: r.notes,
    guest1: guestInfoMap.get(r.guestId1) ?? null,
    guest2: guestInfoMap.get(r.guestId2) ?? null,
  }));

  return c.json({ success: true, data });
});

/**
 * POST /relationships — Create a relationship
 */
floorPlans.post('/relationships', requireAuth, zValidator('json', createRelationshipSchema), async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);
  const body = c.req.valid('json');

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access || !access.canManageGuests) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No guest management permission' } }, 403);
  }

  // Resolve guest UUIDs
  const [guest1] = await db
    .select({ id: schema.guests.id })
    .from(schema.guests)
    .where(and(eq(schema.guests.uuid, body.guestUuid1), eq(schema.guests.eventId, access.event.id)))
    .limit(1);

  const [guest2] = await db
    .select({ id: schema.guests.id })
    .from(schema.guests)
    .where(and(eq(schema.guests.uuid, body.guestUuid2), eq(schema.guests.eventId, access.event.id)))
    .limit(1);

  if (!guest1 || !guest2) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'One or both guests not found' } }, 404);
  }

  if (guest1.id === guest2.id) {
    return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Cannot create relationship with same guest' } }, 400);
  }

  // Ensure consistent ordering
  const [gId1, gId2] = guest1.id < guest2.id ? [guest1.id, guest2.id] : [guest2.id, guest1.id];

  // Check if relationship already exists
  const [existing] = await db
    .select({ id: schema.guestRelationships.id })
    .from(schema.guestRelationships)
    .where(
      and(
        eq(schema.guestRelationships.eventId, access.event.id),
        eq(schema.guestRelationships.guestId1, gId1),
        eq(schema.guestRelationships.guestId2, gId2)
      )
    )
    .limit(1);

  if (existing) {
    return c.json({ success: false, error: { code: 'CONFLICT', message: 'Relationship already exists' } }, 409);
  }

  const [relationship] = await db
    .insert(schema.guestRelationships)
    .values({
      eventId: access.event.id,
      guestId1: gId1,
      guestId2: gId2,
      relationshipType: body.relationshipType,
      notes: body.notes,
    })
    .returning();

  return c.json({ success: true, data: relationship }, 201);
});

/**
 * DELETE /relationships/:id — Remove a relationship
 */
floorPlans.delete('/relationships/:id', requireAuth, async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const relationshipId = parseInt(c.req.param('id')!);
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access || !access.canManageGuests) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No guest management permission' } }, 403);
  }

  const [rel] = await db
    .select({ id: schema.guestRelationships.id })
    .from(schema.guestRelationships)
    .where(
      and(
        eq(schema.guestRelationships.id, relationshipId),
        eq(schema.guestRelationships.eventId, access.event.id)
      )
    )
    .limit(1);

  if (!rel) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Relationship not found' } }, 404);
  }

  await db.delete(schema.guestRelationships).where(eq(schema.guestRelationships.id, rel.id));

  return c.json({ success: true, data: { deleted: true } });
});

export default floorPlans;
