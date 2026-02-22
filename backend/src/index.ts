/**
 * Planloo API - Entry Point
 *
 * Hono application for Cloudflare Workers with Better Auth and API routes.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { lt } from 'drizzle-orm';
import type { Env, HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { createAuth } from '@/lib/auth';
import { authRateLimiters, rsvpLimiter, uploadLimiter } from '@/middleware/rate-limit';
import api from '@/routes';

const app = new Hono<HonoEnv>();

// Global middleware
app.use('*', logger());

// Use permissive CORP for file uploads endpoint
app.use('/api/v1/uploads/files/*', secureHeaders({
  crossOriginResourcePolicy: 'cross-origin',
}));

// Standard secure headers for everything else
app.use('*', secureHeaders());

// CORS configuration
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const frontendUrl = c.env.FRONTEND_URL;

      // Allow requests from frontend
      if (origin === frontendUrl) {
        return origin;
      }

      // Allow localhost in development
      if (
        c.env.ENVIRONMENT === 'development' &&
        (origin?.startsWith('http://localhost:') ||
          origin?.startsWith('http://127.0.0.1:'))
      ) {
        return origin;
      }

      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    credentials: true,
    maxAge: 86400,
  })
);

/**
 * Health check endpoint
 */
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Rate limiting for auth endpoints
 */
app.use('/api/v1/auth/sign-up/*', authRateLimiters.signUp);
app.use('/api/v1/auth/sign-in/email', authRateLimiters.signIn);
app.use('/api/v1/auth/forget-password', authRateLimiters.forgotPassword);

/**
 * Rate limiting for public/upload endpoints
 */
app.use('/api/v1/rsvp/*', rsvpLimiter);
app.use('/api/v1/uploads/*', uploadLimiter);

/**
 * Better Auth handler
 *
 * Handles all authentication routes at /api/v1/auth/*
 * Must create auth instance per-request due to Cloudflare Workers constraints.
 */
app.on(['GET', 'POST'], '/api/v1/auth/*', async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

/**
 * API routes
 *
 * All application API routes mounted at /api/v1/*
 */
app.route('/api/v1', api);

/**
 * 404 handler
 */
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
    },
    404
  );
});

/**
 * Global error handler
 */
app.onError((err, c) => {
  console.error('Unhandled error:', err);

  // Don't expose internal errors in production
  const message =
    c.env.ENVIRONMENT === 'development'
      ? err.message
      : 'An unexpected error occurred';

  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message,
      },
    },
    500
  );
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const db = createDbClient(env.DB);
    const result = await db.delete(schema.session)
      .where(lt(schema.session.expiresAt, new Date()))
      .returning({ id: schema.session.id });
    console.log(`[cron] Purged ${result.length} expired sessions`);
  },
};
