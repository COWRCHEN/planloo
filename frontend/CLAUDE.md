# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the frontend code.

## MANDATORY RULES - MUST FOLLOW

**These rules are non-negotiable. Violating them will result in code that doesn't match the project standards.**

### 1. UI Components: Use shadcn/ui + Radix ONLY
- **DO NOT** create custom UI components from scratch
- **ALWAYS** use shadcn/ui components from `@/components/ui/`
- Add new shadcn/ui components via: `npx shadcn@latest add <component>`
- Components.json is configured at project root
- Use Radix primitives for accessible, unstyled components

### 2. Data Fetching: Use TanStack Query ONLY
- **DO NOT** use `useState` + `useEffect` for API calls
- **ALWAYS** use TanStack Query (`@tanstack/react-query`) for:
  - Server state management
  - Data fetching (useQuery)
  - Mutations (useMutation)
  - Caching and invalidation
- Create custom hooks in `@/hooks/` using TanStack Query

### 3. Forms: Use react-hook-form + Zod
- **ALWAYS** use `react-hook-form` for form handling
- **ALWAYS** use `zod` for validation schemas
- Use `@hookform/resolvers` for zod integration

### 4. Client State: Use Nanostores
- For non-server state (UI state, local preferences), use Nanostores
- Do NOT use TanStack Query for pure client-side state

### 5. UI Animation: Motion (prev Framer Motion)
- Declarative Animations: Motion allows defining animations directly in JSX for ease of use.
- Smooth Transitions: Provides built-in support for seamless transitions like opacity, position, and scale.
- Gesture-based Animations: Triggers animations based on user gestures like hover, tap, and drag.
- Page Transitions: Supports smooth transitions between pages.
- Customizable and Flexible: Offers control over timing, easing, and variants for tailored animations.

### 6. Mobile Responsiveness
- Responsive breakpoints: 320px, 768px, 1024px, 1440px
- Touch-friendly UI elements (44px minimum touch targets)
- Mobile navigation pattern (hamburger menu)
- Swipe gestures for galleries
- Mobile-optimized forms
- Progressive enhancement approach

### Quick Reference
```tsx
// CORRECT: Using TanStack Query for API data
import { useQuery, useMutation } from '@tanstack/react-query';
const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

// WRONG: Using useState + useEffect for API data
const [users, setUsers] = useState([]);
useEffect(() => { fetchUsers().then(setUsers) }, []);

// CORRECT: Using shadcn/ui components
import { Button } from '@/components/ui/button';
<Button variant="default">Click me</Button>

// WRONG: Creating custom button components
const CustomButton = ({ children }) => <button className="...">{children}</button>;
```

---

## Commands

```bash
npm run dev              # Start Astro dev server (port 4321)
npm run build            # Build for production (runs astro check first)
npm run preview          # Preview production build locally

# Quality
npm run type-check       # TypeScript check (tsc --noEmit)
npm run lint             # ESLint (.ts, .tsx, .astro files)
npm run lint:fix         # ESLint with auto-fix
npm run format           # Prettier

# Testing
npm run test             # Vitest unit tests
npm run test:ui          # Vitest with browser UI
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright with UI
```

## Architecture

### Tech Stack
- **Framework**: Astro 5.x with hybrid rendering
- **UI**: React 19 with shadcn/ui + Radix for interactive components
- **UI Animation**: Motion (prev Framer Motion) 
- **Styling**: Tailwind CSS primitives
- **Asynchronous state management, server-state utilities and data fetching**: TanStack
Query
- **State**: Nanostores (lightweight reactive stores)
- **Auth**: Better Auth client
- **Forms**: react-hook-form + Zod validation
- **Deployment**: Cloudflare Pages

### Directory Structure (Planned)

```
src/
├── components/
│   ├── auth/            # Login, register, etc.
│   ├── dashboard/       # Dashboard-specific
│   ├── events/          # Event components
│   ├── guests/          # Guest management
│   ├── budget/          # Budget components
│   ├── shared/          # Common components
│   └── ui/              # shadcn/ui base components
├── layouts/
│   ├── BaseLayout.astro
│   ├── AuthLayout.astro
│   └── DashboardLayout.astro
├── pages/               # File-based routing
│   ├── index.astro
│   ├── login.astro
│   ├── dashboard/
│   │   ├── index.astro
│   │   └── events/[uuid].astro
│   └── rsvp/[uuid].astro
├── stores/              # Nanostores
├── lib/
│   ├── api/            # API client
│   ├── auth/           # Better Auth client
│   └── validation/     # Zod schemas
├── styles/
│   └── global.css
└── types/
```

### Path Aliases

```typescript
import { Button } from '@/components/ui/button';
import { $user } from '@/stores/auth';
import { EventsApi } from '@/lib/api/events';
```

## Rendering Strategy

### Hybrid Mode (`output: 'hybrid'`)

- **SSG (default)**: Homepage, marketing, provider directories
- **SSR (opt-in)**: Dashboard, event details, user profile
- Add `export const prerender = false` to enable SSR for a page

### Island Architecture

Use `client:*` directives to control React hydration:

```astro
---
import GuestList from '@/components/guests/GuestList';
import BudgetChart from '@/components/budget/BudgetChart';
---

<!-- Hydrate immediately -->
<GuestList client:load eventId={event.uuid} />

<!-- Hydrate when visible (lazy) -->
<BudgetChart client:visible data={budgetData} />

<!-- Hydrate when browser idle -->
<SearchFilter client:idle />

<!-- Client-only (no SSR) -->
<MapComponent client:only="react" />
```

## Component Patterns

### Astro Components (.astro)

Use for static/server content:

```astro
---
import type { Event } from '@/types/models';
interface Props {
  event: Event;
}
const { event } = Astro.props;
---

<article class="card">
  <h3>{event.title}</h3>
  <p>{event.description}</p>
</article>
```

### React Components (.tsx)

Use for interactive features:

```tsx
import { useStore } from '@nanostores/react';
import { $currentEvent } from '@/stores/events';

export function GuestForm() {
  const event = useStore($currentEvent);
  // ...
}
```

## State Management (Nanostores)

```typescript
// stores/auth.ts
import { atom, computed } from 'nanostores';
import type { User } from '@/types/models';

export const $user = atom<User | null>(null);
export const $isAuthenticated = computed($user, (user) => user !== null);

// In React components
import { useStore } from '@nanostores/react';
const user = useStore($user);
```

## Data Fetching with TanStack Query

**IMPORTANT**: Always use TanStack Query for data fetching. Do NOT use useState + useEffect.

```typescript
// hooks/use-events.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = import.meta.env.PUBLIC_API_URL;

// Query keys for caching
export const eventKeys = {
  all: ['events'] as const,
  list: () => [...eventKeys.all, 'list'] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
};

// Fetch events with caching
export function useEvents() {
  return useQuery({
    queryKey: eventKeys.list(),
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/events`, { credentials: 'include' });
      const { data } = await res.json();
      return data;
    },
  });
}

// Mutation with cache invalidation
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newEvent: CreateEventInput) => {
      const res = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newEvent),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.list() });
    },
  });
}

// Usage in component
function EventList() {
  const { data: events, isLoading, error } = useEvents();
  const createEvent = useCreateEvent();

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      {events.map(event => <EventCard key={event.id} event={event} />)}
      <Button onClick={() => createEvent.mutate({ title: 'New Event' })}>
        {createEvent.isPending ? 'Creating...' : 'Create Event'}
      </Button>
    </div>
  );
}
```

## Better Auth Client

```typescript
// lib/auth-client.ts
import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
  baseURL: import.meta.env.PUBLIC_API_URL
});

// Usage
await authClient.signIn.email({ email, password });
await authClient.signUp.email({ email, password, name });
await authClient.signIn.social({ provider: 'google' });
await authClient.signOut();
const { data: session } = await authClient.getSession();
```

## Environment Variables

```bash
# .env
PUBLIC_API_URL=http://localhost:8787/api/v1
PUBLIC_SITE_URL=http://localhost:4321
```

Access in code:
- Server-side: `import.meta.env.SECRET_KEY`
- Client-side: `import.meta.env.PUBLIC_*` only

## Tailwind + shadcn/ui

- Base components in `src/components/ui/`
- Use `cn()` utility for class merging
- Custom colors defined in `tailwind.config.mjs`

```tsx
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

<Button variant="primary" className={cn('mt-4', isLoading && 'opacity-50')}>
  Submit
</Button>
```
