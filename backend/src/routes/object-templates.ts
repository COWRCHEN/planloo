/**
 * Object Templates Routes
 *
 * CRUD endpoints for reusable table/element templates, scoped per floor plan.
 * Auto-seeds default templates on first GET if none exist.
 *
 * Routes are scoped to /events/:eventUuid/floor-plans/:planUuid/object-templates
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth } from '@/middleware/auth';
import { resolveEventAccess } from '@/lib/event-access';

const objectTemplates = new Hono<HonoEnv>();

// ==================== SCHEMAS ====================

const TABLE_SHAPES = ['round', 'rectangular', 'square', 'oval', 'semicircle', 'head_table'] as const;
const ELEMENT_TYPES = [
  'dance_floor', 'bar', 'buffet', 'stage', 'dj_booth', 'photo_booth',
  'entrance', 'exit', 'restroom', 'dessert_station', 'gift_table', 'custom',
] as const;

const createTemplateSchema = z.object({
  objectType: z.enum(['table', 'element']),
  tableShape: z.enum(TABLE_SHAPES).optional(),
  elementType: z.enum(ELEMENT_TYPES).optional(),
  label: z.string().min(1).max(100),
  widthFt: z.number().min(1).max(5000),
  heightFt: z.number().min(1).max(5000),
  seatCount: z.number().min(0).max(50).optional(),
  seatTop: z.number().min(0).max(50).optional(),
  seatBottom: z.number().min(0).max(50).optional(),
  seatLeft: z.number().min(0).max(50).optional(),
  seatRight: z.number().min(0).max(50).optional(),
  sortOrder: z.number().min(0).optional(),
}).refine(
  (data) => {
    if (data.objectType === 'table') return !!data.tableShape;
    if (data.objectType === 'element') return !!data.elementType;
    return true;
  },
  { message: 'tableShape required for tables, elementType required for elements' }
);

const updateTemplateSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  widthFt: z.number().min(1).max(5000).optional(),
  heightFt: z.number().min(1).max(5000).optional(),
  seatCount: z.number().min(0).max(50).optional(),
  seatTop: z.number().min(0).max(50).optional(),
  seatBottom: z.number().min(0).max(50).optional(),
  seatLeft: z.number().min(0).max(50).optional(),
  seatRight: z.number().min(0).max(50).optional(),
  sortOrder: z.number().min(0).optional(),
});

// ==================== DEFAULT SEED DATA ====================

interface DefaultTemplate {
  objectType: 'table' | 'element';
  tableShape?: typeof TABLE_SHAPES[number];
  elementType?: typeof ELEMENT_TYPES[number];
  label: string;
  widthFt: number;
  heightFt: number;
  seatCount?: number;
  seatTop?: number;
  seatBottom?: number;
  seatLeft?: number;
  seatRight?: number;
  sortOrder: number;
}

const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  // Tables
  { objectType: 'table', tableShape: 'round', label: 'Round (8)', widthFt: 60, heightFt: 60, seatCount: 8, sortOrder: 0 },
  { objectType: 'table', tableShape: 'round', label: 'Round (10)', widthFt: 70, heightFt: 70, seatCount: 10, sortOrder: 1 },
  { objectType: 'table', tableShape: 'round', label: 'Round (6)', widthFt: 50, heightFt: 50, seatCount: 6, sortOrder: 2 },
  { objectType: 'table', tableShape: 'rectangular', label: 'Rectangular (8)', widthFt: 160, heightFt: 40, seatCount: 8, seatTop: 3, seatBottom: 3, seatLeft: 1, seatRight: 1, sortOrder: 3 },
  { objectType: 'table', tableShape: 'square', label: 'Square (4)', widthFt: 40, heightFt: 40, seatCount: 4, sortOrder: 4 },
  { objectType: 'table', tableShape: 'head_table', label: 'Head Table (12)', widthFt: 160, heightFt: 30, seatCount: 12, seatTop: 0, seatBottom: 12, seatLeft: 0, seatRight: 0, sortOrder: 5 },
  // Elements
  { objectType: 'element', elementType: 'dance_floor', label: 'Dance Floor', widthFt: 200, heightFt: 200, sortOrder: 100 },
  { objectType: 'element', elementType: 'bar', label: 'Bar', widthFt: 100, heightFt: 40, sortOrder: 101 },
  { objectType: 'element', elementType: 'buffet', label: 'Buffet', widthFt: 120, heightFt: 30, sortOrder: 102 },
  { objectType: 'element', elementType: 'stage', label: 'Stage', widthFt: 160, heightFt: 80, sortOrder: 103 },
  { objectType: 'element', elementType: 'dj_booth', label: 'DJ Booth', widthFt: 60, heightFt: 40, sortOrder: 104 },
  { objectType: 'element', elementType: 'entrance', label: 'Entrance', widthFt: 40, heightFt: 40, sortOrder: 105 },
  { objectType: 'element', elementType: 'exit', label: 'Exit', widthFt: 40, heightFt: 40, sortOrder: 106 },
];

// ==================== HELPERS ====================

async function resolveFloorPlan(db: ReturnType<typeof createDbClient>, planUuid: string, eventId: number) {
  const [plan] = await db
    .select()
    .from(schema.floorPlans)
    .where(
      and(
        eq(schema.floorPlans.uuid, planUuid),
        eq(schema.floorPlans.eventId, eventId),
        isNull(schema.floorPlans.deletedAt)
      )
    )
    .limit(1);
  return plan;
}

// ==================== ROUTES ====================

/**
 * GET / - List templates for a floor plan; auto-seed defaults if empty
 */
objectTemplates.get('/', requireAuth, async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const planUuid = c.req.param('planUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
  }

  const plan = await resolveFloorPlan(db, planUuid, access.event.id);
  if (!plan) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  }

  let templates = await db
    .select()
    .from(schema.objectTemplates)
    .where(eq(schema.objectTemplates.floorPlanId, plan.id))
    .orderBy(schema.objectTemplates.sortOrder);

  if (templates.length === 0 && access.canEdit) {
    const values = DEFAULT_TEMPLATES.map((t) => ({
      uuid: crypto.randomUUID(),
      floorPlanId: plan.id,
      objectType: t.objectType,
      tableShape: t.tableShape ?? null,
      elementType: t.elementType ?? null,
      label: t.label,
      widthFt: t.widthFt,
      heightFt: t.heightFt,
      seatCount: t.seatCount ?? null,
      seatTop: t.seatTop ?? null,
      seatBottom: t.seatBottom ?? null,
      seatLeft: t.seatLeft ?? null,
      seatRight: t.seatRight ?? null,
      sortOrder: t.sortOrder,
    }));

    // D1 limit: 100 bound parameters per statement.
    // Each row has 14 params, so max 7 rows per batch (7×14=98).
    const CHUNK = 7;
    const inserts = [];
    for (let i = 0; i < values.length; i += CHUNK) {
      inserts.push(db.insert(schema.objectTemplates).values(values.slice(i, i + CHUNK)));
    }
    await db.batch(inserts);

    templates = await db
      .select()
      .from(schema.objectTemplates)
      .where(eq(schema.objectTemplates.floorPlanId, plan.id))
      .orderBy(schema.objectTemplates.sortOrder);
  }

  return c.json({ success: true, data: templates });
});

/**
 * POST / - Create a new template
 */
objectTemplates.post('/', requireAuth, zValidator('json', createTemplateSchema), async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const planUuid = c.req.param('planUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);
  const body = c.req.valid('json');

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
  }
  if (!access.canEdit) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No edit permission' } }, 403);
  }

  const plan = await resolveFloorPlan(db, planUuid, access.event.id);
  if (!plan) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  }

  const uuid = crypto.randomUUID();
  const [template] = await db
    .insert(schema.objectTemplates)
    .values({
      uuid,
      floorPlanId: plan.id,
      objectType: body.objectType,
      tableShape: body.objectType === 'table' ? body.tableShape! : null,
      elementType: body.objectType === 'element' ? body.elementType! : null,
      label: body.label,
      widthFt: body.widthFt,
      heightFt: body.heightFt,
      seatCount: body.objectType === 'table' ? (body.seatCount ?? null) : null,
      seatTop: body.objectType === 'table' ? (body.seatTop ?? null) : null,
      seatBottom: body.objectType === 'table' ? (body.seatBottom ?? null) : null,
      seatLeft: body.objectType === 'table' ? (body.seatLeft ?? null) : null,
      seatRight: body.objectType === 'table' ? (body.seatRight ?? null) : null,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return c.json({ success: true, data: template }, 201);
});

/**
 * PATCH /:templateUuid - Update a template
 */
objectTemplates.patch('/:templateUuid', requireAuth, zValidator('json', updateTemplateSchema), async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const planUuid = c.req.param('planUuid')!;
  const templateUuid = c.req.param('templateUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);
  const body = c.req.valid('json');

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access || !access.canEdit) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No edit permission' } }, 403);
  }

  const plan = await resolveFloorPlan(db, planUuid, access.event.id);
  if (!plan) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  }

  const [template] = await db
    .select()
    .from(schema.objectTemplates)
    .where(
      and(
        eq(schema.objectTemplates.uuid, templateUuid),
        eq(schema.objectTemplates.floorPlanId, plan.id)
      )
    )
    .limit(1);

  if (!template) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } }, 404);
  }

  const [updated] = await db
    .update(schema.objectTemplates)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(schema.objectTemplates.id, template.id))
    .returning();

  return c.json({ success: true, data: updated });
});

/**
 * DELETE /:templateUuid - Hard delete a template
 */
objectTemplates.delete('/:templateUuid', requireAuth, async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const planUuid = c.req.param('planUuid')!;
  const templateUuid = c.req.param('templateUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access || !access.canEdit) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No edit permission' } }, 403);
  }

  const plan = await resolveFloorPlan(db, planUuid, access.event.id);
  if (!plan) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  }

  const [template] = await db
    .select({ id: schema.objectTemplates.id })
    .from(schema.objectTemplates)
    .where(
      and(
        eq(schema.objectTemplates.uuid, templateUuid),
        eq(schema.objectTemplates.floorPlanId, plan.id)
      )
    )
    .limit(1);

  if (!template) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } }, 404);
  }

  await db.delete(schema.objectTemplates).where(eq(schema.objectTemplates.id, template.id));

  return c.json({ success: true, data: { deleted: true } });
});

export default objectTemplates;
