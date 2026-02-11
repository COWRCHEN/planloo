/**
 * Guests Routes
 *
 * CRUD endpoints for guest management within events.
 * Routes are scoped to /events/:eventUuid/guests
 *
 * Supports:
 * - Core guest fields (always present)
 * - Event-type-specific fields via extension tables (wedding, corporate, conference, birthday)
 * - User-configurable optional fields (address, meal, accommodation, etc.)
 * - Custom user-defined fields (Phase 3)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull, desc, asc, sql, count, like, or, inArray } from 'drizzle-orm';
import { requireAuth, requireVerifiedEmail } from '@/middleware/auth';
import { parseGuestsCsv, generateGuestsCsv } from '@/lib/csv';
import type { EventType, CustomFieldDefinition } from '@/db/types';
import { sendRsvpInvitationEmail, logEmail } from '@/lib/email';

const guests = new Hono<HonoEnv>();

// ==================== ENUMS ====================

const GUEST_CATEGORIES = ['vip', 'family', 'friend', 'colleague', 'other'] as const;
const RSVP_STATUSES = ['pending', 'invited', 'confirmed', 'declined', 'maybe'] as const;

// Event-type-specific enums
const WEDDING_GUEST_SIDES = ['bride', 'groom', 'both'] as const;
const WEDDING_INVITED_TO = ['ceremony', 'reception', 'both'] as const;
const AGE_GROUPS = ['child', 'teen', 'adult'] as const;
const ATTENDEE_TYPES = ['employee', 'client', 'vendor', 'partner', 'other'] as const;
const BADGE_TYPES = ['speaker', 'vip', 'standard', 'press', 'exhibitor', 'staff'] as const;

// ==================== SCHEMAS ====================

// Wedding fields schema
const weddingFieldsSchema = z.object({
  guestSide: z.enum(WEDDING_GUEST_SIDES).optional().nullable(),
  invitedTo: z.enum(WEDDING_INVITED_TO).optional().nullable(),
  weddingGiftDescription: z.string().max(500).optional().nullable(),
  weddingGiftThankYouSent: z.boolean().optional(),
  showerGiftDescription: z.string().max(500).optional().nullable(),
  showerGiftThankYouSent: z.boolean().optional(),
});

// Corporate fields schema
const corporateFieldsSchema = z.object({
  companyName: z.string().max(200).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  attendeeType: z.enum(ATTENDEE_TYPES).optional().nullable(),
});

// Conference fields schema
const conferenceFieldsSchema = z.object({
  badgeType: z.enum(BADGE_TYPES).optional().nullable(),
  organization: z.string().max(200).optional().nullable(),
  sessionRegistrations: z.array(z.string()).optional().nullable(),
  specialAccess: z.boolean().optional(),
  attendingDays: z.array(z.string()).optional().nullable(),
});

// Birthday fields schema
const birthdayFieldsSchema = z.object({
  relationshipToBirthdayPerson: z.string().max(100).optional().nullable(),
  ageGroup: z.enum(AGE_GROUPS).optional().nullable(),
  giftContribution: z.coerce.number().min(0).optional().nullable(),
});

// Optional fields schema (Phase 2)
const optionalFieldsSchema = z.object({
  // Address
  addressStreet: z.string().max(255).optional().nullable(),
  addressCity: z.string().max(100).optional().nullable(),
  addressState: z.string().max(100).optional().nullable(),
  addressZipCode: z.string().max(20).optional().nullable(),
  addressCountry: z.string().max(100).optional().nullable(),
  // Meal
  mealChoice: z.string().max(100).optional().nullable(),
  // Accommodation
  needsAccommodation: z.boolean().optional().nullable(),
  hotelName: z.string().max(200).optional().nullable(),
  checkInDate: z.coerce.date().optional().nullable(),
  checkOutDate: z.coerce.date().optional().nullable(),
  roomNumber: z.string().max(20).optional().nullable(),
  // Additional
  plusOneName: z.string().max(200).optional().nullable(),
  tableAssignment: z.string().max(50).optional().nullable(),
  transportationNeeded: z.boolean().optional().nullable(),
  accessibilityNeeds: z.string().max(500).optional().nullable(),
});

// Custom fields schema (Phase 3)
const customFieldDataSchema = z.record(z.string(), z.unknown()).optional().nullable();

const createGuestSchema = z
  .object({
    // Core fields
    firstName: z.string().min(1).max(100),
    lastName: z.string().max(100).optional().nullable(),
    email: z.string().email().max(255).optional().nullable(),
    phone: z.string().max(50).optional().nullable(),
    category: z.string().max(50).optional().nullable(),
    plusOnesAllowed: z.coerce.number().int().min(0).max(10).default(0),
    plusOnesCountAdults: z.coerce.number().int().min(0).max(10).optional().default(0),
    plusOnesCountChildren: z.coerce.number().int().min(0).max(10).optional().default(0),
    dietaryRestrictions: z.string().max(500).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),

    // Event-type-specific fields (nested)
    weddingDetails: weddingFieldsSchema.optional(),
    corporateDetails: corporateFieldsSchema.optional(),
    conferenceDetails: conferenceFieldsSchema.optional(),
    birthdayDetails: birthdayFieldsSchema.optional(),

    // Optional fields (flat on guest)
    ...optionalFieldsSchema.shape,

    // Custom field data
    customFieldData: customFieldDataSchema,
  })
  .refine(
    (data) => {
      const adults = data.plusOnesCountAdults ?? 0;
      const children = data.plusOnesCountChildren ?? 0;
      return adults + children <= (data.plusOnesAllowed ?? 0);
    },
    { message: 'Plus-ones adults + children must not exceed plus-ones allowed', path: ['plusOnesCountAdults'] }
  );

const updateGuestSchema = z
  .object({
    // Core fields
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().max(100).optional().nullable(),
    email: z.string().email().max(255).optional().nullable(),
    phone: z.string().max(50).optional().nullable(),
    category: z.string().max(50).optional().nullable(),
    rsvpStatus: z.enum(RSVP_STATUSES).optional(),
    plusOnesAllowed: z.coerce.number().int().min(0).max(10).optional(),
    plusOnesCountAdults: z.coerce.number().int().min(0).max(10).optional(),
    plusOnesCountChildren: z.coerce.number().int().min(0).max(10).optional(),
    dietaryRestrictions: z.string().max(500).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),

    // Event-type-specific fields (nested)
    weddingDetails: weddingFieldsSchema.optional(),
    corporateDetails: corporateFieldsSchema.optional(),
    conferenceDetails: conferenceFieldsSchema.optional(),
    birthdayDetails: birthdayFieldsSchema.optional(),

    // Optional fields (flat on guest)
    ...optionalFieldsSchema.shape,

    // Custom field data
    customFieldData: customFieldDataSchema,
  })
  .refine(
    (data) => {
      const adults = data.plusOnesCountAdults;
      const children = data.plusOnesCountChildren;
      if (adults === undefined && children === undefined) return true;
      const sum = (adults ?? 0) + (children ?? 0);
      const allowed = data.plusOnesAllowed;
      return allowed === undefined || sum <= allowed;
    },
    { message: 'Plus-ones adults + children must not exceed plus-ones allowed', path: ['plusOnesCountAdults'] }
  );

const listGuestsQuerySchema = z.object({
  // Core filters (category value is option key when enableCategory is true)
  category: z.string().max(50).optional(),
  rsvpStatus: z.enum(RSVP_STATUSES).optional(),
  search: z.string().max(100).optional(),
  checkedIn: z.enum(['true', 'false']).optional(),

  // Event-type-specific filters
  weddingGuestSide: z.enum(WEDDING_GUEST_SIDES).optional(),
  weddingInvitedTo: z.enum(WEDDING_INVITED_TO).optional(),
  attendeeType: z.enum(ATTENDEE_TYPES).optional(),
  badgeType: z.enum(BADGE_TYPES).optional(),
  ageGroup: z.enum(AGE_GROUPS).optional(),

  // Optional field filters
  needsAccommodation: z.enum(['true', 'false']).optional(),
  tableAssignment: z.string().max(50).optional(),
  transportationNeeded: z.enum(['true', 'false']).optional(),

  // Pagination and sorting
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['firstName', 'lastName', 'createdAt', 'rsvpStatus', 'tableAssignment']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/** Validate accommodation: hotelName must be in event's list (if list non-empty); checkOutDate >= checkInDate when both set */
function validateAccommodation(
  accommodationHotels: Array<{
    id: string;
    name: string;
    streetNo?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  }> | null,
  hotelName: string | null | undefined,
  checkInDate: Date | null | undefined,
  checkOutDate: Date | null | undefined
): { valid: true } | { valid: false; message: string } {
  if (checkInDate && checkOutDate && checkOutDate < checkInDate) {
    return { valid: false, message: 'Check-out date must be on or after check-in date' };
  }
  if (hotelName && accommodationHotels && accommodationHotels.length > 0) {
    const names = accommodationHotels.map((h) => h.name);
    if (!names.includes(hotelName)) {
      return { valid: false, message: `Hotel must be one of: ${names.join(', ')}` };
    }
  }
  return { valid: true };
}

// ==================== HELPERS ====================

/**
 * Verify event ownership and return event info including type
 */
async function getEventByUuidForUser(
  db: ReturnType<typeof createDbClient>,
  eventUuid: string,
  userId: string
): Promise<{ id: number; eventType: EventType } | null> {
  const [event] = await db
    .select({
      id: schema.events.id,
      eventType: schema.events.eventType,
    })
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
 * Compute the effective link expiry, capped to the RSVP deadline if set.
 */
function computeLinkExpiry(expiryHours: number, deadline: Date | null): Date {
  const computedExpiry = new Date(Date.now() + expiryHours * 3600_000);
  if (deadline && deadline < computedExpiry) {
    return deadline;
  }
  return computedExpiry;
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

/**
 * Get the appropriate extension table for an event type
 */
function getExtensionTable(eventType: EventType) {
  switch (eventType) {
    case 'wedding':
      return schema.weddingGuestDetails;
    case 'corporate':
      return schema.corporateGuestDetails;
    case 'conference':
      return schema.conferenceGuestDetails;
    case 'birthday':
      return schema.birthdayGuestDetails;
    default:
      return null;
  }
}

/**
 * Parse JSON fields from extension table data
 */
function parseExtensionData<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };
  // Parse JSON arrays for conference details
  if ('sessionRegistrations' in result && typeof result.sessionRegistrations === 'string') {
    try {
      result.sessionRegistrations = JSON.parse(result.sessionRegistrations as string);
    } catch {
      result.sessionRegistrations = [];
    }
  }
  if ('attendingDays' in result && typeof result.attendingDays === 'string') {
    try {
      result.attendingDays = JSON.parse(result.attendingDays as string);
    } catch {
      result.attendingDays = [];
    }
  }
  return result;
}

/**
 * Validate custom field data against definitions
 */
function validateCustomFieldData(
  data: Record<string, unknown> | null | undefined,
  definitions: CustomFieldDefinition[] | null
): { valid: boolean; errors: string[] } {
  if (!data) return { valid: true, errors: [] };
  if (!definitions || definitions.length === 0) return { valid: true, errors: [] };

  const errors: string[] = [];

  for (const def of definitions) {
    const value = data[def.id];

    if (def.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field "${def.label}" is required`);
      continue;
    }

    if (value !== undefined && value !== null) {
      switch (def.type) {
        case 'number':
          if (typeof value !== 'number' && isNaN(Number(value))) {
            errors.push(`Field "${def.label}" must be a number`);
          }
          break;
        case 'select':
          if (def.options && !def.options.includes(String(value))) {
            errors.push(`Field "${def.label}" must be one of: ${def.options.join(', ')}`);
          }
          break;
        case 'multiselect':
          if (Array.isArray(value)) {
            const invalid = value.filter((v) => def.options && !def.options.includes(String(v)));
            if (invalid.length > 0) {
              errors.push(`Field "${def.label}" contains invalid options`);
            }
          }
          break;
        case 'checkbox':
          if (typeof value !== 'boolean') {
            errors.push(`Field "${def.label}" must be a boolean`);
          }
          break;
        case 'date':
          if (isNaN(Date.parse(String(value)))) {
            errors.push(`Field "${def.label}" must be a valid date`);
          }
          break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ==================== ROUTES ====================

/**
 * GET /events/:eventUuid/guests
 * List guests for an event (paginated, filterable)
 * Includes event-type-specific fields from extension tables
 */
guests.get(
  '/',
  requireAuth,
  zValidator('query', listGuestsQuerySchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const query = c.req.valid('query');
    const {
      category, rsvpStatus, search, checkedIn,
      weddingGuestSide, weddingInvitedTo, attendeeType, badgeType, ageGroup,
      needsAccommodation, tableAssignment, transportationNeeded,
      limit, offset, sortBy, sortOrder
    } = query;

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

    // Optional field filters
    if (needsAccommodation !== undefined) {
      conditions.push(eq(schema.guests.needsAccommodation, needsAccommodation === 'true'));
    }
    if (tableAssignment) {
      conditions.push(eq(schema.guests.tableAssignment, tableAssignment));
    }
    if (transportationNeeded !== undefined) {
      conditions.push(eq(schema.guests.transportationNeeded, transportationNeeded === 'true'));
    }

    // Determine sort column
    const sortColumnMap = {
      firstName: schema.guests.firstName,
      lastName: schema.guests.lastName,
      createdAt: schema.guests.createdAt,
      rsvpStatus: schema.guests.rsvpStatus,
      tableAssignment: schema.guests.tableAssignment,
    };
    const sortColumn = sortColumnMap[sortBy];
    const orderFn = sortOrder === 'desc' ? desc : asc;

    // Get total count (base query without extension table filters for now)
    const [countResult] = await db
      .select({ count: count() })
      .from(schema.guests)
      .where(and(...conditions));

    // Get guests with all fields
    let guestsList = await db
      .select({
        // Core fields
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
        plusOnesCountAdults: schema.guests.plusOnesCountAdults,
        plusOnesCountChildren: schema.guests.plusOnesCountChildren,
        dietaryRestrictions: schema.guests.dietaryRestrictions,
        notes: schema.guests.notes,
        checkedIn: schema.guests.checkedIn,
        checkedInAt: schema.guests.checkedInAt,
        // Optional fields
        addressStreet: schema.guests.addressStreet,
        addressCity: schema.guests.addressCity,
        addressState: schema.guests.addressState,
        addressZipCode: schema.guests.addressZipCode,
        addressCountry: schema.guests.addressCountry,
        mealChoice: schema.guests.mealChoice,
        needsAccommodation: schema.guests.needsAccommodation,
        hotelName: schema.guests.hotelName,
        checkInDate: schema.guests.checkInDate,
        checkOutDate: schema.guests.checkOutDate,
        roomNumber: schema.guests.roomNumber,
        plusOneName: schema.guests.plusOneName,
        tableAssignment: schema.guests.tableAssignment,
        transportationNeeded: schema.guests.transportationNeeded,
        accessibilityNeeds: schema.guests.accessibilityNeeds,
        customFieldData: schema.guests.customFieldData,
        createdAt: schema.guests.createdAt,
        updatedAt: schema.guests.updatedAt,
      })
      .from(schema.guests)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    // Fetch extension table data based on event type
    const guestIds = guestsList.map((g) => g.id);
    let extensionData: Record<number, Record<string, unknown>> = {};

    if (guestIds.length > 0) {
      switch (event.eventType) {
        case 'wedding': {
          const details = await db
            .select()
            .from(schema.weddingGuestDetails)
            .where(inArray(schema.weddingGuestDetails.guestId, guestIds));
          extensionData = Object.fromEntries(details.map((d) => [d.guestId, d]));

          // Apply wedding-specific filters
          if (weddingGuestSide || weddingInvitedTo) {
            guestsList = guestsList.filter((g) => {
              const ext = extensionData[g.id] as Record<string, unknown> | undefined;
              if (!ext) return false;
              if (weddingGuestSide && ext.guestSide !== weddingGuestSide) return false;
              if (weddingInvitedTo && ext.invitedTo !== weddingInvitedTo) return false;
              return true;
            });
          }
          break;
        }
        case 'corporate': {
          const details = await db
            .select()
            .from(schema.corporateGuestDetails)
            .where(inArray(schema.corporateGuestDetails.guestId, guestIds));
          extensionData = Object.fromEntries(details.map((d) => [d.guestId, d]));

          // Apply corporate-specific filters
          if (attendeeType) {
            guestsList = guestsList.filter((g) => {
              const ext = extensionData[g.id] as Record<string, unknown> | undefined;
              return ext && ext.attendeeType === attendeeType;
            });
          }
          break;
        }
        case 'conference': {
          const details = await db
            .select()
            .from(schema.conferenceGuestDetails)
            .where(inArray(schema.conferenceGuestDetails.guestId, guestIds));
          extensionData = Object.fromEntries(details.map((d) => [d.guestId, parseExtensionData(d)]));

          // Apply conference-specific filters
          if (badgeType) {
            guestsList = guestsList.filter((g) => {
              const ext = extensionData[g.id] as Record<string, unknown> | undefined;
              return ext && ext.badgeType === badgeType;
            });
          }
          break;
        }
        case 'birthday': {
          const details = await db
            .select()
            .from(schema.birthdayGuestDetails)
            .where(inArray(schema.birthdayGuestDetails.guestId, guestIds));
          extensionData = Object.fromEntries(details.map((d) => [d.guestId, d]));

          // Apply birthday-specific filters
          if (ageGroup) {
            guestsList = guestsList.filter((g) => {
              const ext = extensionData[g.id] as Record<string, unknown> | undefined;
              return ext && ext.ageGroup === ageGroup;
            });
          }
          break;
        }
      }
    }

    // Merge extension data into guest response
    const responseData = guestsList.map((guest) => {
      const ext = extensionData[guest.id];
      // Parse customFieldData if it's a string
      let parsedCustomFieldData = null;
      if (guest.customFieldData) {
        try {
          parsedCustomFieldData = JSON.parse(guest.customFieldData);
        } catch {
          parsedCustomFieldData = null;
        }
      }

      // Get the appropriate details key based on event type
      const detailsKey = `${event.eventType}Details` as const;

      return {
        ...guest,
        customFieldData: parsedCustomFieldData,
        [detailsKey]: ext ? {
          guestSide: (ext as Record<string, unknown>).guestSide,
          invitedTo: (ext as Record<string, unknown>).invitedTo,
          weddingGiftDescription: (ext as Record<string, unknown>).weddingGiftDescription,
          weddingGiftThankYouSent: (ext as Record<string, unknown>).weddingGiftThankYouSent,
          showerGiftDescription: (ext as Record<string, unknown>).showerGiftDescription,
          showerGiftThankYouSent: (ext as Record<string, unknown>).showerGiftThankYouSent,
          companyName: (ext as Record<string, unknown>).companyName,
          jobTitle: (ext as Record<string, unknown>).jobTitle,
          department: (ext as Record<string, unknown>).department,
          attendeeType: (ext as Record<string, unknown>).attendeeType,
          badgeType: (ext as Record<string, unknown>).badgeType,
          organization: (ext as Record<string, unknown>).organization,
          sessionRegistrations: (ext as Record<string, unknown>).sessionRegistrations,
          specialAccess: (ext as Record<string, unknown>).specialAccess,
          attendingDays: (ext as Record<string, unknown>).attendingDays,
          relationshipToBirthdayPerson: (ext as Record<string, unknown>).relationshipToBirthdayPerson,
          ageGroup: (ext as Record<string, unknown>).ageGroup,
          giftContribution: (ext as Record<string, unknown>).giftContribution,
        } : null,
      };
    });

    return c.json({
      success: true,
      data: responseData,
      meta: {
        total: countResult?.count ?? 0,
        limit,
        offset,
        eventType: event.eventType,
      },
    });
  }
);

/**
 * GET /events/:eventUuid/guests/stats
 * Guest statistics for an event
 * Includes event-type-specific breakdowns
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

  // Get accommodation needs count
  const [accommodationResult] = await db
    .select({ count: count() })
    .from(schema.guests)
    .where(and(baseConditions, eq(schema.guests.needsAccommodation, true)));

  // Get transportation needs count
  const [transportationResult] = await db
    .select({ count: count() })
    .from(schema.guests)
    .where(and(baseConditions, eq(schema.guests.transportationNeeded, true)));

  // Build stats object
  const statusCounts: Record<string, number> = {};
  let total = 0;
  for (const stat of rsvpStats) {
    statusCounts[stat.rsvpStatus ?? 'pending'] = stat.count;
    total += stat.count;
  }

  // Build base stats
  const baseStats = {
    total,
    pending: statusCounts['pending'] ?? 0,
    invited: statusCounts['invited'] ?? 0,
    confirmed: statusCounts['confirmed'] ?? 0,
    declined: statusCounts['declined'] ?? 0,
    maybe: statusCounts['maybe'] ?? 0,
    checkedIn: checkedInResult?.count ?? 0,
    totalPlusOnes: plusOnesResult?.total ?? 0,
    needsAccommodation: accommodationResult?.count ?? 0,
    needsTransportation: transportationResult?.count ?? 0,
    eventType: event.eventType,
  };

  // Event-type-specific stats
  let eventTypeStats: Record<string, unknown> = {};

  // Get guest IDs for extension table queries
  const guestIds = await db
    .select({ id: schema.guests.id })
    .from(schema.guests)
    .where(baseConditions);
  const ids = guestIds.map((g) => g.id);

  if (ids.length > 0) {
    switch (event.eventType) {
      case 'wedding': {
        // Stats by wedding side
        const sideStats = await db
          .select({
            guestSide: schema.weddingGuestDetails.guestSide,
            count: count(),
          })
          .from(schema.weddingGuestDetails)
          .where(inArray(schema.weddingGuestDetails.guestId, ids))
          .groupBy(schema.weddingGuestDetails.guestSide);

        const byWeddingSide: Record<string, number> = {};
        for (const stat of sideStats) {
          byWeddingSide[stat.guestSide ?? 'unassigned'] = stat.count;
        }

        // Stats by invited to
        const invitedToStats = await db
          .select({
            invitedTo: schema.weddingGuestDetails.invitedTo,
            count: count(),
          })
          .from(schema.weddingGuestDetails)
          .where(inArray(schema.weddingGuestDetails.guestId, ids))
          .groupBy(schema.weddingGuestDetails.invitedTo);

        const byInvitedTo: Record<string, number> = {};
        for (const stat of invitedToStats) {
          byInvitedTo[stat.invitedTo ?? 'both'] = stat.count;
        }

        // Thank you cards stats
        const [thankYouStats] = await db
          .select({
            weddingThankYouSent: sql<number>`SUM(CASE WHEN ${schema.weddingGuestDetails.weddingGiftThankYouSent} = 1 THEN 1 ELSE 0 END)`,
            showerThankYouSent: sql<number>`SUM(CASE WHEN ${schema.weddingGuestDetails.showerGiftThankYouSent} = 1 THEN 1 ELSE 0 END)`,
          })
          .from(schema.weddingGuestDetails)
          .where(inArray(schema.weddingGuestDetails.guestId, ids));

        eventTypeStats = {
          byWeddingSide,
          byInvitedTo,
          thankYouCards: {
            weddingGiftSent: thankYouStats?.weddingThankYouSent ?? 0,
            showerGiftSent: thankYouStats?.showerThankYouSent ?? 0,
          },
        };
        break;
      }
      case 'corporate': {
        // Stats by attendee type
        const attendeeStats = await db
          .select({
            attendeeType: schema.corporateGuestDetails.attendeeType,
            count: count(),
          })
          .from(schema.corporateGuestDetails)
          .where(inArray(schema.corporateGuestDetails.guestId, ids))
          .groupBy(schema.corporateGuestDetails.attendeeType);

        const byAttendeeType: Record<string, number> = {};
        for (const stat of attendeeStats) {
          byAttendeeType[stat.attendeeType ?? 'other'] = stat.count;
        }

        // Stats by company (top 10)
        const companyStats = await db
          .select({
            companyName: schema.corporateGuestDetails.companyName,
            count: count(),
          })
          .from(schema.corporateGuestDetails)
          .where(inArray(schema.corporateGuestDetails.guestId, ids))
          .groupBy(schema.corporateGuestDetails.companyName)
          .orderBy(desc(count()))
          .limit(10);

        eventTypeStats = {
          byAttendeeType,
          topCompanies: companyStats.filter((s) => s.companyName).map((s) => ({
            name: s.companyName,
            count: s.count,
          })),
        };
        break;
      }
      case 'conference': {
        // Stats by badge type
        const badgeStats = await db
          .select({
            badgeType: schema.conferenceGuestDetails.badgeType,
            count: count(),
          })
          .from(schema.conferenceGuestDetails)
          .where(inArray(schema.conferenceGuestDetails.guestId, ids))
          .groupBy(schema.conferenceGuestDetails.badgeType);

        const byBadgeType: Record<string, number> = {};
        for (const stat of badgeStats) {
          byBadgeType[stat.badgeType ?? 'standard'] = stat.count;
        }

        // Special access count
        const [specialAccessResult] = await db
          .select({ count: count() })
          .from(schema.conferenceGuestDetails)
          .where(
            and(
              inArray(schema.conferenceGuestDetails.guestId, ids),
              eq(schema.conferenceGuestDetails.specialAccess, true)
            )
          );

        eventTypeStats = {
          byBadgeType,
          specialAccessCount: specialAccessResult?.count ?? 0,
        };
        break;
      }
      case 'birthday': {
        // Stats by age group
        const ageStats = await db
          .select({
            ageGroup: schema.birthdayGuestDetails.ageGroup,
            count: count(),
          })
          .from(schema.birthdayGuestDetails)
          .where(inArray(schema.birthdayGuestDetails.guestId, ids))
          .groupBy(schema.birthdayGuestDetails.ageGroup);

        const byAgeGroup: Record<string, number> = {};
        for (const stat of ageStats) {
          byAgeGroup[stat.ageGroup ?? 'adult'] = stat.count;
        }

        // Total gift contributions
        const [contributionResult] = await db
          .select({
            total: sql<number>`COALESCE(SUM(${schema.birthdayGuestDetails.giftContribution}), 0)`,
          })
          .from(schema.birthdayGuestDetails)
          .where(inArray(schema.birthdayGuestDetails.guestId, ids));

        eventTypeStats = {
          byAgeGroup,
          totalGiftContributions: contributionResult?.total ?? 0,
        };
        break;
      }
    }
  }

  return c.json({
    success: true,
    data: {
      ...baseStats,
      eventTypeStats,
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
 * Get single guest by UUID with extension table data
 */
/**
 * GET /events/:eventUuid/guests/:guestUuid/audit
 * List audit history for a guest (who created/updated and when, with field changes)
 */
guests.get('/:guestUuid/audit', requireAuth, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const guestUuid = c.req.param('guestUuid')!;

  const db = createDbClient(c.env.DB);

  const event = await getEventByUuidForUser(db, eventUuid, user.id);
  if (!event) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  const [guest] = await db
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

  if (!guest) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Guest not found' } },
      404
    );
  }

  const entries = await db
    .select({
      id: schema.guestAudit.id,
      action: schema.guestAudit.action,
      details: schema.guestAudit.details,
      createdAt: schema.guestAudit.createdAt,
      actorId: schema.guestAudit.userId,
      actorName: schema.user.name,
      actorEmail: schema.user.email,
    })
    .from(schema.guestAudit)
    .leftJoin(schema.user, eq(schema.guestAudit.userId, schema.user.id))
    .where(eq(schema.guestAudit.guestId, guest.id))
    .orderBy(desc(schema.guestAudit.createdAt));

  const data = entries.map((row) => {
    let details: { source?: string; changes?: { field: string; from: unknown; to: unknown }[] } = {};
    if (row.details) {
      try {
        details = JSON.parse(row.details) as typeof details;
      } catch {
        details = {};
      }
    }
    return {
      id: row.id,
      action: row.action,
      createdAt: row.createdAt,
      actor: row.actorId
        ? { id: row.actorId, name: row.actorName ?? null, email: row.actorEmail ?? null }
        : null,
      details,
    };
  });

  return c.json({ success: true, data });
});

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

  // Fetch extension table data based on event type
  let extensionData: Record<string, unknown> | null = null;
  const detailsKey = `${event.eventType}Details`;

  switch (event.eventType) {
    case 'wedding': {
      const [details] = await db
        .select()
        .from(schema.weddingGuestDetails)
        .where(eq(schema.weddingGuestDetails.guestId, guest.id))
        .limit(1);
      extensionData = details ?? null;
      break;
    }
    case 'corporate': {
      const [details] = await db
        .select()
        .from(schema.corporateGuestDetails)
        .where(eq(schema.corporateGuestDetails.guestId, guest.id))
        .limit(1);
      extensionData = details ?? null;
      break;
    }
    case 'conference': {
      const [details] = await db
        .select()
        .from(schema.conferenceGuestDetails)
        .where(eq(schema.conferenceGuestDetails.guestId, guest.id))
        .limit(1);
      extensionData = details ? parseExtensionData(details) : null;
      break;
    }
    case 'birthday': {
      const [details] = await db
        .select()
        .from(schema.birthdayGuestDetails)
        .where(eq(schema.birthdayGuestDetails.guestId, guest.id))
        .limit(1);
      extensionData = details ?? null;
      break;
    }
  }

  // Parse customFieldData
  let parsedCustomFieldData = null;
  if (guest.customFieldData) {
    try {
      parsedCustomFieldData = JSON.parse(guest.customFieldData);
    } catch {
      parsedCustomFieldData = null;
    }
  }

  return c.json({
    success: true,
    data: {
      ...guest,
      customFieldData: parsedCustomFieldData,
      [detailsKey]: extensionData,
    },
    meta: {
      eventType: event.eventType,
    },
  });
});

/**
 * POST /events/:eventUuid/guests
 * Create a new guest with optional extension table data
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

    // Validate custom field data if present
    if (data.customFieldData) {
      const [eventSettings] = await db
        .select({ customFieldDefinitions: schema.eventGuestSettings.customFieldDefinitions })
        .from(schema.eventGuestSettings)
        .where(eq(schema.eventGuestSettings.eventId, event.id))
        .limit(1);

      let definitions: CustomFieldDefinition[] = [];
      if (eventSettings?.customFieldDefinitions) {
        try {
          definitions = JSON.parse(eventSettings.customFieldDefinitions);
        } catch {
          definitions = [];
        }
      }

      const validation = validateCustomFieldData(data.customFieldData, definitions);
      if (!validation.valid) {
        return c.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Custom field validation failed',
              details: validation.errors,
            },
          },
          400
        );
      }
    }

    // Fetch guest settings for accommodation and category validation
    const [guestSettings] = await db
      .select({
        enableCategory: schema.eventGuestSettings.enableCategory,
        categoryOptions: schema.eventGuestSettings.categoryOptions,
        enableAccommodation: schema.eventGuestSettings.enableAccommodation,
        accommodationHotels: schema.eventGuestSettings.accommodationHotels,
      })
      .from(schema.eventGuestSettings)
      .where(eq(schema.eventGuestSettings.eventId, event.id))
      .limit(1);

    // Category: if disabled, ignore; if enabled, validate against option keys
    let effectiveCategory: string | null = data.category ?? null;
    if (!guestSettings?.enableCategory) {
      effectiveCategory = null;
    } else if (effectiveCategory !== null && effectiveCategory !== '') {
      let options: Array<{ key: string; label: string }> = [];
      if (guestSettings.categoryOptions) {
        try {
          const parsed = JSON.parse(guestSettings.categoryOptions);
          options = Array.isArray(parsed) ? parsed : [];
        } catch {
          options = [];
        }
      }
      if (options.length === 0) {
        options = [
          { key: 'vip', label: 'VIP' },
          { key: 'family', label: 'Family' },
          { key: 'friend', label: 'Friend' },
          { key: 'colleague', label: 'Colleague' },
          { key: 'other', label: 'Other' },
        ];
      }
      const validKeys = new Set(options.map((o) => o.key));
      if (!validKeys.has(effectiveCategory)) {
        return c.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid category. Must be one of: ${[...validKeys].join(', ')}`,
            },
          },
          400
        );
      }
    }

    // Validate accommodation: hotel from event list, check-out >= check-in
    if (data.needsAccommodation || data.hotelName || data.checkInDate || data.checkOutDate) {
      if (guestSettings?.enableAccommodation && guestSettings.accommodationHotels) {
        let hotels: Array<{ id: string; name: string }> = [];
        try {
          const parsed = JSON.parse(guestSettings.accommodationHotels);
          hotels = Array.isArray(parsed) ? parsed.map((h: { id?: string; name?: string }) => ({ id: h.id ?? '', name: h.name ?? '' })) : [];
        } catch {
          hotels = [];
        }
        const acc = validateAccommodation(
          hotels,
          data.hotelName ?? null,
          data.checkInDate ?? null,
          data.checkOutDate ?? null
        );
        if (!acc.valid) {
          return c.json(
            { success: false, error: { code: 'VALIDATION_ERROR', message: acc.message } },
            400
          );
        }
      } else if (data.checkInDate && data.checkOutDate && data.checkOutDate < data.checkInDate) {
        return c.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Check-out date must be on or after check-in date',
            },
          },
          400
        );
      }
    }

    const uuid = crypto.randomUUID();
    const rsvpToken = generateRsvpToken();

    // Prepare base guest data
    const guestData = {
      uuid,
      eventId: event.id,
      firstName: data.firstName,
      lastName: data.lastName ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      category: effectiveCategory,
      rsvpStatus: 'pending' as const,
      rsvpToken,
      plusOnesAllowed: data.plusOnesAllowed,
      plusOnesCount: (data.plusOnesCountAdults ?? 0) + (data.plusOnesCountChildren ?? 0),
      plusOnesCountAdults: data.plusOnesCountAdults ?? 0,
      plusOnesCountChildren: data.plusOnesCountChildren ?? 0,
      dietaryRestrictions: data.dietaryRestrictions ?? null,
      notes: data.notes ?? null,
      checkedIn: false,
      // Optional fields
      addressStreet: data.addressStreet ?? null,
      addressCity: data.addressCity ?? null,
      addressState: data.addressState ?? null,
      addressZipCode: data.addressZipCode ?? null,
      addressCountry: data.addressCountry ?? null,
      mealChoice: data.mealChoice ?? null,
      needsAccommodation: data.needsAccommodation ?? null,
      hotelName: data.hotelName ?? null,
      checkInDate: data.checkInDate ?? null,
      checkOutDate: data.checkOutDate ?? null,
      roomNumber: data.roomNumber ?? null,
      plusOneName: data.plusOneName ?? null,
      tableAssignment: data.tableAssignment ?? null,
      transportationNeeded: data.transportationNeeded ?? null,
      accessibilityNeeds: data.accessibilityNeeds ?? null,
      customFieldData: data.customFieldData ? JSON.stringify(data.customFieldData) : null,
    };

    // Insert guest
    const [newGuest] = await db
      .insert(schema.guests)
      .values(guestData)
      .returning();

    // Audit: record create
    await db.insert(schema.guestAudit).values({
      guestId: newGuest.id,
      userId: user.id,
      action: 'create',
      details: JSON.stringify({
        source: 'dashboard',
        snapshot: {
          firstName: newGuest.firstName,
          lastName: newGuest.lastName,
          email: newGuest.email,
        },
      }),
    });

    // Insert extension table data based on event type
    let extensionData: Record<string, unknown> | null = null;
    const detailsKey = `${event.eventType}Details`;

    switch (event.eventType) {
      case 'wedding': {
        if (data.weddingDetails) {
          const [details] = await db
            .insert(schema.weddingGuestDetails)
            .values({
              guestId: newGuest.id,
              guestSide: data.weddingDetails.guestSide ?? null,
              invitedTo: data.weddingDetails.invitedTo ?? 'both',
              weddingGiftDescription: data.weddingDetails.weddingGiftDescription ?? null,
              weddingGiftThankYouSent: data.weddingDetails.weddingGiftThankYouSent ?? false,
              showerGiftDescription: data.weddingDetails.showerGiftDescription ?? null,
              showerGiftThankYouSent: data.weddingDetails.showerGiftThankYouSent ?? false,
            })
            .returning();
          extensionData = details;
        }
        break;
      }
      case 'corporate': {
        if (data.corporateDetails) {
          const [details] = await db
            .insert(schema.corporateGuestDetails)
            .values({
              guestId: newGuest.id,
              companyName: data.corporateDetails.companyName ?? null,
              jobTitle: data.corporateDetails.jobTitle ?? null,
              department: data.corporateDetails.department ?? null,
              attendeeType: data.corporateDetails.attendeeType ?? null,
            })
            .returning();
          extensionData = details;
        }
        break;
      }
      case 'conference': {
        if (data.conferenceDetails) {
          const [details] = await db
            .insert(schema.conferenceGuestDetails)
            .values({
              guestId: newGuest.id,
              badgeType: data.conferenceDetails.badgeType ?? 'standard',
              organization: data.conferenceDetails.organization ?? null,
              sessionRegistrations: data.conferenceDetails.sessionRegistrations
                ? JSON.stringify(data.conferenceDetails.sessionRegistrations)
                : null,
              specialAccess: data.conferenceDetails.specialAccess ?? false,
              attendingDays: data.conferenceDetails.attendingDays
                ? JSON.stringify(data.conferenceDetails.attendingDays)
                : null,
            })
            .returning();
          extensionData = details ? parseExtensionData(details) : null;
        }
        break;
      }
      case 'birthday': {
        if (data.birthdayDetails) {
          const [details] = await db
            .insert(schema.birthdayGuestDetails)
            .values({
              guestId: newGuest.id,
              relationshipToBirthdayPerson: data.birthdayDetails.relationshipToBirthdayPerson ?? null,
              ageGroup: data.birthdayDetails.ageGroup ?? null,
              giftContribution: data.birthdayDetails.giftContribution ?? null,
            })
            .returning();
          extensionData = details;
        }
        break;
      }
    }

    // Parse customFieldData for response
    let parsedCustomFieldData = null;
    if (newGuest.customFieldData) {
      try {
        parsedCustomFieldData = JSON.parse(newGuest.customFieldData);
      } catch {
        parsedCustomFieldData = null;
      }
    }

    return c.json(
      {
        success: true,
        data: {
          ...newGuest,
          customFieldData: parsedCustomFieldData,
          [detailsKey]: extensionData,
        },
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

  // Fetch guest settings for category (and optional: only include category column when enabled)
  const [importSettings] = await db
    .select({
      enableCategory: schema.eventGuestSettings.enableCategory,
      categoryOptions: schema.eventGuestSettings.categoryOptions,
    })
    .from(schema.eventGuestSettings)
    .where(eq(schema.eventGuestSettings.eventId, event.id))
    .limit(1);

  let categoryOptionKeys: Set<string> = new Set();
  if (importSettings?.enableCategory && importSettings.categoryOptions) {
    try {
      const opts = JSON.parse(importSettings.categoryOptions) as Array<{ key: string; label: string }>;
      categoryOptionKeys = new Set(Array.isArray(opts) ? opts.map((o) => o.key) : []);
    } catch {
      categoryOptionKeys = new Set(['vip', 'family', 'friend', 'colleague', 'other']);
    }
  }
  if (importSettings?.enableCategory && categoryOptionKeys.size === 0) {
    categoryOptionKeys = new Set(['vip', 'family', 'friend', 'colleague', 'other']);
  }

  const categoryImportErrors: Array<{ row: number; message: string }> = [];
  const guestsToInsert = parseResult.guests.map((g, index) => {
    let effectiveCategory: string | null = g.category ?? null;
    if (!importSettings?.enableCategory) {
      effectiveCategory = null;
    } else if (effectiveCategory !== null && effectiveCategory !== '' && !categoryOptionKeys.has(effectiveCategory)) {
      categoryImportErrors.push({
        row: index + 2,
        message: `Invalid category: ${effectiveCategory}. Must be one of: ${[...categoryOptionKeys].join(', ')}`,
      });
      effectiveCategory = null;
    }
    return {
      uuid: crypto.randomUUID(),
      eventId: event.id,
      firstName: g.firstName,
      lastName: g.lastName ?? null,
      email: g.email ?? null,
      phone: g.phone ?? null,
      category: effectiveCategory,
      rsvpStatus: 'pending' as const,
      rsvpToken: generateRsvpToken(),
      plusOnesAllowed: g.plusOnesAllowed ?? 0,
      plusOnesCount: (g.plusOnesCountAdults ?? 0) + (g.plusOnesCountChildren ?? 0),
      plusOnesCountAdults: g.plusOnesCountAdults ?? 0,
      plusOnesCountChildren: g.plusOnesCountChildren ?? 0,
      dietaryRestrictions: g.dietaryRestrictions ?? null,
      notes: g.notes ?? null,
      checkedIn: false,
      addressStreet: g.addressStreet ?? null,
      addressCity: g.addressCity ?? null,
      addressState: g.addressState ?? null,
      addressZipCode: g.addressZipCode ?? null,
      addressCountry: g.addressCountry ?? null,
      mealChoice: g.mealChoice ?? null,
      needsAccommodation: g.needsAccommodation ?? null,
      hotelName: g.hotelName ?? null,
      checkInDate: g.checkInDate ?? null,
      checkOutDate: g.checkOutDate ?? null,
      roomNumber: g.roomNumber ?? null,
      plusOneName: g.plusOneName ?? null,
      tableAssignment: g.tableAssignment ?? null,
      transportationNeeded: g.transportationNeeded ?? null,
      accessibilityNeeds: g.accessibilityNeeds ?? null,
    };
  });

  if (categoryImportErrors.length > 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'CSV category validation failed',
          details: categoryImportErrors,
        },
      },
      400
    );
  }

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
 * Update an existing guest with extension table data
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

    // Check guest exists and load current row for audit diff
    const [currentGuest] = await db
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

    if (!currentGuest) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Guest not found' } },
        404
      );
    }

    const existingGuest = { id: currentGuest.id };

    // Validate custom field data if present
    if (updates.customFieldData) {
      const [eventSettings] = await db
        .select({ customFieldDefinitions: schema.eventGuestSettings.customFieldDefinitions })
        .from(schema.eventGuestSettings)
        .where(eq(schema.eventGuestSettings.eventId, event.id))
        .limit(1);

      let definitions: CustomFieldDefinition[] = [];
      if (eventSettings?.customFieldDefinitions) {
        try {
          definitions = JSON.parse(eventSettings.customFieldDefinitions);
        } catch {
          definitions = [];
        }
      }

      const validation = validateCustomFieldData(updates.customFieldData, definitions);
      if (!validation.valid) {
        return c.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Custom field validation failed',
              details: validation.errors,
            },
          },
          400
        );
      }
    }

    // Validate accommodation when updating hotel or dates
    const effectiveHotel = updates.hotelName !== undefined ? updates.hotelName : currentGuest.hotelName;
    const effectiveCheckIn = updates.checkInDate !== undefined ? updates.checkInDate : currentGuest.checkInDate;
    const effectiveCheckOut = updates.checkOutDate !== undefined ? updates.checkOutDate : currentGuest.checkOutDate;
    if (effectiveHotel !== undefined || effectiveCheckIn !== undefined || effectiveCheckOut !== undefined) {
      const [guestSettings] = await db
        .select({
          enableCategory: schema.eventGuestSettings.enableCategory,
          categoryOptions: schema.eventGuestSettings.categoryOptions,
          enableAccommodation: schema.eventGuestSettings.enableAccommodation,
          accommodationHotels: schema.eventGuestSettings.accommodationHotels,
        })
        .from(schema.eventGuestSettings)
        .where(eq(schema.eventGuestSettings.eventId, event.id))
        .limit(1);

      if (guestSettings?.enableAccommodation && guestSettings.accommodationHotels) {
        let hotels: Array<{ id: string; name: string }> = [];
        try {
          const parsed = JSON.parse(guestSettings.accommodationHotels);
          hotels = Array.isArray(parsed) ? parsed.map((h: { id?: string; name?: string }) => ({ id: h.id ?? '', name: h.name ?? '' })) : [];
        } catch {
          hotels = [];
        }
        const acc = validateAccommodation(
          hotels,
          effectiveHotel ?? null,
          effectiveCheckIn ?? null,
          effectiveCheckOut ?? null
        );
        if (!acc.valid) {
          return c.json(
            { success: false, error: { code: 'VALIDATION_ERROR', message: acc.message } },
            400
          );
        }
      } else if (effectiveCheckIn && effectiveCheckOut && effectiveCheckOut < effectiveCheckIn) {
        return c.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Check-out date must be on or after check-in date',
            },
          },
          400
        );
      }
    }

    // Category update: validate when enableCategory, else clear
    let effectiveCategoryUpdate: string | null | undefined = updates.category;
    if (updates.category !== undefined) {
      const [catSettings] = await db
        .select({
          enableCategory: schema.eventGuestSettings.enableCategory,
          categoryOptions: schema.eventGuestSettings.categoryOptions,
        })
        .from(schema.eventGuestSettings)
        .where(eq(schema.eventGuestSettings.eventId, event.id))
        .limit(1);
      if (!catSettings?.enableCategory) {
        effectiveCategoryUpdate = null;
      } else if (updates.category !== null && updates.category !== '') {
        let options: Array<{ key: string; label: string }> = [];
        if (catSettings.categoryOptions) {
          try {
            const parsed = JSON.parse(catSettings.categoryOptions);
            options = Array.isArray(parsed) ? parsed : [];
          } catch {
            options = [];
          }
        }
        if (options.length === 0) {
          options = [
            { key: 'vip', label: 'VIP' },
            { key: 'family', label: 'Family' },
            { key: 'friend', label: 'Friend' },
            { key: 'colleague', label: 'Colleague' },
            { key: 'other', label: 'Other' },
          ];
        }
        const validKeys = new Set(options.map((o) => o.key));
        if (!validKeys.has(updates.category)) {
          return c.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: `Invalid category. Must be one of: ${[...validKeys].join(', ')}`,
              },
            },
            400
          );
        }
      }
    }

    // Build update object for base guest table
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Core fields
    if (updates.firstName !== undefined) updateData.firstName = updates.firstName;
    if (updates.lastName !== undefined) updateData.lastName = updates.lastName;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.category !== undefined) updateData.category = effectiveCategoryUpdate;
    if (updates.rsvpStatus !== undefined) updateData.rsvpStatus = updates.rsvpStatus;
    if (updates.plusOnesAllowed !== undefined) updateData.plusOnesAllowed = updates.plusOnesAllowed;
    if (updates.plusOnesCountAdults !== undefined) updateData.plusOnesCountAdults = updates.plusOnesCountAdults;
    if (updates.plusOnesCountChildren !== undefined) updateData.plusOnesCountChildren = updates.plusOnesCountChildren;
    // When adults/children are provided, keep plusOnesCount in sync and validate against allowed
    if (updates.plusOnesCountAdults !== undefined || updates.plusOnesCountChildren !== undefined) {
      const adults = updates.plusOnesCountAdults ?? currentGuest.plusOnesCountAdults ?? 0;
      const children = updates.plusOnesCountChildren ?? currentGuest.plusOnesCountChildren ?? 0;
      const allowed = updates.plusOnesAllowed ?? currentGuest.plusOnesAllowed ?? 0;
      if (adults + children > allowed) {
        return c.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Plus-ones adults + children must not exceed plus-ones allowed',
            },
          },
          400
        );
      }
      updateData.plusOnesCount = adults + children;
    }
    if (updates.dietaryRestrictions !== undefined) updateData.dietaryRestrictions = updates.dietaryRestrictions;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    // Optional fields
    if (updates.addressStreet !== undefined) updateData.addressStreet = updates.addressStreet;
    if (updates.addressCity !== undefined) updateData.addressCity = updates.addressCity;
    if (updates.addressState !== undefined) updateData.addressState = updates.addressState;
    if (updates.addressZipCode !== undefined) updateData.addressZipCode = updates.addressZipCode;
    if (updates.addressCountry !== undefined) updateData.addressCountry = updates.addressCountry;
    if (updates.mealChoice !== undefined) updateData.mealChoice = updates.mealChoice;
    if (updates.needsAccommodation !== undefined) updateData.needsAccommodation = updates.needsAccommodation;
    if (updates.hotelName !== undefined) updateData.hotelName = updates.hotelName;
    if (updates.checkInDate !== undefined) updateData.checkInDate = updates.checkInDate;
    if (updates.checkOutDate !== undefined) updateData.checkOutDate = updates.checkOutDate;
    if (updates.roomNumber !== undefined) updateData.roomNumber = updates.roomNumber;
    if (updates.plusOneName !== undefined) updateData.plusOneName = updates.plusOneName;
    if (updates.tableAssignment !== undefined) updateData.tableAssignment = updates.tableAssignment;
    if (updates.transportationNeeded !== undefined) updateData.transportationNeeded = updates.transportationNeeded;
    if (updates.accessibilityNeeds !== undefined) updateData.accessibilityNeeds = updates.accessibilityNeeds;

    // Custom field data
    if (updates.customFieldData !== undefined) {
      updateData.customFieldData = updates.customFieldData ? JSON.stringify(updates.customFieldData) : null;
    }

    // Build audit changes (from currentGuest to updateData, excluding updatedAt)
    const auditChanges: { field: string; from: unknown; to: unknown }[] = [];
    const skipKeys = new Set(['updatedAt']);
    for (const [key, toVal] of Object.entries(updateData)) {
      if (skipKeys.has(key)) continue;
      const fromVal = (currentGuest as Record<string, unknown>)[key];
      const fromNorm = fromVal instanceof Date ? fromVal.getTime() : fromVal;
      const toNorm = toVal instanceof Date ? (toVal as Date).getTime() : toVal;
      if (fromNorm !== toNorm && JSON.stringify(fromNorm) !== JSON.stringify(toNorm)) {
        auditChanges.push({ field: key, from: fromVal ?? null, to: toVal ?? null });
      }
    }

    // Update base guest
    const [updatedGuest] = await db
      .update(schema.guests)
      .set(updateData)
      .where(eq(schema.guests.uuid, guestUuid))
      .returning();

    // Audit: record update when there were changes
    if (auditChanges.length > 0) {
      await db.insert(schema.guestAudit).values({
        guestId: currentGuest.id,
        userId: user.id,
        action: 'update',
        details: JSON.stringify({ source: 'dashboard', changes: auditChanges }),
      });
    }

    // Update extension table data based on event type
    let extensionData: Record<string, unknown> | null = null;
    const detailsKey = `${event.eventType}Details`;

    switch (event.eventType) {
      case 'wedding': {
        if (updates.weddingDetails) {
          const extUpdateData: Record<string, unknown> = { updatedAt: new Date() };
          if (updates.weddingDetails.guestSide !== undefined) extUpdateData.guestSide = updates.weddingDetails.guestSide;
          if (updates.weddingDetails.invitedTo !== undefined) extUpdateData.invitedTo = updates.weddingDetails.invitedTo;
          if (updates.weddingDetails.weddingGiftDescription !== undefined) extUpdateData.weddingGiftDescription = updates.weddingDetails.weddingGiftDescription;
          if (updates.weddingDetails.weddingGiftThankYouSent !== undefined) extUpdateData.weddingGiftThankYouSent = updates.weddingDetails.weddingGiftThankYouSent;
          if (updates.weddingDetails.showerGiftDescription !== undefined) extUpdateData.showerGiftDescription = updates.weddingDetails.showerGiftDescription;
          if (updates.weddingDetails.showerGiftThankYouSent !== undefined) extUpdateData.showerGiftThankYouSent = updates.weddingDetails.showerGiftThankYouSent;

          // Upsert: try update first, then insert if not exists
          const [existing] = await db
            .select({ id: schema.weddingGuestDetails.id })
            .from(schema.weddingGuestDetails)
            .where(eq(schema.weddingGuestDetails.guestId, existingGuest.id))
            .limit(1);

          if (existing) {
            const [details] = await db
              .update(schema.weddingGuestDetails)
              .set(extUpdateData)
              .where(eq(schema.weddingGuestDetails.guestId, existingGuest.id))
              .returning();
            extensionData = details;
          } else {
            const [details] = await db
              .insert(schema.weddingGuestDetails)
              .values({
                guestId: existingGuest.id,
                guestSide: updates.weddingDetails.guestSide ?? null,
                invitedTo: updates.weddingDetails.invitedTo ?? 'both',
                weddingGiftDescription: updates.weddingDetails.weddingGiftDescription ?? null,
                weddingGiftThankYouSent: updates.weddingDetails.weddingGiftThankYouSent ?? false,
                showerGiftDescription: updates.weddingDetails.showerGiftDescription ?? null,
                showerGiftThankYouSent: updates.weddingDetails.showerGiftThankYouSent ?? false,
              })
              .returning();
            extensionData = details;
          }
        } else {
          // Fetch existing extension data for response
          const [details] = await db
            .select()
            .from(schema.weddingGuestDetails)
            .where(eq(schema.weddingGuestDetails.guestId, existingGuest.id))
            .limit(1);
          extensionData = details ?? null;
        }
        break;
      }
      case 'corporate': {
        if (updates.corporateDetails) {
          const extUpdateData: Record<string, unknown> = { updatedAt: new Date() };
          if (updates.corporateDetails.companyName !== undefined) extUpdateData.companyName = updates.corporateDetails.companyName;
          if (updates.corporateDetails.jobTitle !== undefined) extUpdateData.jobTitle = updates.corporateDetails.jobTitle;
          if (updates.corporateDetails.department !== undefined) extUpdateData.department = updates.corporateDetails.department;
          if (updates.corporateDetails.attendeeType !== undefined) extUpdateData.attendeeType = updates.corporateDetails.attendeeType;

          const [existing] = await db
            .select({ id: schema.corporateGuestDetails.id })
            .from(schema.corporateGuestDetails)
            .where(eq(schema.corporateGuestDetails.guestId, existingGuest.id))
            .limit(1);

          if (existing) {
            const [details] = await db
              .update(schema.corporateGuestDetails)
              .set(extUpdateData)
              .where(eq(schema.corporateGuestDetails.guestId, existingGuest.id))
              .returning();
            extensionData = details;
          } else {
            const [details] = await db
              .insert(schema.corporateGuestDetails)
              .values({
                guestId: existingGuest.id,
                companyName: updates.corporateDetails.companyName ?? null,
                jobTitle: updates.corporateDetails.jobTitle ?? null,
                department: updates.corporateDetails.department ?? null,
                attendeeType: updates.corporateDetails.attendeeType ?? null,
              })
              .returning();
            extensionData = details;
          }
        } else {
          const [details] = await db
            .select()
            .from(schema.corporateGuestDetails)
            .where(eq(schema.corporateGuestDetails.guestId, existingGuest.id))
            .limit(1);
          extensionData = details ?? null;
        }
        break;
      }
      case 'conference': {
        if (updates.conferenceDetails) {
          const extUpdateData: Record<string, unknown> = { updatedAt: new Date() };
          if (updates.conferenceDetails.badgeType !== undefined) extUpdateData.badgeType = updates.conferenceDetails.badgeType;
          if (updates.conferenceDetails.organization !== undefined) extUpdateData.organization = updates.conferenceDetails.organization;
          if (updates.conferenceDetails.sessionRegistrations !== undefined) {
            extUpdateData.sessionRegistrations = updates.conferenceDetails.sessionRegistrations
              ? JSON.stringify(updates.conferenceDetails.sessionRegistrations)
              : null;
          }
          if (updates.conferenceDetails.specialAccess !== undefined) extUpdateData.specialAccess = updates.conferenceDetails.specialAccess;
          if (updates.conferenceDetails.attendingDays !== undefined) {
            extUpdateData.attendingDays = updates.conferenceDetails.attendingDays
              ? JSON.stringify(updates.conferenceDetails.attendingDays)
              : null;
          }

          const [existing] = await db
            .select({ id: schema.conferenceGuestDetails.id })
            .from(schema.conferenceGuestDetails)
            .where(eq(schema.conferenceGuestDetails.guestId, existingGuest.id))
            .limit(1);

          if (existing) {
            const [details] = await db
              .update(schema.conferenceGuestDetails)
              .set(extUpdateData)
              .where(eq(schema.conferenceGuestDetails.guestId, existingGuest.id))
              .returning();
            extensionData = details ? parseExtensionData(details) : null;
          } else {
            const [details] = await db
              .insert(schema.conferenceGuestDetails)
              .values({
                guestId: existingGuest.id,
                badgeType: updates.conferenceDetails.badgeType ?? 'standard',
                organization: updates.conferenceDetails.organization ?? null,
                sessionRegistrations: updates.conferenceDetails.sessionRegistrations
                  ? JSON.stringify(updates.conferenceDetails.sessionRegistrations)
                  : null,
                specialAccess: updates.conferenceDetails.specialAccess ?? false,
                attendingDays: updates.conferenceDetails.attendingDays
                  ? JSON.stringify(updates.conferenceDetails.attendingDays)
                  : null,
              })
              .returning();
            extensionData = details ? parseExtensionData(details) : null;
          }
        } else {
          const [details] = await db
            .select()
            .from(schema.conferenceGuestDetails)
            .where(eq(schema.conferenceGuestDetails.guestId, existingGuest.id))
            .limit(1);
          extensionData = details ? parseExtensionData(details) : null;
        }
        break;
      }
      case 'birthday': {
        if (updates.birthdayDetails) {
          const extUpdateData: Record<string, unknown> = { updatedAt: new Date() };
          if (updates.birthdayDetails.relationshipToBirthdayPerson !== undefined) extUpdateData.relationshipToBirthdayPerson = updates.birthdayDetails.relationshipToBirthdayPerson;
          if (updates.birthdayDetails.ageGroup !== undefined) extUpdateData.ageGroup = updates.birthdayDetails.ageGroup;
          if (updates.birthdayDetails.giftContribution !== undefined) extUpdateData.giftContribution = updates.birthdayDetails.giftContribution;

          const [existing] = await db
            .select({ id: schema.birthdayGuestDetails.id })
            .from(schema.birthdayGuestDetails)
            .where(eq(schema.birthdayGuestDetails.guestId, existingGuest.id))
            .limit(1);

          if (existing) {
            const [details] = await db
              .update(schema.birthdayGuestDetails)
              .set(extUpdateData)
              .where(eq(schema.birthdayGuestDetails.guestId, existingGuest.id))
              .returning();
            extensionData = details;
          } else {
            const [details] = await db
              .insert(schema.birthdayGuestDetails)
              .values({
                guestId: existingGuest.id,
                relationshipToBirthdayPerson: updates.birthdayDetails.relationshipToBirthdayPerson ?? null,
                ageGroup: updates.birthdayDetails.ageGroup ?? null,
                giftContribution: updates.birthdayDetails.giftContribution ?? null,
              })
              .returning();
            extensionData = details;
          }
        } else {
          const [details] = await db
            .select()
            .from(schema.birthdayGuestDetails)
            .where(eq(schema.birthdayGuestDetails.guestId, existingGuest.id))
            .limit(1);
          extensionData = details ?? null;
        }
        break;
      }
    }

    // Parse customFieldData for response
    let parsedCustomFieldData = null;
    if (updatedGuest.customFieldData) {
      try {
        parsedCustomFieldData = JSON.parse(updatedGuest.customFieldData);
      } catch {
        parsedCustomFieldData = null;
      }
    }

    return c.json({
      success: true,
      data: {
        ...updatedGuest,
        customFieldData: parsedCustomFieldData,
        [detailsKey]: extensionData,
      },
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
 * POST /events/:eventUuid/guests/send-invitations
 * Batch send RSVP invitations to eligible guests.
 * Sets status to 'invited' and sends emails (respecting settings).
 */
guests.post(
  '/send-invitations',
  requireAuth,
  requireVerifiedEmail,
  zValidator(
    'json',
    z.object({
      guestUuids: z.union([z.array(z.string().uuid()), z.literal('all-eligible')]),
    })
  ),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const { guestUuids } = c.req.valid('json');

    const db = createDbClient(c.env.DB);

    // Verify event ownership
    const event = await getEventByUuidForUser(db, eventUuid, user.id);
    if (!event) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        404
      );
    }

    // Check RSVP settings
    const [rsvpSettings] = await db
      .select({
        enableRsvp: schema.eventRsvpSettings.enableRsvp,
        sendRsvpInvitation: schema.eventRsvpSettings.sendRsvpInvitation,
        rsvpDeadline: schema.eventRsvpSettings.rsvpDeadline,
        rsvpLinkExpiryHours: schema.eventRsvpSettings.rsvpLinkExpiryHours,
      })
      .from(schema.eventRsvpSettings)
      .where(eq(schema.eventRsvpSettings.eventId, event.id))
      .limit(1);

    if (rsvpSettings && !rsvpSettings.enableRsvp) {
      return c.json(
        { success: false, error: { code: 'RSVP_DISABLED', message: 'RSVP is not enabled for this event. Enable it in event settings.' } },
        400
      );
    }

    // Fetch event details for email
    const [eventDetails] = await db
      .select({
        title: schema.events.title,
        startDate: schema.events.startDate,
        locationName: schema.events.locationName,
      })
      .from(schema.events)
      .where(eq(schema.events.id, event.id))
      .limit(1);

    const eventDate = eventDetails?.startDate
      ? new Date(eventDetails.startDate).toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })
      : 'TBD';

    // Compute link expiry (default 12 hours, capped to RSVP deadline)
    const expiryHours = rsvpSettings?.rsvpLinkExpiryHours ?? 12;
    const rsvpTokenExpiresAt = computeLinkExpiry(expiryHours, rsvpSettings?.rsvpDeadline ?? null);

    // Get eligible guests
    const baseConditions = [
      eq(schema.guests.eventId, event.id),
      isNull(schema.guests.deletedAt),
    ];

    // Only pending/invited are eligible
    const eligibleGuests = await db
      .select({
        id: schema.guests.id,
        uuid: schema.guests.uuid,
        firstName: schema.guests.firstName,
        lastName: schema.guests.lastName,
        email: schema.guests.email,
        rsvpStatus: schema.guests.rsvpStatus,
        rsvpToken: schema.guests.rsvpToken,
      })
      .from(schema.guests)
      .where(and(...baseConditions));

    // Filter to eligible (have email, pending or invited status)
    let targetGuests = eligibleGuests.filter(
      (g) => g.email && (g.rsvpStatus === 'pending' || g.rsvpStatus === 'invited')
    );

    // If specific UUIDs, further filter
    if (guestUuids !== 'all-eligible') {
      const uuidSet = new Set(guestUuids);
      targetGuests = targetGuests.filter((g) => uuidSet.has(g.uuid));
    }

    if (targetGuests.length === 0) {
      return c.json({
        success: true,
        data: { sent: 0, failed: [], total: 0 },
      });
    }

    const shouldSendEmail = !rsvpSettings || rsvpSettings.sendRsvpInvitation !== false;
    const results: Array<{ guestUuid: string; name: string; email: string; success: boolean; error?: string }> = [];

    for (const guest of targetGuests) {
      const guestName = [guest.firstName, guest.lastName].filter(Boolean).join(' ');

      // Update status to 'invited' and stamp link expiry
      if (guest.rsvpStatus === 'pending') {
        await db
          .update(schema.guests)
          .set({ rsvpStatus: 'invited', rsvpTokenExpiresAt, updatedAt: new Date() })
          .where(eq(schema.guests.uuid, guest.uuid));
      } else {
        // Already invited (resend scenario) — refresh the expiry
        await db
          .update(schema.guests)
          .set({ rsvpTokenExpiresAt, updatedAt: new Date() })
          .where(eq(schema.guests.uuid, guest.uuid));
      }

      if (!shouldSendEmail) {
        results.push({ guestUuid: guest.uuid, name: guestName, email: guest.email!, success: true });
        continue;
      }

      const rsvpUrl = `${c.env.FRONTEND_URL}/rsvp/${guest.rsvpToken}`;

      try {
        const result = await sendRsvpInvitationEmail(c.env, {
          to: guest.email!,
          guestName,
          eventTitle: eventDetails?.title ?? 'Event',
          eventDate,
          eventLocation: eventDetails?.locationName ?? null,
          rsvpUrl,
          rsvpDeadline: rsvpSettings?.rsvpDeadline ?? null,
          rsvpLinkExpiresAt: rsvpTokenExpiresAt,
        });
        const actuallySent = Boolean(result.id);
        results.push({
          guestUuid: guest.uuid,
          name: guestName,
          email: guest.email!,
          success: actuallySent,
          ...(actuallySent ? {} : { error: 'Email delivery failed' }),
        });
        await logEmail({
          db,
          recipientEmail: guest.email!,
          emailType: 'rsvp_invitation',
          subject: `You're invited: ${eventDetails?.title ?? 'Event'}`,
          status: actuallySent ? 'sent' : 'failed',
          resendId: result.id ?? undefined,
          errorMessage: actuallySent ? undefined : 'Email not sent',
          userId: user.id,
          eventId: event.id,
          metadata: { guestUuid: guest.uuid, eventUuid, batch: true },
        });
      } catch (err) {
        results.push({
          guestUuid: guest.uuid,
          name: guestName,
          email: guest.email!,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        await logEmail({
          db,
          recipientEmail: guest.email!,
          emailType: 'rsvp_invitation',
          subject: `You're invited: ${eventDetails?.title ?? 'Event'}`,
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
          userId: user.id,
          eventId: event.id,
          metadata: { guestUuid: guest.uuid, eventUuid, batch: true },
        });
      }
    }

    const sentCount = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success);

    return c.json({
      success: true,
      data: { sent: sentCount, failed, total: targetGuests.length },
    });
  }
);

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

  // Fetch event details for the email
  const [eventDetails] = await db
    .select({
      title: schema.events.title,
      startDate: schema.events.startDate,
      locationName: schema.events.locationName,
    })
    .from(schema.events)
    .where(eq(schema.events.id, event.id))
    .limit(1);

  const rsvpUrl = `${c.env.FRONTEND_URL}/rsvp/${guest.rsvpToken}`;
  const guestName = [guest.firstName, guest.lastName].filter(Boolean).join(' ');
  const eventDate = eventDetails?.startDate
    ? new Date(eventDetails.startDate).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : 'TBD';

    // Fetch RSVP settings to respect email toggle
    const [rsvpSettings] = await db
      .select({
        enableRsvp: schema.eventRsvpSettings.enableRsvp,
        sendRsvpInvitation: schema.eventRsvpSettings.sendRsvpInvitation,
        rsvpDeadline: schema.eventRsvpSettings.rsvpDeadline,
        rsvpLinkExpiryHours: schema.eventRsvpSettings.rsvpLinkExpiryHours,
      })
      .from(schema.eventRsvpSettings)
      .where(eq(schema.eventRsvpSettings.eventId, event.id))
      .limit(1);

    if (rsvpSettings && !rsvpSettings.enableRsvp) {
      return c.json(
        { success: false, error: { code: 'RSVP_DISABLED', message: 'RSVP is not enabled for this event. Enable it in event settings.' } },
        400
      );
    }

    // Compute link expiry (default 12 hours, capped to RSVP deadline)
    const expiryHours = rsvpSettings?.rsvpLinkExpiryHours ?? 12;
    const rsvpTokenExpiresAt = computeLinkExpiry(expiryHours, rsvpSettings?.rsvpDeadline ?? null);

    // Update status to 'invited' if currently 'pending', and always refresh expiry
    if (guest.rsvpStatus === 'pending') {
      await db
        .update(schema.guests)
        .set({ rsvpStatus: 'invited', rsvpTokenExpiresAt, updatedAt: new Date() })
        .where(eq(schema.guests.uuid, guestUuid));
    } else {
      await db
        .update(schema.guests)
        .set({ rsvpTokenExpiresAt, updatedAt: new Date() })
        .where(eq(schema.guests.uuid, guestUuid));
    }

    // Send email if the toggle is on (default: send)
    const shouldSendEmail = !rsvpSettings || rsvpSettings.sendRsvpInvitation !== false;
    let sent = true;

    if (shouldSendEmail) {
      try {
        const result = await sendRsvpInvitationEmail(c.env, {
          to: guest.email,
          guestName,
          eventTitle: eventDetails?.title ?? 'Event',
          eventDate,
          eventLocation: eventDetails?.locationName ?? null,
          rsvpUrl,
          rsvpDeadline: rsvpSettings?.rsvpDeadline ?? null,
          rsvpLinkExpiresAt: rsvpTokenExpiresAt,
        });
      const actuallySent = Boolean(result.id);
      if (!actuallySent) sent = false;
      await logEmail({
        db,
        recipientEmail: guest.email,
        emailType: 'rsvp_invitation',
        subject: `You're invited: ${eventDetails?.title ?? 'Event'}`,
        status: actuallySent ? 'sent' : 'failed',
        resendId: result.id ?? undefined,
        errorMessage: actuallySent ? undefined : 'Email not sent (development mode or EMAIL_API_KEY not configured)',
        userId: user.id,
        eventId: event.id,
        metadata: { guestUuid, eventUuid },
      });
    } catch (err) {
      sent = false;
      console.error('Failed to send RSVP invitation email:', err);
      await logEmail({
        db,
        recipientEmail: guest.email,
        emailType: 'rsvp_invitation',
        subject: `You're invited: ${eventDetails?.title ?? 'Event'}`,
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        userId: user.id,
        eventId: event.id,
        metadata: { guestUuid, eventUuid },
      });
    }
  }

  return c.json({
    success: true,
    data: { sent, email: guest.email },
  });
});

export default guests;
