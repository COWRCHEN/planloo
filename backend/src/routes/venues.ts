/**
 * Venue Routes
 *
 * CRUD endpoints for the global venue directory.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull, desc, asc, like, or, count, lte, gte } from 'drizzle-orm';
import { requireAuth, requireVerifiedEmail } from '@/middleware/auth';

const venues = new Hono<HonoEnv>();

// ==================== SCHEMAS ====================

const VENUE_TYPES = ['banquet_hall', 'outdoor', 'hotel', 'restaurant', 'conference_center', 'other'] as const;

const createVenueSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  venueType: z.enum(VENUE_TYPES).optional().nullable(),
  address: z.string().min(1).max(500),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional().nullable(),
  country: z.string().min(1).max(100),
  postalCode: z.string().max(20).optional().nullable(),
  capacityMin: z.coerce.number().int().min(0).optional().nullable(),
  capacityMax: z.coerce.number().int().min(0).optional().nullable(),
  pricePerHour: z.coerce.number().min(0).optional().nullable(),
  pricePerDay: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('USD'),
  amenities: z.array(z.string()).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
});

const updateVenueSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  venueType: z.enum(VENUE_TYPES).optional().nullable(),
  address: z.string().min(1).max(500).optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().min(1).max(100).optional(),
  postalCode: z.string().max(20).optional().nullable(),
  capacityMin: z.coerce.number().int().min(0).optional().nullable(),
  capacityMax: z.coerce.number().int().min(0).optional().nullable(),
  pricePerHour: z.coerce.number().min(0).optional().nullable(),
  pricePerDay: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional(),
  amenities: z.array(z.string()).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
});

const listVenuesQuerySchema = z.object({
  search: z.string().max(200).optional(),
  venueType: z.enum(VENUE_TYPES).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  capacityMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['name', 'ratingAverage', 'capacityMax', 'pricePerDay', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ==================== HELPERS ====================

function parseJson(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatVenue(v: typeof schema.venues.$inferSelect) {
  return {
    uuid: v.uuid,
    name: v.name,
    description: v.description,
    venueType: v.venueType,
    address: v.address,
    city: v.city,
    state: v.state,
    country: v.country,
    postalCode: v.postalCode,
    capacityMin: v.capacityMin,
    capacityMax: v.capacityMax,
    pricePerHour: v.pricePerHour,
    pricePerDay: v.pricePerDay,
    currency: v.currency,
    amenities: parseJson(v.amenities),
    contactEmail: v.contactEmail,
    contactPhone: v.contactPhone,
    website: v.website,
    ratingAverage: v.ratingAverage,
    ratingCount: v.ratingCount,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}

// ==================== ROUTES ====================

/**
 * GET /venues
 * List/search venues
 */
venues.get(
  '/',
  requireAuth,
  zValidator('query', listVenuesQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const { search, venueType, city, state, capacityMin, priceMax, limit, offset, sortBy, sortOrder } = query;

    const db = createDbClient(c.env.DB);

    const conditions = [
      eq(schema.venues.isActive, true),
      isNull(schema.venues.deletedAt),
    ];

    if (search) {
      conditions.push(
        or(
          like(schema.venues.name, `%${search}%`),
          like(schema.venues.description, `%${search}%`)
        )!
      );
    }
    if (venueType) conditions.push(eq(schema.venues.venueType, venueType));
    if (city) conditions.push(eq(schema.venues.city, city));
    if (state) conditions.push(eq(schema.venues.state, state));
    if (capacityMin !== undefined) conditions.push(gte(schema.venues.capacityMax, capacityMin));
    if (priceMax !== undefined) conditions.push(lte(schema.venues.pricePerDay, priceMax));

    const [countResult] = await db
      .select({ count: count() })
      .from(schema.venues)
      .where(and(...conditions));

    const sortColumnMap = {
      name: schema.venues.name,
      ratingAverage: schema.venues.ratingAverage,
      capacityMax: schema.venues.capacityMax,
      pricePerDay: schema.venues.pricePerDay,
      createdAt: schema.venues.createdAt,
    } as const;
    const sortColumn = sortColumnMap[sortBy as keyof typeof sortColumnMap];
    const orderFn = sortOrder === 'desc' ? desc : asc;

    const items = await db
      .select()
      .from(schema.venues)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    return c.json({
      success: true,
      data: items.map(formatVenue),
      meta: {
        total: countResult?.count ?? 0,
        limit,
        offset,
      },
    });
  }
);

/**
 * GET /venues/:uuid
 * Get venue detail
 */
venues.get('/:uuid', requireAuth, async (c) => {
  const uuid = c.req.param('uuid')!;
  const db = createDbClient(c.env.DB);

  const [venue] = await db
    .select()
    .from(schema.venues)
    .where(
      and(
        eq(schema.venues.uuid, uuid),
        eq(schema.venues.isActive, true),
        isNull(schema.venues.deletedAt)
      )
    )
    .limit(1);

  if (!venue) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Venue not found' } },
      404
    );
  }

  return c.json({ success: true, data: formatVenue(venue) });
});

/**
 * POST /venues
 * Create venue
 */
venues.post(
  '/',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', createVenueSchema),
  async (c) => {
    const user = c.get('user')!;
    const data = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    const uuid = crypto.randomUUID();

    const [newVenue] = await db
      .insert(schema.venues)
      .values({
        uuid,
        userId: user.id,
        name: data.name,
        description: data.description ?? null,
        venueType: data.venueType ?? null,
        address: data.address,
        city: data.city,
        state: data.state ?? null,
        country: data.country,
        postalCode: data.postalCode ?? null,
        capacityMin: data.capacityMin ?? null,
        capacityMax: data.capacityMax ?? null,
        pricePerHour: data.pricePerHour ?? null,
        pricePerDay: data.pricePerDay ?? null,
        currency: data.currency,
        amenities: data.amenities ? JSON.stringify(data.amenities) : null,
        contactEmail: data.contactEmail ?? null,
        contactPhone: data.contactPhone ?? null,
        website: data.website ?? null,
      })
      .returning();

    return c.json({ success: true, data: formatVenue(newVenue!) }, 201);
  }
);

/**
 * PATCH /venues/:uuid
 * Update venue (owner only)
 */
venues.patch(
  '/:uuid',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', updateVenueSchema),
  async (c) => {
    const user = c.get('user')!;
    const uuid = c.req.param('uuid')!;
    const updates = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    const [existing] = await db
      .select({ id: schema.venues.id, userId: schema.venues.userId })
      .from(schema.venues)
      .where(
        and(
          eq(schema.venues.uuid, uuid),
          isNull(schema.venues.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Venue not found' } },
        404
      );
    }

    if (existing.userId !== user.id) {
      return c.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not the owner of this venue' } },
        403
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.venueType !== undefined) updateData.venueType = updates.venueType;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.city !== undefined) updateData.city = updates.city;
    if (updates.state !== undefined) updateData.state = updates.state;
    if (updates.country !== undefined) updateData.country = updates.country;
    if (updates.postalCode !== undefined) updateData.postalCode = updates.postalCode;
    if (updates.capacityMin !== undefined) updateData.capacityMin = updates.capacityMin;
    if (updates.capacityMax !== undefined) updateData.capacityMax = updates.capacityMax;
    if (updates.pricePerHour !== undefined) updateData.pricePerHour = updates.pricePerHour;
    if (updates.pricePerDay !== undefined) updateData.pricePerDay = updates.pricePerDay;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.amenities !== undefined) {
      updateData.amenities = updates.amenities ? JSON.stringify(updates.amenities) : null;
    }
    if (updates.contactEmail !== undefined) updateData.contactEmail = updates.contactEmail;
    if (updates.contactPhone !== undefined) updateData.contactPhone = updates.contactPhone;
    if (updates.website !== undefined) updateData.website = updates.website;

    await db
      .update(schema.venues)
      .set(updateData)
      .where(eq(schema.venues.id, existing.id));

    const [fresh] = await db
      .select()
      .from(schema.venues)
      .where(eq(schema.venues.id, existing.id))
      .limit(1);

    return c.json({ success: true, data: formatVenue(fresh!) });
  }
);

/**
 * DELETE /venues/:uuid
 * Soft delete venue (owner only)
 */
venues.delete('/:uuid', requireAuth, requireVerifiedEmail, async (c) => {
  const user = c.get('user')!;
  const uuid = c.req.param('uuid')!;
  const db = createDbClient(c.env.DB);

  const [existing] = await db
    .select({ id: schema.venues.id, userId: schema.venues.userId })
    .from(schema.venues)
    .where(
      and(
        eq(schema.venues.uuid, uuid),
        isNull(schema.venues.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Venue not found' } },
      404
    );
  }

  if (existing.userId !== user.id) {
    return c.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Not the owner of this venue' } },
      403
    );
  }

  await db
    .update(schema.venues)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.venues.id, existing.id));

  return c.json({ success: true, data: { deleted: true } });
});

export default venues;
