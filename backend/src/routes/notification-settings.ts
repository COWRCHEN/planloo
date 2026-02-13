/**
 * Email Log Routes
 *
 * GET endpoint for per-event email history.
 * Mounted under /events/:eventUuid/email-log
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { requireAuth, requireVerifiedEmail } from '@/middleware/auth';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, desc, count } from 'drizzle-orm';
import { resolveEventAccess } from '@/lib/event-access';

const emailLogRoutes = new Hono<HonoEnv>();

const emailLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /
 * List email log entries for this event, most recent first.
 */
emailLogRoutes.get(
  '/',
  requireAuth,
  requireVerifiedEmail,
  zValidator('query', emailLogQuerySchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const { limit, offset } = c.req.valid('query');
    const db = createDbClient(c.env.DB);

    // Verify event access
    const access = await resolveEventAccess(db, eventUuid, user.id);
    if (!access) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        404
      );
    }
    const event = { id: access.event.id };

    const [countResult] = await db
      .select({ count: count() })
      .from(schema.emailLog)
      .where(eq(schema.emailLog.eventId, event.id));

    const logs = await db
      .select({
        id: schema.emailLog.id,
        recipientEmail: schema.emailLog.recipientEmail,
        emailType: schema.emailLog.emailType,
        subject: schema.emailLog.subject,
        status: schema.emailLog.status,
        errorMessage: schema.emailLog.errorMessage,
        createdAt: schema.emailLog.createdAt,
      })
      .from(schema.emailLog)
      .where(eq(schema.emailLog.eventId, event.id))
      .orderBy(desc(schema.emailLog.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      success: true,
      data: logs,
      meta: {
        total: countResult?.count ?? 0,
        limit,
        offset,
      },
    });
  }
);

export default emailLogRoutes;
