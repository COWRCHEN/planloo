/**
 * Notification Settings Routes
 *
 * GET/PATCH endpoints for per-user notification preferences.
 * Follows 1:1 settings pattern: auto-create on first GET, upsert on PATCH.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { requireAuth, requireVerifiedEmail } from '@/middleware/auth';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, desc, count } from 'drizzle-orm';

const notificationSettings = new Hono<HonoEnv>();

// ==================== SCHEMAS ====================

const updateSchema = z.object({
  emailWelcome: z.boolean().optional(),
  emailRsvpReceived: z.boolean().optional(),
  emailRsvpInvitation: z.boolean().optional(),
  emailRsvpConfirmation: z.boolean().optional(),
});

// ==================== ROUTES ====================

/**
 * GET /
 * Get current user's notification settings. Auto-creates with defaults if missing.
 */
notificationSettings.get('/', requireAuth, requireVerifiedEmail, async (c) => {
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  let [settings] = await db
    .select()
    .from(schema.notificationSettings)
    .where(eq(schema.notificationSettings.userId, user.id))
    .limit(1);

  if (!settings) {
    const [created] = await db
      .insert(schema.notificationSettings)
      .values({ userId: user.id })
      .returning();
    settings = created;
  }

  if (!settings) {
    return c.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create notification settings' } },
      500
    );
  }

  return c.json({
    success: true,
    data: {
      emailWelcome: settings.emailWelcome,
      emailRsvpReceived: settings.emailRsvpReceived,
      emailRsvpInvitation: settings.emailRsvpInvitation,
      emailRsvpConfirmation: settings.emailRsvpConfirmation,
      updatedAt: settings.updatedAt,
    },
  });
});

/**
 * PATCH /
 * Update current user's notification settings (upsert).
 */
notificationSettings.patch(
  '/',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', updateSchema),
  async (c) => {
    const user = c.get('user')!;
    const data = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    // Check if row exists
    const [existing] = await db
      .select({ id: schema.notificationSettings.id })
      .from(schema.notificationSettings)
      .where(eq(schema.notificationSettings.userId, user.id))
      .limit(1);

    let settings;
    if (existing) {
      const [updated] = await db
        .update(schema.notificationSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.notificationSettings.userId, user.id))
        .returning();
      settings = updated;
    } else {
      const [created] = await db
        .insert(schema.notificationSettings)
        .values({ userId: user.id, ...data })
        .returning();
      settings = created;
    }

    if (!settings) {
      return c.json(
        { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update notification settings' } },
        500
      );
    }

    return c.json({
      success: true,
      data: {
        emailWelcome: settings.emailWelcome,
        emailRsvpReceived: settings.emailRsvpReceived,
        emailRsvpInvitation: settings.emailRsvpInvitation,
        emailRsvpConfirmation: settings.emailRsvpConfirmation,
        updatedAt: settings.updatedAt,
      },
    });
  }
);

// ==================== EMAIL LOG ====================

const emailLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /email-log
 * List email log entries for the current user, most recent first.
 */
notificationSettings.get(
  '/email-log',
  requireAuth,
  requireVerifiedEmail,
  zValidator('query', emailLogQuerySchema),
  async (c) => {
    const user = c.get('user')!;
    const { limit, offset } = c.req.valid('query');
    const db = createDbClient(c.env.DB);

    const [countResult] = await db
      .select({ count: count() })
      .from(schema.emailLog)
      .where(eq(schema.emailLog.userId, user.id));

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
      .where(eq(schema.emailLog.userId, user.id))
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

export default notificationSettings;
