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
import { createStripeClient, getPriceIdItemType } from '@/lib/stripe';
import { eq, and, isNull } from 'drizzle-orm';
import type Stripe from 'stripe';
import api from '@/routes';

const app = new Hono<HonoEnv>();

function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

async function extractSignInEmail(request: Request): Promise<string | null> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    const body = (await request.clone().json()) as { email?: unknown };
    if (typeof body.email !== 'string') {
      return null;
    }

    const email = body.email.trim().toLowerCase();
    return email.length > 0 ? email : null;
  } catch {
    return null;
  }
}

function getAuthErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as {
    message?: unknown;
    error?: unknown;
  };

  if (typeof candidate.message === 'string' && candidate.message.length > 0) {
    return candidate.message;
  }

  if (typeof candidate.error === 'string' && candidate.error.length > 0) {
    return candidate.error;
  }

  if (
    candidate.error &&
    typeof candidate.error === 'object' &&
    typeof (candidate.error as { message?: unknown }).message === 'string'
  ) {
    return (candidate.error as { message: string }).message;
  }

  return null;
}

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
          origin?.startsWith('http://127.0.0.1:')||
          origin?.startsWith('http://10.0.48.174:'))
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
  const isEmailSignIn =
    c.req.method === 'POST' && c.req.path === '/api/v1/auth/sign-in/email';
  const email = isEmailSignIn ? await extractSignInEmail(c.req.raw) : null;
  const ipAddress = isEmailSignIn ? getClientIp(c.req.raw) : null;
  const userAgent = isEmailSignIn ? c.req.header('user-agent') || 'unknown' : null;

  const auth = createAuth(c.env);
  const response = await auth.handler(c.req.raw);

  if (isEmailSignIn) {
    const setCookie = response.headers.get('set-cookie') || '';
    const hasSessionCookie = setCookie.toLowerCase().includes('session');

    let authErrorMessage: string | null = null;
    try {
      const payload = await response.clone().json();
      authErrorMessage = getAuthErrorMessage(payload);
    } catch {
      // Ignore non-JSON response bodies.
    }

    const failed = !response.ok || !hasSessionCookie;
    const logPayload = {
      event: failed ? 'auth.signin.failed' : 'auth.signin.succeeded',
      email,
      ipAddress,
      userAgent,
      status: response.status,
      errorMessage: authErrorMessage,
      timestamp: new Date().toISOString(),
    };

    if (failed) {
      console.warn('[auth.signin.failed]', JSON.stringify(logPayload));
    } else {
      console.info('[auth.signin.succeeded]', JSON.stringify(logPayload));
    }
  }

  return response;
});

/**
 * Sync Stripe subscription items → user_subscription_items table.
 * Deactivates all current active items, then inserts fresh rows from Stripe.
 */
async function syncSubscriptionItems(
  db: ReturnType<typeof createDbClient>,
  env: Env,
  userId: string,
  stripeItems: Stripe.SubscriptionItem[]
): Promise<void> {
  await db
    .update(schema.userSubscriptionItems)
    .set({ activeTo: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.userSubscriptionItems.userId, userId),
        isNull(schema.userSubscriptionItems.activeTo)
      )
    );

  for (const item of stripeItems) {
    const itemType = getPriceIdItemType(env, item.price.id);
    if (!itemType) continue;
    await db.insert(schema.userSubscriptionItems).values({
      userId,
      itemType,
      quantity: item.quantity ?? 1,
      stripeItemId: item.id,
      activeFrom: new Date(),
      updatedAt: new Date(),
    });
  }
}

/**
 * Stripe Webhook
 *
 * MUST be mounted before app.route('/api/v1', api) because:
 * 1. It needs the raw request body for signature verification.
 * 2. The auth middleware inside `api` would run before we can read raw body.
 * 3. Stripe sends no cookies/auth headers, so auth middleware is not applicable.
 */
app.post('/api/v1/billing/webhook', async (c) => {
  const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return c.json({ error: 'Webhook not configured' }, 500);
  }

  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json({ error: 'Missing stripe-signature header' }, 400);
  }

  let event;
  try {
    const stripe = createStripeClient(c.env);
    const rawBody = await c.req.text();
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return c.json({ error: 'Invalid signature' }, 400);
  }

  const db = createDbClient(c.env.DB);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (!userId) break;

        // For legacy tier checkouts, plan may be in metadata
        const legacyPlan = session.metadata?.plan as 'free' | 'personal' | 'planner' | 'agency' | undefined;

        await db
          .update(schema.subscriptions)
          .set({
            ...(legacyPlan ? { plan: legacyPlan } : {}),
            status: 'active',
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            emailsSentThisPeriod: 0,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.userId, userId));
        break;
      }

      case 'customer.subscription.created': {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stripeSub = sub as any;

        await db
          .update(schema.subscriptions)
          .set({
            status: sub.status as 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete',
            stripeSubscriptionId: sub.id,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.userId, userId));

        await syncSubscriptionItems(db, c.env, userId, sub.items.data);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        const legacyPlan = sub.metadata?.plan as 'free' | 'personal' | 'planner' | 'agency' | undefined;
        if (!userId) break;

        const isNewPeriod =
          event.data.previous_attributes &&
          'current_period_start' in event.data.previous_attributes;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stripeSub = sub as any;

        await db
          .update(schema.subscriptions)
          .set({
            ...(legacyPlan ? { plan: legacyPlan } : {}),
            status: sub.status as 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete',
            stripeSubscriptionId: sub.id,
            stripePriceId: sub.items.data[0]?.price.id ?? undefined,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            canceledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
            ...(isNewPeriod ? { emailsSentThisPeriod: 0 } : {}),
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.userId, userId));

        await syncSubscriptionItems(db, c.env, userId, sub.items.data);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await db
          .update(schema.subscriptions)
          .set({
            plan: 'free',
            status: 'free',
            stripeSubscriptionId: null,
            stripePriceId: null,
            currentPeriodStart: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            canceledAt: new Date(),
            emailsSentThisPeriod: 0,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.userId, userId));

        // Deactivate all items
        await db
          .update(schema.userSubscriptionItems)
          .set({ activeTo: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(schema.userSubscriptionItems.userId, userId),
              isNull(schema.userSubscriptionItems.activeTo)
            )
          );
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;
        if (!customerId) break;

        await db
          .update(schema.subscriptions)
          .set({ status: 'past_due', updatedAt: new Date() })
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;
        if (!customerId) break;

        await db
          .update(schema.subscriptions)
          .set({
            status: 'active',
            emailsSentThisPeriod: 0,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.stripeCustomerId, customerId));
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }

  return c.json({ received: true });
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
