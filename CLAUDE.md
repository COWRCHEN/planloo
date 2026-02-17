# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Planloo is a full-stack event planning SaaS application with:
- **Frontend**: Astro 5.x with React 19, Tailwind CSS, shadcn/ui, deployed to Cloudflare Pages
- **Backend**: Hono API on Cloudflare Workers with D1 (SQLite) database
- **Auth**: Better Auth with email/password and OAuth support
- **ORM**: Drizzle ORM with type-safe schema

## Workflow Rules

- When asked to implement a feature, write actual code — do not stop at producing a plan document unless explicitly asked for a plan only.

## Tech Stack

### Frontend 

- Always use shadcn/ui components with Radix primitives for UI, and TanStack Query for all API calls. Never create custom UI components from scratch.

## Code Quality

### React Rules

- Never place React hooks after conditional returns. All hooks must be called before any early return statements.



## Commands

### Backend (`/backend`)

```bash
npm run dev              # Start local dev server (wrangler, port 8787)
npm run deploy           # Deploy to Cloudflare Workers
npm run deploy:staging   # Deploy to staging environment
npm run deploy:production # Deploy to production

# Database
npm run db:generate      # Generate Drizzle migrations from schema
npm run db:migrate:local # Apply migrations to local D1
npm run db:migrate       # Apply migrations to remote D1
npm run db:studio        # Open Drizzle Studio

# Quality
npm run type-check       # TypeScript check
npm run lint             # ESLint
npm run test             # Vitest
npm run test:ui          # Vitest with UI
```

### Frontend (`/frontend`)

```bash
npm run dev              # Start Astro dev server (port 4321)
npm run build            # Build for production (astro check + astro build)
npm run preview          # Preview production build

# Quality
npm run type-check       # TypeScript check
npm run lint             # ESLint
npm run test             # Vitest unit tests
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright with UI
```

## Architecture

This project deploys to Cloudflare Workers (not Pages). The backend uses Hono on Workers with D1 database. All API routes use /api/v1 versioning — do not remove or change the versioned prefix.


### Backend Structure

```
backend/src/
├── db/                    # Database layer
│   ├── schema/           # Drizzle schemas (21 tables across 6 files)
│   │   ├── auth.ts       # user, session, account, verification
│   │   ├── organization.ts
│   │   ├── events.ts     # events, guests, eventCollaborators, tasks
│   │   ├── budget.ts     # budgetItems, payments
│   │   ├── providers.ts  # serviceProviders, venues, images, reviews
│   │   ├── admin.ts      # auditLog, impersonationSession
│   │   └── relations.ts  # All table relations
│   ├── client.ts         # createDbClient(d1: D1Database)
│   └── types.ts          # Inferred TypeScript types from schema
├── routes/               # Hono route handlers
├── middleware/           # Auth, validation, rate limiting, error handling
├── services/             # Business logic layer
└── lib/                  # Utilities (auth config, validation schemas)
```

### Frontend Structure (Planned)

```
frontend/src/
├── components/           # React + Astro components
│   └── ui/              # shadcn/ui base components
├── layouts/             # BaseLayout, AuthLayout, DashboardLayout
├── pages/               # Astro file-based routing
├── stores/              # Nanostores for state management
└── lib/                 # API client, auth-client, utilities
```

### Shared Structure between Frontend and Backend

```
├── shared/                        # Shared types and contracts between frontend and backend
│
└── README.md                      # This file
```

### Key Patterns

**Database Client**: Create per-request in Workers:
```typescript
import { createDbClient } from '@/db/client';
const db = createDbClient(env.DB);
```

**Drizzle Queries**: Use the exported schema and types:
```typescript
import { schema } from '@/db';
import type { Event, NewEvent } from '@/db/types';
```

**Better Auth**: Configured in `/backend/src/lib/auth.ts`, handles `/api/auth/*` routes

**Hono Routes**: Mounted at `/api/v1/*` with auth middleware

### Rendering Strategy

- **SSG**: Homepage, marketing pages, provider/venue directories
- **SSR**: Dashboard pages, event details, user profile (via Cloudflare adapter)
- **CSR (Islands)**: Interactive forms, real-time updates using `client:load/visible`

## Environment Variables

### Backend (Cloudflare Workers)
- `DB` - D1 database binding
- `BETTER_AUTH_SECRET` - Auth secret (set via `wrangler secret put`)
- `ENVIRONMENT` - development/staging/production
- `FRONTEND_URL` - Frontend URL for CORS
- OAuth secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc.

### Frontend
- `PUBLIC_API_URL` - Backend API URL
- `PUBLIC_SITE_URL` - Site URL for SEO/meta tags

## Database Notes

- Uses Cloudflare D1 (SQLite-based)
- Timestamps stored as Unix integers with `mode: 'timestamp'`
- Soft deletes via `deletedAt` column
- UUIDs for public-facing IDs, auto-increment for internal
- Events can belong to either a user (personal) OR an organization (not both)

## Documentation

- Documentation files go in the docs/ directory (e.g., docs/features/), not as skill files or in other locations.
