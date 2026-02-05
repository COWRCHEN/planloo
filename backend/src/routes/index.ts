/**
 * API Routes Index
 *
 * Main API router that mounts all route handlers.
 */

import { Hono } from 'hono';
import type { HonoEnv } from '@/types/env';
import { authMiddleware, requireAuth } from '@/middleware/auth';
import users from './users';
import uploads from './uploads';
import events from './events';
import guests from './guests';
import rsvp from './rsvp';

const api = new Hono<HonoEnv>();

// Apply auth middleware to all routes
api.use('*', authMiddleware);

/**
 * GET /api/v1/me
 * Get current authenticated user
 */
api.get('/me', requireAuth, (c) => {
  const user = c.get('user')!;
  const session = c.get('session')!;

  return c.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        image: user.image,
        platformRole: user.platformRole,
        isActive: user.isActive,
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
    },
  });
});

// Mount route handlers
api.route('/users', users);
api.route('/uploads', uploads);
api.route('/events', events);
api.route('/events/:eventUuid/guests', guests);
api.route('/rsvp', rsvp); // Public routes (auth middleware is applied but not required)

export default api;
