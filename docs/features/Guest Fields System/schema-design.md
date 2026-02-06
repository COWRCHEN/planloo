# Guest Fields System - Schema Design

## Architecture: Base + Extension Tables

```
guests (base - common fields)
    │
    ├── wedding_guest_details (1:1)
    ├── corporate_guest_details (1:1)
    ├── conference_guest_details (1:1)
    └── birthday_guest_details (1:1)

event_guest_settings (1:1 with events)
    └── Stores which optional fields are enabled per event
```

---

## Table Schemas

### 1. Base Table: `guests` (Updated)

Keep existing fields + add user-configurable optional fields.

```typescript
// backend/src/db/schema/guests.ts

export const guests = sqliteTable('guests', {
  // === EXISTING FIELDS (keep as-is) ===
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
  plusOnesAllowed: integer('plus_ones_allowed').default(0).notNull(),
  plusOnesCount: integer('plus_ones_count').default(0).notNull(),
  dietaryRestrictions: text('dietary_restrictions'),
  notes: text('notes'),
  checkedIn: integer('checked_in', { mode: 'boolean' }).default(false).notNull(),
  checkedInAt: integer('checked_in_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),

  // === NEW: User-Configurable Optional Fields ===

  // Address fields (enabled via event_guest_settings.enableAddress)
  addressStreet: text('address_street'),
  addressCity: text('address_city'),
  addressState: text('address_state'),
  addressZipCode: text('address_zip_code'),
  addressCountry: text('address_country'),

  // Meal choice (enabled via event_guest_settings.enableMealChoice)
  mealChoice: text('meal_choice'),  // Stores selected option key

  // Accommodation fields (enabled via event_guest_settings.enableAccommodation)
  needsAccommodation: integer('needs_accommodation', { mode: 'boolean' }),
  hotelName: text('hotel_name'),
  checkInDate: integer('check_in_date', { mode: 'timestamp' }),
  checkOutDate: integer('check_out_date', { mode: 'timestamp' }),

  // Additional optional fields
  plusOneName: text('plus_one_name'),  // enabled via enablePlusOneName
  tableAssignment: text('table_assignment'),  // enabled via enableTableAssignment
  transportationNeeded: integer('transportation_needed', { mode: 'boolean' }),  // enabled via enableTransportation
  accessibilityNeeds: text('accessibility_needs'),  // enabled via enableAccessibility
});
```

**New columns added: 13**

---

### 2. Event Guest Settings Table

Stores which optional fields are enabled for each event + meal choice options.

```typescript
// backend/src/db/schema/events.ts (add to file)

export const eventGuestSettings = sqliteTable('event_guest_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().unique().references(() => events.id, { onDelete: 'cascade' }),

  // Field toggles
  enableAddress: integer('enable_address', { mode: 'boolean' }).default(false).notNull(),
  enableMealChoice: integer('enable_meal_choice', { mode: 'boolean' }).default(false).notNull(),
  enableAccommodation: integer('enable_accommodation', { mode: 'boolean' }).default(false).notNull(),
  enablePlusOneName: integer('enable_plus_one_name', { mode: 'boolean' }).default(false).notNull(),
  enableTableAssignment: integer('enable_table_assignment', { mode: 'boolean' }).default(false).notNull(),
  enableTransportation: integer('enable_transportation', { mode: 'boolean' }).default(false).notNull(),
  enableAccessibility: integer('enable_accessibility', { mode: 'boolean' }).default(false).notNull(),

  // Meal choice configuration (JSON array of options)
  // Example: [{"key": "option1", "label": "Beef"}, {"key": "option2", "label": "Chicken"}]
  mealChoiceOptions: text('meal_choice_options'),  // JSON string

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  eventIdIdx: index('idx_event_guest_settings_event_id').on(table.eventId),
}));
```

---

### 3. Extension Table: `wedding_guest_details`

```typescript
// backend/src/db/schema/guestDetails.ts (new file)

export const weddingGuestDetails = sqliteTable('wedding_guest_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guestId: integer('guest_id').notNull().unique().references(() => guests.id, { onDelete: 'cascade' }),

  // Which side of the wedding
  guestSide: text('guest_side', { enum: ['bride', 'groom', 'both'] }),

  // Invited to which events
  invitedTo: text('invited_to', { enum: ['ceremony', 'reception', 'both'] }).default('both'),

  // Wedding gift tracking
  weddingGiftDescription: text('wedding_gift_description'),
  weddingGiftThankYouSent: integer('wedding_gift_thank_you_sent', { mode: 'boolean' }).default(false),

  // Shower gift tracking
  showerGiftDescription: text('shower_gift_description'),
  showerGiftThankYouSent: integer('shower_gift_thank_you_sent', { mode: 'boolean' }).default(false),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  guestIdIdx: index('idx_wedding_guest_details_guest_id').on(table.guestId),
  guestSideIdx: index('idx_wedding_guest_details_side').on(table.guestSide),
  invitedToIdx: index('idx_wedding_guest_details_invited_to').on(table.invitedTo),
}));
```

**Columns: 8 (+ id, timestamps)**

---

### 4. Extension Table: `corporate_guest_details`

```typescript
export const corporateGuestDetails = sqliteTable('corporate_guest_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guestId: integer('guest_id').notNull().unique().references(() => guests.id, { onDelete: 'cascade' }),

  companyName: text('company_name'),
  jobTitle: text('job_title'),
  department: text('department'),
  attendeeType: text('attendee_type', { enum: ['employee', 'client', 'vendor', 'partner', 'other'] }),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  guestIdIdx: index('idx_corporate_guest_details_guest_id').on(table.guestId),
  companyNameIdx: index('idx_corporate_guest_details_company').on(table.companyName),
}));
```

**Columns: 4 (+ id, timestamps)**

---

### 5. Extension Table: `conference_guest_details`

```typescript
export const conferenceGuestDetails = sqliteTable('conference_guest_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guestId: integer('guest_id').notNull().unique().references(() => guests.id, { onDelete: 'cascade' }),

  badgeType: text('badge_type', { enum: ['speaker', 'vip', 'standard', 'press', 'exhibitor', 'staff'] }).default('standard'),
  organization: text('organization'),

  // JSON array of session IDs: ["session-1", "session-2"]
  sessionRegistrations: text('session_registrations'),  // JSON string

  specialAccess: integer('special_access', { mode: 'boolean' }).default(false),

  // JSON array of days: ["day1", "day2"]
  attendingDays: text('attending_days'),  // JSON string

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  guestIdIdx: index('idx_conference_guest_details_guest_id').on(table.guestId),
  badgeTypeIdx: index('idx_conference_guest_details_badge').on(table.badgeType),
}));
```

**Columns: 5 (+ id, timestamps)**

---

### 6. Extension Table: `birthday_guest_details`

```typescript
export const birthdayGuestDetails = sqliteTable('birthday_guest_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guestId: integer('guest_id').notNull().unique().references(() => guests.id, { onDelete: 'cascade' }),

  relationshipToBirthdayPerson: text('relationship_to_birthday_person'),  // e.g., "Friend", "Cousin", "Coworker"
  ageGroup: text('age_group', { enum: ['child', 'teen', 'adult'] }),
  giftContribution: real('gift_contribution'),  // For group gift tracking

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  guestIdIdx: index('idx_birthday_guest_details_guest_id').on(table.guestId),
}));
```

**Columns: 3 (+ id, timestamps)**

---

## Relations

```typescript
// backend/src/db/schema/relations.ts (add to file)

export const guestsRelations = relations(guests, ({ one }) => ({
  event: one(events, {
    fields: [guests.eventId],
    references: [events.id],
  }),
  weddingDetails: one(weddingGuestDetails, {
    fields: [guests.id],
    references: [weddingGuestDetails.guestId],
  }),
  corporateDetails: one(corporateGuestDetails, {
    fields: [guests.id],
    references: [corporateGuestDetails.guestId],
  }),
  conferenceDetails: one(conferenceGuestDetails, {
    fields: [guests.id],
    references: [conferenceGuestDetails.guestId],
  }),
  birthdayDetails: one(birthdayGuestDetails, {
    fields: [guests.id],
    references: [birthdayGuestDetails.guestId],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  // ... existing relations ...
  guestSettings: one(eventGuestSettings, {
    fields: [events.id],
    references: [eventGuestSettings.eventId],
  }),
}));

export const weddingGuestDetailsRelations = relations(weddingGuestDetails, ({ one }) => ({
  guest: one(guests, {
    fields: [weddingGuestDetails.guestId],
    references: [guests.id],
  }),
}));

// ... similar for other extension tables
```

---

## Query Examples

### Fetch wedding guests with details

```typescript
const weddingGuests = await db
  .select()
  .from(guests)
  .leftJoin(weddingGuestDetails, eq(guests.id, weddingGuestDetails.guestId))
  .where(eq(guests.eventId, eventId));

// Or with Drizzle relations:
const weddingGuests = await db.query.guests.findMany({
  where: eq(guests.eventId, eventId),
  with: {
    weddingDetails: true,
  },
});
```

### Create guest with wedding details (batch for atomicity)

```typescript
await db.batch([
  db.insert(guests).values({
    uuid: crypto.randomUUID(),
    eventId,
    firstName: 'John',
    lastName: 'Doe',
  }),
  db.insert(weddingGuestDetails).values({
    guestId: sql`last_insert_rowid()`,  // D1 specific
    guestSide: 'groom',
    invitedTo: 'both',
  }),
]);

// Alternative: Insert guest first, get ID, then insert details
const [guest] = await db.insert(guests).values({...}).returning({ id: guests.id });
await db.insert(weddingGuestDetails).values({ guestId: guest.id, ... });
```

### Fetch event with guest settings

```typescript
const eventWithSettings = await db.query.events.findFirst({
  where: eq(events.uuid, eventUuid),
  with: {
    guestSettings: true,
  },
});
```

---

## Summary

| Table | New Columns | Purpose |
|-------|-------------|---------|
| `guests` | +13 | User-configurable optional fields |
| `event_guest_settings` | new table | Field toggle configuration per event |
| `wedding_guest_details` | new table | Wedding-specific: side, invited to, gifts |
| `corporate_guest_details` | new table | Corporate-specific: company, title, dept |
| `conference_guest_details` | new table | Conference-specific: badge, sessions |
| `birthday_guest_details` | new table | Birthday-specific: relationship, age group |

**Total new tables: 5**
**Total new columns on guests: 13**
**Extension table columns: 20 across 4 tables**

---

## Migration Strategy

1. Add 13 new columns to `guests` table (all nullable)
2. Create `event_guest_settings` table
3. Create 4 extension tables
4. Add relations
5. Update types in `db/types.ts`

All columns are nullable, so existing data is unaffected.
