/**
 * RSVP Routes
 *
 * Public endpoints for guest RSVP functionality.
 * No authentication required - uses rsvpToken for identification.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull, count } from 'drizzle-orm';
import { sendRsvpConfirmationEmail, logEmail } from '@/lib/email';

const rsvp = new Hono<HonoEnv>();

// ==================== SCHEMAS ====================

const rsvpSubmitSchema = z.object({
  rsvpStatus: z.enum(['confirmed', 'declined', 'maybe']),
  plusOnesCount: z.coerce.number().int().min(0).max(10).optional(),
  plusOnesCountAdults: z.coerce.number().int().min(0).max(10).optional(),
  plusOnesCountChildren: z.coerce.number().int().min(0).max(10).optional(),
  dietaryRestrictions: z.string().max(500).optional().nullable(),
  needsAccommodation: z.boolean().optional().nullable(),
  hotelName: z.string().max(200).optional().nullable(),
  checkInDate: z.coerce.date().optional().nullable(),
  checkOutDate: z.coerce.date().optional().nullable(),
  // Configurable RSVP form fields
  mealChoice: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  addressStreet: z.string().max(200).optional().nullable(),
  addressCity: z.string().max(100).optional().nullable(),
  addressState: z.string().max(100).optional().nullable(),
  addressZipCode: z.string().max(20).optional().nullable(),
  addressCountry: z.string().max(100).optional().nullable(),
  transportationNeeded: z.boolean().optional().nullable(),
  accessibilityNeeds: z.string().max(500).optional().nullable(),
  customFieldData: z.record(z.unknown()).optional().nullable(),
});

// ==================== ROUTES ====================

/**
 * GET /rsvp/:token
 * Get RSVP page data (event info + guest info + rsvp settings flags)
 */
rsvp.get('/:token', async (c) => {
  const token = c.req.param('token');

  const db = createDbClient(c.env.DB);

  // Find guest by token
  const [guest] = await db
    .select({
      id: schema.guests.id,
      uuid: schema.guests.uuid,
      eventId: schema.guests.eventId,
      firstName: schema.guests.firstName,
      lastName: schema.guests.lastName,
      email: schema.guests.email,
      rsvpStatus: schema.guests.rsvpStatus,
      rsvpTokenExpiresAt: schema.guests.rsvpTokenExpiresAt,
      rsvpRespondedAt: schema.guests.rsvpRespondedAt,
      plusOnesAllowed: schema.guests.plusOnesAllowed,
      plusOnesCount: schema.guests.plusOnesCount,
      plusOnesCountAdults: schema.guests.plusOnesCountAdults,
      plusOnesCountChildren: schema.guests.plusOnesCountChildren,
      dietaryRestrictions: schema.guests.dietaryRestrictions,
      needsAccommodation: schema.guests.needsAccommodation,
      hotelName: schema.guests.hotelName,
      checkInDate: schema.guests.checkInDate,
      checkOutDate: schema.guests.checkOutDate,
      // Configurable RSVP form fields
      mealChoice: schema.guests.mealChoice,
      notes: schema.guests.notes,
      addressStreet: schema.guests.addressStreet,
      addressCity: schema.guests.addressCity,
      addressState: schema.guests.addressState,
      addressZipCode: schema.guests.addressZipCode,
      addressCountry: schema.guests.addressCountry,
      transportationNeeded: schema.guests.transportationNeeded,
      accessibilityNeeds: schema.guests.accessibilityNeeds,
      customFieldData: schema.guests.customFieldData,
    })
    .from(schema.guests)
    .where(and(eq(schema.guests.rsvpToken, token), isNull(schema.guests.deletedAt)))
    .limit(1);

  if (!guest) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Invalid RSVP link' } },
      404
    );
  }

  // Check link expiry (before any other checks)
  if (guest.rsvpTokenExpiresAt && new Date() > new Date(guest.rsvpTokenExpiresAt)) {
    return c.json({
      success: true,
      data: { expired: true },
    });
  }

  // Get RSVP settings for enforcement flags
  const [rsvpSettings] = await db
    .select({
      enableRsvp: schema.eventRsvpSettings.enableRsvp,
      allowMaybeResponse: schema.eventRsvpSettings.allowMaybeResponse,
      rsvpDeadline: schema.eventRsvpSettings.rsvpDeadline,
      rsvpConfirmationMessage: schema.eventRsvpSettings.rsvpConfirmationMessage,
      allowRsvpUpdate: schema.eventRsvpSettings.allowRsvpUpdate,
      allowRsvpPlusOnes: schema.eventRsvpSettings.allowRsvpPlusOnes,
      rsvpFormFields: schema.eventRsvpSettings.rsvpFormFields,
    })
    .from(schema.eventRsvpSettings)
    .where(eq(schema.eventRsvpSettings.eventId, guest.eventId))
    .limit(1);

  // Get event guest settings (accommodation, meal, address, transportation, accessibility, custom fields)
  let guestSettings: {
    enableAccommodation: boolean;
    accommodationHotels: string | null;
    accommodationCheckInDate: string | null;
    accommodationCheckOutDate: string | null;
    enableMealChoice: boolean;
    mealChoiceOptions: string | null;
    enableTransportation: boolean;
    enableAccessibility: boolean;
    enableAddress: boolean;
    customFieldDefinitions: string | null;
    requiredMealChoice: boolean;
    requiredAddress: boolean;
    requiredTransportation: boolean;
    requiredAccessibility: boolean;
  } | null = null;
  const [settingsRow] = await db
    .select({
      enableAccommodation: schema.eventGuestSettings.enableAccommodation,
      accommodationHotels: schema.eventGuestSettings.accommodationHotels,
      accommodationCheckInDate: schema.eventGuestSettings.accommodationCheckInDate,
      accommodationCheckOutDate: schema.eventGuestSettings.accommodationCheckOutDate,
      enableMealChoice: schema.eventGuestSettings.enableMealChoice,
      mealChoiceOptions: schema.eventGuestSettings.mealChoiceOptions,
      enableTransportation: schema.eventGuestSettings.enableTransportation,
      enableAccessibility: schema.eventGuestSettings.enableAccessibility,
      enableAddress: schema.eventGuestSettings.enableAddress,
      customFieldDefinitions: schema.eventGuestSettings.customFieldDefinitions,
      requiredMealChoice: schema.eventGuestSettings.requiredMealChoice,
      requiredAddress: schema.eventGuestSettings.requiredAddress,
      requiredTransportation: schema.eventGuestSettings.requiredTransportation,
      requiredAccessibility: schema.eventGuestSettings.requiredAccessibility,
    })
    .from(schema.eventGuestSettings)
    .where(eq(schema.eventGuestSettings.eventId, guest.eventId))
    .limit(1);
  if (settingsRow) guestSettings = settingsRow;

  // Get event info
  const [event] = await db
    .select({
      uuid: schema.events.uuid,
      title: schema.events.title,
      description: schema.events.description,
      eventType: schema.events.eventType,
      startDate: schema.events.startDate,
      endDate: schema.events.endDate,
      timezone: schema.events.timezone,
      locationName: schema.events.locationName,
      locationAddress: schema.events.locationAddress,
      locationCity: schema.events.locationCity,
      locationState: schema.events.locationState,
      locationCountry: schema.events.locationCountry,
      coverImageUrl: schema.events.coverImageUrl,
    })
    .from(schema.events)
    .where(and(eq(schema.events.id, guest.eventId), isNull(schema.events.deletedAt)))
    .limit(1);

  if (!event) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  type HotelWithAddress = {
    id: string;
    name: string;
    streetNo?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  let accommodationHotels: Array<HotelWithAddress> | null = null;
  if (guestSettings?.accommodationHotels) {
    try {
      const parsed = JSON.parse(guestSettings.accommodationHotels);
      accommodationHotels = Array.isArray(parsed)
        ? parsed.map((h: Record<string, unknown>) => ({
            id: (h.id as string) ?? '',
            name: (h.name as string) ?? '',
            ...(h.streetNo != null && (h.streetNo as string) !== '' ? { streetNo: h.streetNo as string } : {}),
            ...(h.street != null && (h.street as string) !== '' ? { street: h.street as string } : {}),
            ...(h.city != null && (h.city as string) !== '' ? { city: h.city as string } : {}),
            ...(h.state != null && (h.state as string) !== '' ? { state: h.state as string } : {}),
            ...(h.zip != null && (h.zip as string) !== '' ? { zip: h.zip as string } : {}),
            ...(h.country != null && (h.country as string) !== '' ? { country: h.country as string } : {}),
          }))
        : null;
    } catch {
      accommodationHotels = null;
    }
  }

  // Parse rsvpFormFields JSON — default: { dietaryRestrictions: true }, all others false
  type RsvpFormFields = {
    dietaryRestrictions: boolean;
    mealChoice: boolean;
    notes: boolean;
    address: boolean;
    transportation: boolean;
    accessibility: boolean;
    customFields: Record<string, boolean>;
  };
  const defaultFormFields: Omit<RsvpFormFields, 'customFields'> & { customFields: Record<string, boolean> } = {
    dietaryRestrictions: true,
    mealChoice: false,
    notes: false,
    address: false,
    transportation: false,
    accessibility: false,
    customFields: {},
  };
  let rsvpFormFields: RsvpFormFields = { ...defaultFormFields };
  if (rsvpSettings?.rsvpFormFields) {
    try {
      const parsed = JSON.parse(rsvpSettings.rsvpFormFields);
      // Backward compat: if customFields is a boolean, convert to empty record
      const customFields = parsed.customFields && typeof parsed.customFields === 'object' && !Array.isArray(parsed.customFields)
        ? parsed.customFields as Record<string, boolean>
        : {};
      rsvpFormFields = { ...defaultFormFields, ...parsed, customFields };
    } catch { /* use defaults */ }
  }

  // Compute effective fields: rsvpFormFields toggle AND guestSettings gate (where applicable)
  const hasAnyCustomFieldEnabled = Object.values(rsvpFormFields.customFields).some(Boolean);
  const effectiveFields = {
    dietaryRestrictions: rsvpFormFields.dietaryRestrictions,
    mealChoice: rsvpFormFields.mealChoice && (guestSettings?.enableMealChoice ?? false),
    notes: rsvpFormFields.notes,
    address: rsvpFormFields.address && (guestSettings?.enableAddress ?? false),
    transportation: rsvpFormFields.transportation && (guestSettings?.enableTransportation ?? false),
    accessibility: rsvpFormFields.accessibility && (guestSettings?.enableAccessibility ?? false),
    customFields: rsvpFormFields.customFields,
  };

  // Parse JSON fields for response
  let mealChoiceOptions: Array<{ key: string; label: string }> | null = null;
  if (effectiveFields.mealChoice && guestSettings?.mealChoiceOptions) {
    try { mealChoiceOptions = JSON.parse(guestSettings.mealChoiceOptions); } catch { /* ignore */ }
  }
  // Filter custom field definitions to only include fields enabled in RSVP form
  let customFieldDefinitions: Array<Record<string, unknown>> | null = null;
  if (hasAnyCustomFieldEnabled && guestSettings?.customFieldDefinitions) {
    try {
      const allDefs: Array<Record<string, unknown>> = JSON.parse(guestSettings.customFieldDefinitions);
      customFieldDefinitions = allDefs.filter((def) => {
        const id = def.id as string;
        return id && rsvpFormFields.customFields[id] === true;
      });
      if (customFieldDefinitions.length === 0) customFieldDefinitions = null;
    } catch { /* ignore */ }
  }
  let parsedCustomFieldData: Record<string, unknown> | null = null;
  if (hasAnyCustomFieldEnabled && guest.customFieldData) {
    try { parsedCustomFieldData = JSON.parse(guest.customFieldData); } catch { /* ignore */ }
  }

  // Compute enforcement states
  const rsvpEnabled = rsvpSettings?.enableRsvp !== false; // default true if no settings row
  const deadlinePassed = rsvpSettings?.rsvpDeadline
    ? new Date(rsvpSettings.rsvpDeadline) < new Date()
    : false;
  const hasResponded = !!guest.rsvpRespondedAt;
  const allowUpdate = rsvpSettings?.allowRsvpUpdate !== false; // default true
  const canRespond = rsvpEnabled && !deadlinePassed && (!hasResponded || allowUpdate);

  return c.json({
    success: true,
    data: {
      event: {
        uuid: event.uuid,
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        startDate: event.startDate,
        endDate: event.endDate,
        timezone: event.timezone,
        locationName: event.locationName,
        locationAddress: event.locationAddress,
        locationCity: event.locationCity,
        locationState: event.locationState,
        locationCountry: event.locationCountry,
        coverImageUrl: event.coverImageUrl,
      },
      guest: {
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        rsvpStatus: guest.rsvpStatus,
        rsvpRespondedAt: guest.rsvpRespondedAt,
        plusOnesAllowed: guest.plusOnesAllowed,
        plusOnesCount: guest.plusOnesCount,
        plusOnesCountAdults: guest.plusOnesCountAdults,
        plusOnesCountChildren: guest.plusOnesCountChildren,
        dietaryRestrictions: guest.dietaryRestrictions,
        needsAccommodation: guest.needsAccommodation ?? null,
        hotelName: guest.hotelName ?? null,
        checkInDate: guest.checkInDate ?? null,
        checkOutDate: guest.checkOutDate ?? null,
        // Configurable fields
        mealChoice: guest.mealChoice ?? null,
        notes: guest.notes ?? null,
        addressStreet: guest.addressStreet ?? null,
        addressCity: guest.addressCity ?? null,
        addressState: guest.addressState ?? null,
        addressZipCode: guest.addressZipCode ?? null,
        addressCountry: guest.addressCountry ?? null,
        transportationNeeded: guest.transportationNeeded ?? null,
        accessibilityNeeds: guest.accessibilityNeeds ?? null,
        customFieldData: parsedCustomFieldData,
      },
      guestSettings: {
        enableAccommodation: guestSettings?.enableAccommodation ?? false,
        accommodationHotels: guestSettings?.enableAccommodation ? accommodationHotels : null,
        accommodationCheckInDate: guestSettings?.enableAccommodation ? (guestSettings.accommodationCheckInDate ?? null) : null,
        accommodationCheckOutDate: guestSettings?.enableAccommodation ? (guestSettings.accommodationCheckOutDate ?? null) : null,
        mealChoiceOptions,
        customFieldDefinitions,
        requiredMealChoice: guestSettings?.requiredMealChoice ?? false,
        requiredAddress: guestSettings?.requiredAddress ?? false,
        requiredTransportation: guestSettings?.requiredTransportation ?? false,
        requiredAccessibility: guestSettings?.requiredAccessibility ?? false,
      },
      rsvpSettings: {
        enabled: rsvpEnabled,
        allowMaybeResponse: rsvpSettings?.allowMaybeResponse !== false,
        rsvpDeadline: rsvpSettings?.rsvpDeadline ?? null,
        deadlinePassed,
        allowRsvpUpdate: allowUpdate,
        confirmationMessage: rsvpSettings?.rsvpConfirmationMessage ?? null,
        canRespond,
        rsvpFormFields: effectiveFields,
      },
    },
  });
});

/**
 * POST /rsvp/:token
 * Submit RSVP response
 */
rsvp.post('/:token', zValidator('json', rsvpSubmitSchema), async (c) => {
  const token = c.req.param('token');
  const data = c.req.valid('json');

  const db = createDbClient(c.env.DB);

  // Find guest by token (include current values for audit diff)
  const [guest] = await db
    .select({
      id: schema.guests.id,
      uuid: schema.guests.uuid,
      eventId: schema.guests.eventId,
      email: schema.guests.email,
      plusOnesAllowed: schema.guests.plusOnesAllowed,
      rsvpStatus: schema.guests.rsvpStatus,
      rsvpTokenExpiresAt: schema.guests.rsvpTokenExpiresAt,
      rsvpRespondedAt: schema.guests.rsvpRespondedAt,
      plusOnesCount: schema.guests.plusOnesCount,
      plusOnesCountAdults: schema.guests.plusOnesCountAdults,
      plusOnesCountChildren: schema.guests.plusOnesCountChildren,
      dietaryRestrictions: schema.guests.dietaryRestrictions,
      needsAccommodation: schema.guests.needsAccommodation,
      hotelName: schema.guests.hotelName,
      checkInDate: schema.guests.checkInDate,
      checkOutDate: schema.guests.checkOutDate,
      // Configurable fields for audit diff
      mealChoice: schema.guests.mealChoice,
      notes: schema.guests.notes,
      addressStreet: schema.guests.addressStreet,
      addressCity: schema.guests.addressCity,
      addressState: schema.guests.addressState,
      addressZipCode: schema.guests.addressZipCode,
      addressCountry: schema.guests.addressCountry,
      transportationNeeded: schema.guests.transportationNeeded,
      accessibilityNeeds: schema.guests.accessibilityNeeds,
      customFieldData: schema.guests.customFieldData,
    })
    .from(schema.guests)
    .where(and(eq(schema.guests.rsvpToken, token), isNull(schema.guests.deletedAt)))
    .limit(1);

  if (!guest) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Invalid RSVP link' } },
      404
    );
  }

  // Check link expiry
  if (guest.rsvpTokenExpiresAt && new Date() > new Date(guest.rsvpTokenExpiresAt)) {
    return c.json(
      {
        success: false,
        error: {
          code: 'RSVP_LINK_EXPIRED',
          message: 'This RSVP link has expired. Please contact the event organizer to receive a new invitation.',
        },
      },
      410
    );
  }

  // ===== ENFORCE RSVP SETTINGS =====
  const [rsvpSettings] = await db
    .select({
      enableRsvp: schema.eventRsvpSettings.enableRsvp,
      allowMaybeResponse: schema.eventRsvpSettings.allowMaybeResponse,
      rsvpDeadline: schema.eventRsvpSettings.rsvpDeadline,
      allowRsvpUpdate: schema.eventRsvpSettings.allowRsvpUpdate,
      sendRsvpConfirmation: schema.eventRsvpSettings.sendRsvpConfirmation,
      rsvpFormFields: schema.eventRsvpSettings.rsvpFormFields,
    })
    .from(schema.eventRsvpSettings)
    .where(eq(schema.eventRsvpSettings.eventId, guest.eventId))
    .limit(1);

  // Check enableRsvp
  if (rsvpSettings && !rsvpSettings.enableRsvp) {
    return c.json(
      { success: false, error: { code: 'RSVP_DISABLED', message: 'RSVP is not available for this event' } },
      403
    );
  }

  // Check rsvpDeadline
  if (rsvpSettings?.rsvpDeadline) {
    const deadline = new Date(rsvpSettings.rsvpDeadline);
    if (deadline < new Date()) {
      return c.json(
        {
          success: false,
          error: {
            code: 'RSVP_DEADLINE_PASSED',
            message: `The RSVP deadline has passed (${deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })})`,
          },
        },
        410
      );
    }
  }

  // Check allowRsvpUpdate
  if (guest.rsvpRespondedAt && rsvpSettings && !rsvpSettings.allowRsvpUpdate) {
    return c.json(
      {
        success: false,
        error: {
          code: 'RSVP_UPDATE_NOT_ALLOWED',
          message: 'You have already responded to this invitation. The organizer does not allow response updates.',
        },
      },
      403
    );
  }

  // Check allowMaybeResponse
  if (data.rsvpStatus === 'maybe' && rsvpSettings && !rsvpSettings.allowMaybeResponse) {
    return c.json(
      {
        success: false,
        error: {
          code: 'MAYBE_NOT_ALLOWED',
          message: 'The "Maybe" response is not available for this event. Please select Yes or No.',
        },
      },
      400
    );
  }

  // Resolve plus-ones: prefer adults+children if either provided, else use plusOnesCount (backward compat)
  const hasAdultsChildren =
    data.plusOnesCountAdults !== undefined || data.plusOnesCountChildren !== undefined;
  const adults = hasAdultsChildren ? (data.plusOnesCountAdults ?? 0) : (data.plusOnesCount ?? 0);
  const children = hasAdultsChildren ? (data.plusOnesCountChildren ?? 0) : 0;
  const plusOnesCount = adults + children;
  if (plusOnesCount > guest.plusOnesAllowed) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Maximum ${guest.plusOnesAllowed} plus-ones allowed`,
        },
      },
      400
    );
  }

  // Accommodation validation when provided
  let accommodationHotels: Array<{ id: string; name: string; checkInDate: string; checkOutDate: string }> | null = null;
  if (data.needsAccommodation !== undefined || data.hotelName !== undefined || data.checkInDate !== undefined || data.checkOutDate !== undefined) {
    const [settingsRow] = await db
      .select({
        enableAccommodation: schema.eventGuestSettings.enableAccommodation,
        accommodationHotels: schema.eventGuestSettings.accommodationHotels,
      })
      .from(schema.eventGuestSettings)
      .where(eq(schema.eventGuestSettings.eventId, guest.eventId))
      .limit(1);

    if (settingsRow?.enableAccommodation && settingsRow.accommodationHotels) {
      try {
        accommodationHotels = JSON.parse(settingsRow.accommodationHotels);
      } catch {
        accommodationHotels = [];
      }
      const hotelName = data.hotelName ?? guest.hotelName ?? null;
      const checkIn = data.checkInDate ?? guest.checkInDate ?? null;
      const checkOut = data.checkOutDate ?? guest.checkOutDate ?? null;
      if (checkIn && checkOut && checkOut < checkIn) {
        return c.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Check-out date must be on or after check-in date' } },
          400
        );
      }
      if (hotelName && accommodationHotels && accommodationHotels.length > 0) {
        const names = accommodationHotels.map((h) => h.name);
        if (!names.includes(hotelName)) {
          return c.json(
            { success: false, error: { code: 'VALIDATION_ERROR', message: `Hotel must be one of: ${names.join(', ')}` } },
            400
          );
        }
      }
    }
  }

  // Parse rsvpFormFields to know which fields are enabled
  type RsvpFormFields = {
    dietaryRestrictions: boolean;
    mealChoice: boolean;
    notes: boolean;
    address: boolean;
    transportation: boolean;
    accessibility: boolean;
    customFields: Record<string, boolean>;
  };
  const defaultFormFields: RsvpFormFields = {
    dietaryRestrictions: true,
    mealChoice: false,
    notes: false,
    address: false,
    transportation: false,
    accessibility: false,
    customFields: {},
  };
  let formFields: RsvpFormFields = { ...defaultFormFields };
  if (rsvpSettings?.rsvpFormFields) {
    try {
      const parsed = JSON.parse(rsvpSettings.rsvpFormFields);
      // Backward compat: if customFields is a boolean, convert to empty record
      const customFields = parsed.customFields && typeof parsed.customFields === 'object' && !Array.isArray(parsed.customFields)
        ? parsed.customFields as Record<string, boolean>
        : {};
      formFields = { ...defaultFormFields, ...parsed, customFields };
    } catch { /* use defaults */ }
  }
  const hasAnyCustomFieldEnabled = Object.values(formFields.customFields).some(Boolean);

  // Validate mealChoice against mealChoiceOptions when enabled
  if (formFields.mealChoice && data.mealChoice) {
    const [gsRow] = await db
      .select({ enableMealChoice: schema.eventGuestSettings.enableMealChoice, mealChoiceOptions: schema.eventGuestSettings.mealChoiceOptions })
      .from(schema.eventGuestSettings)
      .where(eq(schema.eventGuestSettings.eventId, guest.eventId))
      .limit(1);
    if (gsRow?.enableMealChoice && gsRow.mealChoiceOptions) {
      try {
        const options: Array<{ key: string; label: string }> = JSON.parse(gsRow.mealChoiceOptions);
        const validKeys = options.map((o) => o.key);
        if (!validKeys.includes(data.mealChoice)) {
          return c.json(
            { success: false, error: { code: 'VALIDATION_ERROR', message: `Meal choice must be one of: ${options.map((o) => o.label).join(', ')}` } },
            400
          );
        }
      } catch { /* skip validation if options are malformed */ }
    }
  }

  // ===== VALIDATE REQUIRED FIELDS (only for confirmed/maybe) =====
  if (data.rsvpStatus === 'confirmed' || data.rsvpStatus === 'maybe') {
    // Fetch guest settings for required flags
    const [gsReq] = await db
      .select({
        requiredMealChoice: schema.eventGuestSettings.requiredMealChoice,
        requiredAddress: schema.eventGuestSettings.requiredAddress,
        requiredAccessibility: schema.eventGuestSettings.requiredAccessibility,
        enableMealChoice: schema.eventGuestSettings.enableMealChoice,
        enableAddress: schema.eventGuestSettings.enableAddress,
        enableAccessibility: schema.eventGuestSettings.enableAccessibility,
        customFieldDefinitions: schema.eventGuestSettings.customFieldDefinitions,
      })
      .from(schema.eventGuestSettings)
      .where(eq(schema.eventGuestSettings.eventId, guest.eventId))
      .limit(1);

    if (gsReq) {
      const missing: string[] = [];

      if (formFields.mealChoice && gsReq.enableMealChoice && gsReq.requiredMealChoice && !data.mealChoice) {
        missing.push('Meal Choice');
      }
      if (formFields.address && gsReq.enableAddress && gsReq.requiredAddress) {
        if (!data.addressStreet && !data.addressCity) {
          missing.push('Address');
        }
      }
      if (formFields.accessibility && gsReq.enableAccessibility && gsReq.requiredAccessibility && !data.accessibilityNeeds?.trim()) {
        missing.push('Accessibility Needs');
      }

      // Validate required custom fields
      if (hasAnyCustomFieldEnabled && gsReq.customFieldDefinitions) {
        try {
          const defs: Array<{ id: string; label: string; required: boolean }> = JSON.parse(gsReq.customFieldDefinitions);
          for (const def of defs) {
            if (def.required && formFields.customFields[def.id]) {
              const val = data.customFieldData?.[def.id];
              if (val == null || val === '' || (Array.isArray(val) && val.length === 0)) {
                missing.push(def.label);
              }
            }
          }
        } catch { /* skip */ }
      }

      if (missing.length > 0) {
        return c.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: `Required fields are missing: ${missing.join(', ')}` } },
          400
        );
      }
    }
  }

  // Build audit changes for RSVP update
  const auditChanges: { field: string; from: unknown; to: unknown }[] = [];
  if (guest.rsvpStatus !== data.rsvpStatus) {
    auditChanges.push({ field: 'rsvpStatus', from: guest.rsvpStatus, to: data.rsvpStatus });
  }
  const newPlusOnes = data.rsvpStatus === 'confirmed' ? plusOnesCount : 0;
  if (guest.plusOnesCount !== newPlusOnes) {
    auditChanges.push({ field: 'plusOnesCount', from: guest.plusOnesCount, to: newPlusOnes });
  }
  if (JSON.stringify(guest.dietaryRestrictions ?? null) !== JSON.stringify(data.dietaryRestrictions ?? null)) {
    auditChanges.push({
      field: 'dietaryRestrictions',
      from: guest.dietaryRestrictions ?? null,
      to: data.dietaryRestrictions ?? null,
    });
  }
  if (data.needsAccommodation !== undefined && guest.needsAccommodation !== data.needsAccommodation) {
    auditChanges.push({ field: 'needsAccommodation', from: guest.needsAccommodation ?? null, to: data.needsAccommodation ?? null });
  }
  if (data.hotelName !== undefined && (guest.hotelName ?? null) !== (data.hotelName ?? null)) {
    auditChanges.push({ field: 'hotelName', from: guest.hotelName ?? null, to: data.hotelName ?? null });
  }
  if (data.checkInDate !== undefined && (guest.checkInDate?.getTime?.() ?? guest.checkInDate) !== (data.checkInDate?.getTime?.() ?? null)) {
    auditChanges.push({ field: 'checkInDate', from: guest.checkInDate ?? null, to: data.checkInDate ?? null });
  }
  if (data.checkOutDate !== undefined && (guest.checkOutDate?.getTime?.() ?? guest.checkOutDate) !== (data.checkOutDate?.getTime?.() ?? null)) {
    auditChanges.push({ field: 'checkOutDate', from: guest.checkOutDate ?? null, to: data.checkOutDate ?? null });
  }
  // Audit for configurable fields
  if (formFields.mealChoice && data.mealChoice !== undefined && (guest.mealChoice ?? null) !== (data.mealChoice ?? null)) {
    auditChanges.push({ field: 'mealChoice', from: guest.mealChoice ?? null, to: data.mealChoice ?? null });
  }
  if (formFields.notes && data.notes !== undefined && (guest.notes ?? null) !== (data.notes ?? null)) {
    auditChanges.push({ field: 'notes', from: guest.notes ?? null, to: data.notes ?? null });
  }
  if (formFields.transportation && data.transportationNeeded !== undefined && (guest.transportationNeeded ?? null) !== (data.transportationNeeded ?? null)) {
    auditChanges.push({ field: 'transportationNeeded', from: guest.transportationNeeded ?? null, to: data.transportationNeeded ?? null });
  }
  if (formFields.accessibility && data.accessibilityNeeds !== undefined && (guest.accessibilityNeeds ?? null) !== (data.accessibilityNeeds ?? null)) {
    auditChanges.push({ field: 'accessibilityNeeds', from: guest.accessibilityNeeds ?? null, to: data.accessibilityNeeds ?? null });
  }
  if (formFields.address) {
    for (const f of ['addressStreet', 'addressCity', 'addressState', 'addressZipCode', 'addressCountry'] as const) {
      if (data[f] !== undefined && (guest[f] ?? null) !== (data[f] ?? null)) {
        auditChanges.push({ field: f, from: guest[f] ?? null, to: data[f] ?? null });
      }
    }
  }

  const newPlusOnesAdults = data.rsvpStatus === 'confirmed' ? adults : 0;
  const newPlusOnesChildren = data.rsvpStatus === 'confirmed' ? children : 0;
  const updatePayload: Record<string, unknown> = {
    rsvpStatus: data.rsvpStatus,
    plusOnesCount: data.rsvpStatus === 'confirmed' ? plusOnesCount : 0,
    plusOnesCountAdults: newPlusOnesAdults,
    plusOnesCountChildren: newPlusOnesChildren,
    dietaryRestrictions: formFields.dietaryRestrictions ? (data.dietaryRestrictions ?? null) : undefined,
    rsvpRespondedAt: new Date(),
    updatedAt: new Date(),
  };
  // Remove undefined keys (dietaryRestrictions when disabled)
  if (updatePayload.dietaryRestrictions === undefined) delete updatePayload.dietaryRestrictions;

  if (data.needsAccommodation !== undefined) updatePayload.needsAccommodation = data.needsAccommodation;
  if (data.hotelName !== undefined) updatePayload.hotelName = data.hotelName ?? null;
  if (data.checkInDate !== undefined) updatePayload.checkInDate = data.checkInDate ?? null;
  if (data.checkOutDate !== undefined) updatePayload.checkOutDate = data.checkOutDate ?? null;

  // Configurable fields — only save when toggle is on
  if (formFields.mealChoice && data.mealChoice !== undefined) updatePayload.mealChoice = data.mealChoice ?? null;
  if (formFields.notes && data.notes !== undefined) updatePayload.notes = data.notes ?? null;
  if (formFields.transportation && data.transportationNeeded !== undefined) updatePayload.transportationNeeded = data.transportationNeeded ?? null;
  if (formFields.accessibility && data.accessibilityNeeds !== undefined) updatePayload.accessibilityNeeds = data.accessibilityNeeds ?? null;
  if (formFields.address) {
    if (data.addressStreet !== undefined) updatePayload.addressStreet = data.addressStreet ?? null;
    if (data.addressCity !== undefined) updatePayload.addressCity = data.addressCity ?? null;
    if (data.addressState !== undefined) updatePayload.addressState = data.addressState ?? null;
    if (data.addressZipCode !== undefined) updatePayload.addressZipCode = data.addressZipCode ?? null;
    if (data.addressCountry !== undefined) updatePayload.addressCountry = data.addressCountry ?? null;
  }
  if (hasAnyCustomFieldEnabled && data.customFieldData !== undefined) {
    updatePayload.customFieldData = data.customFieldData ? JSON.stringify(data.customFieldData) : null;
  }

  // Update guest RSVP
  const [updatedGuest] = await db
    .update(schema.guests)
    .set(updatePayload)
    .where(eq(schema.guests.rsvpToken, token))
    .returning({
      uuid: schema.guests.uuid,
      firstName: schema.guests.firstName,
      lastName: schema.guests.lastName,
      rsvpStatus: schema.guests.rsvpStatus,
      plusOnesCount: schema.guests.plusOnesCount,
      dietaryRestrictions: schema.guests.dietaryRestrictions,
      rsvpRespondedAt: schema.guests.rsvpRespondedAt,
    });

  if (!updatedGuest) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Failed to update RSVP' } },
      500
    );
  }

  // Sync guestCountConfirmed on the event
  const [confirmedResult] = await db
    .select({ confirmedCount: count() })
    .from(schema.guests)
    .where(and(eq(schema.guests.eventId, guest.eventId), eq(schema.guests.rsvpStatus, 'confirmed'), isNull(schema.guests.deletedAt)));
  await db
    .update(schema.events)
    .set({ guestCountConfirmed: confirmedResult?.confirmedCount ?? 0 })
    .where(eq(schema.events.id, guest.eventId));

  // Audit: record RSVP update (no userId = guest self-response)
  if (auditChanges.length > 0) {
    await db.insert(schema.guestAudit).values({
      guestId: guest.id,
      userId: null,
      action: 'update',
      details: JSON.stringify({ source: 'rsvp', changes: auditChanges }),
    });
  }

  // Send confirmation email (best-effort) — respect sendRsvpConfirmation toggle
  const shouldSendConfirmation = !rsvpSettings || rsvpSettings.sendRsvpConfirmation !== false;
  if (shouldSendConfirmation && guest.email) {
    const [eventInfo] = await db
      .select({
        title: schema.events.title,
        startDate: schema.events.startDate,
        locationName: schema.events.locationName,
      })
      .from(schema.events)
      .where(and(eq(schema.events.id, guest.eventId), isNull(schema.events.deletedAt)))
      .limit(1);

    if (eventInfo) {
      const guestName = [updatedGuest.firstName, updatedGuest.lastName].filter(Boolean).join(' ');
      const eventDate = eventInfo.startDate
        ? new Date(eventInfo.startDate).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })
        : 'TBD';

      try {
        const result = await sendRsvpConfirmationEmail(c.env, {
          to: guest.email,
          guestName,
          eventTitle: eventInfo.title,
          eventDate,
          eventLocation: eventInfo.locationName ?? null,
          rsvpStatus: data.rsvpStatus,
        });
        const actuallySent = Boolean(result.id);
        await logEmail({
          db,
          recipientEmail: guest.email,
          emailType: 'rsvp_confirmation',
          subject: `RSVP ${data.rsvpStatus === 'confirmed' ? 'Confirmed' : data.rsvpStatus === 'declined' ? 'Declined' : 'Maybe'}: ${eventInfo.title}`,
          status: actuallySent ? 'sent' : 'failed',
          resendId: result.id ?? undefined,
          errorMessage: actuallySent ? undefined : 'Email not sent (development mode or EMAIL_API_KEY not configured)',
          eventId: guest.eventId,
        });
      } catch (err) {
        console.error('Failed to send RSVP confirmation email:', err);
        await logEmail({
          db,
          recipientEmail: guest.email,
          emailType: 'rsvp_confirmation',
          subject: `RSVP confirmation: ${eventInfo.title}`,
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
          eventId: guest.eventId,
        });
      }
    }
  }

  return c.json({
    success: true,
    data: updatedGuest,
  });
});

export default rsvp;
