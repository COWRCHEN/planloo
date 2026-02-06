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

const rsvp = new Hono<HonoEnv>();

// ==================== SCHEMAS ====================

const rsvpSubmitSchema = z.object({
  rsvpStatus: z.enum(['confirmed', 'declined', 'maybe']),
  plusOnesCount: z.coerce.number().int().min(0).max(10).optional(),
  dietaryRestrictions: z.string().max(500).optional().nullable(),
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
      dietaryRestrictions: schema.guests.dietaryRestrictions,
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
        dietaryRestrictions: guest.dietaryRestrictions,
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
      plusOnesAllowed: schema.guests.plusOnesAllowed,
      rsvpStatus: schema.guests.rsvpStatus,
      plusOnesCount: schema.guests.plusOnesCount,
      dietaryRestrictions: schema.guests.dietaryRestrictions,
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

  // Validate plusOnesCount
  const plusOnesCount = data.plusOnesCount ?? 0;
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

  // Update guest RSVP
  const [updatedGuest] = await db
    .update(schema.guests)
    .set({
      rsvpStatus: data.rsvpStatus,
      plusOnesCount: data.rsvpStatus === 'confirmed' ? plusOnesCount : 0,
      dietaryRestrictions: data.dietaryRestrictions ?? null,
      rsvpRespondedAt: new Date(),
      updatedAt: new Date(),
    })
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

  // TODO: Send confirmation email
  console.log(`[RSVP] Guest ${updatedGuest.firstName} responded: ${data.rsvpStatus}`);

  return c.json({
    success: true,
    data: updatedGuest,
  });
});

export default rsvp;
