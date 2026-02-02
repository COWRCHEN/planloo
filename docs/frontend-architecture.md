# Frontend Architecture - Planloo

## Overview

This document outlines the frontend architecture for Planloo using Astro v5.17 with a focus on performance, SEO, and developer experience.

**Framework:** Astro v5.17
**UI Library:** React 19 with shadcn/ui + Radix (for interactive components)
**Styling:** Tailwind CSS
**Type Safety:** TypeScript (strict mode)
**State Management:** Nanostores (lightweight reactive stores)

---

## Project Structure

```
planloo/frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── auth/           # Authentication components
│   │   ├── dashboard/      # Dashboard-specific components
│   │   ├── events/         # Event-related components
│   │   ├── guests/         # Guest management components
│   │   ├── budget/         # Budget components
│   │   ├── providers/      # Service provider components
│   │   ├── venues/         # Venue components
│   │   ├── shared/         # Shared/common components
│   │   └── ui/             # Base UI components (Button, Input, etc.)
│   │
│   ├── layouts/            # Page layouts
│   │   ├── BaseLayout.astro       # Base HTML structure
│   │   ├── AuthLayout.astro       # Layout for auth pages
│   │   ├── DashboardLayout.astro  # Layout for authenticated pages
│   │   └── PublicLayout.astro     # Layout for public pages
│   │
│   ├── pages/              # File-based routing (Astro convention)
│   │   ├── index.astro            # Homepage
│   │   ├── login.astro            # Login page
│   │   ├── register.astro         # Registration page
│   │   ├── dashboard/
│   │   │   ├── index.astro        # Dashboard home
│   │   │   └── events/
│   │   │       ├── index.astro    # Event list
│   │   │       ├── new.astro      # Create event
│   │   │       └── [uuid].astro   # Event detail (dynamic route)
│   │   ├── rsvp/
│   │   │   └── [uuid].astro       # Public RSVP page
│   │   ├── providers/
│   │   │   ├── index.astro        # Provider directory
│   │   │   └── [uuid].astro       # Provider detail
│   │   └── venues/
│   │       ├── index.astro        # Venue directory
│   │       └── [uuid].astro       # Venue detail
│   │
│   ├── lib/                # Utility libraries
│   │   ├── api/           # API client functions
│   │   ├── auth/          # Auth helpers
│   │   ├── utils/         # General utilities
│   │   ├── validation/    # Form validation schemas (Zod)
│   │   └── constants/     # Constants and config
│   │
│   ├── stores/            # Nanostores for state management
│   │   ├── auth.ts        # Auth state
│   │   ├── events.ts      # Event data
│   │   └── ui.ts          # UI state (modals, toasts, etc.)
│   │
│   ├── styles/            # Global styles
│   │   ├── global.css     # Global CSS
│   │   └── tailwind.css   # Tailwind directives
│   │
│   ├── types/             # TypeScript type definitions
│   │   ├── api.ts         # API response types
│   │   ├── models.ts      # Data models
│   │   └── index.ts       # Type exports
│   │
│   └── env.d.ts           # Environment type definitions
│
├── public/                # Static assets
│   ├── images/
│   ├── fonts/
│   └── favicon.ico
│
├── astro.config.mjs       # Astro configuration
├── tailwind.config.mjs    # Tailwind configuration
├── package.json
└── tsconfig.json          # TypeScript configuration
```

---

## Rendering Strategy

### Hybrid Rendering (Astro's Strength)

Astro supports multiple rendering modes per page. Here's our strategy:

**Static Generation (SSG):**
- Homepage
- Marketing pages
- Provider/Venue directory pages (with ISR)
- Public RSVP pages (pre-rendered when possible)

**Server-Side Rendering (SSR):**
- Dashboard pages (authenticated)
- Event detail pages (dynamic data)
- User profile pages
- Admin pages

**Client-Side Rendering (CSR):**
- Interactive forms
- Real-time updates (guest check-in)
- Dynamic search/filters

### Configuration

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'hybrid', // Enable hybrid rendering
  adapter: cloudflare({
    mode: 'directory',
    routes: {
      strategy: 'include',
      include: ['/api/*', '/dashboard/*']
    }
  }),
  integrations: [
    react(),
    tailwind()
  ],
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp' // Image optimization
    }
  },
  vite: {
    optimizeDeps: {
      include: ['react', 'react-dom']
    }
  }
});
```

---

## Component Architecture

### Astro Components (.astro)

Use for static or server-rendered content:

```astro
---
// components/events/EventCard.astro
import { Image } from 'astro:assets';
import type { Event } from '@/types/models';

interface Props {
  event: Event;
}

const { event } = Astro.props;
---

<article class="event-card border rounded-lg p-6 hover:shadow-lg transition">
  {event.coverImageUrl && (
    <Image
      src={event.coverImageUrl}
      alt={event.title}
      width={400}
      height={300}
      class="rounded-lg mb-4"
    />
  )}
  <h3 class="text-xl font-bold mb-2">{event.title}</h3>
  <p class="text-gray-600 mb-4">{event.description}</p>
  <div class="flex justify-between items-center">
    <span class="text-sm text-gray-500">
      {new Date(event.startDate).toLocaleDateString()}
    </span>
    <a href={`/dashboard/events/${event.uuid}`} class="btn btn-primary">
      View Details
    </a>
  </div>
</article>
```

### React Components (.tsx)

Use for interactive features:

```tsx
// components/guests/GuestForm.tsx
import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $currentEvent } from '@/stores/events';
import type { GuestFormData } from '@/types/models';

export function GuestForm() {
  const event = useStore($currentEvent);
  const [formData, setFormData] = useState<GuestFormData>({
    firstName: '',
    lastName: '',
    email: '',
    category: 'other'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // API call to create guest
    await fetch(`/api/v1/events/${event.uuid}/guests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields */}
    </form>
  );
}
```

### Island Architecture

Use `client:*` directives to control hydration:

```astro
---
// pages/dashboard/events/[uuid].astro
import DashboardLayout from '@/layouts/DashboardLayout.astro';
import EventHeader from '@/components/events/EventHeader.astro';
import GuestList from '@/components/guests/GuestList'; // React component
import BudgetOverview from '@/components/budget/BudgetOverview'; // React component
---

<DashboardLayout title="Event Details">
  <EventHeader event={event} />

  <!-- Static content loads instantly -->
  <div class="grid md:grid-cols-2 gap-8">
    <!-- Interactive component hydrates on page load -->
    <GuestList client:load eventId={event.uuid} />

    <!-- Interactive component hydrates when visible -->
    <BudgetOverview client:visible eventId={event.uuid} />
  </div>
</DashboardLayout>
```

**Client Directives:**
- `client:load` - Hydrate immediately on page load
- `client:idle` - Hydrate when browser is idle
- `client:visible` - Hydrate when element is visible
- `client:media` - Hydrate based on media query
- `client:only` - Only render on client (CSR)

---

## State Management

### Better Auth Client

```typescript
// lib/auth-client.ts
import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
  baseURL: import.meta.env.PUBLIC_API_URL
});

// Usage in components:
// const { data: session } = await authClient.getSession()
// await authClient.signIn.email({ email, password })
// await authClient.signIn.social({ provider: 'google' })
// await authClient.signUp.email({ email, password, name })
// await authClient.signOut()
```

### Nanostores

Lightweight, framework-agnostic state management.

```typescript
// stores/auth.ts
import { atom, computed } from 'nanostores';
import { authClient } from '@/lib/auth-client';
import type { User } from '@/types/models';

export const $user = atom<User | null>(null);
export const $session = atom<{ id: string; expiresAt: Date } | null>(null);
export const $isAuthenticated = computed($user, (user) => user !== null);

export async function initAuth() {
  const { data } = await authClient.getSession();
  if (data) {
    $user.set(data.user);
    $session.set(data.session);
  }
}

export function setUser(user: User | null) {
  $user.set(user);
}

export async function logout() {
  await authClient.signOut();
  $user.set(null);
  $session.set(null);
}
```

```typescript
// stores/events.ts
import { atom, map } from 'nanostores';
import type { Event } from '@/types/models';

export const $events = map<Record<string, Event>>({});
export const $currentEvent = atom<Event | null>(null);

export async function fetchEvents() {
  const response = await fetch('/api/v1/events');
  const { data } = await response.json();

  const eventsMap = data.events.reduce((acc, event) => {
    acc[event.uuid] = event;
    return acc;
  }, {});

  $events.set(eventsMap);
}

export function setCurrentEvent(uuid: string) {
  const events = $events.get();
  $currentEvent.set(events[uuid] || null);
}
```

---

## API Client

### Fetch Wrapper

```typescript
// lib/api/client.ts
import type { ApiResponse, ApiError } from '@/types/api';

const API_BASE_URL = import.meta.env.PUBLIC_API_URL || '/api/v1';

export class ApiClient {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultOptions: RequestInit = {
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error.message);
    }

    const data: ApiResponse<T> = await response.json();
    return data.data;
  }

  static get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
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
```

### API Service Layer

```typescript
// lib/api/events.ts
import { ApiClient } from './client';
import type { Event, CreateEventData } from '@/types/models';

export const EventsApi = {
  getAll: () => ApiClient.get<{ events: Event[] }>('/events'),

  getById: (uuid: string) => ApiClient.get<{ event: Event }>(`/events/${uuid}`),

  create: (data: CreateEventData) =>
    ApiClient.post<{ event: Event }>('/events', data),

  update: (uuid: string, data: Partial<Event>) =>
    ApiClient.patch<{ event: Event }>(`/events/${uuid}`, data),

  delete: (uuid: string) => ApiClient.delete(`/events/${uuid}`)
};
```

---

## Form Handling & Validation

### Zod Schemas

```typescript
// lib/validation/event.ts
import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  eventType: z.enum(['wedding', 'birthday', 'corporate', 'conference', 'other']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  locationName: z.string().optional(),
  locationCity: z.string().optional(),
  guestCountExpected: z.number().int().positive().optional(),
  budgetTotal: z.number().positive().optional()
});

export type CreateEventFormData = z.infer<typeof createEventSchema>;
```

### Form Component

```tsx
// components/events/CreateEventForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEventSchema, type CreateEventFormData } from '@/lib/validation/event';
import { EventsApi } from '@/lib/api/events';

export function CreateEventForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema)
  });

  const onSubmit = async (data: CreateEventFormData) => {
    try {
      const { event } = await EventsApi.create(data);
      window.location.href = `/dashboard/events/${event.uuid}`;
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Event Title *
        </label>
        <input
          {...register('title')}
          type="text"
          className="mt-1 block w-full rounded-md border-gray-300"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      {/* More fields */}

      <button type="submit" className="btn btn-primary">
        Create Event
      </button>
    </form>
  );
}
```

---

## Styling with Tailwind CSS

### Configuration

```javascript
// tailwind.config.mjs
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8'
        },
        secondary: {
          500: '#8b5cf6',
          600: '#7c3aed'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'sans-serif']
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
};
```

### Component Classes

```css
/* styles/global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn {
    @apply px-4 py-2 rounded-lg font-medium transition-colors;
  }

  .btn-primary {
    @apply bg-primary-600 text-white hover:bg-primary-700;
  }

  .btn-secondary {
    @apply bg-gray-200 text-gray-800 hover:bg-gray-300;
  }

  .card {
    @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
  }

  .input {
    @apply w-full rounded-lg border-gray-300 focus:border-primary-500 focus:ring focus:ring-primary-200;
  }
}
```

---

## SEO Implementation

### Meta Tags Component

```astro
---
// components/shared/SEO.astro
interface Props {
  title: string;
  description: string;
  image?: string;
  canonical?: string;
  type?: 'website' | 'article';
}

const { title, description, image, canonical, type = 'website' } = Astro.props;
const defaultImage = '/images/og-default.jpg';
const siteUrl = import.meta.env.PUBLIC_SITE_URL;
---

<head>
  <title>{title} | Planloo</title>
  <meta name="description" content={description} />

  <!-- Open Graph -->
  <meta property="og:type" content={type} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={image || defaultImage} />
  <meta property="og:url" content={canonical || Astro.url.href} />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={image || defaultImage} />

  <!-- Canonical -->
  {canonical && <link rel="canonical" href={canonical} />}
</head>
```

### Structured Data

```astro
---
// components/shared/StructuredData.astro
import type { Event } from '@/types/models';

interface Props {
  event: Event;
}

const { event } = Astro.props;

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Event",
  "name": event.title,
  "description": event.description,
  "startDate": event.startDate,
  "endDate": event.endDate,
  "location": {
    "@type": "Place",
    "name": event.locationName,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": event.locationCity,
      "addressRegion": event.locationState,
      "addressCountry": event.locationCountry
    }
  }
};
---

<script type="application/ld+json" set:html={JSON.stringify(structuredData)} />
```

---

## Performance Optimization

### Image Optimization

```astro
---
import { Image, Picture } from 'astro:assets';
import placeholderImage from '@/assets/placeholder.jpg';
---

<!-- Optimized image with lazy loading -->
<Image
  src={event.coverImageUrl || placeholderImage}
  alt={event.title}
  width={800}
  height={600}
  format="webp"
  loading="lazy"
  decoding="async"
/>

<!-- Responsive image with multiple formats -->
<Picture
  src={event.coverImageUrl}
  widths={[400, 800, 1200]}
  sizes="(max-width: 768px) 100vw, 800px"
  alt={event.title}
  formats={['avif', 'webp', 'jpeg']}
/>
```

### Code Splitting

```astro
---
// Only load heavy components when needed
const HeavyChart = (await import('@/components/budget/BudgetChart')).default;
---

<div>
  {showChart && <HeavyChart client:visible data={budgetData} />}
</div>
```

---

## Accessibility

### ARIA Labels

```tsx
<button
  aria-label="Delete guest"
  aria-describedby="delete-warning"
  onClick={handleDelete}
>
  <TrashIcon className="w-5 h-5" />
</button>
<span id="delete-warning" className="sr-only">
  This action cannot be undone
</span>
```

### Keyboard Navigation

```tsx
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</div>
```

---

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// lib/utils/formatDate.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2026-08-15T14:00:00Z');
    expect(formatDate(date)).toBe('August 15, 2026');
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/create-event.spec.ts
import { test, expect } from '@playwright/test';

test('user can create an event', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await page.goto('/dashboard/events/new');
  await page.fill('[name="title"]', 'My Summer Wedding');
  await page.selectOption('[name="eventType"]', 'wedding');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/dashboard\/events\/evt_/);
  await expect(page.locator('h1')).toContainText('My Summer Wedding');
});
```

---

## Deployment Configuration

### Environment Variables

```bash
# .env.development
PUBLIC_API_URL=http://localhost:8787/api/v1
PUBLIC_SITE_URL=http://localhost:4321

# .env.production
PUBLIC_API_URL=https://api.planloo.com/api/v1
PUBLIC_SITE_URL=https://planloo.com
```

### Build Command

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "type-check": "tsc --noEmit",
    "lint": "eslint src/",
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | Product Manager | Initial frontend architecture specification |
