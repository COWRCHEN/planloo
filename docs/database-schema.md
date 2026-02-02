# Database Schema Design - Planloo

## Overview

This document defines the database schema for the Planloo event planning platform using Cloudflare D1 (SQLite) with Drizzle ORM.

**Database:** Cloudflare D1 (SQLite-based)
**ORM:** Drizzle ORM
**Migration Strategy:** Drizzle Kit migrations

---

## Schema Design Principles

1. **Normalization:** Follow 3NF to reduce redundancy
2. **Indexing:** Strategic indexes on frequently queried columns
3. **Soft Deletes:** Use `deleted_at` for important records
4. **Timestamps:** All tables include `created_at` and `updated_at`
5. **UUIDs:** Use UUIDs for public-facing IDs, auto-increment for internal
6. **Foreign Keys:** Enforce referential integrity where appropriate

---

## Core Tables

### Better Auth Tables

Better Auth manages its own authentication tables. These are created automatically by the adapter.

### 1. user (Better Auth)

Core user table managed by Better Auth.

```sql
CREATE TABLE user (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  email_verified INTEGER DEFAULT 0,
  image TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  -- Custom fields
  platform_role TEXT NOT NULL DEFAULT 'user', -- 'super_admin', 'operator', 'user'
  phone TEXT,
  is_active INTEGER DEFAULT 1, -- For account suspension
  suspended_at INTEGER,
  suspended_reason TEXT
);

CREATE INDEX idx_user_email ON user(email);
CREATE INDEX idx_user_platform_role ON user(platform_role);
CREATE INDEX idx_user_is_active ON user(is_active);
```

**Platform Roles:**
- `super_admin` - Full platform control (SaaS owner)
- `operator` - Support staff with limited admin access
- `user` - Regular user (default)

**Drizzle Schema:**
```typescript
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  // Custom fields
  platformRole: text('platform_role', { enum: ['super_admin', 'operator', 'user'] }).notNull().default('user'),
  phone: text('phone'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  suspendedAt: integer('suspended_at', { mode: 'timestamp' }),
  suspendedReason: text('suspended_reason')
});
```

### 2. session (Better Auth)

Session management table.

```sql
CREATE TABLE session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX idx_session_user_id ON session(user_id);
CREATE INDEX idx_session_expires_at ON session(expires_at);
```

**Drizzle Schema:**
```typescript
export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});
```

### 3. account (Better Auth)

OAuth account linking table.

```sql
CREATE TABLE account (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  access_token_expires_at INTEGER,
  refresh_token_expires_at INTEGER,
  scope TEXT,
  id_token TEXT,
  password TEXT, -- Hashed password for email/password auth
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX idx_account_user_id ON account(user_id);
CREATE INDEX idx_account_provider ON account(provider_id, account_id);
```

**Drizzle Schema:**
```typescript
export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});
```

### 4. verification (Better Auth)

Email verification and password reset tokens.

```sql
CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_verification_identifier ON verification(identifier);
```

**Drizzle Schema:**
```typescript
export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});
```

---

## Organization Tables

### 5. organization

Organizations (companies/families) that can own events and have multiple members.

```sql
CREATE TABLE organization (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'company', -- 'company', 'family'
  description TEXT,
  logo_url TEXT,
  website TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER,
  FOREIGN KEY (created_by) REFERENCES user(id) ON DELETE SET NULL
);

CREATE INDEX idx_organization_slug ON organization(slug);
CREATE INDEX idx_organization_type ON organization(type);
CREATE INDEX idx_organization_created_by ON organization(created_by);
```

**Drizzle Schema:**
```typescript
export const organization = sqliteTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  type: text('type', { enum: ['company', 'family'] }).notNull().default('company'),
  description: text('description'),
  logoUrl: text('logo_url'),
  website: text('website'),
  createdBy: text('created_by').notNull().references(() => user.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' })
});
```

### 6. organization_member

Junction table linking users to organizations with roles.

```sql
CREATE TABLE organization_member (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member', 'viewer'
  invited_by TEXT,
  invited_at INTEGER,
  accepted_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES user(id) ON DELETE SET NULL,
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_member_org_id ON organization_member(organization_id);
CREATE INDEX idx_org_member_user_id ON organization_member(user_id);
CREATE INDEX idx_org_member_role ON organization_member(role);
```

**Drizzle Schema:**
```typescript
export const organizationMember = sqliteTable('organization_member', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['admin', 'member', 'viewer'] }).notNull().default('member'),
  invitedBy: text('invited_by').references(() => user.id, { onDelete: 'set null' }),
  invitedAt: integer('invited_at', { mode: 'timestamp' }),
  acceptedAt: integer('accepted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});
```

### 7. organization_invitation

Pending invitations to join an organization.

```sql
CREATE TABLE organization_invitation (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member', 'viewer'
  invited_by TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  accepted_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX idx_org_invitation_org_id ON organization_invitation(organization_id);
CREATE INDEX idx_org_invitation_email ON organization_invitation(email);
CREATE INDEX idx_org_invitation_token ON organization_invitation(token);
```

**Drizzle Schema:**
```typescript
export const organizationInvitation = sqliteTable('organization_invitation', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role', { enum: ['admin', 'member', 'viewer'] }).notNull().default('member'),
  invitedBy: text('invited_by').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  acceptedAt: integer('accepted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});
```

---

## Application Tables

### 8. events

Core table for event data. Events can belong to a user (personal) or an organization.

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  user_id TEXT, -- Owner if personal event (NULL if org event)
  organization_id TEXT, -- Owner if organization event (NULL if personal)
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT, -- 'wedding', 'birthday', 'corporate', 'conference', 'other'
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'planning', 'confirmed', 'completed', 'cancelled'
  start_date INTEGER NOT NULL, -- Unix timestamp
  end_date INTEGER,
  timezone TEXT DEFAULT 'UTC',
  location_name TEXT,
  location_address TEXT,
  location_city TEXT,
  location_state TEXT,
  location_country TEXT,
  location_postal_code TEXT,
  location_lat REAL,
  location_lng REAL,
  guest_count_expected INTEGER,
  guest_count_confirmed INTEGER DEFAULT 0,
  budget_total REAL,
  budget_currency TEXT DEFAULT 'USD',
  is_public INTEGER DEFAULT 0, -- boolean
  slug TEXT UNIQUE, -- for SEO-friendly URLs
  cover_image_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE CASCADE,
  CHECK ((user_id IS NOT NULL AND organization_id IS NULL) OR (user_id IS NULL AND organization_id IS NOT NULL))
);

CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_organization_id ON events(organization_id);
CREATE INDEX idx_events_uuid ON events(uuid);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_is_public ON events(is_public);
```

**Drizzle Schema:**
```typescript
export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }), // NULL if org event
  organizationId: text('organization_id').references(() => organization.id, { onDelete: 'cascade' }), // NULL if personal
  title: text('title').notNull(),
  description: text('description'),
  eventType: text('event_type', { enum: ['wedding', 'birthday', 'corporate', 'conference', 'other'] }),
  status: text('status', { enum: ['draft', 'planning', 'confirmed', 'completed', 'cancelled'] }).notNull().default('draft'),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }),
  timezone: text('timezone').default('UTC'),
  locationName: text('location_name'),
  locationAddress: text('location_address'),
  locationCity: text('location_city'),
  locationState: text('location_state'),
  locationCountry: text('location_country'),
  locationPostalCode: text('location_postal_code'),
  locationLat: real('location_lat'),
  locationLng: real('location_lng'),
  guestCountExpected: integer('guest_count_expected'),
  guestCountConfirmed: integer('guest_count_confirmed').default(0),
  budgetTotal: real('budget_total'),
  budgetCurrency: text('budget_currency').default('USD'),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false),
  slug: text('slug').unique(),
  coverImageUrl: text('cover_image_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' })
});
```

---

### 9. guests

Guest list management for each event.

```sql
CREATE TABLE guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  event_id INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  category TEXT, -- 'vip', 'family', 'friend', 'colleague', 'other'
  rsvp_status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'declined', 'maybe'
  rsvp_token TEXT UNIQUE, -- unique token for RSVP link
  rsvp_responded_at INTEGER,
  plus_ones_allowed INTEGER DEFAULT 0,
  plus_ones_count INTEGER DEFAULT 0,
  dietary_restrictions TEXT,
  notes TEXT,
  checked_in INTEGER DEFAULT 0, -- boolean
  checked_in_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX idx_guests_event_id ON guests(event_id);
CREATE INDEX idx_guests_uuid ON guests(uuid);
CREATE INDEX idx_guests_rsvp_token ON guests(rsvp_token);
CREATE INDEX idx_guests_rsvp_status ON guests(rsvp_status);
CREATE INDEX idx_guests_email ON guests(email);
```

**Drizzle Schema:**
```typescript
export const guests = sqliteTable('guests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  email: text('email'),
  phone: text('phone'),
  category: text('category', { enum: ['vip', 'family', 'friend', 'colleague', 'other'] }),
  rsvpStatus: text('rsvp_status', { enum: ['pending', 'confirmed', 'declined', 'maybe'] }).default('pending'),
  rsvpToken: text('rsvp_token').unique(),
  rsvpRespondedAt: integer('rsvp_responded_at', { mode: 'timestamp' }),
  plusOnesAllowed: integer('plus_ones_allowed').default(0),
  plusOnesCount: integer('plus_ones_count').default(0),
  dietaryRestrictions: text('dietary_restrictions'),
  notes: text('notes'),
  checkedIn: integer('checked_in', { mode: 'boolean' }).default(false),
  checkedInAt: integer('checked_in_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' })
});
```

---

### 10. service_providers

Service providers/vendors available for events.

```sql
CREATE TABLE service_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  user_id TEXT, -- Optional: if provider has account
  business_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  category TEXT NOT NULL, -- 'catering', 'photography', 'dj', 'florist', 'venue', 'decoration', 'other'
  description TEXT,
  services_offered TEXT, -- JSON array of services
  price_range TEXT, -- '$$', '$$$', '$$$$'
  location_city TEXT,
  location_state TEXT,
  location_country TEXT,
  service_area_radius INTEGER, -- in miles/km
  rating_average REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  logo_url TEXT,
  is_verified INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL
);

CREATE INDEX idx_service_providers_uuid ON service_providers(uuid);
CREATE INDEX idx_service_providers_user_id ON service_providers(user_id);
CREATE INDEX idx_service_providers_category ON service_providers(category);
CREATE INDEX idx_service_providers_location ON service_providers(location_city, location_state);
CREATE INDEX idx_service_providers_rating ON service_providers(rating_average);
CREATE INDEX idx_service_providers_is_active ON service_providers(is_active);
```

---

### 11. venues

Venue/location listings for events.

```sql
CREATE TABLE venues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  user_id TEXT, -- Optional: venue owner account
  name TEXT NOT NULL,
  description TEXT,
  venue_type TEXT, -- 'banquet_hall', 'outdoor', 'hotel', 'restaurant', 'conference_center', 'other'
  capacity_min INTEGER,
  capacity_max INTEGER,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL,
  postal_code TEXT,
  lat REAL,
  lng REAL,
  price_per_hour REAL,
  price_per_day REAL,
  currency TEXT DEFAULT 'USD',
  amenities TEXT, -- JSON array: ['parking', 'wifi', 'catering', 'av_equipment']
  policies TEXT, -- JSON object with cancellation, deposit, etc.
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  rating_average REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  is_verified INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL
);

CREATE INDEX idx_venues_uuid ON venues(uuid);
CREATE INDEX idx_venues_city ON venues(city);
CREATE INDEX idx_venues_type ON venues(venue_type);
CREATE INDEX idx_venues_capacity ON venues(capacity_max);
CREATE INDEX idx_venues_location ON venues(lat, lng);
CREATE INDEX idx_venues_is_active ON venues(is_active);
```

---

### 12. event_service_providers

Junction table linking events to service providers.

```sql
CREATE TABLE event_service_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  service_provider_id INTEGER NOT NULL,
  status TEXT DEFAULT 'inquiry', -- 'inquiry', 'quoted', 'booked', 'confirmed', 'completed', 'cancelled'
  quote_amount REAL,
  final_amount REAL,
  currency TEXT DEFAULT 'USD',
  contract_url TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (service_provider_id) REFERENCES service_providers(id) ON DELETE CASCADE,
  UNIQUE(event_id, service_provider_id)
);

CREATE INDEX idx_event_service_providers_event ON event_service_providers(event_id);
CREATE INDEX idx_event_service_providers_provider ON event_service_providers(service_provider_id);
```

---

### 13. event_venues

Junction table linking events to venues.

```sql
CREATE TABLE event_venues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  venue_id INTEGER NOT NULL,
  status TEXT DEFAULT 'inquiry', -- 'inquiry', 'quoted', 'booked', 'confirmed', 'completed', 'cancelled'
  booking_date INTEGER,
  booking_start_time INTEGER,
  booking_end_time INTEGER,
  quote_amount REAL,
  final_amount REAL,
  currency TEXT DEFAULT 'USD',
  deposit_amount REAL,
  deposit_paid INTEGER DEFAULT 0,
  contract_url TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE
);

CREATE INDEX idx_event_venues_event ON event_venues(event_id);
CREATE INDEX idx_event_venues_venue ON event_venues(venue_id);
CREATE INDEX idx_event_venues_booking_date ON event_venues(booking_date);
```

---

### 14. budget_items

Individual budget line items for events.

```sql
CREATE TABLE budget_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  event_id INTEGER NOT NULL,
  category TEXT NOT NULL, -- 'venue', 'catering', 'entertainment', 'decorations', 'photography', 'other'
  item_name TEXT NOT NULL,
  description TEXT,
  estimated_cost REAL,
  actual_cost REAL,
  currency TEXT DEFAULT 'USD',
  service_provider_id INTEGER, -- Optional link to provider
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'partial', 'paid', 'overdue'
  payment_due_date INTEGER,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (service_provider_id) REFERENCES service_providers(id) ON DELETE SET NULL
);

CREATE INDEX idx_budget_items_event_id ON budget_items(event_id);
CREATE INDEX idx_budget_items_uuid ON budget_items(uuid);
CREATE INDEX idx_budget_items_category ON budget_items(category);
CREATE INDEX idx_budget_items_payment_status ON budget_items(payment_status);
```

---

### 15. payments

Payment tracking for budget items.

```sql
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  budget_item_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT, -- 'cash', 'check', 'credit_card', 'bank_transfer', 'other'
  payment_date INTEGER NOT NULL,
  reference_number TEXT,
  receipt_url TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (budget_item_id) REFERENCES budget_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_payments_budget_item_id ON payments(budget_item_id);
CREATE INDEX idx_payments_uuid ON payments(uuid);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
```

---

### 16. images

Image storage for events, venues, and providers.

```sql
CREATE TABLE images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL, -- 'event', 'venue', 'service_provider', 'user'
  entity_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  is_cover INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER
);

CREATE INDEX idx_images_entity ON images(entity_type, entity_id);
CREATE INDEX idx_images_uuid ON images(uuid);
```

---

### 17. reviews

Reviews for service providers and venues.

```sql
CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'service_provider', 'venue'
  entity_id INTEGER NOT NULL,
  event_id INTEGER, -- Optional: link to specific event
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT,
  would_recommend INTEGER DEFAULT 1, -- boolean
  is_verified INTEGER DEFAULT 0, -- verified from actual booking
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);

CREATE INDEX idx_reviews_entity ON reviews(entity_type, entity_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);
```

---

## Supporting Tables (Future)

### 18. tasks (Event Checklist)

```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  event_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  assigned_to_user_id TEXT,
  due_date INTEGER,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  completed_at INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to_user_id) REFERENCES user(id) ON DELETE SET NULL
);
```

### 19. event_collaborators

```sql
CREATE TABLE event_collaborators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'viewer', -- 'owner', 'editor', 'viewer'
  invited_by_user_id TEXT,
  invited_at INTEGER,
  accepted_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by_user_id) REFERENCES user(id) ON DELETE SET NULL,
  UNIQUE(event_id, user_id)
);
```

---

## Platform Administration Tables

### 20. audit_log

Tracks all administrative actions for security and compliance.

```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT NOT NULL, -- User who performed the action
  actor_role TEXT NOT NULL, -- Role at time of action ('super_admin', 'operator')
  action TEXT NOT NULL, -- Action type (e.g., 'user.delete', 'user.suspend', 'org.delete')
  target_type TEXT, -- Entity type ('user', 'organization', 'event', etc.)
  target_id TEXT, -- ID of affected entity
  target_name TEXT, -- Name/email for readability
  details TEXT, -- JSON with additional context
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_target ON audit_log(target_type, target_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
```

**Drizzle Schema:**
```typescript
export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actorId: text('actor_id').notNull().references(() => user.id),
  actorRole: text('actor_role', { enum: ['super_admin', 'operator'] }).notNull(),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  targetName: text('target_name'),
  details: text('details'), // JSON string
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});
```

**Common Actions:**
- `user.view`, `user.update`, `user.delete`, `user.suspend`, `user.unsuspend`
- `user.impersonate.start`, `user.impersonate.end`
- `user.role.change`
- `org.view`, `org.update`, `org.delete`
- `event.view`, `event.update`, `event.delete`
- `platform.settings.update`
- `content.moderate`, `content.remove`

### 21. impersonation_session

Tracks when admins impersonate users for support.

```sql
CREATE TABLE impersonation_session (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL, -- Admin performing impersonation
  target_user_id TEXT NOT NULL, -- User being impersonated
  reason TEXT NOT NULL, -- Required reason for audit
  started_at INTEGER NOT NULL DEFAULT (unixepoch()),
  ended_at INTEGER,
  ip_address TEXT,
  FOREIGN KEY (admin_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX idx_impersonation_admin_id ON impersonation_session(admin_id);
CREATE INDEX idx_impersonation_target_id ON impersonation_session(target_user_id);
CREATE INDEX idx_impersonation_started_at ON impersonation_session(started_at);
```

**Drizzle Schema:**
```typescript
export const impersonationSession = sqliteTable('impersonation_session', {
  id: text('id').primaryKey(),
  adminId: text('admin_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  targetUserId: text('target_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  ipAddress: text('ip_address')
});
```

---

## Data Migration Strategy

### Phase 1: Core Tables (MVP)
1. Better Auth tables (user, session, account, verification)
2. Organization tables (organization, organization_member, organization_invitation)
3. Platform admin tables (audit_log, impersonation_session)
4. events
5. guests
6. budget_items
7. payments

### Phase 2: Provider/Venue Tables
8. service_providers
9. venues
10. event_service_providers
11. event_venues
12. images
13. reviews

### Phase 3: Advanced Features
14. tasks
15. event_collaborators

---

## Drizzle Configuration

**File: `drizzle.config.ts`**

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  driver: 'd1',
  dbCredentials: {
    wranglerConfigPath: 'wrangler.toml',
    dbName: 'planloo-db'
  }
} satisfies Config;
```

---

## Query Optimization Guidelines

1. **Use indexes strategically** - Add indexes on foreign keys, UUID lookups, and frequently filtered columns
2. **Limit SELECT columns** - Only fetch needed columns
3. **Use prepared statements** - Drizzle handles this automatically
4. **Pagination** - Always paginate large result sets (LIMIT/OFFSET)
5. **Join optimization** - Use LEFT JOIN only when needed, prefer multiple queries for small datasets
6. **Cache frequently accessed data** - Use Cloudflare KV for provider/venue listings
7. **Batch operations** - Use transactions for multiple inserts/updates

---

## Backup & Recovery

- **Cloudflare D1** provides automatic backups
- Export critical data periodically for compliance
- Use Drizzle migrations for version control
- Test restore procedures regularly

---

## Security Considerations

1. **Never store plain text passwords** - Use bcrypt/argon2
2. **Sanitize all inputs** - Drizzle ORM prevents SQL injection
3. **Use prepared statements** - Always parameterize queries
4. **Implement rate limiting** - Prevent brute force attacks
5. **Audit sensitive operations** - Log authentication, payment changes
6. **Encrypt sensitive data** - Consider encryption for payment info

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | Product Manager | Initial database schema design |
