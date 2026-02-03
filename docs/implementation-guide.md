# Implementation Guide - Planloo

**Version:** 1.0
**Date:** 2026-02-02
**Author:** Full-Stack Developer Agent

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Architecture Decisions](#architecture-decisions)
5. [Shared Types & Contracts](#shared-types--contracts)
6. [Component Organization](#component-organization)
7. [State Management Strategy](#state-management-strategy)
8. [API Client Architecture](#api-client-architecture)
9. [Authentication Flow](#authentication-flow)
10. [Data Fetching Patterns](#data-fetching-patterns)
11. [Error Handling Strategy](#error-handling-strategy)
12. [Testing Strategy](#testing-strategy)
13. [Development Workflow](#development-workflow)
14. [Deployment Strategy](#deployment-strategy)

---

## Project Overview

Planloo is a full-stack event planning SaaS application built with modern web technologies optimized for performance, SEO, and developer experience.

**Monorepo Structure:**
```
planloo/
├── frontend/          # Astro v5.17 + React 19 application
├── backend/           # Hono API on Cloudflare Workers
├── shared/            # Shared types and contracts
├── docs/              # Documentation
└── .github/           # CI/CD workflows
```

**Key Requirements:**
- Lighthouse Performance Score > 90
- WCAG 2.1 AA accessibility compliance
- Mobile-first responsive design
- Edge-optimized deployment (Cloudflare)
- Type-safe API contracts

---

## Technology Stack

### Frontend Stack

**Framework & Runtime:**
- **Astro v5.17**: Hybrid SSR/SSG framework for optimal performance
- **React 19**: Interactive UI components with islands architecture
- **TypeScript 5.x**: Strict type safety

**UI & Styling:**
- **Tailwind CSS 3.x**: Utility-first CSS framework
- **shadcn/ui**: Accessible component library based on Radix
- **Radix UI**: Unstyled accessible primitives
- **class-variance-authority**: Component variant management
- **tailwind-merge**: Tailwind class conflict resolution

**State Management:**
- **Nanostores**: Lightweight reactive state management
- **@nanostores/react**: React integration for Nanostores

**Forms & Validation:**
- **React Hook Form**: Performant form management
- **Zod**: Runtime type validation and schema definition

**HTTP Client:**
- **Native Fetch API**: Modern browser API with polyfill

**Development Tools:**
- **Vite**: Fast build tool (bundled with Astro)
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Vitest**: Unit testing framework
- **Playwright**: E2E testing

### Backend Stack

**Framework & Runtime:**
- **Hono v4.x**: Lightweight edge-optimized web framework
- **Cloudflare Workers**: Edge computing runtime
- **TypeScript 5.x**: Type safety

**Database & ORM:**
- **Cloudflare D1**: SQLite-based edge database
- **Drizzle ORM**: Type-safe SQL query builder
- **Drizzle Kit**: Migration management

**Authentication:**
- **Better Auth**: Modern authentication library with session management
- **bcrypt**: Password hashing

**Utilities:**
- **Zod**: API request/response validation
- **date-fns**: Date manipulation

**Development Tools:**
- **Wrangler**: Cloudflare Workers CLI
- **Vitest**: Unit testing

---

## Project Structure

### Frontend Directory Structure

```
frontend/
├── public/                      # Static assets
│   ├── images/
│   ├── fonts/
│   └── favicon.ico
│
├── src/
│   ├── components/              # UI components
│   │   ├── ui/                 # Base components (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── alert.tsx
│   │   │   └── ... (other shadcn components)
│   │   │
│   │   ├── shared/             # Shared composed components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── LoadingState.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   │
│   │   ├── auth/               # Authentication components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── ForgotPasswordForm.tsx
│   │   │   └── SocialAuthButtons.tsx
│   │   │
│   │   ├── dashboard/          # Dashboard components
│   │   │   ├── DashboardStats.tsx
│   │   │   ├── RecentEvents.tsx
│   │   │   ├── UpcomingTasks.tsx
│   │   │   └── QuickActions.tsx
│   │   │
│   │   ├── events/             # Event-related components
│   │   │   ├── EventCard.tsx
│   │   │   ├── EventForm.tsx
│   │   │   ├── EventHeader.tsx
│   │   │   ├── EventList.tsx
│   │   │   └── EventFilters.tsx
│   │   │
│   │   ├── guests/             # Guest management components
│   │   │   ├── GuestList.tsx
│   │   │   ├── GuestForm.tsx
│   │   │   ├── GuestCard.tsx
│   │   │   ├── RSVPStatusBadge.tsx
│   │   │   └── GuestFilters.tsx
│   │   │
│   │   ├── budget/             # Budget components
│   │   │   ├── BudgetOverview.tsx
│   │   │   ├── BudgetChart.tsx
│   │   │   ├── BudgetCategoryList.tsx
│   │   │   ├── BudgetItemForm.tsx
│   │   │   └── ExpenseTracker.tsx
│   │   │
│   │   ├── providers/          # Service provider components
│   │   │   ├── ProviderCard.tsx
│   │   │   ├── ProviderList.tsx
│   │   │   ├── ProviderFilters.tsx
│   │   │   └── ProviderDetails.tsx
│   │   │
│   │   └── venues/             # Venue components
│   │       ├── VenueCard.tsx
│   │       ├── VenueList.tsx
│   │       ├── VenueFilters.tsx
│   │       └── VenueDetails.tsx
│   │
│   ├── layouts/                 # Astro layouts
│   │   ├── BaseLayout.astro    # Base HTML structure
│   │   ├── AuthLayout.astro    # Layout for auth pages
│   │   ├── DashboardLayout.astro
│   │   ├── PublicLayout.astro
│   │   └── EmptyLayout.astro   # Minimal layout
│   │
│   ├── pages/                   # File-based routing
│   │   ├── index.astro         # Homepage
│   │   ├── login.astro
│   │   ├── register.astro
│   │   ├── forgot-password.astro
│   │   │
│   │   ├── dashboard/
│   │   │   ├── index.astro     # Dashboard home
│   │   │   │
│   │   │   ├── events/
│   │   │   │   ├── index.astro # Event list
│   │   │   │   ├── new.astro   # Create event
│   │   │   │   └── [uuid].astro # Event detail (dynamic)
│   │   │   │
│   │   │   ├── budget/
│   │   │   │   └── index.astro
│   │   │   │
│   │   │   ├── providers/
│   │   │   │   └── index.astro
│   │   │   │
│   │   │   ├── venues/
│   │   │   │   └── index.astro
│   │   │   │
│   │   │   └── settings/
│   │   │       └── index.astro
│   │   │
│   │   ├── rsvp/
│   │   │   └── [token].astro   # Public RSVP page
│   │   │
│   │   ├── providers/
│   │   │   ├── index.astro     # Provider directory
│   │   │   └── [uuid].astro    # Provider detail
│   │   │
│   │   └── venues/
│   │       ├── index.astro     # Venue directory
│   │       └── [uuid].astro    # Venue detail
│   │
│   ├── lib/                     # Utility libraries
│   │   ├── api/                # API client
│   │   │   ├── client.ts       # Base API client
│   │   │   ├── events.ts       # Event API methods
│   │   │   ├── guests.ts       # Guest API methods
│   │   │   ├── budget.ts       # Budget API methods
│   │   │   ├── providers.ts    # Provider API methods
│   │   │   └── venues.ts       # Venue API methods
│   │   │
│   │   ├── auth/               # Auth utilities
│   │   │   ├── client.ts       # Better Auth client
│   │   │   ├── guards.ts       # Route guards
│   │   │   └── session.ts      # Session helpers
│   │   │
│   │   ├── validation/         # Validation schemas
│   │   │   ├── event.ts
│   │   │   ├── guest.ts
│   │   │   ├── budget.ts
│   │   │   ├── auth.ts
│   │   │   └── common.ts
│   │   │
│   │   ├── utils/              # General utilities
│   │   │   ├── cn.ts           # Class name merger
│   │   │   ├── format.ts       # Formatters (date, currency)
│   │   │   ├── storage.ts      # LocalStorage wrapper
│   │   │   └── constants.ts    # App constants
│   │   │
│   │   └── hooks/              # React hooks
│   │       ├── useAuth.ts
│   │       ├── useDebounce.ts
│   │       ├── useLocalStorage.ts
│   │       └── useMediaQuery.ts
│   │
│   ├── stores/                  # Nanostores
│   │   ├── auth.ts             # Auth state
│   │   ├── events.ts           # Event state
│   │   ├── ui.ts               # UI state (modals, toasts)
│   │   └── filters.ts          # Filter state
│   │
│   ├── styles/                  # Global styles
│   │   ├── global.css          # Global CSS
│   │   └── tailwind.css        # Tailwind directives
│   │
│   ├── types/                   # TypeScript types
│   │   ├── api.ts              # API types
│   │   ├── models.ts           # Data models
│   │   ├── components.ts       # Component prop types
│   │   └── index.ts            # Type exports
│   │
│   └── env.d.ts                # Environment types
│
├── astro.config.mjs             # Astro configuration
├── tailwind.config.mjs          # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
├── package.json
├── .eslintrc.cjs
├── .prettierrc
└── playwright.config.ts         # E2E test config
```

### Backend Directory Structure

```
backend/
├── src/
│   ├── index.ts                 # Main entry point
│   │
│   ├── routes/                  # Route handlers
│   │   ├── index.ts            # Route aggregation
│   │   ├── auth.ts             # Auth routes (Better Auth)
│   │   ├── users.ts            # User management
│   │   ├── organizations.ts    # Organization routes
│   │   ├── events.ts           # Event CRUD
│   │   ├── guests.ts           # Guest management
│   │   ├── rsvp.ts             # Public RSVP
│   │   ├── budget.ts           # Budget routes
│   │   ├── providers.ts        # Service providers
│   │   ├── venues.ts           # Venues
│   │   └── admin.ts            # Admin routes
│   │
│   ├── middleware/              # Middleware functions
│   │   ├── auth.ts             # Authentication middleware
│   │   ├── validation.ts       # Request validation
│   │   ├── errorHandler.ts     # Global error handler
│   │   ├── rateLimit.ts        # Rate limiting
│   │   ├── cors.ts             # CORS config
│   │   ├── logger.ts           # Request logging
│   │   └── rbac.ts             # Role-based access control
│   │
│   ├── db/                      # Database layer
│   │   ├── schema.ts           # Drizzle schema
│   │   ├── client.ts           # Database client
│   │   ├── relations.ts        # Table relations
│   │   └── migrations/         # Migration files
│   │
│   ├── services/                # Business logic
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── organization.service.ts
│   │   ├── event.service.ts
│   │   ├── guest.service.ts
│   │   ├── budget.service.ts
│   │   ├── provider.service.ts
│   │   ├── venue.service.ts
│   │   ├── email.service.ts
│   │   └── audit.service.ts    # Audit logging
│   │
│   ├── lib/                     # Utilities
│   │   ├── auth.ts             # Better Auth config
│   │   ├── validation.ts       # Zod schemas
│   │   ├── email.ts            # Email client
│   │   ├── crypto.ts           # Encryption utilities
│   │   └── utils.ts            # General utilities
│   │
│   ├── types/                   # TypeScript types
│   │   ├── api.ts              # API types
│   │   ├── db.ts               # Database types
│   │   ├── env.ts              # Environment types
│   │   └── index.ts            # Type exports
│   │
│   └── constants/               # Application constants
│       ├── errors.ts           # Error codes
│       ├── roles.ts            # User roles
│       └── config.ts           # App config
│
├── drizzle/                     # Drizzle files
│   └── migrations/             # Generated migrations
│
├── tests/                       # Tests
│   ├── unit/
│   └── integration/
│
├── wrangler.toml                # Cloudflare Workers config
├── drizzle.config.ts            # Drizzle configuration
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Shared Directory Structure

```
shared/
├── src/
│   ├── types/                   # Shared type definitions
│   │   ├── user.ts
│   │   ├── organization.ts
│   │   ├── event.ts
│   │   ├── guest.ts
│   │   ├── budget.ts
│   │   ├── provider.ts
│   │   ├── venue.ts
│   │   ├── api.ts              # API request/response types
│   │   └── index.ts
│   │
│   ├── validation/              # Shared Zod schemas
│   │   ├── user.ts
│   │   ├── event.ts
│   │   ├── guest.ts
│   │   └── index.ts
│   │
│   └── constants/               # Shared constants
│       ├── event-types.ts
│       ├── rsvp-status.ts
│       ├── user-roles.ts
│       └── index.ts
│
├── package.json
└── tsconfig.json
```

---

## Architecture Decisions

### 1. Astro Pages vs React Components

**When to use Astro pages (.astro):**
- Static or server-rendered content
- SEO-critical pages (homepage, provider directory, venue listings)
- Pages with minimal interactivity
- Layout components
- Marketing pages

**When to use React components (.tsx):**
- Interactive forms
- Real-time data updates
- Complex state management
- Client-side filtering/searching
- Interactive dashboards

**Example Pattern:**
```astro
---
// pages/dashboard/events/[uuid].astro
import DashboardLayout from '@/layouts/DashboardLayout.astro';
import EventHeader from '@/components/events/EventHeader.astro'; // Static
import GuestList from '@/components/guests/GuestList'; // Interactive (React)
import BudgetOverview from '@/components/budget/BudgetOverview'; // Interactive

const { uuid } = Astro.params;
const event = await fetchEvent(uuid); // Server-side fetch
---

<DashboardLayout title={event.title}>
  <!-- Static Astro component - renders on server -->
  <EventHeader event={event} />

  <!-- Interactive React component - hydrates on client -->
  <GuestList client:load eventId={event.uuid} />

  <!-- Interactive React component - hydrates when visible -->
  <BudgetOverview client:visible eventId={event.uuid} />
</DashboardLayout>
```

### 2. Rendering Strategies

**Static Site Generation (SSG):**
Use for pages that can be pre-rendered at build time:
- Homepage
- Marketing pages
- Public provider/venue directories (with ISR)

```astro
---
// Default behavior in Astro
export const prerender = true;
---
```

**Server-Side Rendering (SSR):**
Use for authenticated or dynamic content:
- Dashboard pages
- Event detail pages
- User-specific content

```astro
---
export const prerender = false;
---
```

**Hybrid Strategy:**
Configure in `astro.config.mjs`:
```javascript
export default defineConfig({
  output: 'hybrid', // Pages are SSG by default, opt-in to SSR
  adapter: cloudflare({
    mode: 'directory'
  })
});
```

### 3. Client-Side Hydration

**Hydration Directives:**

```astro
<!-- Load immediately on page load (critical interactivity) -->
<LoginForm client:load />

<!-- Load when browser is idle (non-critical) -->
<NewsletterForm client:idle />

<!-- Load when element enters viewport (below-fold content) -->
<BudgetChart client:visible />

<!-- Load based on media query (responsive components) -->
<MobileNav client:media="(max-width: 768px)" />

<!-- Never hydrate (static React component) -->
<StaticCard client:only="react" />
```

**Decision Matrix:**
- **client:load**: Forms, critical UI (login, checkout)
- **client:idle**: Secondary features (chat widget, analytics)
- **client:visible**: Charts, heavy components below fold
- **client:media**: Mobile-specific components
- **client:only**: Server-incompatible libraries

---

## Shared Types & Contracts

### Type Sharing Strategy

**Approach:** Monorepo with shared package referenced by frontend and backend.

**Benefits:**
- Single source of truth for data models
- Type safety across API boundaries
- Reduced duplication
- Easier refactoring

### Shared Type Definitions

```typescript
// shared/src/types/user.ts
export interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  image: string | null;
  platformRole: 'super_admin' | 'operator' | 'user';
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// shared/src/types/event.ts
export interface Event {
  id: number;
  uuid: string;
  userId: string | null;
  organizationId: string | null;
  title: string;
  description: string | null;
  eventType: 'wedding' | 'birthday' | 'corporate' | 'conference' | 'other';
  status: 'draft' | 'planning' | 'confirmed' | 'completed' | 'cancelled';
  startDate: Date;
  endDate: Date | null;
  timezone: string;
  locationName: string | null;
  locationCity: string | null;
  guestCountExpected: number | null;
  guestCountConfirmed: number;
  budgetTotal: number | null;
  budgetCurrency: string;
  slug: string | null;
  coverImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// shared/src/types/api.ts
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// Request/Response types
export interface CreateEventRequest {
  title: string;
  description?: string;
  eventType: Event['eventType'];
  startDate: string; // ISO 8601
  endDate?: string;
  locationName?: string;
  locationCity?: string;
  guestCountExpected?: number;
  budgetTotal?: number;
}

export interface CreateEventResponse {
  event: Event;
}

export interface ListEventsRequest {
  status?: Event['status'];
  limit?: number;
  cursor?: string;
}

export interface ListEventsResponse {
  events: Event[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}
```

### Validation Schemas

Share Zod schemas between frontend and backend:

```typescript
// shared/src/validation/event.ts
import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(2000).optional(),
  eventType: z.enum(['wedding', 'birthday', 'corporate', 'conference', 'other']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().default('UTC'),
  locationName: z.string().max(200).optional(),
  locationCity: z.string().max(100).optional(),
  guestCountExpected: z.number().int().positive().optional(),
  budgetTotal: z.number().positive().optional()
});

export type CreateEventData = z.infer<typeof createEventSchema>;
```

**Usage in Frontend:**
```typescript
// frontend/src/components/events/EventForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEventSchema } from '@planloo/shared/validation';

export function EventForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(createEventSchema)
  });
  // ...
}
```

**Usage in Backend:**
```typescript
// backend/src/routes/events.ts
import { validateBody } from '@/middleware/validation';
import { createEventSchema } from '@planloo/shared/validation';

events.post('/', validateBody(createEventSchema), async (c) => {
  const data = c.get('validatedBody');
  // data is fully typed and validated
});
```

---

## Component Organization

### Component Hierarchy

**Three-tier component structure:**

1. **Base Components (`components/ui/`)**: Unstyled or minimally styled primitives from shadcn/ui
2. **Shared Components (`components/shared/`)**: Composed components used across features
3. **Feature Components (`components/{feature}/`)**: Domain-specific components

### Component Best Practices

**1. Use TypeScript interfaces for props:**
```typescript
// components/events/EventCard.tsx
interface EventCardProps {
  event: Event;
  variant?: 'default' | 'compact';
  onEdit?: (event: Event) => void;
  onDelete?: (event: Event) => void;
}

export function EventCard({
  event,
  variant = 'default',
  onEdit,
  onDelete
}: EventCardProps) {
  // Component implementation
}
```

**2. Use composition over configuration:**
```typescript
// Good: Composition
<Card>
  <CardHeader>
    <CardTitle>Event Title</CardTitle>
  </CardHeader>
  <CardContent>
    Event details...
  </CardContent>
</Card>

// Avoid: Over-configuration
<Card
  title="Event Title"
  content="Event details..."
  showHeader={true}
  headerActions={[...]}
/>
```

**3. Extract reusable logic to hooks:**
```typescript
// lib/hooks/useEvent.ts
export function useEvent(uuid: string) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchEvent(uuid)
      .then(setEvent)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [uuid]);

  return { event, loading, error };
}

// Usage in component
function EventDetail({ uuid }: { uuid: string }) {
  const { event, loading, error } = useEvent(uuid);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!event) return <NotFound />;

  return <EventContent event={event} />;
}
```

**4. Co-locate component tests:**
```
components/
├── events/
│   ├── EventCard.tsx
│   ├── EventCard.test.tsx
│   └── EventCard.stories.tsx (if using Storybook)
```

---

## State Management Strategy

### Nanostores Architecture

**Store Types:**

1. **Atoms** - Single values
2. **Maps** - Key-value objects
3. **Computed** - Derived values

### Store Organization

```typescript
// stores/auth.ts
import { atom, computed } from 'nanostores';
import type { User } from '@planloo/shared/types';

export const $user = atom<User | null>(null);
export const $session = atom<{ id: string; expiresAt: Date } | null>(null);
export const $isAuthenticated = computed($user, (user) => user !== null);
export const $isAdmin = computed(
  $user,
  (user) => user?.platformRole === 'super_admin'
);

// Actions
export function setUser(user: User | null) {
  $user.set(user);
}

export function clearAuth() {
  $user.set(null);
  $session.set(null);
}
```

```typescript
// stores/events.ts
import { map, atom } from 'nanostores';
import type { Event } from '@planloo/shared/types';

// Store events as a map for efficient lookups
export const $events = map<Record<string, Event>>({});
export const $currentEventUuid = atom<string | null>(null);
export const $currentEvent = computed(
  [$events, $currentEventUuid],
  (events, uuid) => uuid ? events[uuid] : null
);

// Actions
export function setEvents(events: Event[]) {
  const eventsMap = events.reduce((acc, event) => {
    acc[event.uuid] = event;
    return acc;
  }, {} as Record<string, Event>);
  $events.set(eventsMap);
}

export function addEvent(event: Event) {
  $events.setKey(event.uuid, event);
}

export function updateEvent(uuid: string, updates: Partial<Event>) {
  const current = $events.get()[uuid];
  if (current) {
    $events.setKey(uuid, { ...current, ...updates });
  }
}

export function removeEvent(uuid: string) {
  const events = { ...$events.get() };
  delete events[uuid];
  $events.set(events);
}

export function setCurrentEvent(uuid: string) {
  $currentEventUuid.set(uuid);
}
```

```typescript
// stores/ui.ts
import { atom } from 'nanostores';

export const $modals = atom<{
  createEvent: boolean;
  addGuest: boolean;
  confirmDelete: boolean;
}>({
  createEvent: false,
  addGuest: false,
  confirmDelete: false
});

export const $toasts = atom<Array<{
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}>>([]);

// Actions
export function openModal(modal: keyof typeof $modals.value) {
  $modals.set({ ...$modals.get(), [modal]: true });
}

export function closeModal(modal: keyof typeof $modals.value) {
  $modals.set({ ...$modals.get(), [modal]: false });
}

export function showToast(
  type: 'success' | 'error' | 'warning' | 'info',
  message: string
) {
  const id = crypto.randomUUID();
  $toasts.set([...$toasts.get(), { id, type, message }]);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    $toasts.set($toasts.get().filter(t => t.id !== id));
  }, 5000);
}
```

### Using Stores in React Components

```typescript
// components/events/EventList.tsx
import { useStore } from '@nanostores/react';
import { $events, fetchEvents } from '@/stores/events';

export function EventList() {
  const events = useStore($events);

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div>
      {Object.values(events).map(event => (
        <EventCard key={event.uuid} event={event} />
      ))}
    </div>
  );
}
```

### Using Stores in Astro Components

```astro
---
// pages/dashboard/index.astro
import { $user } from '@/stores/auth';

// Access store value on server
const user = $user.get();
---

<script>
  // Access store on client
  import { $user } from '@/stores/auth';
  import { initAuth } from '@/stores/auth';

  // Initialize auth on page load
  initAuth();

  // Listen to changes
  $user.subscribe(user => {
    console.log('User changed:', user);
  });
</script>
```

---

## API Client Architecture

### Base API Client

```typescript
// frontend/src/lib/api/client.ts
import type { ApiResponse, ApiError } from '@planloo/shared/types';

const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787/api/v1';

export class ApiClient {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultOptions: RequestInit = {
      credentials: 'include', // Send cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    // Handle non-OK responses
    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new ApiClientError(error.error.code, error.error.message);
    }

    // Handle no-content responses
    if (response.status === 204) {
      return undefined as T;
    }

    const data: ApiResponse<T> = await response.json();
    return data.data;
  }

  static get<T>(endpoint: string, params?: Record<string, string>) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<T>(`${endpoint}${query}`, { method: 'GET' });
  }

  static post<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  static patch<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  static delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}
```

### Feature-Specific API Modules

```typescript
// frontend/src/lib/api/events.ts
import { ApiClient } from './client';
import type {
  Event,
  CreateEventRequest,
  CreateEventResponse,
  ListEventsRequest,
  ListEventsResponse
} from '@planloo/shared/types';

export const EventsApi = {
  list: (params?: ListEventsRequest) =>
    ApiClient.get<ListEventsResponse>('/events', params as any),

  getByUuid: (uuid: string) =>
    ApiClient.get<{ event: Event }>(`/events/${uuid}`),

  create: (data: CreateEventRequest) =>
    ApiClient.post<CreateEventResponse>('/events', data),

  update: (uuid: string, data: Partial<Event>) =>
    ApiClient.patch<{ event: Event }>(`/events/${uuid}`, data),

  delete: (uuid: string) =>
    ApiClient.delete(`/events/${uuid}`)
};
```

### Server-Side Data Fetching (Astro)

```astro
---
// pages/dashboard/events/[uuid].astro
import { EventsApi } from '@/lib/api/events';
import DashboardLayout from '@/layouts/DashboardLayout.astro';

const { uuid } = Astro.params;

let event;
let error;

try {
  const response = await EventsApi.getByUuid(uuid);
  event = response.event;
} catch (e) {
  error = e instanceof Error ? e.message : 'Failed to load event';
}

if (error || !event) {
  return Astro.redirect('/dashboard/events?error=not-found');
}
---

<DashboardLayout title={event.title}>
  <!-- Event content -->
</DashboardLayout>
```

---

## Authentication Flow

### Better Auth Setup

**Backend Configuration:**

```typescript
// backend/src/lib/auth.ts
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
      updateAge: 60 * 60 * 24,     // Update every 24 hours
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5 // 5 minutes
      }
    },

    user: {
      additionalFields: {
        platformRole: {
          type: 'string',
          defaultValue: 'user'
        },
        phone: {
          type: 'string',
          required: false
        }
      }
    }
  });
}
```

**Frontend Auth Client:**

```typescript
// frontend/src/lib/auth/client.ts
import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
  baseURL: import.meta.env.PUBLIC_API_URL
});

// Convenience methods
export const auth = {
  signIn: authClient.signIn.email,
  signUp: authClient.signUp.email,
  signOut: authClient.signOut,
  getSession: authClient.getSession,

  // Social auth
  signInWithGoogle: () => authClient.signIn.social({ provider: 'google' }),
  signInWithGitHub: () => authClient.signIn.social({ provider: 'github' })
};
```

### Protected Routes

**Server-Side Protection (Astro):**

```astro
---
// layouts/DashboardLayout.astro
import { auth } from '@/lib/auth/client';

// Check authentication on server
const session = await auth.getSession();

if (!session.data) {
  return Astro.redirect('/login?redirect=' + Astro.url.pathname);
}

const user = session.data.user;
---

<html>
  <body>
    <!-- Dashboard layout with authenticated user -->
  </body>
</html>
```

**Client-Side Protection (React):**

```typescript
// lib/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { auth } from '@/lib/auth/client';
import { setUser, clearAuth } from '@/stores/auth';

export function useAuth() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auth.getSession()
      .then(({ data }) => {
        if (data) {
          setUser(data.user);
        } else {
          clearAuth();
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return { loading };
}
```

---

## Data Fetching Patterns

### Pattern 1: Server-Side Fetching (SSR)

**Best for:** Initial page load, SEO-critical content

```astro
---
// pages/providers/[uuid].astro
import { ProvidersApi } from '@/lib/api/providers';

const { uuid } = Astro.params;
const { provider } = await ProvidersApi.getByUuid(uuid);
---

<PublicLayout title={provider.businessName}>
  <ProviderDetails provider={provider} />
</PublicLayout>
```

### Pattern 2: Client-Side Fetching (CSR)

**Best for:** User-triggered actions, dynamic updates

```typescript
// components/events/EventList.tsx
import { useEffect, useState } from 'react';
import { EventsApi } from '@/lib/api/events';

export function EventList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    EventsApi.list()
      .then(({ events }) => setEvents(events))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return <div>{/* Render events */}</div>;
}
```

### Pattern 3: Hybrid Fetching

**Best for:** Interactive lists with filters

```astro
---
// pages/dashboard/events/index.astro
import { EventsApi } from '@/lib/api/events';

// Initial server-side fetch
const initialData = await EventsApi.list({ limit: 10 });
---

<DashboardLayout>
  <!-- Pass server data to client component -->
  <EventList
    client:load
    initialEvents={initialData.events}
    initialCursor={initialData.pagination.nextCursor}
  />
</DashboardLayout>
```

```typescript
// components/events/EventList.tsx
interface EventListProps {
  initialEvents: Event[];
  initialCursor: string | null;
}

export function EventList({ initialEvents, initialCursor }: EventListProps) {
  const [events, setEvents] = useState(initialEvents);
  const [cursor, setCursor] = useState(initialCursor);

  const loadMore = async () => {
    if (!cursor) return;

    const { events: newEvents, pagination } = await EventsApi.list({
      cursor
    });

    setEvents([...events, ...newEvents]);
    setCursor(pagination.nextCursor);
  };

  return (
    <div>
      {events.map(event => <EventCard key={event.uuid} event={event} />)}
      {cursor && <button onClick={loadMore}>Load More</button>}
    </div>
  );
}
```

---

## Error Handling Strategy

### Frontend Error Handling

**1. API Error Handling:**

```typescript
// lib/api/client.ts
export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  isValidationError(): boolean {
    return this.code === 'VALIDATION_ERROR';
  }

  isAuthError(): boolean {
    return this.code === 'UNAUTHORIZED' || this.code === 'FORBIDDEN';
  }

  isNotFound(): boolean {
    return this.code === 'NOT_FOUND';
  }
}
```

**2. Error Boundary Component:**

```typescript
// components/shared/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error tracking service (e.g., Sentry)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!);
      }

      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**3. Form Error Handling:**

```typescript
// components/events/EventForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EventsApi } from '@/lib/api/events';
import { ApiClientError } from '@/lib/api/client';
import { showToast } from '@/stores/ui';

export function EventForm() {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm({
    resolver: zodResolver(createEventSchema)
  });

  const onSubmit = async (data) => {
    setServerError(null);

    try {
      const { event } = await EventsApi.create(data);
      showToast('success', 'Event created successfully');
      window.location.href = `/dashboard/events/${event.uuid}`;
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.isValidationError()) {
          // Map server validation errors to form fields
          const details = error.details as Array<{ field: string; message: string }>;
          details?.forEach(({ field, message }) => {
            setError(field as any, { message });
          });
        } else {
          setServerError(error.message);
        }
      } else {
        setServerError('An unexpected error occurred');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {serverError && (
        <Alert variant="error">
          {serverError}
        </Alert>
      )}

      {/* Form fields */}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Event'}
      </Button>
    </form>
  );
}
```

### Backend Error Handling

```typescript
// backend/src/middleware/errorHandler.ts
import { ErrorHandler } from 'hono';
import { ZodError } from 'zod';

export const errorHandler: ErrorHandler = (err, c) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      }
    }, 400);
  }

  // Database constraint errors
  if (err.message.includes('UNIQUE constraint failed')) {
    return c.json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Resource already exists'
      }
    }, 409);
  }

  // Custom app errors
  if (err.name === 'NotFoundError') {
    return c.json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: err.message
      }
    }, 404);
  }

  // Default error
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

## Testing Strategy

### Frontend Testing

**1. Unit Tests (Vitest):**

```typescript
// lib/utils/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate } from './format';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('handles zero', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });
});

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2026-08-15T14:00:00Z');
    expect(formatDate(date)).toBe('August 15, 2026');
  });
});
```

**2. Component Tests:**

```typescript
// components/events/EventCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventCard } from './EventCard';

describe('EventCard', () => {
  const mockEvent = {
    uuid: 'evt_123',
    title: 'Summer Wedding',
    startDate: new Date('2026-08-15'),
    status: 'planning' as const
  };

  it('renders event title', () => {
    render(<EventCard event={mockEvent} />);
    expect(screen.getByText('Summer Wedding')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<EventCard event={mockEvent} onEdit={onEdit} />);

    fireEvent.click(screen.getByLabelText('Edit event'));
    expect(onEdit).toHaveBeenCalledWith(mockEvent);
  });
});
```

**3. E2E Tests (Playwright):**

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can sign up and log in', async ({ page }) => {
  // Navigate to sign up
  await page.goto('/register');

  // Fill registration form
  await page.fill('[name="name"]', 'Test User');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'SecurePass123!');
  await page.fill('[name="confirmPassword"]', 'SecurePass123!');

  // Submit form
  await page.click('button[type="submit"]');

  // Should redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/);

  // Should see welcome message
  await expect(page.locator('h1')).toContainText('Welcome');
});
```

### Backend Testing

```typescript
// backend/tests/unit/services/event.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { EventService } from '@/services/event.service';

describe('EventService', () => {
  let eventService: EventService;

  beforeEach(() => {
    eventService = new EventService(testEnv);
  });

  it('creates an event', async () => {
    const event = await eventService.create('user_123', {
      title: 'Test Event',
      eventType: 'birthday',
      startDate: new Date('2026-08-15')
    });

    expect(event).toBeDefined();
    expect(event.title).toBe('Test Event');
    expect(event.userId).toBe('user_123');
  });

  it('throws error when title is too short', async () => {
    await expect(
      eventService.create('user_123', {
        title: 'Te',
        eventType: 'birthday',
        startDate: new Date('2026-08-15')
      })
    ).rejects.toThrow('Title must be at least 3 characters');
  });
});
```

---

## Development Workflow

### Initial Setup

```bash
# Clone repository
git clone https://github.com/planloo/planloo.git
cd planloo

# Install dependencies (all workspaces)
npm install

# Set up environment variables
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# Generate database
cd backend
npm run db:generate
npm run db:migrate
```

### Development Commands

**Frontend:**
```bash
cd frontend

# Start dev server
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Test
npm run test

# E2E tests
npm run test:e2e

# Build
npm run build

# Preview production build
npm run preview
```

**Backend:**
```bash
cd backend

# Start dev server with Wrangler
npm run dev

# Type check
npm run type-check

# Test
npm run test

# Generate migration
npm run db:generate

# Run migrations
npm run db:migrate

# Deploy to Cloudflare
npm run deploy
```

### Git Workflow

**Branch Naming:**
- `feature/` - New features
- `bugfix/` - Bug fixes
- `hotfix/` - Urgent production fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates

**Commit Convention:**
```
feat: Add event creation form
fix: Resolve RSVP token generation issue
refactor: Simplify API client error handling
docs: Update implementation guide
test: Add E2E tests for authentication flow
```

---

## Deployment Strategy

### Frontend Deployment (Cloudflare Pages)

**Build Configuration:**
```yaml
# .github/workflows/deploy-frontend.yml
name: Deploy Frontend
on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - 'shared/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: cd frontend && npm run build
        env:
          PUBLIC_API_URL: ${{ secrets.PUBLIC_API_URL }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: planloo
          directory: frontend/dist
```

### Backend Deployment (Cloudflare Workers)

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - 'shared/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: cd backend && npm run db:migrate
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Deploy
        run: cd backend && npm run deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Environment Variables

**Frontend (.env):**
```bash
PUBLIC_API_URL=https://api.planloo.com/api/v1
PUBLIC_SITE_URL=https://planloo.com
```

**Backend (Cloudflare Secrets):**
```bash
# Set via Wrangler CLI
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put EMAIL_API_KEY
```

---

## Next Steps

1. **Initialize Projects**: Create frontend and backend directories with initial configs
2. **Set Up Shared Package**: Create shared types and validation schemas
3. **Implement Base Components**: Build shadcn/ui components with Planloo design tokens
4. **Create Auth Flow**: Implement Better Auth integration
5. **Build Core Features**: Event management, guest list, budget tracking
6. **Write Tests**: Unit, integration, and E2E tests
7. **Deploy to Staging**: Test full deployment pipeline
8. **User Acceptance Testing**: Validate with target users
9. **Production Deployment**: Launch MVP

---

## Revision History

| Version | Date       | Author                      | Changes                          |
|---------|------------|-----------------------------|----------------------------------|
| 1.0     | 2026-02-02 | Full-Stack Developer Agent  | Initial implementation guide     |
