# Venue Database Schema

## Tables

### `venues` (pre-existing)

Full venue listing with location, capacity, pricing, amenities, and contact info.

**File:** `backend/src/db/schema/providers.ts`

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer PK | Auto-increment internal ID |
| `uuid` | text UNIQUE | Public-facing UUID |
| `user_id` | text FK → `user.id` | Venue owner (optional) |
| `name` | text NOT NULL | Venue name |
| `description` | text | Description |
| `venue_type` | text enum | `banquet_hall`, `outdoor`, `hotel`, `restaurant`, `conference_center`, `other` |
| `capacity_min` | integer | Minimum capacity |
| `capacity_max` | integer | Maximum capacity |
| `address` | text NOT NULL | Street address |
| `city` | text NOT NULL | City |
| `state` | text | State/province (required on create, validated against US/CA codes) |
| `country` | text NOT NULL | Country (restricted to `US` or `CA`) |
| `postal_code` | text | Postal/ZIP code (required on create, format validated per country) |
| `lat` | real | Latitude (for future map integration) |
| `lng` | real | Longitude (for future map integration) |
| `price_per_hour` | real | Hourly rate |
| `price_per_day` | real | Daily rate |
| `currency` | text NOT NULL | Currency code (default: `USD`) |
| `amenities` | text | JSON array: `["parking", "wifi", "catering"]` |
| `policies` | text | JSON object with cancellation, deposit info |
| `contact_email` | text | Contact email address |
| `contact_phone` | text | Contact phone number |
| `website` | text | Website URL |
| `rating_average` | real NOT NULL | Average rating (default: 0) |
| `rating_count` | integer NOT NULL | Number of ratings (default: 0) |
| `is_verified` | integer boolean | Whether venue is verified |
| `is_active` | integer boolean | Soft active flag |
| `created_at` | integer timestamp | Creation timestamp |
| `updated_at` | integer timestamp | Last update timestamp |
| `deleted_at` | integer timestamp | Soft delete timestamp |

**Indexes:** `uuid`, `city`, `venue_type`, `capacity_max`, `lat+lng`, `is_active`, `city+country` (nearby), `postal_code` (nearby)

**Address constraints (application layer):**
- `country` restricted to `US` or `CA` (enforced by Zod, not DB)
- `state` validated against US states (50 + DC) or CA provinces (13)
- `postal_code` validated: US format `12345` or `12345-1234`, CA format `A1A 1A1`
- State/province and postal code are required on create; validated cross-field on update

---

### `event_venues` (pre-existing)

Junction table linking events to venues with booking status tracking.

**File:** `backend/src/db/schema/providers.ts`

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer PK | Auto-increment |
| `event_id` | integer FK → `events.id` | Event reference |
| `venue_id` | integer FK → `venues.id` | Venue reference |
| `status` | text enum | `inquiry`, `quoted`, `booked`, `confirmed`, `completed`, `cancelled` |
| `booking_date` | integer timestamp | Date of the booking |
| `booking_start_time` | integer timestamp | Start time |
| `booking_end_time` | integer timestamp | End time |
| `quote_amount` | real | Quoted price |
| `final_amount` | real | Final agreed price |
| `currency` | text | Currency code |
| `deposit_amount` | real | Deposit amount |
| `deposit_paid` | integer boolean | Whether deposit is paid |
| `contract_url` | text | URL to contract document |
| `notes` | text | Notes |
| `created_at` | integer timestamp | Creation timestamp |
| `updated_at` | integer timestamp | Last update timestamp |

**Indexes:** `event_id`, `venue_id`, `booking_date`

---

### `user_venue_favorites` (new)

Tracks which venues a user has favorited. Simple toggle — uses hard delete (no soft delete needed).

**File:** `backend/src/db/schema/providers.ts`

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer PK | Auto-increment |
| `user_id` | text FK → `user.id` | User who favorited (CASCADE delete) |
| `venue_id` | integer FK → `venues.id` | Favorited venue (CASCADE delete) |
| `created_at` | integer timestamp | When the favorite was created |

**Indexes:** `user_id`, `venue_id`
**Constraints:** UNIQUE on `(user_id, venue_id)`

**Migration:** `backend/drizzle/0023_add_user_venue_favorites.sql`

---

### Nearby Query Indexes (migration 0024)

Added by `backend/drizzle/0024_provider_address_fields.sql`:

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_venues_city_country` | `venues` | `city`, `country` | City + country nearby lookup |
| `idx_venues_postal_code` | `venues` | `postal_code` | Postal code prefix nearby lookup |

---

## Relations

Defined in `backend/src/db/schema/relations.ts`:

- `user` → many `userVenueFavorites`
- `venues` → many `userVenueFavorites`
- `userVenueFavorites` → one `user`, one `venue`

---

## TypeScript Types

Defined in `backend/src/db/types.ts`:

```typescript
export type UserVenueFavorite = InferSelectModel<typeof schema.userVenueFavorites>;
export type NewUserVenueFavorite = InferInsertModel<typeof schema.userVenueFavorites>;
```
