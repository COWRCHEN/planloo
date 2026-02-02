# Backend Architecture - Planloo

## Overview

This document outlines the backend architecture for Planloo using Hono framework deployed on Cloudflare Workers with D1 database.

**Framework:** Hono v4.x
**Runtime:** Cloudflare Workers
**Database:** Cloudflare D1 (SQLite)
**ORM:** Drizzle ORM
**Authentication:** Better Auth

---

## Project Structure

```
planloo/backend/
├── src/
│   ├── index.ts                  # Main entry point, Hono app initialization
│   │
│   ├── routes/                   # Route handlers
│   │   ├── auth.ts              # Authentication routes
│   │   ├── users.ts             # User management routes
│   │   ├── events.ts            # Event CRUD routes
│   │   ├── guests.ts            # Guest management routes
│   │   ├── rsvp.ts              # Public RSVP routes
│   │   ├── service-providers.ts # Service provider routes
│   │   ├── venues.ts            # Venue routes
│   │   ├── budget.ts            # Budget management routes
│   │   ├── reviews.ts           # Review routes
│   │   └── index.ts             # Route aggregation
│   │
│   ├── middleware/              # Middleware functions
│   │   ├── auth.ts             # Authentication middleware
│   │   ├── validation.ts       # Request validation middleware
│   │   ├── errorHandler.ts     # Global error handler
│   │   ├── rateLimit.ts        # Rate limiting
│   │   ├── cors.ts             # CORS configuration
│   │   └── logger.ts           # Request logging
│   │
│   ├── db/                      # Database layer
│   │   ├── schema.ts           # Drizzle schema definitions
│   │   ├── client.ts           # Database client initialization
│   │   └── migrations/         # Database migrations
│   │       ├── 0001_initial.sql
│   │       └── meta/
│   │
│   ├── services/                # Business logic layer
│   │   ├── auth.service.ts
│   │   ├── event.service.ts
│   │   ├── guest.service.ts
│   │   ├── budget.service.ts
│   │   ├── provider.service.ts
│   │   └── email.service.ts
│   │
│   ├── lib/                     # Utility libraries
│   │   ├── auth.ts             # Better Auth configuration
│   │   ├── validation.ts       # Zod validation schemas
│   │   ├── email.ts            # Email client
│   │   └── utils.ts            # General utilities
│   │
│   ├── types/                   # TypeScript types
│   │   ├── api.ts              # API request/response types
│   │   ├── db.ts               # Database types
│   │   ├── env.ts              # Environment types
│   │   └── index.ts
│   │
│   └── constants/               # Application constants
│       ├── errors.ts
│       └── config.ts
│
├── drizzle/                     # Drizzle ORM files
│   └── migrations/             # Generated migrations
│
├── wrangler.toml                # Cloudflare Workers configuration
├── drizzle.config.ts            # Drizzle configuration
├── package.json
└── tsconfig.json
```

---

## Core Application Setup

### Main Entry Point

```typescript
// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimit';
import type { Env } from './types/env';

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: (origin) => {
    // Allow configured origins
    const allowedOrigins = ['https://planloo.com', 'http://localhost:4321'];
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
}));

// Rate limiting
app.use('*', rateLimiter);

// API routes
app.route('/api/v1', routes);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});

// Error handling
app.onError(errorHandler);

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  }, 404);
});

export default app;
```

### Environment Types

```typescript
// src/types/env.ts
export interface Env {
  DB: D1Database; // Cloudflare D1 binding
  BETTER_AUTH_SECRET: string;
  EMAIL_API_KEY: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  FRONTEND_URL: string;
  // OAuth providers (optional)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}
```

---

## Database Layer

### Drizzle Schema

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  role: text('role', { enum: ['user', 'provider', 'admin'] }).notNull().default('user'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  emailVerificationToken: text('email_verification_token'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpires: integer('password_reset_expires', { mode: 'timestamp' }),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' })
});

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  eventType: text('event_type', { enum: ['wedding', 'birthday', 'corporate', 'conference', 'other'] }),
  status: text('status', { enum: ['draft', 'planning', 'confirmed', 'completed', 'cancelled'] }).notNull().default('draft'),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }),
  timezone: text('timezone').default('UTC'),
  locationName: text('location_name'),
  locationCity: text('location_city'),
  budgetTotal: real('budget_total'),
  budgetCurrency: text('budget_currency').default('USD'),
  slug: text('slug').unique(),
  coverImageUrl: text('cover_image_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' })
});

// Additional tables: guests, service_providers, venues, budget_items, etc.
```

### Database Client

```typescript
// src/db/client.ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
import type { Env } from '@/types/env';

export function getDb(env: Env) {
  return drizzle(env.DB, { schema });
}

export type DbClient = ReturnType<typeof getDb>;
```

---

## Better Auth Setup

### Auth Configuration

```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from '@/db/client';
import type { Env } from '@/types/env';

export function createAuth(env: Env) {
  const db = getDb(env);

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'sqlite'
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.FRONTEND_URL,

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true
    },

    socialProviders: {
      google: env.GOOGLE_CLIENT_ID ? {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET!
      } : undefined,
      github: env.GITHUB_CLIENT_ID ? {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET!
      } : undefined
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24,     // 1 day
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5 // 5 minutes
      }
    },

    user: {
      additionalFields: {
        role: {
          type: 'string',
          defaultValue: 'user'
        },
        phone: {
          type: 'string',
          required: false
        }
      }
    },

    advanced: {
      generateId: () => crypto.randomUUID()
    }
  });
}

export type Auth = ReturnType<typeof createAuth>;
```

### Auth Route Handler

```typescript
// src/routes/auth.ts
import { Hono } from 'hono';
import { createAuth } from '@/lib/auth';
import type { Env } from '@/types/env';

const authRoutes = new Hono<{ Bindings: Env }>();

// Mount Better Auth handler at /api/auth/*
authRoutes.on(['GET', 'POST'], '/*', async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

export default authRoutes;
```

---

## Middleware

### Authentication Middleware

```typescript
// src/middleware/auth.ts
import { createMiddleware } from 'hono/factory';
import { createAuth } from '@/lib/auth';
import type { Env } from '@/types/env';

export interface AuthVariables {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  session: {
    id: string;
    expiresAt: Date;
  };
}

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: AuthVariables;
}>(async (c, next) => {
  const auth = createAuth(c.env);

  const session = await auth.api.getSession({
    headers: c.req.raw.headers
  });

  if (!session) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    }, 401);
  }

  // Set user and session context
  c.set('user', session.user);
  c.set('session', session.session);

  await next();
});

// Role-based authorization
export const requireRole = (allowedRoles: string[]) => {
  return createMiddleware<{ Bindings: Env; Variables: AuthVariables }>(
    async (c, next) => {
      const user = c.get('user');

      if (!allowedRoles.includes(user.role)) {
        return c.json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions'
          }
        }, 403);
      }

      await next();
    }
  );
};
```

### Validation Middleware

```typescript
// src/middleware/validation.ts
import { createMiddleware } from 'hono/factory';
import { z } from 'zod';

export const validateBody = <T extends z.ZodType>(schema: T) => {
  return createMiddleware(async (c, next) => {
    try {
      const body = await c.req.json();
      const validated = schema.parse(body);
      c.set('validatedBody', validated);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        }, 400);
      }
      throw error;
    }
  });
};

export const validateQuery = <T extends z.ZodType>(schema: T) => {
  return createMiddleware(async (c, next) => {
    try {
      const query = c.req.query();
      const validated = schema.parse(query);
      c.set('validatedQuery', validated);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors
          }
        }, 400);
      }
      throw error;
    }
  });
};
```

### Rate Limiting

```typescript
// src/middleware/rateLimit.ts
import { createMiddleware } from 'hono/factory';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export const rateLimiter = createMiddleware(async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = c.get('userId') ? 1000 : 100; // Higher limit for authenticated users

  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    // New window
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + windowMs
    });
  } else {
    // Increment count
    record.count++;

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);

      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', record.resetAt.toString());
      c.header('Retry-After', retryAfter.toString());

      return c.json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter
        }
      }, 429);
    }
  }

  // Set rate limit headers
  const remaining = maxRequests - (record?.count || 0);
  c.header('X-RateLimit-Limit', maxRequests.toString());
  c.header('X-RateLimit-Remaining', remaining.toString());
  c.header('X-RateLimit-Reset', (record?.resetAt || now + windowMs).toString());

  await next();
});
```

### Error Handler

```typescript
// src/middleware/errorHandler.ts
import { ErrorHandler } from 'hono';

export const errorHandler: ErrorHandler = (err, c) => {
  console.error('Error:', err);

  // Handle known error types
  if (err.name === 'ZodError') {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors
      }
    }, 400);
  }

  // Database errors
  if (err.message.includes('UNIQUE constraint failed')) {
    return c.json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Resource already exists'
      }
    }, 409);
  }

  // Default error response
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: c.env?.ENVIRONMENT === 'production'
        ? 'An unexpected error occurred'
        : err.message
    }
  }, 500);
};
```

---

## Route Handlers

### Main App with Better Auth

```typescript
// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createAuth } from '@/lib/auth';
import routes from './routes';
import type { Env } from '@/types/env';

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => {
    const allowedOrigins = ['https://planloo.com', 'http://localhost:4321'];
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
}));

// Better Auth routes - handles all /api/auth/* endpoints
app.on(['GET', 'POST'], '/api/auth/*', async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

// API routes
app.route('/api/v1', routes);

export default app;
```

### Better Auth Client (Frontend)

```typescript
// src/lib/auth-client.ts (for Astro frontend)
import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
  baseURL: import.meta.env.PUBLIC_API_URL
});

// Usage examples:
// await authClient.signUp.email({ email, password, name })
// await authClient.signIn.email({ email, password })
// await authClient.signIn.social({ provider: 'google' })
// await authClient.signOut()
// const session = await authClient.getSession()
```

### Event Routes

```typescript
// src/routes/events.ts
import { Hono } from 'hono';
import { authMiddleware } from '@/middleware/auth';
import { validateBody, validateQuery } from '@/middleware/validation';
import { EventService } from '@/services/event.service';
import { createEventSchema, updateEventSchema, listEventsSchema } from '@/lib/validation';
import type { Env } from '@/types/env';

const events = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
events.use('*', authMiddleware);

// List events
events.get('/', validateQuery(listEventsSchema), async (c) => {
  const userId = c.get('userId');
  const query = c.get('validatedQuery');
  const eventService = new EventService(c.env);

  const result = await eventService.list(userId, query);

  return c.json({
    success: true,
    data: result
  });
});

// Create event
events.post('/', validateBody(createEventSchema), async (c) => {
  const userId = c.get('userId');
  const data = c.get('validatedBody');
  const eventService = new EventService(c.env);

  const event = await eventService.create(userId, data);

  return c.json({
    success: true,
    data: { event }
  }, 201);
});

// Get event by UUID
events.get('/:uuid', async (c) => {
  const userId = c.get('userId');
  const uuid = c.req.param('uuid');
  const eventService = new EventService(c.env);

  const event = await eventService.getByUuid(uuid, userId);

  if (!event) {
    return c.json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Event not found'
      }
    }, 404);
  }

  return c.json({
    success: true,
    data: { event }
  });
});

// Update event
events.patch('/:uuid', validateBody(updateEventSchema), async (c) => {
  const userId = c.get('userId');
  const uuid = c.req.param('uuid');
  const data = c.get('validatedBody');
  const eventService = new EventService(c.env);

  const event = await eventService.update(uuid, userId, data);

  if (!event) {
    return c.json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Event not found'
      }
    }, 404);
  }

  return c.json({
    success: true,
    data: { event }
  });
});

// Delete event
events.delete('/:uuid', async (c) => {
  const userId = c.get('userId');
  const uuid = c.req.param('uuid');
  const eventService = new EventService(c.env);

  await eventService.delete(uuid, userId);

  return c.body(null, 204);
});

export default events;
```

---

## Service Layer

### Event Service

```typescript
// src/services/event.service.ts
import { getDb } from '@/db/client';
import { events } from '@/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { generateUuid, generateSlug } from '@/lib/utils';
import type { Env } from '@/types/env';

export class EventService {
  private db;

  constructor(env: Env) {
    this.db = getDb(env);
  }

  async list(userId: number, options: any) {
    const { status, limit = 20, cursor } = options;

    const query = this.db
      .select()
      .from(events)
      .where(
        and(
          eq(events.userId, userId),
          isNull(events.deletedAt),
          status ? eq(events.status, status) : undefined
        )
      )
      .orderBy(desc(events.createdAt))
      .limit(limit + 1); // Fetch one extra for pagination

    const results = await query;
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, -1) : results;

    return {
      events: items,
      pagination: {
        hasMore,
        nextCursor: hasMore ? items[items.length - 1].uuid : null
      }
    };
  }

  async create(userId: number, data: any) {
    const uuid = generateUuid();
    const slug = await generateSlug(data.title);

    const [event] = await this.db
      .insert(events)
      .values({
        uuid,
        userId,
        slug,
        ...data
      })
      .returning();

    return event;
  }

  async getByUuid(uuid: string, userId: number) {
    const [event] = await this.db
      .select()
      .from(events)
      .where(
        and(
          eq(events.uuid, uuid),
          eq(events.userId, userId),
          isNull(events.deletedAt)
        )
      )
      .limit(1);

    return event || null;
  }

  async update(uuid: string, userId: number, data: any) {
    const [event] = await this.db
      .update(events)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(events.uuid, uuid),
          eq(events.userId, userId),
          isNull(events.deletedAt)
        )
      )
      .returning();

    return event || null;
  }

  async delete(uuid: string, userId: number) {
    // Soft delete
    await this.db
      .update(events)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(events.uuid, uuid),
          eq(events.userId, userId)
        )
      );
  }
}
```

---

## Utilities

### Better Auth Session Helper

```typescript
// src/lib/session.ts
import { createAuth } from './auth';
import type { Env } from '@/types/env';

// Get current session in API routes
export async function getSession(env: Env, request: Request) {
  const auth = createAuth(env);
  return auth.api.getSession({ headers: request.headers });
}

// Get current user in API routes
export async function getCurrentUser(env: Env, request: Request) {
  const session = await getSession(env, request);
  return session?.user ?? null;
}
```

### UUID Generation

```typescript
// src/lib/utils.ts
export function generateUuid(): string {
  return crypto.randomUUID();
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + crypto.randomUUID().slice(0, 8);
}
```

---

## Configuration

### Wrangler Configuration

```toml
# wrangler.toml
name = "planloo-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
name = "planloo-api-production"
route = { pattern = "api.planloo.com/*", zone_name = "planloo.com" }

[env.staging]
name = "planloo-api-staging"

[[d1_databases]]
binding = "DB"
database_name = "planloo-db"
database_id = "your-database-id"

[vars]
ENVIRONMENT = "production"
FRONTEND_URL = "https://planloo.com"

# Secrets (set via `wrangler secret put`)
# BETTER_AUTH_SECRET
# EMAIL_API_KEY
# GOOGLE_CLIENT_ID (optional)
# GOOGLE_CLIENT_SECRET (optional)
# GITHUB_CLIENT_ID (optional)
# GITHUB_CLIENT_SECRET (optional)
```

---

## Testing

### Unit Tests

```typescript
// src/services/event.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { EventService } from './event.service';

describe('EventService', () => {
  let eventService: EventService;

  beforeEach(() => {
    // Setup test database
    eventService = new EventService(testEnv);
  });

  it('creates an event', async () => {
    const event = await eventService.create(1, {
      title: 'Test Event',
      eventType: 'birthday',
      startDate: new Date('2026-08-15')
    });

    expect(event).toBeDefined();
    expect(event.title).toBe('Test Event');
  });
});
```

---

## Deployment

```bash
# Deploy to production
wrangler deploy --env production

# Run migrations
wrangler d1 migrations apply planloo-db --env production
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | Product Manager | Initial backend architecture specification |
