/**
 * Guests Routes
 *
 * CRUD endpoints for guest management within events.
 * Routes are scoped to /events/:eventUuid/guests
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull, desc, asc, sql, count, like, or } from 'drizzle-orm';
import { requireAuth, requireVerifiedEmail } from '@/middleware/auth';
import { parseGuestsCsv, generateGuestsCsv } from '@/lib/csv';

const guests = new Hono<HonoEnv>();

// ==================== ENUMS ====================

const GUEST_CATEGORIES = ['vip', 'family', 'friend', 'colleague', 'other'] as const;
const RSVP_STATUSES = ['pending', 'confirmed', 'declined', 'maybe'] as const;

// ==================== SCHEMAS ====================

const createGuestSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  category: z.enum(GUEST_CATEGORIES).optional().nullable(),
  plusOnesAllowed: z.coerce.number().int().min(0).max(10).default(0),
  dietaryRestrictions: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const updateGuestSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  category: z.enum(GUEST_CATEGORIES).optional().nullable(),
  rsvpStatus: z.enum(RSVP_STATUSES).optional(),
  plusOnesAllowed: z.coerce.number().int().min(0).max(10).optional(),
  plusOnesCount: z.coerce.number().int().min(0).optional(),
  dietaryRestrictions: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const listGuestsQuerySchema = z.object({
  category: z.enum(GUEST_CATEGORIES).optional(),
  rsvpStatus: z.enum(RSVP_STATUSES).optional(),
  search: z.string().max(100).optional(),
  checkedIn: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['firstName', 'lastName', 'createdAt', 'rsvpStatus']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ==================== HELPERS ====================

/**
 * Verify event ownership and return event ID
 */
async function getEventByUuidForUser(
  db: ReturnType<typeof createDbClient>,
  eventUuid: string,
  userId: string
): Promise<{ id: number } | null> {
  const [event] = await db
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.uuid, eventUuid),
        eq(schema.events.userId, userId),
        isNull(schema.events.deletedAt)
      )
    )
    .limit(1);

  return event ?? null;
}

/**
 * Generate a unique RSVP token
 */
function generateRsvpToken(): string {
  // Generate a URL-safe token
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ==================== ROUTES ====================

/**
 * GET /events/:eventUuid/guests
 * List guests for an event (paginated, filterable)
 */
guests.get(
  '/',
  requireAuth,
  zValidator('query', listGuestsQuerySchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const { category, rsvpStatus, search, checkedIn, limit, offset, sortBy, sortOrder } =
      c.req.valid('query');

    const db = createDbClient(c.env.DB);

    // Verify event ownership
    const event = await getEventByUuidForUser(db, eventUuid, user.id);
    if (!event) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        404
      );
    }

    // Build where conditions
    const conditions = [eq(schema.guests.eventId, event.id), isNull(schema.guests.deletedAt)];

    if (category) {
      conditions.push(eq(schema.guests.category, category));
    }

    if (rsvpStatus) {
      conditions.push(eq(schema.guests.rsvpStatus, rsvpStatus));
    }

    if (checkedIn !== undefined) {
      conditions.push(eq(schema.guests.checkedIn, checkedIn === 'true'));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          like(schema.guests.firstName, searchPattern),
          like(schema.guests.lastName, searchPattern),
          like(schema.guests.email, searchPattern)
        )!
      );
    }

    // Determine sort column
    const sortColumnMap = {
      firstName: schema.guests.firstName,
      lastName: schema.guests.lastName,
      createdAt: schema.guests.createdAt,
      rsvpStatus: schema.guests.rsvpStatus,
    };
    const sortColumn = sortColumnMap[sortBy];
    const orderFn = sortOrder === 'desc' ? desc : asc;

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(schema.guests)
      .where(and(...conditions));

    // Get guests
    const guestsList = await db
      .select({
        id: schema.guests.id,
        uuid: schema.guests.uuid,
        eventId: schema.guests.eventId,
        firstName: schema.guests.firstName,
        lastName: schema.guests.lastName,
        email: schema.guests.email,
        phone: schema.guests.phone,
        category: schema.guests.category,
        rsvpStatus: schema.guests.rsvpStatus,
        rsvpToken: schema.guests.rsvpToken,
        rsvpRespondedAt: schema.guests.rsvpRespondedAt,
        plusOnesAllowed: schema.guests.plusOnesAllowed,
        plusOnesCount: schema.guests.plusOnesCount,
        dietaryRestrictions: schema.guests.dietaryRestrictions,
        notes: schema.guests.notes,
        checkedIn: schema.guests.checkedIn,
        checkedInAt: schema.guests.checkedInAt,
        createdAt: schema.guests.createdAt,
        updatedAt: schema.guests.updatedAt,
      })
      .from(schema.guests)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    return c.json({
      success: true,
      data: guestsList,
      meta: {
        total: countResult?.count ?? 0,
        limit,
        offset,
      },
    });
  }
);

/**
 * GET /events/:eventUuid/guests/stats
 * Guest statistics for an event
 */
guests.get('/stats', requireAuth, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;

  const db = createDbClient(c.env.DB);

  // Verify event ownership
  const event = await getEventByUuidForUser(db, eventUuid, user.id);
  if (!event) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  const baseConditions = and(eq(schema.guests.eventId, event.id), isNull(schema.guests.deletedAt));

  // Get counts by RSVP status
  const rsvpStats = await db
    .select({
      rsvpStatus: schema.guests.rsvpStatus,
      count: count(),
    })
    .from(schema.guests)
    .where(baseConditions)
    .groupBy(schema.guests.rsvpStatus);

  // Get checked-in count
  const [checkedInResult] = await db
    .select({ count: count() })
    .from(schema.guests)
    .where(and(baseConditions, eq(schema.guests.checkedIn, true)));

  // Get total plus ones for confirmed guests
  const [plusOnesResult] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${schema.guests.plusOnesCount}), 0)`,
    })
    .from(schema.guests)
    .where(and(baseConditions, eq(schema.guests.rsvpStatus, 'confirmed')));

  // Build stats object
  const statusCounts: Record<string, number> = {};
  let total = 0;
  for (const stat of rsvpStats) {
    statusCounts[stat.rsvpStatus ?? 'pending'] = stat.count;
    total += stat.count;
  }

  return c.json({
    success: true,
    data: {
      total,
      pending: statusCounts['pending'] ?? 0,
      confirmed: statusCounts['confirmed'] ?? 0,
      declined: statusCounts['declined'] ?? 0,
      maybe: statusCounts['maybe'] ?? 0,
      checkedIn: checkedInResult?.count ?? 0,
      totalPlusOnes: plusOnesResult?.total ?? 0,
    },
  });
});

/**
 * GET /events/:eventUuid/guests/export
 * Export guests to CSV
 */
guests.get('/export', requireAuth, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;

  const db = createDbClient(c.env.DB);

  // Verify event ownership
  const event = await getEventByUuidForUser(db, eventUuid, user.id);
  if (!event) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  // Get all guests
  const guestsList = await db
    .select()
    .from(schema.guests)
    .where(and(eq(schema.guests.eventId, event.id), isNull(schema.guests.deletedAt)))
    .orderBy(asc(schema.guests.lastName), asc(schema.guests.firstName));

  const csv = generateGuestsCsv(guestsList);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="guests-${eventUuid}.csv"`,
    },
  });
});

/**
 * GET /events/:eventUuid/guests/:guestUuid
 * Get single guest by UUID
 */
guests.get('/:guestUuid', requireAuth, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const guestUuid = c.req.param('guestUuid')!;

  const db = createDbClient(c.env.DB);

  // Verify event ownership
  const event = await getEventByUuidForUser(db, eventUuid, user.id);
  if (!event) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  const [guest] = await db
    .select()
    .from(schema.guests)
    .where(
      and(
        eq(schema.guests.uuid, guestUuid),
        eq(schema.guests.eventId, event.id),
        isNull(schema.guests.deletedAt)
      )
    )
    .limit(1);

  if (!guest) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Guest not found' } },
      404
    );
  }

  return c.json({
    success: true,
    data: guest,
  });
});

/**
 * POST /events/:eventUuid/guests
 * Create a new guest
 */
guests.post(
  '/',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', createGuestSchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const data = c.req.valid('json');

    const db = createDbClient(c.env.DB);

    // Verify event ownership
    const event = await getEventByUuidForUser(db, eventUuid, user.id);
    if (!event) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        404
      );
    }

    const uuid = crypto.randomUUID();
    const rsvpToken = generateRsvpToken();

    const [newGuest] = await db
      .insert(schema.guests)
      .values({
        uuid,
        eventId: event.id,
        firstName: data.firstName,
        lastName: data.lastName ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        category: data.category ?? null,
        rsvpStatus: 'pending',
        rsvpToken,
        plusOnesAllowed: data.plusOnesAllowed,
        plusOnesCount: 0,
        dietaryRestrictions: data.dietaryRestrictions ?? null,
        notes: data.notes ?? null,
        checkedIn: false,
      })
      .returning();

    return c.json(
      {
        success: true,
        data: newGuest,
      },
      201
    );
  }
);

/**
 * POST /events/:eventUuid/guests/import
 * Bulk import guests from CSV
 */
guests.post('/import', requireAuth, requireVerifiedEmail, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;

  const db = createDbClient(c.env.DB);

  // Verify event ownership
  const event = await getEventByUuidForUser(db, eventUuid, user.id);
  if (!event) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  // Get CSV content from request body
  const body = await c.req.text();
  if (!body.trim()) {
    return c.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Empty CSV content' } },
      400
    );
  }

  // Parse and validate CSV
  const parseResult = parseGuestsCsv(body);
  if (!parseResult.success) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'CSV validation failed',
          details: parseResult.errors,
        },
      },
      400
    );
  }

  if (parseResult.guests.length === 0) {
    return c.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'No valid guests in CSV' } },
      400
    );
  }

  // Prepare guests for insertion
  const guestsToInsert = parseResult.guests.map((g) => ({
    uuid: crypto.randomUUID(),
    eventId: event.id,
    firstName: g.firstName,
    lastName: g.lastName ?? null,
    email: g.email ?? null,
    phone: g.phone ?? null,
    category: g.category ?? null,
    rsvpStatus: 'pending' as const,
    rsvpToken: generateRsvpToken(),
    plusOnesAllowed: g.plusOnesAllowed ?? 0,
    plusOnesCount: 0,
    dietaryRestrictions: g.dietaryRestrictions ?? null,
    notes: g.notes ?? null,
    checkedIn: false,
  }));

  // Batch insert (D1 has a limit of ~100 parameters, so we chunk)
  const CHUNK_SIZE = 10;
  let insertedCount = 0;

  for (let i = 0; i < guestsToInsert.length; i += CHUNK_SIZE) {
    const chunk = guestsToInsert.slice(i, i + CHUNK_SIZE);
    await db.insert(schema.guests).values(chunk);
    insertedCount += chunk.length;
  }

  return c.json({
    success: true,
    data: {
      imported: insertedCount,
      total: parseResult.guests.length,
    },
  });
});

/**
 * PATCH /events/:eventUuid/guests/:guestUuid
 * Update an existing guest
 */
guests.patch(
  '/:guestUuid',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', updateGuestSchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const guestUuid = c.req.param('guestUuid')!;
    const updates = c.req.valid('json');

    const db = createDbClient(c.env.DB);

    // Verify event ownership
    const event = await getEventByUuidForUser(db, eventUuid, user.id);
    if (!event) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        404
      );
    }

    // Check guest exists
    const [existingGuest] = await db
      .select({ id: schema.guests.id })
      .from(schema.guests)
      .where(
        and(
          eq(schema.guests.uuid, guestUuid),
          eq(schema.guests.eventId, event.id),
          isNull(schema.guests.deletedAt)
        )
      )
      .limit(1);

    if (!existingGuest) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Guest not found' } },
        404
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.firstName !== undefined) updateData.firstName = updates.firstName;
    if (updates.lastName !== undefined) updateData.lastName = updates.lastName;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.rsvpStatus !== undefined) updateData.rsvpStatus = updates.rsvpStatus;
    if (updates.plusOnesAllowed !== undefined) updateData.plusOnesAllowed = updates.plusOnesAllowed;
    if (updates.plusOnesCount !== undefined) updateData.plusOnesCount = updates.plusOnesCount;
    if (updates.dietaryRestrictions !== undefined)
      updateData.dietaryRestrictions = updates.dietaryRestrictions;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const [updatedGuest] = await db
      .update(schema.guests)
      .set(updateData)
      .where(eq(schema.guests.uuid, guestUuid))
      .returning();

    return c.json({
      success: true,
      data: updatedGuest,
    });
  }
);

/**
 * DELETE /events/:eventUuid/guests/:guestUuid
 * Soft delete a guest
 */
guests.delete('/:guestUuid', requireAuth, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const guestUuid = c.req.param('guestUuid')!;

  const db = createDbClient(c.env.DB);

  // Verify event ownership
  const event = await getEventByUuidForUser(db, eventUuid, user.id);
  if (!event) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  // Check guest exists
  const [existingGuest] = await db
    .select({ id: schema.guests.id })
    .from(schema.guests)
    .where(
      and(
        eq(schema.guests.uuid, guestUuid),
        eq(schema.guests.eventId, event.id),
        isNull(schema.guests.deletedAt)
      )
    )
    .limit(1);

  if (!existingGuest) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Guest not found' } },
      404
    );
  }

  // Soft delete
  await db
    .update(schema.guests)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.guests.uuid, guestUuid));

  return c.json({
    success: true,
    data: { deleted: true },
  });
});

/**
 * POST /events/:eventUuid/guests/:guestUuid/checkin
 * Toggle guest check-in status
 */
guests.post('/:guestUuid/checkin', requireAuth, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const guestUuid = c.req.param('guestUuid')!;

  const db = createDbClient(c.env.DB);

  // Verify event ownership
  const event = await getEventByUuidForUser(db, eventUuid, user.id);
  if (!event) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  // Get current guest state
  const [guest] = await db
    .select({ id: schema.guests.id, checkedIn: schema.guests.checkedIn })
    .from(schema.guests)
    .where(
      and(
        eq(schema.guests.uuid, guestUuid),
        eq(schema.guests.eventId, event.id),
        isNull(schema.guests.deletedAt)
      )
    )
    .limit(1);

  if (!guest) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Guest not found' } },
      404
    );
  }

  // Toggle check-in
  const newCheckedIn = !guest.checkedIn;
  const [updatedGuest] = await db
    .update(schema.guests)
    .set({
      checkedIn: newCheckedIn,
      checkedInAt: newCheckedIn ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.guests.uuid, guestUuid))
    .returning();

  return c.json({
    success: true,
    data: updatedGuest,
  });
});

/**
 * POST /events/:eventUuid/guests/:guestUuid/resend-rsvp
 * Resend RSVP invitation (logs for now)
 */
guests.post('/:guestUuid/resend-rsvp', requireAuth, requireVerifiedEmail, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const guestUuid = c.req.param('guestUuid')!;

  const db = createDbClient(c.env.DB);

  // Verify event ownership
  const event = await getEventByUuidForUser(db, eventUuid, user.id);
  if (!event) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  // Get guest
  const [guest] = await db
    .select()
    .from(schema.guests)
    .where(
      and(
        eq(schema.guests.uuid, guestUuid),
        eq(schema.guests.eventId, event.id),
        isNull(schema.guests.deletedAt)
      )
    )
    .limit(1);

  if (!guest) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Guest not found' } },
      404
    );
  }

  if (!guest.email) {
    return c.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Guest has no email address' } },
      400
    );
  }

  // TODO: Implement actual email sending
  console.log(`[RSVP] Would send RSVP email to ${guest.email} for guest ${guest.firstName}`);
  console.log(`[RSVP] Token: ${guest.rsvpToken}`);

  return c.json({
    success: true,
    data: { sent: true, email: guest.email },
  });
});

export default guests;
