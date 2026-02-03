# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the backend code.

## Commands

```bash
npm run dev              # Start wrangler dev server (port 8787)
npm run deploy           # Deploy to Cloudflare Workers
npm run deploy:staging   # Deploy to staging
npm run deploy:production # Deploy to production

# Database
npm run db:generate      # Generate migrations from schema changes
npm run db:migrate:local # Apply migrations locally
npm run db:migrate       # Apply migrations to remote D1
npm run db:studio        # Open Drizzle Studio GUI

# Quality
npm run type-check       # TypeScript check (tsc --noEmit)
npm run lint             # ESLint
npm run lint:fix         # ESLint with auto-fix
npm run test             # Run Vitest
npm run test:ui          # Vitest with browser UI
```

## Architecture

### Tech Stack
- **Runtime**: Cloudflare Workers
- **Framework**: Hono v4
- **API input valiation**: Zod validation
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Auth**: Better Auth
- **Validation**: Zod

### Directory Structure

```
src/
├── db/
│   ├── schema/           # Drizzle table definitions
│   │   ├── auth.ts       # user, session, account, verification (Better Auth)
│   │   ├── organization.ts
│   │   ├── events.ts     # events, guests, eventCollaborators, tasks
│   │   ├── budget.ts     # budgetItems, payments
│   │   ├── providers.ts  # serviceProviders, venues, images, reviews
│   │   ├── admin.ts      # auditLog, impersonationSession
│   │   └── relations.ts  # All table relations
│   ├── client.ts         # Database client factory
│   └── types.ts          # Inferred TypeScript types
├── routes/               # Hono route handlers
├── middleware/           # Auth, validation, rate limiting
├── services/             # Business logic
└── lib/                  # Utilities, auth config
```

### Path Aliases

```typescript
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import type { Event } from '@/db/types';
```

## Database Patterns

### Creating DB Client (per-request)

```typescript
import { createDbClient } from '@/db/client';

app.get('/events', async (c) => {
  const db = createDbClient(c.env.DB);
  // use db...
});
```

### Using Schema and Types

```typescript
import { schema } from '@/db';
import type { Event, NewEvent, User } from '@/db/types';

// Query with schema
const events = await db.select().from(schema.events).where(eq(schema.events.userId, userId));

// Insert with type
const newEvent: NewEvent = { uuid: crypto.randomUUID(), title: 'Party', startDate: new Date() };
await db.insert(schema.events).values(newEvent);
```

### D1/SQLite Specifics

- Timestamps: Use `integer('col', { mode: 'timestamp' })` - stored as Unix epoch
- Booleans: Use `integer('col', { mode: 'boolean' })` - stored as 0/1
- Default timestamps: `default(sql\`(unixepoch())\`)`
- Soft deletes: Check `deletedAt IS NULL` in queries
- No `BEGIN TRANSACTION` in D1 - use `db.batch()` for atomic operations

### Schema Tables (21 total)

**Auth (4)**: user, session, account, verification
**Organization (3)**: organization, organizationMember, organizationInvitation
**Events (4)**: events, guests, eventCollaborators, tasks
**Budget (2)**: budgetItems, payments
**Providers (6)**: serviceProviders, venues, eventServiceProviders, eventVenues, images, reviews
**Admin (2)**: auditLog, impersonationSession

## Hono Patterns

### Route Handler

```typescript
import { Hono } from 'hono';
import type { Env } from '@/types/env';

const app = new Hono<{ Bindings: Env }>();

app.get('/events', async (c) => {
  const db = createDbClient(c.env.DB);
  return c.json({ success: true, data: events });
});
```

### Environment Bindings

```typescript
interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  FRONTEND_URL: string;
}
```

## Secrets Management

Set secrets via wrangler (not in wrangler.toml):

```bash
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put BETTER_AUTH_SECRET --env staging
wrangler secret put BETTER_AUTH_SECRET --env production
```

## Migration Workflow

1. Modify schema in `src/db/schema/*.ts`
2. Run `npm run db:generate` to create migration
3. Run `npm run db:migrate:local` to test locally
4. Run `npm run db:migrate` to apply to remote
