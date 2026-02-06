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

/**
 * Update guest settings schema
 */
const updateGuestSettingsSchema = z.object({
  // Field toggles
  enableAddress: z.boolean().optional(),
  enableMealChoice: z.boolean().optional(),
  enableAccommodation: z.boolean().optional(),
  enablePlusOneName: z.boolean().optional(),
  enableTableAssignment: z.boolean().optional(),
  enableTransportation: z.boolean().optional(),
  enableAccessibility: z.boolean().optional(),
  // Meal options
  mealChoiceOptions: z.array(mealChoiceOptionSchema).max(20).optional(),
  // Custom field definitions (max 10)
  customFieldDefinitions: z.array(customFieldDefinitionSchema).max(10).optional(),
});

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
        enablePlusOneName: false,
        enableTableAssignment: false,
        enableTransportation: false,
        enableAccessibility: false,
        mealChoiceOptions: null,
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

  return c.json({
    success: true,
    data: {
      id: settings!.id,
      eventId: settings!.eventId,
      eventType: event.eventType,
      enableAddress: settings!.enableAddress,
      enableMealChoice: settings!.enableMealChoice,
      enableAccommodation: settings!.enableAccommodation,
      enablePlusOneName: settings!.enablePlusOneName,
      enableTableAssignment: settings!.enableTableAssignment,
      enableTransportation: settings!.enableTransportation,
      enableAccessibility: settings!.enableAccessibility,
      mealChoiceOptions,
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
    if (updates.enablePlusOneName !== undefined) updateData.enablePlusOneName = updates.enablePlusOneName;
    if (updates.enableTableAssignment !== undefined) updateData.enableTableAssignment = updates.enableTableAssignment;
    if (updates.enableTransportation !== undefined) updateData.enableTransportation = updates.enableTransportation;
    if (updates.enableAccessibility !== undefined) updateData.enableAccessibility = updates.enableAccessibility;

    if (updates.mealChoiceOptions !== undefined) {
      updateData.mealChoiceOptions = updates.mealChoiceOptions
        ? JSON.stringify(updates.mealChoiceOptions)
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
          enablePlusOneName: updates.enablePlusOneName ?? false,
          enableTableAssignment: updates.enableTableAssignment ?? false,
          enableTransportation: updates.enableTransportation ?? false,
          enableAccessibility: updates.enableAccessibility ?? false,
          mealChoiceOptions: updates.mealChoiceOptions ? JSON.stringify(updates.mealChoiceOptions) : null,
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

    let customFieldDefinitions = null;
    if (settings.customFieldDefinitions) {
      try {
        customFieldDefinitions = JSON.parse(settings.customFieldDefinitions);
      } catch {
        customFieldDefinitions = null;
      }
    }

    return c.json({
      success: true,
      data: {
        id: settings.id,
        eventId: settings.eventId,
        enableAddress: settings.enableAddress,
        enableMealChoice: settings.enableMealChoice,
        enableAccommodation: settings.enableAccommodation,
        enablePlusOneName: settings.enablePlusOneName,
        enableTableAssignment: settings.enableTableAssignment,
        enableTransportation: settings.enableTransportation,
        enableAccessibility: settings.enableAccessibility,
        mealChoiceOptions,
        customFieldDefinitions,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    });
  }
);

export default events;
