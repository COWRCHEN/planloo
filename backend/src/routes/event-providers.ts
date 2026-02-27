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
import { eq, and, isNull, isNotNull, desc, count, inArray, sql, gt } from 'drizzle-orm';
import { user as userTable } from '@/db/schema/auth';
import { requireAuth, requireVerifiedEmail } from '@/middleware/auth';
import { resolveEventAccess } from '@/lib/event-access';

const eventProviders = new Hono<HonoEnv>();

// ==================== SCHEMAS ====================

const BOOKING_STATUSES = ['inquiry', 'quoted', 'booked', 'confirmed', 'completed', 'cancelled'] as const;

const createEventProviderSchema = z.object({
  providerUuid: z.string().uuid(),
});

const updateEventProviderSchema = z.object({
  quoteAmount: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional(),
  depositAmount: z.coerce.number().min(0).optional().nullable(),
  depositPaid: z.boolean().optional(),
  paymentDueDate: z.coerce.date().optional().nullable(),
  priceIncludes: z.string().max(1000).optional().nullable(),
  contractUrl: z.string().url().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

const createEventVenueSchema = z.object({
  venueUuid: z.string().uuid(),
});

const createLogSchema = z.object({
  contactPerson: z.string().max(200).optional().nullable(),
  result: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  statusChange: z.enum(BOOKING_STATUSES).optional().nullable(),
  currency: z.string().length(3).optional(),
  quoteAmount: z.coerce.number().min(0).optional().nullable(),
  finalAmount: z.coerce.number().min(0).optional().nullable(),
  depositAmount: z.coerce.number().min(0).optional().nullable(),
  depositPaid: z.boolean().optional().nullable(),
  paymentDueDate: z.coerce.date().optional().nullable(),
  bookingStartTime: z.coerce.date().optional().nullable(),
  bookingEndTime: z.coerce.date().optional().nullable(),
  isAppointment: z.boolean().default(false),
}).refine((d) => !d.isAppointment || d.bookingStartTime != null, {
  message: 'bookingStartTime is required for appointments',
  path: ['bookingStartTime'],
});

const updateEventVenueSchema = z.object({
  bookingDate: z.coerce.date().optional().nullable(),
  quoteAmount: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional(),
  depositAmount: z.coerce.number().min(0).optional().nullable(),
  depositPaid: z.boolean().optional(),
  paymentDueDate: z.coerce.date().optional().nullable(),
  priceIncludes: z.string().max(1000).optional().nullable(),
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
        depositAmount: schema.eventServiceProviders.depositAmount,
        depositPaid: schema.eventServiceProviders.depositPaid,
        paymentDueDate: schema.eventServiceProviders.paymentDueDate,
        priceIncludes: schema.eventServiceProviders.priceIncludes,
        contractUrl: schema.eventServiceProviders.contractUrl,
        notes: schema.eventServiceProviders.notes,
        createdAt: schema.eventServiceProviders.createdAt,
        updatedAt: schema.eventServiceProviders.updatedAt,
      },
      provider: schema.serviceProviders,
      userRating: schema.userProviderRatings.rating,
      userComment: schema.userProviderRatings.comment,
    })
    .from(schema.eventServiceProviders)
    .innerJoin(
      schema.serviceProviders,
      eq(schema.eventServiceProviders.serviceProviderId, schema.serviceProviders.id)
    )
    .leftJoin(
      schema.userProviderRatings,
      and(
        eq(schema.userProviderRatings.providerId, schema.serviceProviders.id),
        eq(schema.userProviderRatings.userId, user.id)
      )
    )
    .where(eq(schema.eventServiceProviders.eventId, event.id));

  // Batch-fetch rating breakdown for all linked providers
  type RatingBreakdown = { 1: number; 2: number; 3: number; 4: number; 5: number };
  const providerBreakdownMap = new Map<number, RatingBreakdown>();
  const providerIds = links.map((r) => r.provider.id);
  if (providerIds.length > 0) {
    const bdRows = await db
      .select({ providerId: schema.userProviderRatings.providerId, rating: schema.userProviderRatings.rating, cnt: count() })
      .from(schema.userProviderRatings)
      .where(and(inArray(schema.userProviderRatings.providerId, providerIds), isNotNull(schema.userProviderRatings.rating)))
      .groupBy(schema.userProviderRatings.providerId, schema.userProviderRatings.rating);
    for (const r of bdRows) {
      if (!providerBreakdownMap.has(r.providerId)) providerBreakdownMap.set(r.providerId, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
      if (r.rating) providerBreakdownMap.get(r.providerId)![r.rating as 1 | 2 | 3 | 4 | 5] = r.cnt;
    }
  }

  const data = links.map((row) => ({
    id: row.link.id,
    status: row.link.status,
    quoteAmount: row.link.quoteAmount,
    finalAmount: row.link.finalAmount,
    currency: row.link.currency,
    depositAmount: row.link.depositAmount,
    depositPaid: row.link.depositPaid,
    paymentDueDate: row.link.paymentDueDate,
    priceIncludes: row.link.priceIncludes,
    contractUrl: row.link.contractUrl,
    notes: row.link.notes,
    createdAt: row.link.createdAt,
    updatedAt: row.link.updatedAt,
    provider: { ...formatProvider(row.provider, user.id), userRating: row.userRating ?? null, userComment: row.userComment ?? null, ratingBreakdown: providerBreakdownMap.get(row.provider.id) ?? null },
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
      await db.run(sql`INSERT INTO event_service_providers (event_id, service_provider_id) VALUES (${event.id}, ${provider.id})`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      const cause = err instanceof Error && err.cause != null ? String(err.cause) : '';
      const full = `${message} ${cause}`;
      if (full.includes('UNIQUE constraint failed') || full.includes('unique_event_provider')) {
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
          depositAmount: schema.eventServiceProviders.depositAmount,
          depositPaid: schema.eventServiceProviders.depositPaid,
          paymentDueDate: schema.eventServiceProviders.paymentDueDate,
          priceIncludes: schema.eventServiceProviders.priceIncludes,
          contractUrl: schema.eventServiceProviders.contractUrl,
          notes: schema.eventServiceProviders.notes,
          createdAt: schema.eventServiceProviders.createdAt,
          updatedAt: schema.eventServiceProviders.updatedAt,
        },
        provider: schema.serviceProviders,
        userRating: schema.userProviderRatings.rating,
        userComment: schema.userProviderRatings.comment,
      })
      .from(schema.eventServiceProviders)
      .innerJoin(
        schema.serviceProviders,
        eq(schema.eventServiceProviders.serviceProviderId, schema.serviceProviders.id)
      )
      .leftJoin(
        schema.userProviderRatings,
        and(
          eq(schema.userProviderRatings.providerId, schema.serviceProviders.id),
          eq(schema.userProviderRatings.userId, user.id)
        )
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
          depositAmount: link!.link.depositAmount,
          depositPaid: link!.link.depositPaid,
          paymentDueDate: link!.link.paymentDueDate,
          priceIncludes: link!.link.priceIncludes,
          contractUrl: link!.link.contractUrl,
          notes: link!.link.notes,
          createdAt: link!.link.createdAt,
          updatedAt: link!.link.updatedAt,
          provider: { ...formatProvider(link!.provider, user.id), userRating: link!.userRating ?? null, userComment: link!.userComment ?? null },
        },
      },
      201
    );
  }
);

// ==================== APPOINTMENTS ROUTE (static — must be before /:linkId param) ====================

/**
 * GET /events/:eventUuid/providers/appointments
 * List upcoming appointments (logs flagged as isAppointment with future bookingStartTime)
 */
eventProviders.get('/appointments', requireAuth, async (c) => {
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
  const event = access.event;
  const now = new Date();

  const [providerAppts, venueAppts] = await Promise.all([
    db
      .select({
        id: schema.eventProviderLogs.id,
        linkId: schema.eventProviderLogs.linkId,
        contactPerson: schema.eventProviderLogs.contactPerson,
        notes: schema.eventProviderLogs.notes,
        result: schema.eventProviderLogs.result,
        statusChange: schema.eventProviderLogs.statusChange,
        bookingStartTime: schema.eventProviderLogs.bookingStartTime,
        bookingEndTime: schema.eventProviderLogs.bookingEndTime,
        createdAt: schema.eventProviderLogs.createdAt,
        entityName: schema.serviceProviders.businessName,
        entityCategory: schema.serviceProviders.category,
      })
      .from(schema.eventProviderLogs)
      .innerJoin(
        schema.eventServiceProviders,
        eq(schema.eventProviderLogs.linkId, schema.eventServiceProviders.id)
      )
      .innerJoin(
        schema.serviceProviders,
        eq(schema.eventServiceProviders.serviceProviderId, schema.serviceProviders.id)
      )
      .where(
        and(
          eq(schema.eventProviderLogs.entityType, 'provider'),
          eq(schema.eventProviderLogs.isAppointment, true),
          gt(schema.eventProviderLogs.bookingStartTime, now),
          eq(schema.eventServiceProviders.eventId, event.id)
        )
      ),

    db
      .select({
        id: schema.eventProviderLogs.id,
        linkId: schema.eventProviderLogs.linkId,
        contactPerson: schema.eventProviderLogs.contactPerson,
        notes: schema.eventProviderLogs.notes,
        result: schema.eventProviderLogs.result,
        statusChange: schema.eventProviderLogs.statusChange,
        bookingStartTime: schema.eventProviderLogs.bookingStartTime,
        bookingEndTime: schema.eventProviderLogs.bookingEndTime,
        createdAt: schema.eventProviderLogs.createdAt,
        entityName: schema.venues.name,
        entityCategory: schema.venues.venueType,
      })
      .from(schema.eventProviderLogs)
      .innerJoin(
        schema.eventVenues,
        eq(schema.eventProviderLogs.linkId, schema.eventVenues.id)
      )
      .innerJoin(
        schema.venues,
        eq(schema.eventVenues.venueId, schema.venues.id)
      )
      .where(
        and(
          eq(schema.eventProviderLogs.entityType, 'venue'),
          eq(schema.eventProviderLogs.isAppointment, true),
          gt(schema.eventProviderLogs.bookingStartTime, now),
          eq(schema.eventVenues.eventId, event.id)
        )
      ),
  ]);

  const allAppts = [
    ...providerAppts.map((r) => ({
      id: r.id,
      entityType: 'provider' as const,
      entityName: r.entityName,
      entityCategory: r.entityCategory as string,
      linkId: r.linkId,
      appointmentStart: r.bookingStartTime!.toISOString(),
      appointmentEnd: r.bookingEndTime ? r.bookingEndTime.toISOString() : null,
      contactPerson: r.contactPerson,
      notes: r.notes,
      result: r.result,
      statusChange: r.statusChange,
      createdAt: r.createdAt.toISOString(),
    })),
    ...venueAppts.map((r) => ({
      id: r.id,
      entityType: 'venue' as const,
      entityName: r.entityName,
      entityCategory: r.entityCategory as string,
      linkId: r.linkId,
      appointmentStart: r.bookingStartTime!.toISOString(),
      appointmentEnd: r.bookingEndTime ? r.bookingEndTime.toISOString() : null,
      contactPerson: r.contactPerson,
      notes: r.notes,
      result: r.result,
      statusChange: r.statusChange,
      createdAt: r.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(a.appointmentStart).getTime() - new Date(b.appointmentStart).getTime())
    .slice(0, 10);

  return c.json({ success: true, data: allAppts });
});

// ==================== PROVIDER LOG ROUTES (before /:linkId param) ====================

/**
 * GET /events/:eventUuid/providers/:linkId/logs
 */
eventProviders.get('/:linkId/logs', requireAuth, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const linkId = parseInt(c.req.param('linkId')!, 10);
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);

  const rows = await db
    .select({
      id: schema.eventProviderLogs.id,
      entityType: schema.eventProviderLogs.entityType,
      linkId: schema.eventProviderLogs.linkId,
      logDate: schema.eventProviderLogs.logDate,
      contactPerson: schema.eventProviderLogs.contactPerson,
      result: schema.eventProviderLogs.result,
      notes: schema.eventProviderLogs.notes,
      statusChange: schema.eventProviderLogs.statusChange,
      quoteAmount: schema.eventProviderLogs.quoteAmount,
      finalAmount: schema.eventProviderLogs.finalAmount,
      depositAmount: schema.eventProviderLogs.depositAmount,
      depositPaid: schema.eventProviderLogs.depositPaid,
      paymentDueDate: schema.eventProviderLogs.paymentDueDate,
      bookingStartTime: schema.eventProviderLogs.bookingStartTime,
      bookingEndTime: schema.eventProviderLogs.bookingEndTime,
      isAppointment: schema.eventProviderLogs.isAppointment,
      createdByUserId: schema.eventProviderLogs.createdByUserId,
      createdByName: userTable.name,
      createdAt: schema.eventProviderLogs.createdAt,
      updatedAt: schema.eventProviderLogs.updatedAt,
    })
    .from(schema.eventProviderLogs)
    .leftJoin(userTable, eq(schema.eventProviderLogs.createdByUserId, userTable.id))
    .where(and(eq(schema.eventProviderLogs.entityType, 'provider'), eq(schema.eventProviderLogs.linkId, linkId)))
    .orderBy(desc(schema.eventProviderLogs.logDate));

  return c.json({ success: true, data: rows });
});

/**
 * POST /events/:eventUuid/providers/:linkId/logs
 */
eventProviders.post('/:linkId/logs', requireAuth, requireVerifiedEmail, zValidator('json', createLogSchema), async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const linkId = parseInt(c.req.param('linkId')!, 10);
  const body = c.req.valid('json');
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
  if (!access.canEdit) return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);

  const statusChange = body.statusChange ?? null;
  const logValues = {
    entityType: 'provider' as const,
    linkId,
    logDate: new Date(),
    contactPerson: body.contactPerson ?? null,
    result: body.result ?? null,
    notes: body.notes ?? null,
    statusChange,
    createdByUserId: user.id,
    quoteAmount: body.quoteAmount ?? null,
    finalAmount: body.finalAmount ?? null,
    depositAmount: body.depositAmount ?? null,
    depositPaid: body.depositPaid ?? null,
    paymentDueDate: body.paymentDueDate ?? null,
    bookingStartTime: body.bookingStartTime ?? null,
    bookingEndTime: body.bookingEndTime ?? null,
    isAppointment: body.isAppointment ?? false,
  };

  const linkUpdateData: Record<string, unknown> = { updatedAt: new Date() };
  if (statusChange) linkUpdateData.status = statusChange;
  if (body.currency) linkUpdateData.currency = body.currency;
  if (body.quoteAmount != null) linkUpdateData.quoteAmount = body.quoteAmount;
  if (body.finalAmount != null) linkUpdateData.finalAmount = body.finalAmount;
  if (body.depositAmount != null) linkUpdateData.depositAmount = body.depositAmount;
  if (body.depositPaid != null) linkUpdateData.depositPaid = body.depositPaid;
  if (body.paymentDueDate !== undefined) linkUpdateData.paymentDueDate = body.paymentDueDate ?? null;

  const batchResults = await db.batch([
    db.insert(schema.eventProviderLogs).values(logValues).returning(),
    db.update(schema.eventServiceProviders).set(linkUpdateData).where(eq(schema.eventServiceProviders.id, linkId)),
  ]);
  const insertedLog = (batchResults[0] as typeof schema.eventProviderLogs.$inferSelect[])[0]!;

  const log = { ...insertedLog, createdByName: user.name };
  return c.json({ success: true, data: log }, 201);
});

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
        bookingStartTime: schema.eventVenues.bookingStartTime,
        bookingEndTime: schema.eventVenues.bookingEndTime,
        quoteAmount: schema.eventVenues.quoteAmount,
        finalAmount: schema.eventVenues.finalAmount,
        currency: schema.eventVenues.currency,
        depositAmount: schema.eventVenues.depositAmount,
        depositPaid: schema.eventVenues.depositPaid,
        paymentDueDate: schema.eventVenues.paymentDueDate,
        priceIncludes: schema.eventVenues.priceIncludes,
        contractUrl: schema.eventVenues.contractUrl,
        notes: schema.eventVenues.notes,
        createdAt: schema.eventVenues.createdAt,
        updatedAt: schema.eventVenues.updatedAt,
      },
      venue: schema.venues,
      userRating: schema.userVenueRatings.rating,
      userComment: schema.userVenueRatings.comment,
    })
    .from(schema.eventVenues)
    .innerJoin(schema.venues, eq(schema.eventVenues.venueId, schema.venues.id))
    .leftJoin(
      schema.userVenueRatings,
      and(
        eq(schema.userVenueRatings.venueId, schema.venues.id),
        eq(schema.userVenueRatings.userId, user.id)
      )
    )
    .where(eq(schema.eventVenues.eventId, event.id));

  // Batch-fetch rating breakdown for all linked venues
  type RatingBreakdown = { 1: number; 2: number; 3: number; 4: number; 5: number };
  const venueBreakdownMap = new Map<number, RatingBreakdown>();
  const venueIds = links.map((r) => r.venue.id);
  if (venueIds.length > 0) {
    const bdRows = await db
      .select({ venueId: schema.userVenueRatings.venueId, rating: schema.userVenueRatings.rating, cnt: count() })
      .from(schema.userVenueRatings)
      .where(and(inArray(schema.userVenueRatings.venueId, venueIds), isNotNull(schema.userVenueRatings.rating)))
      .groupBy(schema.userVenueRatings.venueId, schema.userVenueRatings.rating);
    for (const r of bdRows) {
      if (!venueBreakdownMap.has(r.venueId)) venueBreakdownMap.set(r.venueId, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
      if (r.rating) venueBreakdownMap.get(r.venueId)![r.rating as 1 | 2 | 3 | 4 | 5] = r.cnt;
    }
  }

  const data = links.map((row) => ({
    id: row.link.id,
    status: row.link.status,
    bookingDate: row.link.bookingDate,
    bookingStartTime: row.link.bookingStartTime,
    bookingEndTime: row.link.bookingEndTime,
    quoteAmount: row.link.quoteAmount,
    finalAmount: row.link.finalAmount,
    currency: row.link.currency,
    depositAmount: row.link.depositAmount,
    depositPaid: row.link.depositPaid,
    paymentDueDate: row.link.paymentDueDate,
    priceIncludes: row.link.priceIncludes,
    contractUrl: row.link.contractUrl,
    notes: row.link.notes,
    createdAt: row.link.createdAt,
    updatedAt: row.link.updatedAt,
    venue: { ...formatVenue(row.venue, user.id), userRating: row.userRating ?? null, userComment: row.userComment ?? null, ratingBreakdown: venueBreakdownMap.get(row.venue.id) ?? null },
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

    await db.run(sql`INSERT INTO event_venues (event_id, venue_id) VALUES (${event.id}, ${venue.id})`);

    // Re-fetch with join
    const links = await db
      .select({
        link: {
          id: schema.eventVenues.id,
          status: schema.eventVenues.status,
          bookingDate: schema.eventVenues.bookingDate,
          bookingStartTime: schema.eventVenues.bookingStartTime,
          bookingEndTime: schema.eventVenues.bookingEndTime,
          quoteAmount: schema.eventVenues.quoteAmount,
          finalAmount: schema.eventVenues.finalAmount,
          currency: schema.eventVenues.currency,
          depositAmount: schema.eventVenues.depositAmount,
          depositPaid: schema.eventVenues.depositPaid,
          paymentDueDate: schema.eventVenues.paymentDueDate,
          priceIncludes: schema.eventVenues.priceIncludes,
          contractUrl: schema.eventVenues.contractUrl,
          notes: schema.eventVenues.notes,
          createdAt: schema.eventVenues.createdAt,
          updatedAt: schema.eventVenues.updatedAt,
        },
        venue: schema.venues,
        userRating: schema.userVenueRatings.rating,
        userComment: schema.userVenueRatings.comment,
      })
      .from(schema.eventVenues)
      .innerJoin(schema.venues, eq(schema.eventVenues.venueId, schema.venues.id))
      .leftJoin(
        schema.userVenueRatings,
        and(
          eq(schema.userVenueRatings.venueId, schema.venues.id),
          eq(schema.userVenueRatings.userId, user.id)
        )
      )
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
          bookingStartTime: row.link.bookingStartTime,
          bookingEndTime: row.link.bookingEndTime,
          quoteAmount: row.link.quoteAmount,
          finalAmount: row.link.finalAmount,
          currency: row.link.currency,
          depositAmount: row.link.depositAmount,
          depositPaid: row.link.depositPaid,
          paymentDueDate: row.link.paymentDueDate,
          priceIncludes: row.link.priceIncludes,
          contractUrl: row.link.contractUrl,
          notes: row.link.notes,
          createdAt: row.link.createdAt,
          updatedAt: row.link.updatedAt,
          venue: { ...formatVenue(row.venue, user.id), userRating: row.userRating ?? null, userComment: row.userComment ?? null },
        },
      },
      201
    );
  }
);

/**
 * GET /events/:eventUuid/providers/venues/:linkId/logs
 */
eventProviders.get('/venues/:linkId/logs', requireAuth, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const linkId = parseInt(c.req.param('linkId')!, 10);
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);

  const rows = await db
    .select({
      id: schema.eventProviderLogs.id,
      entityType: schema.eventProviderLogs.entityType,
      linkId: schema.eventProviderLogs.linkId,
      logDate: schema.eventProviderLogs.logDate,
      contactPerson: schema.eventProviderLogs.contactPerson,
      result: schema.eventProviderLogs.result,
      notes: schema.eventProviderLogs.notes,
      statusChange: schema.eventProviderLogs.statusChange,
      quoteAmount: schema.eventProviderLogs.quoteAmount,
      finalAmount: schema.eventProviderLogs.finalAmount,
      depositAmount: schema.eventProviderLogs.depositAmount,
      depositPaid: schema.eventProviderLogs.depositPaid,
      paymentDueDate: schema.eventProviderLogs.paymentDueDate,
      bookingStartTime: schema.eventProviderLogs.bookingStartTime,
      bookingEndTime: schema.eventProviderLogs.bookingEndTime,
      isAppointment: schema.eventProviderLogs.isAppointment,
      createdByUserId: schema.eventProviderLogs.createdByUserId,
      createdByName: userTable.name,
      createdAt: schema.eventProviderLogs.createdAt,
      updatedAt: schema.eventProviderLogs.updatedAt,
    })
    .from(schema.eventProviderLogs)
    .leftJoin(userTable, eq(schema.eventProviderLogs.createdByUserId, userTable.id))
    .where(and(eq(schema.eventProviderLogs.entityType, 'venue'), eq(schema.eventProviderLogs.linkId, linkId)))
    .orderBy(desc(schema.eventProviderLogs.logDate));

  return c.json({ success: true, data: rows });
});

/**
 * POST /events/:eventUuid/providers/venues/:linkId/logs
 */
eventProviders.post('/venues/:linkId/logs', requireAuth, requireVerifiedEmail, zValidator('json', createLogSchema), async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const linkId = parseInt(c.req.param('linkId')!, 10);
  const body = c.req.valid('json');
  const db = createDbClient(c.env.DB);

  const access = await resolveEventAccess(db, eventUuid, user.id);
  if (!access) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } }, 404);
  if (!access.canEdit) return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);

  const statusChange = body.statusChange ?? null;
  const logValues = {
    entityType: 'venue' as const,
    linkId,
    logDate: new Date(),
    contactPerson: body.contactPerson ?? null,
    result: body.result ?? null,
    notes: body.notes ?? null,
    statusChange,
    createdByUserId: user.id,
    quoteAmount: body.quoteAmount ?? null,
    finalAmount: body.finalAmount ?? null,
    depositAmount: body.depositAmount ?? null,
    depositPaid: body.depositPaid ?? null,
    paymentDueDate: body.paymentDueDate ?? null,
    bookingStartTime: body.bookingStartTime ?? null,
    bookingEndTime: body.bookingEndTime ?? null,
    isAppointment: body.isAppointment ?? false,
  };

  const venueLinkUpdateData: Record<string, unknown> = { updatedAt: new Date() };
  if (statusChange) venueLinkUpdateData.status = statusChange;
  if (body.currency) venueLinkUpdateData.currency = body.currency;
  if (body.quoteAmount != null) venueLinkUpdateData.quoteAmount = body.quoteAmount;
  if (body.finalAmount != null) venueLinkUpdateData.finalAmount = body.finalAmount;
  if (body.depositAmount != null) venueLinkUpdateData.depositAmount = body.depositAmount;
  if (body.depositPaid != null) venueLinkUpdateData.depositPaid = body.depositPaid;
  if (body.paymentDueDate !== undefined) venueLinkUpdateData.paymentDueDate = body.paymentDueDate ?? null;
  if (body.bookingStartTime !== undefined) venueLinkUpdateData.bookingStartTime = body.bookingStartTime ?? null;
  if (body.bookingEndTime !== undefined) venueLinkUpdateData.bookingEndTime = body.bookingEndTime ?? null;

  const venueBatchResults = await db.batch([
    db.insert(schema.eventProviderLogs).values(logValues).returning(),
    db.update(schema.eventVenues).set(venueLinkUpdateData).where(eq(schema.eventVenues.id, linkId)),
  ]);
  const insertedVenueLog = (venueBatchResults[0] as typeof schema.eventProviderLogs.$inferSelect[])[0]!;

  const venueLog = { ...insertedVenueLog, createdByName: user.name };
  return c.json({ success: true, data: venueLog }, 201);
});

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

    if (updates.bookingDate !== undefined) updateData.bookingDate = updates.bookingDate;
    if (updates.quoteAmount !== undefined) updateData.quoteAmount = updates.quoteAmount;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.depositAmount !== undefined) updateData.depositAmount = updates.depositAmount;
    if (updates.depositPaid !== undefined) updateData.depositPaid = updates.depositPaid;
    if (updates.paymentDueDate !== undefined) updateData.paymentDueDate = updates.paymentDueDate;
    if (updates.priceIncludes !== undefined) updateData.priceIncludes = updates.priceIncludes;
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
          bookingStartTime: schema.eventVenues.bookingStartTime,
          bookingEndTime: schema.eventVenues.bookingEndTime,
          quoteAmount: schema.eventVenues.quoteAmount,
          finalAmount: schema.eventVenues.finalAmount,
          currency: schema.eventVenues.currency,
          depositAmount: schema.eventVenues.depositAmount,
          depositPaid: schema.eventVenues.depositPaid,
          paymentDueDate: schema.eventVenues.paymentDueDate,
          priceIncludes: schema.eventVenues.priceIncludes,
          contractUrl: schema.eventVenues.contractUrl,
          notes: schema.eventVenues.notes,
          createdAt: schema.eventVenues.createdAt,
          updatedAt: schema.eventVenues.updatedAt,
        },
        venue: schema.venues,
        userRating: schema.userVenueRatings.rating,
        userComment: schema.userVenueRatings.comment,
      })
      .from(schema.eventVenues)
      .innerJoin(schema.venues, eq(schema.eventVenues.venueId, schema.venues.id))
      .leftJoin(
        schema.userVenueRatings,
        and(
          eq(schema.userVenueRatings.venueId, schema.venues.id),
          eq(schema.userVenueRatings.userId, user.id)
        )
      )
      .where(eq(schema.eventVenues.id, existing.id))
      .limit(1);

    return c.json({
      success: true,
      data: {
        id: row!.link.id,
        status: row!.link.status,
        bookingDate: row!.link.bookingDate,
        bookingStartTime: row!.link.bookingStartTime,
        bookingEndTime: row!.link.bookingEndTime,
        quoteAmount: row!.link.quoteAmount,
        finalAmount: row!.link.finalAmount,
        currency: row!.link.currency,
        depositAmount: row!.link.depositAmount,
        depositPaid: row!.link.depositPaid,
        paymentDueDate: row!.link.paymentDueDate,
        priceIncludes: row!.link.priceIncludes,
        contractUrl: row!.link.contractUrl,
        notes: row!.link.notes,
        createdAt: row!.link.createdAt,
        updatedAt: row!.link.updatedAt,
        venue: { ...formatVenue(row!.venue, user.id), userRating: row!.userRating ?? null, userComment: row!.userComment ?? null },
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

    if (updates.quoteAmount !== undefined) updateData.quoteAmount = updates.quoteAmount;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.depositAmount !== undefined) updateData.depositAmount = updates.depositAmount;
    if (updates.depositPaid !== undefined) updateData.depositPaid = updates.depositPaid;
    if (updates.paymentDueDate !== undefined) updateData.paymentDueDate = updates.paymentDueDate;
    if (updates.priceIncludes !== undefined) updateData.priceIncludes = updates.priceIncludes;
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
          depositAmount: schema.eventServiceProviders.depositAmount,
          depositPaid: schema.eventServiceProviders.depositPaid,
          paymentDueDate: schema.eventServiceProviders.paymentDueDate,
          priceIncludes: schema.eventServiceProviders.priceIncludes,
          contractUrl: schema.eventServiceProviders.contractUrl,
          notes: schema.eventServiceProviders.notes,
          createdAt: schema.eventServiceProviders.createdAt,
          updatedAt: schema.eventServiceProviders.updatedAt,
        },
        provider: schema.serviceProviders,
        userRating: schema.userProviderRatings.rating,
        userComment: schema.userProviderRatings.comment,
      })
      .from(schema.eventServiceProviders)
      .innerJoin(
        schema.serviceProviders,
        eq(schema.eventServiceProviders.serviceProviderId, schema.serviceProviders.id)
      )
      .leftJoin(
        schema.userProviderRatings,
        and(
          eq(schema.userProviderRatings.providerId, schema.serviceProviders.id),
          eq(schema.userProviderRatings.userId, user.id)
        )
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
        depositAmount: row!.link.depositAmount,
        depositPaid: row!.link.depositPaid,
        paymentDueDate: row!.link.paymentDueDate,
        priceIncludes: row!.link.priceIncludes,
        contractUrl: row!.link.contractUrl,
        notes: row!.link.notes,
        createdAt: row!.link.createdAt,
        updatedAt: row!.link.updatedAt,
        provider: { ...formatProvider(row!.provider, user.id), userRating: row!.userRating ?? null, userComment: row!.userComment ?? null },
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
