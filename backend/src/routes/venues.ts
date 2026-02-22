/**
 * Venue Routes
 *
 * CRUD endpoints for the global venue directory.
 * Includes amenities filtering, availability check, favorites, and nearby search.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull, desc, asc, like, or, count, lte, gte, inArray, ne, sql } from 'drizzle-orm';
import { requireAuth, requireVerifiedEmail } from '@/middleware/auth';
import {
  createVenueSchema,
  updateVenueSchema,
  listVenuesQuerySchema,
  checkAvailabilityQuerySchema,
  nearbyQuerySchema,
} from '../../../shared/schemas/provider';

const venues = new Hono<HonoEnv>();

// ==================== HELPERS ====================

function parseJson(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatVenue(v: typeof schema.venues.$inferSelect, isFavorited?: boolean, currentUserId?: string) {
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
    isOwner: currentUserId ? v.userId === currentUserId : false,
    isFavorited: isFavorited ?? false,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}

// ==================== ROUTES ====================
// IMPORTANT: Static routes must come before parameterized routes (/:uuid)

/**
 * GET /venues
 * List/search venues with amenities and favorites filtering
 */
venues.get(
  '/',
  requireAuth,
  zValidator('query', listVenuesQuerySchema),
  async (c) => {
    const user = c.get('user')!;
    const query = c.req.valid('query');
    const { search, venueType, city, state, country, capacityMin, priceMax, amenities, favoritesOnly, limit, offset, sortBy, sortOrder } = query;

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
    if (country) conditions.push(eq(schema.venues.country, country));
    if (capacityMin !== undefined) conditions.push(gte(schema.venues.capacityMax, capacityMin));
    if (priceMax !== undefined) conditions.push(lte(schema.venues.pricePerDay, priceMax));

    // Amenities filter: each requested amenity must be present in the JSON array
    if (amenities) {
      const amenityList = amenities.split(',').map((a: string) => a.trim()).filter(Boolean);
      for (const amenity of amenityList) {
        conditions.push(like(schema.venues.amenities, `%"${amenity}"%`));
      }
    }

    // Favorites-only filter: restrict to venues the user has favorited
    if (favoritesOnly === 'true') {
      const favRows = await db
        .select({ venueId: schema.userVenueFavorites.venueId })
        .from(schema.userVenueFavorites)
        .where(eq(schema.userVenueFavorites.userId, user.id));
      const favVenueIds = favRows.map((r) => r.venueId);
      if (favVenueIds.length === 0) {
        return c.json({
          success: true,
          data: [],
          meta: { total: 0, limit, offset },
        });
      }
      conditions.push(inArray(schema.venues.id, favVenueIds));
    }

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

    // Batch-check favorites for the returned items
    let favoritedIds = new Set<number>();
    if (items.length > 0) {
      const venueIds = items.map((v) => v.id);
      const favRows = await db
        .select({ venueId: schema.userVenueFavorites.venueId })
        .from(schema.userVenueFavorites)
        .where(
          and(
            eq(schema.userVenueFavorites.userId, user.id),
            inArray(schema.userVenueFavorites.venueId, venueIds)
          )
        );
      favoritedIds = new Set(favRows.map((r) => r.venueId));
    }

    return c.json({
      success: true,
      data: items.map((v) => formatVenue(v, favoritedIds.has(v.id), user.id)),
      meta: {
        total: countResult?.count ?? 0,
        limit,
        offset,
      },
    });
  }
);

/**
 * GET /venues/check-availability
 * Check if a venue is available on a specific date
 */
venues.get(
  '/check-availability',
  requireAuth,
  zValidator('query', checkAvailabilityQuerySchema),
  async (c) => {
    const { venueUuid, date } = c.req.valid('query');
    const db = createDbClient(c.env.DB);

    // Resolve venue by UUID
    const [venue] = await db
      .select({ id: schema.venues.id })
      .from(schema.venues)
      .where(
        and(
          eq(schema.venues.uuid, venueUuid),
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

    // Check for bookings on that date (not cancelled)
    const targetDate = new Date(date + 'T00:00:00Z');
    const targetEnd = new Date(date + 'T23:59:59Z');

    const bookings = await db
      .select({ id: schema.eventVenues.id })
      .from(schema.eventVenues)
      .where(
        and(
          eq(schema.eventVenues.venueId, venue.id),
          ne(schema.eventVenues.status, 'cancelled'),
          gte(schema.eventVenues.bookingDate, targetDate),
          lte(schema.eventVenues.bookingDate, targetEnd)
        )
      );

    return c.json({
      success: true,
      data: {
        available: bookings.length === 0,
        conflictCount: bookings.length,
        date,
      },
    });
  }
);

/**
 * GET /venues/favorites
 * List user's favorite venues
 */
venues.get('/favorites', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  const rows = await db
    .select({ venue: schema.venues })
    .from(schema.userVenueFavorites)
    .innerJoin(schema.venues, eq(schema.userVenueFavorites.venueId, schema.venues.id))
    .where(
      and(
        eq(schema.userVenueFavorites.userId, user.id),
        eq(schema.venues.isActive, true),
        isNull(schema.venues.deletedAt)
      )
    )
    .orderBy(desc(schema.userVenueFavorites.createdAt));

  return c.json({
    success: true,
    data: rows.map((r) => formatVenue(r.venue, true, user.id)),
  });
});

/**
 * POST /venues/favorites/:venueUuid
 * Toggle favorite on a venue
 */
venues.post('/favorites/:venueUuid', requireAuth, async (c) => {
  const user = c.get('user')!;
  const venueUuid = c.req.param('venueUuid')!;
  const db = createDbClient(c.env.DB);

  // Resolve venue
  const [venue] = await db
    .select({ id: schema.venues.id })
    .from(schema.venues)
    .where(
      and(
        eq(schema.venues.uuid, venueUuid),
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

  // Check if already favorited
  const [existing] = await db
    .select({ id: schema.userVenueFavorites.id })
    .from(schema.userVenueFavorites)
    .where(
      and(
        eq(schema.userVenueFavorites.userId, user.id),
        eq(schema.userVenueFavorites.venueId, venue.id)
      )
    )
    .limit(1);

  if (existing) {
    // Unfavorite
    await db
      .delete(schema.userVenueFavorites)
      .where(eq(schema.userVenueFavorites.id, existing.id));
    return c.json({ success: true, data: { favorited: false } });
  }

  // Favorite
  await db
    .insert(schema.userVenueFavorites)
    .values({ userId: user.id, venueId: venue.id });
  return c.json({ success: true, data: { favorited: true } }, 201);
});

/**
 * GET /venues/nearby
 * Find venues near a city or postal code prefix
 */
venues.get(
  '/nearby',
  requireAuth,
  zValidator('query', nearbyQuerySchema),
  async (c) => {
    const user = c.get('user')!;
    const { city, postalCode, country, venueType, limit } = c.req.valid('query');

    if (!city && !postalCode) {
      return c.json({
        success: true,
        data: [],
      });
    }

    const db = createDbClient(c.env.DB);

    const baseConditions = [
      eq(schema.venues.isActive, true),
      isNull(schema.venues.deletedAt),
    ];

    if (country) {
      baseConditions.push(eq(schema.venues.country, country));
    }
    if (venueType) {
      baseConditions.push(eq(schema.venues.venueType, venueType));
    }

    // Match by city (case-insensitive) OR postal code prefix (first 3 chars)
    const matchConditions = [];
    if (city) {
      matchConditions.push(
        sql`LOWER(${schema.venues.city}) = LOWER(${city})`
      );
    }
    if (postalCode && postalCode.length >= 3) {
      const prefix = postalCode.substring(0, 3);
      matchConditions.push(
        sql`SUBSTR(${schema.venues.postalCode}, 1, 3) = ${prefix}`
      );
    }

    if (matchConditions.length === 0) {
      return c.json({ success: true, data: [] });
    }

    const items = await db
      .select()
      .from(schema.venues)
      .where(and(...baseConditions, or(...matchConditions)))
      .orderBy(desc(schema.venues.ratingAverage))
      .limit(limit);

    // Check favorites for the returned items
    let favoritedIds = new Set<number>();
    if (items.length > 0) {
      const venueIds = items.map((v) => v.id);
      const favRows = await db
        .select({ venueId: schema.userVenueFavorites.venueId })
        .from(schema.userVenueFavorites)
        .where(
          and(
            eq(schema.userVenueFavorites.userId, user.id),
            inArray(schema.userVenueFavorites.venueId, venueIds)
          )
        );
      favoritedIds = new Set(favRows.map((r) => r.venueId));
    }

    return c.json({
      success: true,
      data: items.map((v) => formatVenue(v, favoritedIds.has(v.id), user.id)),
    });
  }
);

/**
 * GET /venues/:uuid
 * Get venue detail (with isFavorited)
 */
venues.get('/:uuid', requireAuth, async (c) => {
  const user = c.get('user')!;
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

  // Check if favorited
  const [fav] = await db
    .select({ id: schema.userVenueFavorites.id })
    .from(schema.userVenueFavorites)
    .where(
      and(
        eq(schema.userVenueFavorites.userId, user.id),
        eq(schema.userVenueFavorites.venueId, venue.id)
      )
    )
    .limit(1);

  return c.json({ success: true, data: formatVenue(venue, !!fav, user.id) });
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
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
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

    return c.json({ success: true, data: formatVenue(newVenue!, false, user.id) }, 201);
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

    return c.json({ success: true, data: formatVenue(fresh!, false, user.id) });
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
