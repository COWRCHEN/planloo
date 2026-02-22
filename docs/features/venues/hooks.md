# Venue Data Hooks

All hooks are in `frontend/src/hooks/use-providers.ts`.

Uses TanStack Query with `handleResponse` pattern and 5-minute `staleTime`.

---

## Query Keys

```typescript
export const venueKeys = {
  all: ['venues'],
  lists: () => [...venueKeys.all, 'list'],
  list: (filters?) => [...venueKeys.lists(), filters],
  details: () => [...venueKeys.all, 'detail'],
  detail: (uuid) => [...venueKeys.details(), uuid],
  favorites: () => [...venueKeys.all, 'favorites'],
  availability: (uuid, date) => [...venueKeys.all, 'availability', uuid, date],
  nearby: (params) => [...venueKeys.all, 'nearby', params],
};
```

---

## Query Hooks

### `useVenues(filters?)`

Fetches paginated venue list with all filter params (search, venueType, city, state, country, capacityMin, priceMax, amenities, favoritesOnly, sort, pagination).

**Returns:** `{ items: VenueResponse[], meta: { total, limit, offset } }`

---

### `useVenue(uuid)`

Fetches a single venue by UUID. Includes `isFavorited` field.

**Enabled:** Only when `uuid` is truthy.

**Returns:** `VenueResponse | undefined`

---

### `useVenueAvailability(venueUuid, date)`

Checks venue availability for a specific date.

**Enabled:** Only when both `venueUuid` and `date` are truthy.

**Returns:** `AvailabilityCheckResult | undefined`

```typescript
interface AvailabilityCheckResult {
  available: boolean;
  conflictCount: number;
  date: string;
}
```

---

### `useFavoriteVenues()`

Fetches all venues the current user has favorited.

**Returns:** `VenueResponse[]` (all with `isFavorited: true`)

---

### `useNearbyVenues(params?)`

Fetches nearby venues matching a city or postal code prefix. Used by `NearbyVenueSuggestions` in the event form.

**Params:** `NearbyQuery | undefined`

```typescript
interface NearbyQuery {
  city?: string;
  postalCode?: string;
  country?: string;
  venueType?: VenueType;
  limit?: number;          // default 10, max 50
}
```

**Enabled:** Only when `params` is defined and has either `city` or `postalCode`.

**Stale time:** 5 minutes.

**Returns:** `VenueResponse[] | undefined`

---

## Mutation Hooks

### `useToggleFavorite()`

Toggles favorite status on a venue. POST to `/venues/favorites/:venueUuid`.

**Input:** `venueUuid: string`

**Returns:** `{ favorited: boolean }`

**Invalidates:** `venueKeys.lists()`, `venueKeys.details()`, `venueKeys.favorites()`

---

### `useCreateVenue()`

Creates a new venue. POST to `/venues`.

**Input:** `CreateVenueInput`

**Invalidates:** `venueKeys.lists()`

---

### `useUpdateVenue(uuid)`

Updates a venue. PATCH to `/venues/:uuid`.

**Input:** `UpdateVenueInput`

**Invalidates:** `venueKeys.lists()`, sets cache for `venueKeys.detail(uuid)`

---

### `useDeleteVenue()`

Soft-deletes a venue. DELETE to `/venues/:uuid`.

**Input:** `uuid: string`

**Invalidates:** `venueKeys.lists()`, removes `venueKeys.detail(uuid)` from cache

---

## Types

### `ListVenuesQuery`

```typescript
interface ListVenuesQuery {
  search?: string;
  venueType?: VenueType;
  city?: string;
  state?: string;
  country?: string;         // "US" or "CA"
  capacityMin?: number;
  priceMax?: number;
  amenities?: string;       // comma-separated
  favoritesOnly?: boolean;  // sent as "true" query param
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'ratingAverage' | 'capacityMax' | 'pricePerDay' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
```

### `VenueResponse`

Key fields (full type in `use-providers.ts`):

```typescript
interface VenueResponse {
  // ... standard fields ...
  state: string;            // required (was nullable before address requirements)
  country: string;          // restricted to "US" or "CA"
  postalCode: string;       // required (was nullable before address requirements)
  isFavorited?: boolean;    // present on list and detail responses
}
```

### `NearbyQuery`

```typescript
interface NearbyQuery {
  city?: string;
  postalCode?: string;
  country?: string;
  category?: ProviderCategory;  // for providers
  venueType?: VenueType;        // for venues
  limit?: number;
}
```
