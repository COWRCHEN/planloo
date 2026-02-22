/**
 * Event Provider/Venue Routes
 *
 * Event-scoped endpoints for linking service providers and venues to events.
 * Mounted at /events/:eventUuid/providers
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth, requireVerifiedEmail } from '@/middleware/auth';
import { resolveEventAccess } from '@/lib/event-access';

const eventProviders = new Hono<HonoEnv>();

// ==================== SCHEMAS ====================

const BOOKING_STATUSES = ['inquiry', 'quoted', 'booked', 'confirmed', 'completed', 'cancelled'] as const;

const createEventProviderSchema = z.object({
  providerUuid: z.string().uuid(),
  status: z.enum(BOOKING_STATUSES).default('inquiry'),
  quoteAmount: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('USD'),
  notes: z.string().max(2000).optional().nullable(),
});

const updateEventProviderSchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  quoteAmount: z.coerce.number().min(0).optional().nullable(),
  finalAmount: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional(),
  contractUrl: z.string().url().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

const createEventVenueSchema = z.object({
  venueUuid: z.string().uuid(),
  status: z.enum(BOOKING_STATUSES).default('inquiry'),
  bookingDate: z.coerce.date().optional().nullable(),
  quoteAmount: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('USD'),
  notes: z.string().max(2000).optional().nullable(),
});

const updateEventVenueSchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  bookingDate: z.coerce.date().optional().nullable(),
  quoteAmount: z.coerce.number().min(0).optional().nullable(),
  finalAmount: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional(),
  depositAmount: z.coerce.number().min(0).optional().nullable(),
  depositPaid: z.boolean().optional(),
  contractUrl: z.string().url().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
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

function formatProvider(p: typeof schema.serviceProviders.$inferSelect, currentUserId?: string) {
  return {
    uuid: p.uuid,
    businessName: p.businessName,
    contactName: p.contactName,
    email: p.email,
    phone: p.phone,
    website: p.website,
    category: p.category,
    description: p.description,
    servicesOffered: parseJson(p.servicesOffered),
    priceRange: p.priceRange,
    locationAddress: p.locationAddress,
    locationCity: p.locationCity,
    locationState: p.locationState,
    locationCountry: p.locationCountry,
    locationPostalCode: p.locationPostalCode,
    ratingAverage: p.ratingAverage,
    ratingCount: p.ratingCount,
    isOwner: currentUserId ? p.userId === currentUserId : false,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function formatVenue(v: typeof schema.venues.$inferSelect, currentUserId?: string) {
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
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}

// ==================== PROVIDER LINK ROUTES ====================

/**
 * GET /events/:eventUuid/providers
 * List linked providers for an event
 */
eventProviders.get('/', requireAuth, async (c) => {
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
  const event = { id: access.event.id };

  const links = await db
    .select({
      link: {
        id: schema.eventServiceProviders.id,
        status: schema.eventServiceProviders.status,
        quoteAmount: schema.eventServiceProviders.quoteAmount,
        finalAmount: schema.eventServiceProviders.finalAmount,
        currency: schema.eventServiceProviders.currency,
        contractUrl: schema.eventServiceProviders.contractUrl,
        notes: schema.eventServiceProviders.notes,
        createdAt: schema.eventServiceProviders.createdAt,
        updatedAt: schema.eventServiceProviders.updatedAt,
      },
      provider: schema.serviceProviders,
    })
    .from(schema.eventServiceProviders)
    .innerJoin(
      schema.serviceProviders,
      eq(schema.eventServiceProviders.serviceProviderId, schema.serviceProviders.id)
    )
    .where(eq(schema.eventServiceProviders.eventId, event.id));

  const data = links.map((row) => ({
    id: row.link.id,
    status: row.link.status,
    quoteAmount: row.link.quoteAmount,
    finalAmount: row.link.finalAmount,
    currency: row.link.currency,
    contractUrl: row.link.contractUrl,
    notes: row.link.notes,
    createdAt: row.link.createdAt,
    updatedAt: row.link.updatedAt,
    provider: formatProvider(row.provider, user.id),
  }));

  return c.json({ success: true, data });
});

/**
 * POST /events/:eventUuid/providers
 * Link a provider to an event
 */
eventProviders.post(
  '/',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', createEventProviderSchema),
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
    if (!access.canEdit) {
      return c.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        403
      );
    }
    const event = access.event;

    // Lookup provider by uuid
    const [provider] = await db
      .select({ id: schema.serviceProviders.id })
      .from(schema.serviceProviders)
      .where(
        and(
          eq(schema.serviceProviders.uuid, body.providerUuid),
          eq(schema.serviceProviders.isActive, true),
          isNull(schema.serviceProviders.deletedAt)
        )
      )
      .limit(1);

    if (!provider) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Provider not found' } },
        404
      );
    }

    try {
      await db.insert(schema.eventServiceProviders).values({
        eventId: event.id,
        serviceProviderId: provider.id,
        status: body.status,
        quoteAmount: body.quoteAmount ?? null,
        currency: body.currency,
        notes: body.notes ?? null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('UNIQUE constraint failed') || message.includes('unique_event_provider')) {
        return c.json(
          { success: false, error: { code: 'CONFLICT', message: 'Provider already linked to this event' } },
          409
        );
      }
      throw err;
    }

    // Re-fetch with join
    const [link] = await db
      .select({
        link: {
          id: schema.eventServiceProviders.id,
          status: schema.eventServiceProviders.status,
          quoteAmount: schema.eventServiceProviders.quoteAmount,
          finalAmount: schema.eventServiceProviders.finalAmount,
          currency: schema.eventServiceProviders.currency,
          contractUrl: schema.eventServiceProviders.contractUrl,
          notes: schema.eventServiceProviders.notes,
          createdAt: schema.eventServiceProviders.createdAt,
          updatedAt: schema.eventServiceProviders.updatedAt,
        },
        provider: schema.serviceProviders,
      })
      .from(schema.eventServiceProviders)
      .innerJoin(
        schema.serviceProviders,
        eq(schema.eventServiceProviders.serviceProviderId, schema.serviceProviders.id)
      )
      .where(
        and(
          eq(schema.eventServiceProviders.eventId, event.id),
          eq(schema.eventServiceProviders.serviceProviderId, provider.id)
        )
      )
      .limit(1);

    return c.json(
      {
        success: true,
        data: {
          id: link!.link.id,
          status: link!.link.status,
          quoteAmount: link!.link.quoteAmount,
          finalAmount: link!.link.finalAmount,
          currency: link!.link.currency,
          contractUrl: link!.link.contractUrl,
          notes: link!.link.notes,
          createdAt: link!.link.createdAt,
          updatedAt: link!.link.updatedAt,
          provider: formatProvider(link!.provider, user.id),
        },
      },
      201
    );
  }
);

// ==================== VENUE LINK ROUTES (static paths BEFORE /:linkId) ====================

/**
 * GET /events/:eventUuid/providers/venues
 * List linked venues for an event
 */
eventProviders.get('/venues', requireAuth, async (c) => {
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
  const event = { id: access.event.id };

  const links = await db
    .select({
      link: {
        id: schema.eventVenues.id,
        status: schema.eventVenues.status,
        bookingDate: schema.eventVenues.bookingDate,
        quoteAmount: schema.eventVenues.quoteAmount,
        finalAmount: schema.eventVenues.finalAmount,
        currency: schema.eventVenues.currency,
        depositAmount: schema.eventVenues.depositAmount,
        depositPaid: schema.eventVenues.depositPaid,
        contractUrl: schema.eventVenues.contractUrl,
        notes: schema.eventVenues.notes,
        createdAt: schema.eventVenues.createdAt,
        updatedAt: schema.eventVenues.updatedAt,
      },
      venue: schema.venues,
    })
    .from(schema.eventVenues)
    .innerJoin(schema.venues, eq(schema.eventVenues.venueId, schema.venues.id))
    .where(eq(schema.eventVenues.eventId, event.id));

  const data = links.map((row) => ({
    id: row.link.id,
    status: row.link.status,
    bookingDate: row.link.bookingDate,
    quoteAmount: row.link.quoteAmount,
    finalAmount: row.link.finalAmount,
    currency: row.link.currency,
    depositAmount: row.link.depositAmount,
    depositPaid: row.link.depositPaid,
    contractUrl: row.link.contractUrl,
    notes: row.link.notes,
    createdAt: row.link.createdAt,
    updatedAt: row.link.updatedAt,
    venue: formatVenue(row.venue, user.id),
  }));

  return c.json({ success: true, data });
});

/**
 * POST /events/:eventUuid/providers/venues
 * Link a venue to an event
 */
eventProviders.post(
  '/venues',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', createEventVenueSchema),
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
    if (!access.canEdit) {
      return c.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        403
      );
    }
    const event = access.event;

    const [venue] = await db
      .select({ id: schema.venues.id })
      .from(schema.venues)
      .where(
        and(
          eq(schema.venues.uuid, body.venueUuid),
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

    await db.insert(schema.eventVenues).values({
      eventId: event.id,
      venueId: venue.id,
      status: body.status,
      bookingDate: body.bookingDate ?? null,
      quoteAmount: body.quoteAmount ?? null,
      currency: body.currency,
      notes: body.notes ?? null,
    });

    // Re-fetch with join
    const links = await db
      .select({
        link: {
          id: schema.eventVenues.id,
          status: schema.eventVenues.status,
          bookingDate: schema.eventVenues.bookingDate,
          quoteAmount: schema.eventVenues.quoteAmount,
          finalAmount: schema.eventVenues.finalAmount,
          currency: schema.eventVenues.currency,
          depositAmount: schema.eventVenues.depositAmount,
          depositPaid: schema.eventVenues.depositPaid,
          contractUrl: schema.eventVenues.contractUrl,
          notes: schema.eventVenues.notes,
          createdAt: schema.eventVenues.createdAt,
          updatedAt: schema.eventVenues.updatedAt,
        },
        venue: schema.venues,
      })
      .from(schema.eventVenues)
      .innerJoin(schema.venues, eq(schema.eventVenues.venueId, schema.venues.id))
      .where(
        and(
          eq(schema.eventVenues.eventId, event.id),
          eq(schema.eventVenues.venueId, venue.id)
        )
      )
      .limit(1);

    const row = links[0]!;

    return c.json(
      {
        success: true,
        data: {
          id: row.link.id,
          status: row.link.status,
          bookingDate: row.link.bookingDate,
          quoteAmount: row.link.quoteAmount,
          finalAmount: row.link.finalAmount,
          currency: row.link.currency,
          depositAmount: row.link.depositAmount,
          depositPaid: row.link.depositPaid,
          contractUrl: row.link.contractUrl,
          notes: row.link.notes,
          createdAt: row.link.createdAt,
          updatedAt: row.link.updatedAt,
          venue: formatVenue(row.venue, user.id),
        },
      },
      201
    );
  }
);

/**
 * PATCH /events/:eventUuid/providers/venues/:linkId
 * Update an event-venue link
 */
eventProviders.patch(
  '/venues/:linkId',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', updateEventVenueSchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const linkId = parseInt(c.req.param('linkId')!, 10);
    const updates = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    const access = await resolveEventAccess(db, eventUuid, user.id);
    if (!access) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        404
      );
    }
    if (!access.canEdit) {
      return c.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        403
      );
    }
    const event = access.event;

    const [existing] = await db
      .select({ id: schema.eventVenues.id })
      .from(schema.eventVenues)
      .where(
        and(
          eq(schema.eventVenues.id, linkId),
          eq(schema.eventVenues.eventId, event.id)
        )
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Venue link not found' } },
        404
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.bookingDate !== undefined) updateData.bookingDate = updates.bookingDate;
    if (updates.quoteAmount !== undefined) updateData.quoteAmount = updates.quoteAmount;
    if (updates.finalAmount !== undefined) updateData.finalAmount = updates.finalAmount;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.depositAmount !== undefined) updateData.depositAmount = updates.depositAmount;
    if (updates.depositPaid !== undefined) updateData.depositPaid = updates.depositPaid;
    if (updates.contractUrl !== undefined) updateData.contractUrl = updates.contractUrl;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    await db
      .update(schema.eventVenues)
      .set(updateData)
      .where(eq(schema.eventVenues.id, existing.id));

    // Re-fetch
    const [row] = await db
      .select({
        link: {
          id: schema.eventVenues.id,
          status: schema.eventVenues.status,
          bookingDate: schema.eventVenues.bookingDate,
          quoteAmount: schema.eventVenues.quoteAmount,
          finalAmount: schema.eventVenues.finalAmount,
          currency: schema.eventVenues.currency,
          depositAmount: schema.eventVenues.depositAmount,
          depositPaid: schema.eventVenues.depositPaid,
          contractUrl: schema.eventVenues.contractUrl,
          notes: schema.eventVenues.notes,
          createdAt: schema.eventVenues.createdAt,
          updatedAt: schema.eventVenues.updatedAt,
        },
        venue: schema.venues,
      })
      .from(schema.eventVenues)
      .innerJoin(schema.venues, eq(schema.eventVenues.venueId, schema.venues.id))
      .where(eq(schema.eventVenues.id, existing.id))
      .limit(1);

    return c.json({
      success: true,
      data: {
        id: row!.link.id,
        status: row!.link.status,
        bookingDate: row!.link.bookingDate,
        quoteAmount: row!.link.quoteAmount,
        finalAmount: row!.link.finalAmount,
        currency: row!.link.currency,
        depositAmount: row!.link.depositAmount,
        depositPaid: row!.link.depositPaid,
        contractUrl: row!.link.contractUrl,
        notes: row!.link.notes,
        createdAt: row!.link.createdAt,
        updatedAt: row!.link.updatedAt,
        venue: formatVenue(row!.venue, user.id),
      },
    });
  }
);

/**
 * DELETE /events/:eventUuid/providers/venues/:linkId
 * Remove a venue link from event (hard delete)
 */
eventProviders.delete('/venues/:linkId', requireAuth, requireVerifiedEmail, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const linkId = parseInt(c.req.param('linkId')!, 10);
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }
  const event = { id: access.event.id };

  const [existing] = await db
    .select({ id: schema.eventVenues.id })
    .from(schema.eventVenues)
    .where(
      and(
        eq(schema.eventVenues.id, linkId),
        eq(schema.eventVenues.eventId, event.id)
      )
    )
    .limit(1);

  if (!existing) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Venue link not found' } },
      404
    );
  }

  await db.delete(schema.eventVenues).where(eq(schema.eventVenues.id, existing.id));

  return c.json({ success: true, data: { deleted: true } });
});

// ==================== PROVIDER LINK UPDATE/DELETE (after static /venues routes) ====================

/**
 * PATCH /events/:eventUuid/providers/:linkId
 * Update a provider link
 */
eventProviders.patch(
  '/:linkId',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', updateEventProviderSchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const linkId = parseInt(c.req.param('linkId')!, 10);
    const updates = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    const access = await resolveEventAccess(db, eventUuid, user.id);
    if (!access) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        404
      );
    }
    if (!access.canEdit) {
      return c.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        403
      );
    }
    const event = access.event;

    const [existing] = await db
      .select({ id: schema.eventServiceProviders.id })
      .from(schema.eventServiceProviders)
      .where(
        and(
          eq(schema.eventServiceProviders.id, linkId),
          eq(schema.eventServiceProviders.eventId, event.id)
        )
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Provider link not found' } },
        404
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.quoteAmount !== undefined) updateData.quoteAmount = updates.quoteAmount;
    if (updates.finalAmount !== undefined) updateData.finalAmount = updates.finalAmount;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.contractUrl !== undefined) updateData.contractUrl = updates.contractUrl;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    await db
      .update(schema.eventServiceProviders)
      .set(updateData)
      .where(eq(schema.eventServiceProviders.id, existing.id));

    // Re-fetch
    const [row] = await db
      .select({
        link: {
          id: schema.eventServiceProviders.id,
          status: schema.eventServiceProviders.status,
          quoteAmount: schema.eventServiceProviders.quoteAmount,
          finalAmount: schema.eventServiceProviders.finalAmount,
          currency: schema.eventServiceProviders.currency,
          contractUrl: schema.eventServiceProviders.contractUrl,
          notes: schema.eventServiceProviders.notes,
          createdAt: schema.eventServiceProviders.createdAt,
          updatedAt: schema.eventServiceProviders.updatedAt,
        },
        provider: schema.serviceProviders,
      })
      .from(schema.eventServiceProviders)
      .innerJoin(
        schema.serviceProviders,
        eq(schema.eventServiceProviders.serviceProviderId, schema.serviceProviders.id)
      )
      .where(eq(schema.eventServiceProviders.id, existing.id))
      .limit(1);

    return c.json({
      success: true,
      data: {
        id: row!.link.id,
        status: row!.link.status,
        quoteAmount: row!.link.quoteAmount,
        finalAmount: row!.link.finalAmount,
        currency: row!.link.currency,
        contractUrl: row!.link.contractUrl,
        notes: row!.link.notes,
        createdAt: row!.link.createdAt,
        updatedAt: row!.link.updatedAt,
        provider: formatProvider(row!.provider, user.id),
      },
    });
  }
);

/**
 * DELETE /events/:eventUuid/providers/:linkId
 * Remove a provider link from event (hard delete)
 */
eventProviders.delete('/:linkId', requireAuth, requireVerifiedEmail, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const linkId = parseInt(c.req.param('linkId')!, 10);
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }
  const event = { id: access.event.id };

  const [existing] = await db
    .select({ id: schema.eventServiceProviders.id })
    .from(schema.eventServiceProviders)
    .where(
      and(
        eq(schema.eventServiceProviders.id, linkId),
        eq(schema.eventServiceProviders.eventId, event.id)
      )
    )
    .limit(1);

  if (!existing) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Provider link not found' } },
      404
    );
  }

  await db
    .delete(schema.eventServiceProviders)
    .where(eq(schema.eventServiceProviders.id, existing.id));

  return c.json({ success: true, data: { deleted: true } });
});

export default eventProviders;
