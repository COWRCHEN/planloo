# Venue API Endpoints

All endpoints require authentication (`requireAuth` middleware).

**Base path:** `/api/v1/venues`

**File:** `backend/src/routes/venues.ts`

**Route ordering note:** Static routes (`/check-availability`, `/favorites`) are declared before the parameterized `/:uuid` route to prevent Hono from matching them as UUID params.

---

## List/Search Venues

### GET `/`

List venues with search, filtering, amenities, and favorites support.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | — | Search by name or description (LIKE) |
| `venueType` | enum | — | Filter by venue type |
| `city` | string | — | Filter by city (exact match) |
| `state` | string | — | Filter by state (exact match) |
| `country` | `US` \| `CA` | — | Filter by country |
| `capacityMin` | number | — | Minimum capacity (filters on `capacity_max >= value`) |
| `priceMax` | number | — | Maximum price/day |
| `amenities` | string | — | Comma-separated amenity names (AND match, e.g. `parking,wifi`) |
| `favoritesOnly` | `"true"` | — | Only show user's favorited venues |
| `limit` | number | 20 | Page size (1-100) |
| `offset` | number | 0 | Pagination offset |
| `sortBy` | enum | `createdAt` | `name`, `ratingAverage`, `capacityMax`, `pricePerDay`, `createdAt` |
| `sortOrder` | enum | `desc` | `asc` or `desc` |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "uuid": "abc-123",
      "name": "Grand Ballroom",
      "venueType": "banquet_hall",
      "city": "New York",
      "amenities": ["parking", "wifi", "catering"],
      "isFavorited": true,
      "..."
    }
  ],
  "meta": { "total": 42, "limit": 20, "offset": 0 }
}
```

**Amenities filter implementation:** Each requested amenity is matched with `LIKE '%"amenity"%'` against the JSON-encoded `amenities` column. All amenities must match (AND logic).

**Favorites filter implementation:** When `favoritesOnly=true`, first fetches the user's favorite venue IDs, then uses `IN (...)` to filter. Returns empty if user has no favorites.

---

## Check Availability

### GET `/check-availability`

Check if a venue has conflicting bookings on a specific date.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `venueUuid` | UUID | Venue to check |
| `date` | `YYYY-MM-DD` | Date to check |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "available": true,
    "conflictCount": 0,
    "date": "2026-03-15"
  }
}
```

**Logic:** Queries `event_venues` for bookings on the given date where `status != 'cancelled'`.

**Error (404):** If venue UUID not found.

---

## Favorites

### GET `/favorites`

List all venues the current user has favorited.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "uuid": "abc-123",
      "name": "Grand Ballroom",
      "isFavorited": true,
      "..."
    }
  ]
}
```

---

### POST `/favorites/:venueUuid`

Toggle favorite status on a venue. If already favorited, removes the favorite; otherwise adds it.

**Response (200 — unfavorited):**

```json
{ "success": true, "data": { "favorited": false } }
```

**Response (201 — favorited):**

```json
{ "success": true, "data": { "favorited": true } }
```

**Error (404):** If venue UUID not found.

---

## Nearby Venues

### GET `/nearby`

Find venues near a city or postal code prefix. Useful for suggesting venues when creating events.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `city` | string | — | City name (case-insensitive match) |
| `postalCode` | string | — | Postal code (matches first 3 characters) |
| `country` | `US` \| `CA` | — | Filter by country |
| `venueType` | enum | — | Filter by venue type |
| `limit` | number | 10 | Max results (1-50) |

At least one of `city` or `postalCode` must be provided, otherwise returns empty array.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "uuid": "abc-123",
      "name": "Grand Ballroom",
      "venueType": "banquet_hall",
      "city": "New York",
      "state": "NY",
      "country": "US",
      "ratingAverage": 4.5,
      "isFavorited": false,
      "..."
    }
  ]
}
```

**Matching logic:** Matches venues where `LOWER(city) = LOWER(:city)` OR `SUBSTR(postal_code, 1, 3) = :prefix`. Results are ordered by `ratingAverage DESC`.

**Route ordering note:** This endpoint is declared before `/:uuid` to avoid Hono matching "nearby" as a UUID parameter.

---

## Venue Detail

### GET `/:uuid`

Get full venue details with `isFavorited` status for the current user.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "uuid": "abc-123",
    "name": "Grand Ballroom",
    "description": "A beautiful venue...",
    "venueType": "banquet_hall",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "country": "US",
    "postalCode": "10001",
    "capacityMin": 100,
    "capacityMax": 500,
    "pricePerHour": 250.00,
    "pricePerDay": 5000.00,
    "currency": "USD",
    "amenities": ["parking", "wifi", "catering", "av_equipment"],
    "contactEmail": "events@granballroom.com",
    "contactPhone": "+1-555-0123",
    "website": "https://grandballroom.com",
    "ratingAverage": 4.5,
    "ratingCount": 23,
    "isFavorited": false,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

## Create Venue

### POST `/`

Create a new venue. Requires verified email.

**Body (required fields marked with *):**

```json
{
  "name": "Grand Ballroom",          // * required, max 200 chars
  "address": "123 Main St",          // * required, max 500 chars
  "city": "New York",                // * required, max 100 chars
  "state": "NY",                     // * required, validated against US states or CA provinces
  "country": "US",                   // * required, must be "US" or "CA"
  "postalCode": "10001",             // * required, validated format (US: 12345 or 12345-1234, CA: A1A 1A1)
  "venueType": "banquet_hall",
  "capacityMin": 100,
  "capacityMax": 500,
  "pricePerHour": 250,
  "pricePerDay": 5000,
  "currency": "USD",                 // defaults to "USD", 3 chars
  "amenities": ["parking", "wifi"],
  "contactEmail": "events@example.com",
  "contactPhone": "+1-555-0123",
  "website": "https://example.com",
  "description": "A beautiful venue..."
}
```

**Address validation:** Cross-validates country, state/province, and postal code format via `superRefine`. US state codes are validated against 50 states + DC. Canadian province codes are validated against 13 provinces/territories. Postal code format is validated per country.

**Response (201):** Created venue object.

---

## Update Venue

### PATCH `/:uuid`

Update venue fields. Owner only. Requires verified email.

**Body:** Any subset of create fields.

**Response (200):** Updated venue object.

**Error (403):** If not the owner.

---

## Delete Venue

### DELETE `/:uuid`

Soft delete a venue. Owner only. Requires verified email.

**Response (200):**

```json
{ "success": true, "data": { "deleted": true } }
```

**Error (403):** If not the owner.
