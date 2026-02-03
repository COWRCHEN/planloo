/**
 * User Routes
 *
 * Endpoints for user profile management.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq } from 'drizzle-orm';
import { requireAuth, requireVerifiedEmail, requireSuperAdmin } from '@/middleware/auth';

const users = new Hono<HonoEnv>();

// Schema for updating user profile
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  image: z.string().url().optional(),
});

/**
 * GET /users
 * List all users (super admin only)
 */
users.get('/', requireAuth, requireSuperAdmin, async (c) => {
  const db = createDbClient(c.env.DB);

  const allUsers = await db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      name: schema.user.name,
      emailVerified: schema.user.emailVerified,
      image: schema.user.image,
      platformRole: schema.user.platformRole,
      isActive: schema.user.isActive,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .orderBy(schema.user.createdAt);

  return c.json({
    success: true,
    data: allUsers,
  });
});

/**
 * GET /users/:id
 * Get user by ID (super admin only, or own profile)
 */
users.get('/:id', requireAuth, async (c) => {
  const userId = c.req.param('id');
  const currentUser = c.get('user')!;

  // Only allow viewing own profile or super admin
  if (userId !== currentUser.id && currentUser.platformRole !== 'super_admin') {
    return c.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot view other users',
        },
      },
      403
    );
  }

  const db = createDbClient(c.env.DB);

  const [user] = await db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      name: schema.user.name,
      emailVerified: schema.user.emailVerified,
      image: schema.user.image,
      platformRole: schema.user.platformRole,
      phone: schema.user.phone,
      isActive: schema.user.isActive,
      createdAt: schema.user.createdAt,
      updatedAt: schema.user.updatedAt,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  if (!user) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      },
      404
    );
  }

  return c.json({
    success: true,
    data: user,
  });
});

/**
 * PATCH /users/:id
 * Update user profile (own profile only, or super admin)
 */
users.patch(
  '/:id',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', updateProfileSchema),
  async (c) => {
    const userId = c.req.param('id');
    const currentUser = c.get('user')!;
    const updates = c.req.valid('json');

    // Only allow updating own profile or super admin
    if (userId !== currentUser.id && currentUser.platformRole !== 'super_admin') {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot update other users',
          },
        },
        403
      );
    }

    const db = createDbClient(c.env.DB);

    // Check user exists
    const [existingUser] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    if (!existingUser) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        },
        404
      );
    }

    // Update user
    const [updatedUser] = await db
      .update(schema.user)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(schema.user.id, userId))
      .returning({
        id: schema.user.id,
        email: schema.user.email,
        name: schema.user.name,
        emailVerified: schema.user.emailVerified,
        image: schema.user.image,
        phone: schema.user.phone,
        platformRole: schema.user.platformRole,
        updatedAt: schema.user.updatedAt,
      });

    return c.json({
      success: true,
      data: updatedUser,
    });
  }
);

export default users;
