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
import { eq, and, isNull } from 'drizzle-orm';
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
});

// ==================== ROUTES ====================

/**
 * GET /rsvp/:token
 * Get RSVP page data (event info + guest info)
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

  // Get event guest settings (for accommodation: hotels + event-level dates)
  let guestSettings: {
    enableAccommodation: boolean;
    accommodationHotels: string | null;
    accommodationCheckInDate: string | null;
    accommodationCheckOutDate: string | null;
  } | null = null;
  const [settingsRow] = await db
    .select({
      enableAccommodation: schema.eventGuestSettings.enableAccommodation,
      accommodationHotels: schema.eventGuestSettings.accommodationHotels,
      accommodationCheckInDate: schema.eventGuestSettings.accommodationCheckInDate,
      accommodationCheckOutDate: schema.eventGuestSettings.accommodationCheckOutDate,
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
      },
      guestSettings:
        guestSettings?.enableAccommodation
          ? {
              enableAccommodation: true,
              accommodationHotels,
              accommodationCheckInDate: guestSettings.accommodationCheckInDate ?? null,
              accommodationCheckOutDate: guestSettings.accommodationCheckOutDate ?? null,
            }
          : { enableAccommodation: false, accommodationHotels: null, accommodationCheckInDate: null, accommodationCheckOutDate: null },
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
      plusOnesCount: schema.guests.plusOnesCount,
      plusOnesCountAdults: schema.guests.plusOnesCountAdults,
      plusOnesCountChildren: schema.guests.plusOnesCountChildren,
      dietaryRestrictions: schema.guests.dietaryRestrictions,
      needsAccommodation: schema.guests.needsAccommodation,
      hotelName: schema.guests.hotelName,
      checkInDate: schema.guests.checkInDate,
      checkOutDate: schema.guests.checkOutDate,
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

  const newPlusOnesAdults = data.rsvpStatus === 'confirmed' ? adults : 0;
  const newPlusOnesChildren = data.rsvpStatus === 'confirmed' ? children : 0;
  const updatePayload: Record<string, unknown> = {
    rsvpStatus: data.rsvpStatus,
    plusOnesCount: data.rsvpStatus === 'confirmed' ? plusOnesCount : 0,
    plusOnesCountAdults: newPlusOnesAdults,
    plusOnesCountChildren: newPlusOnesChildren,
    dietaryRestrictions: data.dietaryRestrictions ?? null,
    rsvpRespondedAt: new Date(),
    updatedAt: new Date(),
  };
  if (data.needsAccommodation !== undefined) updatePayload.needsAccommodation = data.needsAccommodation;
  if (data.hotelName !== undefined) updatePayload.hotelName = data.hotelName ?? null;
  if (data.checkInDate !== undefined) updatePayload.checkInDate = data.checkInDate ?? null;
  if (data.checkOutDate !== undefined) updatePayload.checkOutDate = data.checkOutDate ?? null;

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

  // Audit: record RSVP update (no userId = guest self-response)
  if (auditChanges.length > 0) {
    await db.insert(schema.guestAudit).values({
      guestId: guest.id,
      userId: null,
      action: 'update',
      details: JSON.stringify({ source: 'rsvp', changes: auditChanges }),
    });
  }

  // Send confirmation email (best-effort)
  if (guest.email) {
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
        await logEmail({
          db,
          recipientEmail: guest.email,
          emailType: 'rsvp_confirmation',
          subject: `RSVP ${data.rsvpStatus === 'confirmed' ? 'Confirmed' : data.rsvpStatus === 'declined' ? 'Declined' : 'Maybe'}: ${eventInfo.title}`,
          status: 'sent',
          resendId: result.id,
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
