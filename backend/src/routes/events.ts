/**
 * Events Routes
 *
 * CRUD endpoints for event management.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull, desc, asc, sql, count } from 'drizzle-orm';
import { requireAuth, requireVerifiedEmail } from '@/middleware/auth';

const events = new Hono<HonoEnv>();

// ==================== ENUMS ====================

const EVENT_TYPES = ['wedding', 'birthday', 'corporate', 'conference', 'other'] as const;
const EVENT_STATUSES = ['draft', 'planning', 'confirmed', 'completed', 'cancelled'] as const;

// ==================== SCHEMAS ====================

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  eventType: z.enum(EVENT_TYPES).optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  timezone: z.string().default('UTC'),
  locationName: z.string().max(200).optional().nullable(),
  locationAddress: z.string().max(500).optional().nullable(),
  locationCity: z.string().max(100).optional().nullable(),
  locationState: z.string().max(100).optional().nullable(),
  locationCountry: z.string().max(100).optional().nullable(),
  locationPostalCode: z.string().max(20).optional().nullable(),
  guestCountExpected: z.coerce.number().int().min(0).optional().nullable(),
  budgetTotal: z.coerce.number().min(0).optional().nullable(),
  budgetCurrency: z.string().length(3).default('USD'),
  isPublic: z.boolean().default(false),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  eventType: z.enum(EVENT_TYPES).optional().nullable(),
  status: z.enum(EVENT_STATUSES).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional().nullable(),
  timezone: z.string().optional(),
  locationName: z.string().max(200).optional().nullable(),
  locationAddress: z.string().max(500).optional().nullable(),
  locationCity: z.string().max(100).optional().nullable(),
  locationState: z.string().max(100).optional().nullable(),
  locationCountry: z.string().max(100).optional().nullable(),
  locationPostalCode: z.string().max(20).optional().nullable(),
  guestCountExpected: z.coerce.number().int().min(0).optional().nullable(),
  budgetTotal: z.coerce.number().min(0).optional().nullable(),
  budgetCurrency: z.string().length(3).optional(),
  isPublic: z.boolean().optional(),
  coverImageUrl: z.string().url().optional().nullable(),
  slug: z.string().min(3).max(60).regex(/^[a-z0-9-]+$/).optional().nullable(),
});

const listEventsQuerySchema = z.object({
  status: z.enum(EVENT_STATUSES).optional(),
  eventType: z.enum(EVENT_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['startDate', 'createdAt', 'title']).default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// ==================== ROUTES ====================

/**
 * GET /events
 * List user's events (paginated, filterable)
 */
events.get('/', requireAuth, zValidator('query', listEventsQuerySchema), async (c) => {
  const user = c.get('user')!;
  const { status, eventType, limit, offset, sortBy, sortOrder } = c.req.valid('query');

  const db = createDbClient(c.env.DB);

  // Build where conditions
  const conditions = [
    eq(schema.events.userId, user.id),
    isNull(schema.events.deletedAt),
  ];

  if (status) {
    conditions.push(eq(schema.events.status, status));
  }

  if (eventType) {
    conditions.push(eq(schema.events.eventType, eventType));
  }

  // Determine sort column
  const sortColumn =
    sortBy === 'startDate'
      ? schema.events.startDate
      : sortBy === 'title'
        ? schema.events.title
        : schema.events.createdAt;

  const orderFn = sortOrder === 'desc' ? desc : asc;

  // Get total count
  const [countResult] = await db
    .select({ count: count() })
    .from(schema.events)
    .where(and(...conditions));

  // Get events
  const eventsList = await db
    .select({
      id: schema.events.id,
      uuid: schema.events.uuid,
      userId: schema.events.userId,
      organizationId: schema.events.organizationId,
      title: schema.events.title,
      description: schema.events.description,
      eventType: schema.events.eventType,
      status: schema.events.status,
      startDate: schema.events.startDate,
      endDate: schema.events.endDate,
      timezone: schema.events.timezone,
      locationName: schema.events.locationName,
      locationCity: schema.events.locationCity,
      locationCountry: schema.events.locationCountry,
      guestCountExpected: schema.events.guestCountExpected,
      guestCountConfirmed: schema.events.guestCountConfirmed,
      budgetTotal: schema.events.budgetTotal,
      budgetCurrency: schema.events.budgetCurrency,
      isPublic: schema.events.isPublic,
      coverImageUrl: schema.events.coverImageUrl,
      createdAt: schema.events.createdAt,
      updatedAt: schema.events.updatedAt,
    })
    .from(schema.events)
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  return c.json({
    success: true,
    data: eventsList,
    meta: {
      total: countResult?.count ?? 0,
      limit,
      offset,
    },
  });
});

/**
 * GET /events/stats
 * Dashboard statistics for user's events
 */
events.get('/stats', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  const now = new Date();

  // Get event counts by status
  const eventStats = await db
    .select({
      status: schema.events.status,
      count: count(),
    })
    .from(schema.events)
    .where(and(eq(schema.events.userId, user.id), isNull(schema.events.deletedAt)))
    .groupBy(schema.events.status);

  // Get upcoming events count
  const [upcomingResult] = await db
    .select({ count: count() })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.userId, user.id),
        isNull(schema.events.deletedAt),
        sql`${schema.events.startDate} > ${Math.floor(now.getTime() / 1000)}`
      )
    );

  // Get total guests across all user's events
  const [guestStats] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${schema.events.guestCountExpected}), 0)`,
      confirmed: sql<number>`COALESCE(SUM(${schema.events.guestCountConfirmed}), 0)`,
    })
    .from(schema.events)
    .where(and(eq(schema.events.userId, user.id), isNull(schema.events.deletedAt)));

  // Calculate stats
  const statsMap: Record<string, number> = {};
  for (const stat of eventStats) {
    statsMap[stat.status] = stat.count;
  }

  const totalEvents = Object.values(statsMap).reduce((a, b) => a + b, 0);

  return c.json({
    success: true,
    data: {
      totalEvents,
      upcomingEvents: upcomingResult?.count ?? 0,
      draftEvents: statsMap['draft'] ?? 0,
      completedEvents: statsMap['completed'] ?? 0,
      totalGuests: guestStats?.total ?? 0,
      confirmedGuests: guestStats?.confirmed ?? 0,
    },
  });
});

/**
 * GET /events/check-slug
 * Check if a slug is available
 */
events.get('/check-slug', requireAuth, async (c) => {
  const slug = c.req.query('slug');
  const eventUuid = c.req.query('eventUuid');

  if (!slug) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'slug query parameter is required' } },
      400
    );
  }

  const db = createDbClient(c.env.DB);

  const conditions = [
    eq(schema.events.slug, slug),
    isNull(schema.events.deletedAt),
  ];

  // Exclude current event if provided
  if (eventUuid) {
    const [currentEvent] = await db
      .select({ id: schema.events.id })
      .from(schema.events)
      .where(eq(schema.events.uuid, eventUuid))
      .limit(1);

    if (currentEvent) {
      conditions.push(sql`${schema.events.id} != ${currentEvent.id}`);
    }
  }

  const [existing] = await db
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(and(...conditions))
    .limit(1);

  return c.json({
    success: true,
    data: { available: !existing },
  });
});

/**
 * GET /events/:uuid
 * Get single event by UUID
 */
events.get('/:uuid', requireAuth, async (c) => {
  const user = c.get('user')!;
  const uuid = c.req.param('uuid');

  const db = createDbClient(c.env.DB);

  const [event] = await db
    .select()
    .from(schema.events)
    .where(
      and(
        eq(schema.events.uuid, uuid),
        eq(schema.events.userId, user.id),
        isNull(schema.events.deletedAt)
      )
    )
    .limit(1);

  if (!event) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Event not found',
        },
      },
      404
    );
  }

  return c.json({
    success: true,
    data: event,
  });
});

/**
 * POST /events
 * Create a new event
 */
events.post(
  '/',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', createEventSchema),
  async (c) => {
    const user = c.get('user')!;
    const data = c.req.valid('json');

    const db = createDbClient(c.env.DB);

    const uuid = crypto.randomUUID();

    const [newEvent] = await db
      .insert(schema.events)
      .values({
        uuid,
        userId: user.id,
        title: data.title,
        description: data.description ?? null,
        eventType: data.eventType ?? null,
        status: 'draft',
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        timezone: data.timezone,
        locationName: data.locationName ?? null,
        locationAddress: data.locationAddress ?? null,
        locationCity: data.locationCity ?? null,
        locationState: data.locationState ?? null,
        locationCountry: data.locationCountry ?? null,
        locationPostalCode: data.locationPostalCode ?? null,
        guestCountExpected: data.guestCountExpected ?? null,
        budgetTotal: data.budgetTotal ?? null,
        budgetCurrency: data.budgetCurrency,
        isPublic: data.isPublic,
      })
      .returning();

    return c.json(
      {
        success: true,
        data: newEvent,
      },
      201
    );
  }
);

/**
 * PATCH /events/:uuid
 * Update an existing event
 */
events.patch(
  '/:uuid',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', updateEventSchema),
  async (c) => {
    const user = c.get('user')!;
    const uuid = c.req.param('uuid');
    const updates = c.req.valid('json');

    const db = createDbClient(c.env.DB);

    // Check event exists and belongs to user
    const [existingEvent] = await db
      .select({ id: schema.events.id })
      .from(schema.events)
      .where(
        and(
          eq(schema.events.uuid, uuid),
          eq(schema.events.userId, user.id),
          isNull(schema.events.deletedAt)
        )
      )
      .limit(1);

    if (!existingEvent) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Event not found',
          },
        },
        404
      );
    }

    // Build update object, only including defined fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.eventType !== undefined) updateData.eventType = updates.eventType;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.startDate !== undefined) updateData.startDate = updates.startDate;
    if (updates.endDate !== undefined) updateData.endDate = updates.endDate;
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
    if (updates.locationName !== undefined) updateData.locationName = updates.locationName;
    if (updates.locationAddress !== undefined) updateData.locationAddress = updates.locationAddress;
    if (updates.locationCity !== undefined) updateData.locationCity = updates.locationCity;
    if (updates.locationState !== undefined) updateData.locationState = updates.locationState;
    if (updates.locationCountry !== undefined) updateData.locationCountry = updates.locationCountry;
    if (updates.locationPostalCode !== undefined)
      updateData.locationPostalCode = updates.locationPostalCode;
    if (updates.guestCountExpected !== undefined)
      updateData.guestCountExpected = updates.guestCountExpected;
    if (updates.budgetTotal !== undefined) updateData.budgetTotal = updates.budgetTotal;
    if (updates.budgetCurrency !== undefined) updateData.budgetCurrency = updates.budgetCurrency;
    if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic;
    if (updates.coverImageUrl !== undefined) updateData.coverImageUrl = updates.coverImageUrl;
    if (updates.slug !== undefined) {
      // Check slug uniqueness if setting a slug
      if (updates.slug) {
        const [existingSlug] = await db
          .select({ id: schema.events.id })
          .from(schema.events)
          .where(
            and(
              eq(schema.events.slug, updates.slug),
              isNull(schema.events.deletedAt)
            )
          )
          .limit(1);

        if (existingSlug && existingSlug.id !== existingEvent.id) {
          return c.json(
            {
              success: false,
              error: {
                code: 'SLUG_TAKEN',
                message: 'This slug is already in use by another event',
              },
            },
            409
          );
        }
      }
      updateData.slug = updates.slug;
    }

    const [updatedEvent] = await db
      .update(schema.events)
      .set(updateData)
      .where(eq(schema.events.uuid, uuid))
      .returning();

    return c.json({
      success: true,
      data: updatedEvent,
    });
  }
);

/**
 * DELETE /events/:uuid
 * Soft delete an event
 */
events.delete('/:uuid', requireAuth, async (c) => {
  const user = c.get('user')!;
  const uuid = c.req.param('uuid');

  const db = createDbClient(c.env.DB);

  // Check event exists and belongs to user
  const [existingEvent] = await db
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.uuid, uuid),
        eq(schema.events.userId, user.id),
        isNull(schema.events.deletedAt)
      )
    )
    .limit(1);

  if (!existingEvent) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Event not found',
        },
      },
      404
    );
  }

  // Soft delete
  await db
    .update(schema.events)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.events.uuid, uuid));

  return c.json({
    success: true,
    data: { deleted: true },
  });
});

// ==================== GUEST SETTINGS ENDPOINTS ====================

/**
 * Meal choice option schema
 */
const mealChoiceOptionSchema = z.object({
  key: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
});

/** Default category options when enableCategory is true but categoryOptions not yet set */
const DEFAULT_CATEGORY_OPTIONS = [
  { key: 'vip', label: 'VIP' },
  { key: 'family', label: 'Family' },
  { key: 'friend', label: 'Friend' },
  { key: 'colleague', label: 'Colleague' },
  { key: 'other', label: 'Other' },
];

/**
 * Custom field definition schema
 */
const customFieldDefinitionSchema = z.object({
  id: z.string().min(1).max(50),
  type: z.enum(['text', 'number', 'select', 'multiselect', 'date', 'checkbox']),
  label: z.string().min(1).max(100),
  required: z.boolean().default(false),
  helpText: z.string().max(500).optional(),
  options: z.array(z.string().max(100)).optional(),
});

/** Accommodation hotel: id, name, optional structured address. Check-in/check-out are event-level (same for all hotels). */
const accommodationHotelSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  streetNo: z.string().max(20).optional(),
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
});

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

/**
 * Update guest settings schema
 */
const updateGuestSettingsSchema = z
  .object({
  // Field toggles
  enableAddress: z.boolean().optional(),
  enableMealChoice: z.boolean().optional(),
  enableAccommodation: z.boolean().optional(),
  enablePlusOnes: z.boolean().optional(),
  defaultPlusOnesAllowed: z.number().int().min(0).max(10).optional(),
  enablePlusOneName: z.boolean().optional(),
  enableTableAssignment: z.boolean().optional(),
  enableTransportation: z.boolean().optional(),
  enableAccessibility: z.boolean().optional(),
  enableCategory: z.boolean().optional(),
  // Required flag for each optional field
  requiredAddress: z.boolean().optional(),
  requiredMealChoice: z.boolean().optional(),
  requiredAccommodation: z.boolean().optional(),
  requiredPlusOneName: z.boolean().optional(),
  requiredTableAssignment: z.boolean().optional(),
  requiredTransportation: z.boolean().optional(),
  requiredAccessibility: z.boolean().optional(),
  requiredCategory: z.boolean().optional(),
  // Common field required flags
  requiredFirstName: z.boolean().optional(),
  requiredLastName: z.boolean().optional(),
  requiredEmail: z.boolean().optional(),
  requiredPhone: z.boolean().optional(),
  // Meal options
  mealChoiceOptions: z.array(mealChoiceOptionSchema).max(20).optional(),
  // Category options (same shape as meal)
  categoryOptions: z.array(mealChoiceOptionSchema).max(20).optional(),
  // Accommodation: event-level dates (same for all hotels) + hotel list (id, name only)
  accommodationCheckInDate: dateOnlySchema.optional().nullable(),
  accommodationCheckOutDate: dateOnlySchema.optional().nullable(),
  accommodationHotels: z.array(accommodationHotelSchema).max(50).optional(),
  // Custom field definitions (max 10)
  customFieldDefinitions: z.array(customFieldDefinitionSchema).max(10).optional(),
})
  .refine(
    (data) => {
      const cin = data.accommodationCheckInDate;
      const cout = data.accommodationCheckOutDate;
      if (!cin || !cout) return true;
      return cout >= cin;
    },
    { message: 'Check-out date must be on or after check-in date', path: ['accommodationCheckOutDate'] }
  );

/**
 * GET /events/:uuid/guest-settings
 * Get guest field settings for an event
 */
events.get('/:uuid/guest-settings', requireAuth, async (c) => {
  const user = c.get('user')!;
  const uuid = c.req.param('uuid');

  const db = createDbClient(c.env.DB);

  // Get event
  const [event] = await db
    .select({ id: schema.events.id, eventType: schema.events.eventType })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.uuid, uuid),
        eq(schema.events.userId, user.id),
        isNull(schema.events.deletedAt)
      )
    )
    .limit(1);

  if (!event) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  // Get or create settings
  let [settings] = await db
    .select()
    .from(schema.eventGuestSettings)
    .where(eq(schema.eventGuestSettings.eventId, event.id))
    .limit(1);

  // If no settings exist, create default settings
  if (!settings) {
    const [newSettings] = await db
      .insert(schema.eventGuestSettings)
      .values({
        eventId: event.id,
        enableAddress: false,
        enableMealChoice: false,
        enableAccommodation: false,
        enablePlusOnes: false,
        defaultPlusOnesAllowed: 0,
        enablePlusOneName: false,
        enableTableAssignment: false,
        enableTransportation: false,
        enableAccessibility: false,
        enableCategory: false,
        requiredCategory: false,
        requiredFirstName: true,
        requiredLastName: false,
        requiredEmail: false,
        requiredPhone: false,
        mealChoiceOptions: null,
        categoryOptions: null,
        customFieldDefinitions: null,
      })
      .returning();
    settings = newSettings!;
  }

  // Parse JSON fields
  let mealChoiceOptions = null;
  if (settings!.mealChoiceOptions) {
    try {
      mealChoiceOptions = JSON.parse(settings!.mealChoiceOptions);
    } catch {
      mealChoiceOptions = null;
    }
  }

  let customFieldDefinitions = null;
  if (settings!.customFieldDefinitions) {
    try {
      customFieldDefinitions = JSON.parse(settings!.customFieldDefinitions);
    } catch {
      customFieldDefinitions = null;
    }
  }

  let accommodationHotels = null;
  if (settings!.accommodationHotels) {
    try {
      accommodationHotels = JSON.parse(settings!.accommodationHotels);
    } catch {
      accommodationHotels = null;
    }
  }

  let categoryOptions = null;
  if (settings!.categoryOptions) {
    try {
      categoryOptions = JSON.parse(settings!.categoryOptions);
    } catch {
      categoryOptions = null;
    }
  }
  if (settings!.enableCategory && (!categoryOptions || categoryOptions.length === 0)) {
    categoryOptions = DEFAULT_CATEGORY_OPTIONS;
  }

  return c.json({
    success: true,
    data: {
      id: settings!.id,
      eventId: settings!.eventId,
      eventType: event.eventType,
      enableAddress: settings!.enableAddress,
      enableMealChoice: settings!.enableMealChoice,
      enableAccommodation: settings!.enableAccommodation,
      enablePlusOnes: settings!.enablePlusOnes,
      defaultPlusOnesAllowed: settings!.defaultPlusOnesAllowed,
      enablePlusOneName: settings!.enablePlusOneName,
      enableTableAssignment: settings!.enableTableAssignment,
      enableTransportation: settings!.enableTransportation,
      enableAccessibility: settings!.enableAccessibility,
      enableCategory: settings!.enableCategory,
      requiredAddress: settings!.requiredAddress,
      requiredMealChoice: settings!.requiredMealChoice,
      requiredAccommodation: settings!.requiredAccommodation,
      requiredPlusOneName: settings!.requiredPlusOneName,
      requiredTableAssignment: settings!.requiredTableAssignment,
      requiredTransportation: settings!.requiredTransportation,
      requiredAccessibility: settings!.requiredAccessibility,
      requiredCategory: settings!.requiredCategory,
      requiredFirstName: settings!.requiredFirstName,
      requiredLastName: settings!.requiredLastName,
      requiredEmail: settings!.requiredEmail,
      requiredPhone: settings!.requiredPhone,
      mealChoiceOptions,
      categoryOptions,
      accommodationCheckInDate: settings!.accommodationCheckInDate ?? null,
      accommodationCheckOutDate: settings!.accommodationCheckOutDate ?? null,
      accommodationHotels,
      customFieldDefinitions,
      createdAt: settings!.createdAt,
      updatedAt: settings!.updatedAt,
    },
  });
});

/**
 * PATCH /events/:uuid/guest-settings
 * Update guest field settings for an event
 */
events.patch(
  '/:uuid/guest-settings',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', updateGuestSettingsSchema),
  async (c) => {
    const user = c.get('user')!;
    const uuid = c.req.param('uuid');
    const updates = c.req.valid('json');

    const db = createDbClient(c.env.DB);

    // Get event
    const [event] = await db
      .select({ id: schema.events.id })
      .from(schema.events)
      .where(
        and(
          eq(schema.events.uuid, uuid),
          eq(schema.events.userId, user.id),
          isNull(schema.events.deletedAt)
        )
      )
      .limit(1);

    if (!event) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        404
      );
    }

    // Check if settings exist
    const [existingSettings] = await db
      .select({ id: schema.eventGuestSettings.id })
      .from(schema.eventGuestSettings)
      .where(eq(schema.eventGuestSettings.eventId, event.id))
      .limit(1);

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.enableAddress !== undefined) updateData.enableAddress = updates.enableAddress;
    if (updates.enableMealChoice !== undefined) updateData.enableMealChoice = updates.enableMealChoice;
    if (updates.enableAccommodation !== undefined) updateData.enableAccommodation = updates.enableAccommodation;
    if (updates.enablePlusOnes !== undefined) updateData.enablePlusOnes = updates.enablePlusOnes;
    if (updates.defaultPlusOnesAllowed !== undefined) updateData.defaultPlusOnesAllowed = updates.defaultPlusOnesAllowed;
    if (updates.enablePlusOneName !== undefined) updateData.enablePlusOneName = updates.enablePlusOneName;
    if (updates.enableTableAssignment !== undefined) updateData.enableTableAssignment = updates.enableTableAssignment;
    if (updates.enableTransportation !== undefined) updateData.enableTransportation = updates.enableTransportation;
    if (updates.enableAccessibility !== undefined) updateData.enableAccessibility = updates.enableAccessibility;
    if (updates.enableCategory !== undefined) updateData.enableCategory = updates.enableCategory;

    if (updates.requiredAddress !== undefined) updateData.requiredAddress = updates.requiredAddress;
    if (updates.requiredMealChoice !== undefined) updateData.requiredMealChoice = updates.requiredMealChoice;
    if (updates.requiredAccommodation !== undefined) updateData.requiredAccommodation = updates.requiredAccommodation;
    if (updates.requiredPlusOneName !== undefined) updateData.requiredPlusOneName = updates.requiredPlusOneName;
    if (updates.requiredTableAssignment !== undefined) updateData.requiredTableAssignment = updates.requiredTableAssignment;
    if (updates.requiredTransportation !== undefined) updateData.requiredTransportation = updates.requiredTransportation;
    if (updates.requiredAccessibility !== undefined) updateData.requiredAccessibility = updates.requiredAccessibility;
    if (updates.requiredCategory !== undefined) updateData.requiredCategory = updates.requiredCategory;
    if (updates.requiredFirstName !== undefined) updateData.requiredFirstName = updates.requiredFirstName;
    if (updates.requiredLastName !== undefined) updateData.requiredLastName = updates.requiredLastName;
    if (updates.requiredEmail !== undefined) updateData.requiredEmail = updates.requiredEmail;
    if (updates.requiredPhone !== undefined) updateData.requiredPhone = updates.requiredPhone;

    if (updates.mealChoiceOptions !== undefined) {
      updateData.mealChoiceOptions = updates.mealChoiceOptions
        ? JSON.stringify(updates.mealChoiceOptions)
        : null;
    }
    if (updates.categoryOptions !== undefined) {
      updateData.categoryOptions = updates.categoryOptions
        ? JSON.stringify(updates.categoryOptions)
        : null;
    }

    if (updates.accommodationCheckInDate !== undefined) updateData.accommodationCheckInDate = updates.accommodationCheckInDate ?? null;
    if (updates.accommodationCheckOutDate !== undefined) updateData.accommodationCheckOutDate = updates.accommodationCheckOutDate ?? null;
    if (updates.accommodationHotels !== undefined) {
      updateData.accommodationHotels =
        updates.accommodationHotels && updates.accommodationHotels.length > 0
          ? JSON.stringify(updates.accommodationHotels)
          : null;
    }

    if (updates.customFieldDefinitions !== undefined) {
      // Validate custom field definitions
      if (updates.customFieldDefinitions && updates.customFieldDefinitions.length > 10) {
        return c.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Maximum 10 custom fields allowed per event',
            },
          },
          400
        );
      }

      // Validate that select/multiselect fields have options
      for (const field of updates.customFieldDefinitions || []) {
        if ((field.type === 'select' || field.type === 'multiselect') && (!field.options || field.options.length === 0)) {
          return c.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: `Field "${field.label}" of type ${field.type} requires at least one option`,
              },
            },
            400
          );
        }
      }

      updateData.customFieldDefinitions = updates.customFieldDefinitions
        ? JSON.stringify(updates.customFieldDefinitions)
        : null;
    }

    let settings: typeof schema.eventGuestSettings.$inferSelect;

    if (existingSettings) {
      // Update existing settings
      const [updatedSettings] = await db
        .update(schema.eventGuestSettings)
        .set(updateData)
        .where(eq(schema.eventGuestSettings.eventId, event.id))
        .returning();
      settings = updatedSettings!;
    } else {
      // Create new settings with updates
      const [newSettings] = await db
        .insert(schema.eventGuestSettings)
        .values({
          eventId: event.id,
          enableAddress: updates.enableAddress ?? false,
          enableMealChoice: updates.enableMealChoice ?? false,
          enableAccommodation: updates.enableAccommodation ?? false,
        accommodationCheckInDate: updates.accommodationCheckInDate ?? null,
        accommodationCheckOutDate: updates.accommodationCheckOutDate ?? null,
        accommodationHotels: updates.accommodationHotels
          ? JSON.stringify(updates.accommodationHotels)
          : null,
        enablePlusOnes: updates.enablePlusOnes ?? false,
        defaultPlusOnesAllowed: updates.defaultPlusOnesAllowed ?? 0,
        enablePlusOneName: updates.enablePlusOneName ?? false,
          enableTableAssignment: updates.enableTableAssignment ?? false,
          enableTransportation: updates.enableTransportation ?? false,
          enableAccessibility: updates.enableAccessibility ?? false,
          enableCategory: updates.enableCategory ?? false,
          requiredCategory: updates.requiredCategory ?? false,
          requiredAddress: updates.requiredAddress ?? false,
          requiredMealChoice: updates.requiredMealChoice ?? false,
          requiredAccommodation: updates.requiredAccommodation ?? false,
          requiredPlusOneName: updates.requiredPlusOneName ?? false,
          requiredTableAssignment: updates.requiredTableAssignment ?? false,
          requiredTransportation: updates.requiredTransportation ?? false,
          requiredAccessibility: updates.requiredAccessibility ?? false,
          requiredFirstName: updates.requiredFirstName ?? true,
          requiredLastName: updates.requiredLastName ?? false,
          requiredEmail: updates.requiredEmail ?? false,
          requiredPhone: updates.requiredPhone ?? false,
          mealChoiceOptions: updates.mealChoiceOptions ? JSON.stringify(updates.mealChoiceOptions) : null,
          categoryOptions: updates.categoryOptions ? JSON.stringify(updates.categoryOptions) : null,
          customFieldDefinitions: updates.customFieldDefinitions ? JSON.stringify(updates.customFieldDefinitions) : null,
        })
        .returning();
      settings = newSettings!;
    }

    // Parse JSON fields for response
    let mealChoiceOptions = null;
    if (settings.mealChoiceOptions) {
      try {
        mealChoiceOptions = JSON.parse(settings.mealChoiceOptions);
      } catch {
        mealChoiceOptions = null;
      }
    }

    let accommodationHotels = null;
    if (settings.accommodationHotels) {
      try {
        accommodationHotels = JSON.parse(settings.accommodationHotels);
      } catch {
        accommodationHotels = null;
      }
    }

    let customFieldDefinitions = null;
    if (settings.customFieldDefinitions) {
      try {
        customFieldDefinitions = JSON.parse(settings.customFieldDefinitions);
      } catch {
        customFieldDefinitions = null;
      }
    }

    let categoryOptions = null;
    if (settings.categoryOptions) {
      try {
        categoryOptions = JSON.parse(settings.categoryOptions);
      } catch {
        categoryOptions = null;
      }
    }
    if (settings.enableCategory && (!categoryOptions || categoryOptions.length === 0)) {
      categoryOptions = DEFAULT_CATEGORY_OPTIONS;
    }

    return c.json({
      success: true,
      data: {
        id: settings.id,
        eventId: settings.eventId,
        enableAddress: settings.enableAddress,
        enableMealChoice: settings.enableMealChoice,
        enableAccommodation: settings.enableAccommodation,
        enablePlusOnes: settings.enablePlusOnes,
        defaultPlusOnesAllowed: settings.defaultPlusOnesAllowed,
        enablePlusOneName: settings.enablePlusOneName,
        enableTableAssignment: settings.enableTableAssignment,
        enableTransportation: settings.enableTransportation,
        enableAccessibility: settings.enableAccessibility,
        enableCategory: settings.enableCategory,
        requiredAddress: settings.requiredAddress,
        requiredMealChoice: settings.requiredMealChoice,
        requiredAccommodation: settings.requiredAccommodation,
        requiredPlusOneName: settings.requiredPlusOneName,
        requiredTableAssignment: settings.requiredTableAssignment,
        requiredTransportation: settings.requiredTransportation,
        requiredAccessibility: settings.requiredAccessibility,
        requiredCategory: settings.requiredCategory,
        requiredFirstName: settings.requiredFirstName,
        requiredLastName: settings.requiredLastName,
        requiredEmail: settings.requiredEmail,
        requiredPhone: settings.requiredPhone,
        mealChoiceOptions,
        categoryOptions,
        accommodationCheckInDate: settings.accommodationCheckInDate ?? null,
        accommodationCheckOutDate: settings.accommodationCheckOutDate ?? null,
        accommodationHotels,
        customFieldDefinitions,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    });
  }
);

// ==================== RSVP SETTINGS ENDPOINTS ====================

const rsvpFormFieldsSchema = z.object({
  dietaryRestrictions: z.boolean().optional(),
  mealChoice: z.boolean().optional(),
  notes: z.boolean().optional(),
  address: z.boolean().optional(),
  transportation: z.boolean().optional(),
  accessibility: z.boolean().optional(),
  customFields: z.record(z.string(), z.boolean()).optional(),
}).optional();

const updateRsvpSettingsSchema = z.object({
  enableRsvp: z.boolean().optional(),
  allowMaybeResponse: z.boolean().optional(),
  rsvpDeadline: z.coerce.date().optional().nullable(),
  rsvpConfirmationMessage: z.string().max(500).optional().nullable(),
  allowRsvpUpdate: z.boolean().optional(),
  allowRsvpPlusOnes: z.boolean().optional(),
  sendRsvpInvitation: z.boolean().optional(),
  sendRsvpConfirmation: z.boolean().optional(),
  rsvpLinkExpiryHours: z.coerce.number().int().min(1).max(720).optional(),
  rsvpFormFields: rsvpFormFieldsSchema,
});

/**
 * GET /events/:uuid/rsvp-settings
 * Get RSVP settings for an event
 */
events.get('/:uuid/rsvp-settings', requireAuth, async (c) => {
  const user = c.get('user')!;
  const uuid = c.req.param('uuid');

  const db = createDbClient(c.env.DB);

  const [event] = await db
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.uuid, uuid),
        eq(schema.events.userId, user.id),
        isNull(schema.events.deletedAt)
      )
    )
    .limit(1);

  if (!event) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  let [settings] = await db
    .select()
    .from(schema.eventRsvpSettings)
    .where(eq(schema.eventRsvpSettings.eventId, event.id))
    .limit(1);

  if (!settings) {
    const [newSettings] = await db
      .insert(schema.eventRsvpSettings)
      .values({ eventId: event.id })
      .returning();
    settings = newSettings!;
  }

  // Parse rsvpFormFields JSON
  let rsvpFormFields: Record<string, boolean> | null = null;
  if (settings.rsvpFormFields) {
    try { rsvpFormFields = JSON.parse(settings.rsvpFormFields); } catch { /* ignore */ }
  }

  return c.json({
    success: true,
    data: { ...settings, rsvpFormFields },
  });
});

/**
 * PATCH /events/:uuid/rsvp-settings
 * Update RSVP settings for an event
 */
events.patch(
  '/:uuid/rsvp-settings',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', updateRsvpSettingsSchema),
  async (c) => {
    const user = c.get('user')!;
    const uuid = c.req.param('uuid');
    const updates = c.req.valid('json');

    const db = createDbClient(c.env.DB);

    const [event] = await db
      .select({ id: schema.events.id })
      .from(schema.events)
      .where(
        and(
          eq(schema.events.uuid, uuid),
          eq(schema.events.userId, user.id),
          isNull(schema.events.deletedAt)
        )
      )
      .limit(1);

    if (!event) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        404
      );
    }

    const [existingSettings] = await db
      .select({ id: schema.eventRsvpSettings.id, rsvpFormFields: schema.eventRsvpSettings.rsvpFormFields })
      .from(schema.eventRsvpSettings)
      .where(eq(schema.eventRsvpSettings.eventId, event.id))
      .limit(1);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.enableRsvp !== undefined) updateData.enableRsvp = updates.enableRsvp;
    if (updates.allowMaybeResponse !== undefined) updateData.allowMaybeResponse = updates.allowMaybeResponse;
    if (updates.rsvpDeadline !== undefined) updateData.rsvpDeadline = updates.rsvpDeadline;
    if (updates.rsvpConfirmationMessage !== undefined) updateData.rsvpConfirmationMessage = updates.rsvpConfirmationMessage;
    if (updates.allowRsvpUpdate !== undefined) updateData.allowRsvpUpdate = updates.allowRsvpUpdate;
    if (updates.allowRsvpPlusOnes !== undefined) updateData.allowRsvpPlusOnes = updates.allowRsvpPlusOnes;
    if (updates.sendRsvpInvitation !== undefined) updateData.sendRsvpInvitation = updates.sendRsvpInvitation;
    if (updates.sendRsvpConfirmation !== undefined) updateData.sendRsvpConfirmation = updates.sendRsvpConfirmation;
    if (updates.rsvpLinkExpiryHours !== undefined) updateData.rsvpLinkExpiryHours = updates.rsvpLinkExpiryHours;

    // Merge rsvpFormFields with existing JSON
    if (updates.rsvpFormFields !== undefined) {
      let existing: Record<string, boolean> = {};
      if (existingSettings?.rsvpFormFields) {
        try { existing = JSON.parse(existingSettings.rsvpFormFields); } catch { /* ignore */ }
      }
      updateData.rsvpFormFields = JSON.stringify({ ...existing, ...updates.rsvpFormFields });
    }

    let settings: typeof schema.eventRsvpSettings.$inferSelect;

    if (existingSettings) {
      const [updatedSettings] = await db
        .update(schema.eventRsvpSettings)
        .set(updateData)
        .where(eq(schema.eventRsvpSettings.eventId, event.id))
        .returning();
      settings = updatedSettings!;
    } else {
      const [newSettings] = await db
        .insert(schema.eventRsvpSettings)
        .values({
          eventId: event.id,
          enableRsvp: updates.enableRsvp ?? false,
          allowMaybeResponse: updates.allowMaybeResponse ?? true,
          rsvpDeadline: updates.rsvpDeadline ?? null,
          rsvpConfirmationMessage: updates.rsvpConfirmationMessage ?? null,
          allowRsvpUpdate: updates.allowRsvpUpdate ?? true,
          allowRsvpPlusOnes: updates.allowRsvpPlusOnes ?? false,
          sendRsvpInvitation: updates.sendRsvpInvitation ?? true,
          sendRsvpConfirmation: updates.sendRsvpConfirmation ?? true,
          rsvpLinkExpiryHours: updates.rsvpLinkExpiryHours ?? 12,
          rsvpFormFields: updates.rsvpFormFields ? JSON.stringify(updates.rsvpFormFields) : null,
        })
        .returning();
      settings = newSettings!;
    }

    // Parse rsvpFormFields JSON for response
    let parsedFormFields: Record<string, boolean> | null = null;
    if (settings.rsvpFormFields) {
      try { parsedFormFields = JSON.parse(settings.rsvpFormFields); } catch { /* ignore */ }
    }

    return c.json({
      success: true,
      data: { ...settings, rsvpFormFields: parsedFormFields },
    });
  }
);

// ==================== PRIVACY SETTINGS ENDPOINTS ====================

const updatePrivacySettingsSchema = z.object({
  enablePassword: z.boolean().optional(),
  pagePassword: z.string().max(50).optional().nullable(),
  showGuestList: z.boolean().optional(),
  enableSocialPreview: z.boolean().optional(),
});

/**
 * GET /events/:uuid/privacy-settings
 * Get privacy settings for an event
 */
events.get('/:uuid/privacy-settings', requireAuth, async (c) => {
  const user = c.get('user')!;
  const uuid = c.req.param('uuid');

  const db = createDbClient(c.env.DB);

  const [event] = await db
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.uuid, uuid),
        eq(schema.events.userId, user.id),
        isNull(schema.events.deletedAt)
      )
    )
    .limit(1);

  if (!event) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  let [settings] = await db
    .select()
    .from(schema.eventPrivacySettings)
    .where(eq(schema.eventPrivacySettings.eventId, event.id))
    .limit(1);

  if (!settings) {
    const [newSettings] = await db
      .insert(schema.eventPrivacySettings)
      .values({ eventId: event.id })
      .returning();
    settings = newSettings!;
  }

  return c.json({
    success: true,
    data: settings,
  });
});

/**
 * PATCH /events/:uuid/privacy-settings
 * Update privacy settings for an event
 */
events.patch(
  '/:uuid/privacy-settings',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', updatePrivacySettingsSchema),
  async (c) => {
    const user = c.get('user')!;
    const uuid = c.req.param('uuid');
    const updates = c.req.valid('json');

    const db = createDbClient(c.env.DB);

    const [event] = await db
      .select({ id: schema.events.id })
      .from(schema.events)
      .where(
        and(
          eq(schema.events.uuid, uuid),
          eq(schema.events.userId, user.id),
          isNull(schema.events.deletedAt)
        )
      )
      .limit(1);

    if (!event) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        404
      );
    }

    const [existingSettings] = await db
      .select({ id: schema.eventPrivacySettings.id })
      .from(schema.eventPrivacySettings)
      .where(eq(schema.eventPrivacySettings.eventId, event.id))
      .limit(1);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.enablePassword !== undefined) updateData.enablePassword = updates.enablePassword;
    if (updates.pagePassword !== undefined) updateData.pagePassword = updates.pagePassword;
    if (updates.showGuestList !== undefined) updateData.showGuestList = updates.showGuestList;
    if (updates.enableSocialPreview !== undefined) updateData.enableSocialPreview = updates.enableSocialPreview;

    let settings: typeof schema.eventPrivacySettings.$inferSelect;

    if (existingSettings) {
      const [updatedSettings] = await db
        .update(schema.eventPrivacySettings)
        .set(updateData)
        .where(eq(schema.eventPrivacySettings.eventId, event.id))
        .returning();
      settings = updatedSettings!;
    } else {
      const [newSettings] = await db
        .insert(schema.eventPrivacySettings)
        .values({
          eventId: event.id,
          enablePassword: updates.enablePassword ?? false,
          pagePassword: updates.pagePassword ?? null,
          showGuestList: updates.showGuestList ?? false,
          enableSocialPreview: updates.enableSocialPreview ?? true,
        })
        .returning();
      settings = newSettings!;
    }

    return c.json({
      success: true,
      data: settings,
    });
  }
);

export default events;
