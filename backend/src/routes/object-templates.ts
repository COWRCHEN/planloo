/**
 * Object Templates Routes
 *
 * CRUD endpoints for reusable table/element templates, scoped per event.
 * Auto-seeds default templates on first GET if none exist.
 *
 * Routes are scoped to /events/:eventUuid/object-templates
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and } from 'drizzle-orm';
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
  widthFt: z.number().min(1).max(100),
  heightFt: z.number().min(1).max(100),
  seatCount: z.number().min(1).max(50).optional(),
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
  widthFt: z.number().min(1).max(100).optional(),
  heightFt: z.number().min(1).max(100).optional(),
  seatCount: z.number().min(1).max(50).optional(),
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
  sortOrder: number;
}

const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  // Tables
  { objectType: 'table', tableShape: 'round', label: 'Round (8)', widthFt: 6, heightFt: 6, seatCount: 8, sortOrder: 0 },
  { objectType: 'table', tableShape: 'round', label: 'Round (10)', widthFt: 7, heightFt: 7, seatCount: 10, sortOrder: 1 },
  { objectType: 'table', tableShape: 'round', label: 'Round (6)', widthFt: 5, heightFt: 5, seatCount: 6, sortOrder: 2 },
  { objectType: 'table', tableShape: 'rectangular', label: 'Rectangular', widthFt: 10, heightFt: 4, seatCount: 8, sortOrder: 3 },
  { objectType: 'table', tableShape: 'square', label: 'Square (4)', widthFt: 4, heightFt: 4, seatCount: 4, sortOrder: 4 },
  { objectType: 'table', tableShape: 'head_table', label: 'Head Table', widthFt: 16, heightFt: 3, seatCount: 12, sortOrder: 5 },
  // Elements
  { objectType: 'element', elementType: 'dance_floor', label: 'Dance Floor', widthFt: 20, heightFt: 20, sortOrder: 100 },
  { objectType: 'element', elementType: 'bar', label: 'Bar', widthFt: 10, heightFt: 4, sortOrder: 101 },
  { objectType: 'element', elementType: 'buffet', label: 'Buffet', widthFt: 12, heightFt: 3, sortOrder: 102 },
  { objectType: 'element', elementType: 'stage', label: 'Stage', widthFt: 16, heightFt: 8, sortOrder: 103 },
  { objectType: 'element', elementType: 'dj_booth', label: 'DJ Booth', widthFt: 6, heightFt: 4, sortOrder: 104 },
  { objectType: 'element', elementType: 'entrance', label: 'Entrance', widthFt: 4, heightFt: 4, sortOrder: 105 },
  { objectType: 'element', elementType: 'exit', label: 'Exit', widthFt: 4, heightFt: 4, sortOrder: 106 },
];

// ==================== ROUTES ====================

/**
 * GET / - List templates for event; auto-seed defaults if empty
 */
objectTemplates.get('/', requireAuth, async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
  }

  let templates = await db
    .select()
    .from(schema.objectTemplates)
    .where(eq(schema.objectTemplates.eventId, access.event.id))
    .orderBy(schema.objectTemplates.sortOrder);

  // Auto-seed defaults if none exist
  if (templates.length === 0 && access.canEdit) {
    const values = DEFAULT_TEMPLATES.map((t) => ({
      uuid: crypto.randomUUID(),
      eventId: access.event.id,
      objectType: t.objectType,
      tableShape: t.tableShape ?? null,
      elementType: t.elementType ?? null,
      label: t.label,
      widthFt: t.widthFt,
      heightFt: t.heightFt,
      seatCount: t.seatCount ?? null,
      sortOrder: t.sortOrder,
    }));

    await db.insert(schema.objectTemplates).values(values);

    templates = await db
      .select()
      .from(schema.objectTemplates)
      .where(eq(schema.objectTemplates.eventId, access.event.id))
      .orderBy(schema.objectTemplates.sortOrder);
  }

  return c.json({ success: true, data: templates });
});

/**
 * POST / - Create a new template
 */
objectTemplates.post('/', requireAuth, zValidator('json', createTemplateSchema), async (c) => {
  const eventUuid = c.req.param('eventUuid')!;
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

  const uuid = crypto.randomUUID();
  const [template] = await db
    .insert(schema.objectTemplates)
    .values({
      uuid,
      eventId: access.event.id,
      objectType: body.objectType,
      tableShape: body.objectType === 'table' ? body.tableShape! : null,
      elementType: body.objectType === 'element' ? body.elementType! : null,
      label: body.label,
      widthFt: body.widthFt,
      heightFt: body.heightFt,
      seatCount: body.objectType === 'table' ? (body.seatCount ?? null) : null,
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
  const templateUuid = c.req.param('templateUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);
  const body = c.req.valid('json');

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access || !access.canEdit) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No edit permission' } }, 403);
  }

  const [template] = await db
    .select()
    .from(schema.objectTemplates)
    .where(
      and(
        eq(schema.objectTemplates.uuid, templateUuid),
        eq(schema.objectTemplates.eventId, access.event.id)
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
  const templateUuid = c.req.param('templateUuid')!;
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access || !access.canEdit) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No edit permission' } }, 403);
  }

  const [template] = await db
    .select({ id: schema.objectTemplates.id })
    .from(schema.objectTemplates)
    .where(
      and(
        eq(schema.objectTemplates.uuid, templateUuid),
        eq(schema.objectTemplates.eventId, access.event.id)
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
