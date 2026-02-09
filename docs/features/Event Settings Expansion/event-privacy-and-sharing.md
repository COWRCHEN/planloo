# Event Privacy & Sharing Settings

**Feature:** Control event visibility, public page access, custom URL slugs, and guest list privacy.
**Status:** Planning
**Document Date:** 2026-02-08

---

## Overview

The event schema already has `isPublic` (boolean) and `slug` (unique text) columns, but they are not exposed in any settings UI. This feature adds an "Event Privacy & Sharing" section to event settings, giving organizers control over who can see their event and how it's shared.

---

## Settings

### Event Visibility

- **Event visibility** (`isPublic`: boolean, default `false`)
  - **Private** - only the organizer and collaborators can access the event
  - **Public** - the event has a public-facing page accessible via its URL/slug
  - Uses the existing `isPublic` column on the `events` table (no schema change)

### Custom URL Slug

- **Custom event URL** (`slug`: text, nullable, unique)
  - When the event is public, it's accessible at `/rsvp/:slug`
  - Organizer can set a custom slug (e.g., `sarah-and-james-2026`)
  - Auto-generated from event title if not set manually
  - Uses the existing `slug` column on the `events` table (no schema change)

**Validation:**
- 3-60 characters
- Lowercase alphanumeric, hyphens only (no spaces or special characters)
- Must be unique across all events
- Cannot use reserved slugs (`admin`, `api`, `login`, `dashboard`, etc.)

### Password Protection

- **Require password to view event** (`enablePassword`: boolean, default `false`)
  - Only applies when `isPublic` is true
  - Guests must enter a password before seeing event details or RSVP form
  - Password is set by the organizer, shared out-of-band (e.g., on the invitation)

- **Event page password** (`pagePassword`: text, nullable)
  - Plain text stored hashed
  - Organizer can view/change/remove at any time
  - Max 50 characters

### Guest List Visibility

- **Show guest list to attendees** (`showGuestList`: boolean, default `false`)
  - When enabled, confirmed guests can see other confirmed guests on the public event page
  - Only shows first name + last initial (e.g., "Sarah M.") for privacy
  - Only shows guests with `rsvpStatus = 'confirmed'`

### Social Sharing

- **Enable social sharing preview** (`enableSocialPreview`: boolean, default `true`)
  - When enabled, the public event page includes Open Graph meta tags for rich link previews
  - Uses event title, description, and cover image
  - When disabled, link previews show generic Planloo branding

---

## Schema Changes

### New table: `eventPrivacySettings`

One-to-one relationship with `events`, same pattern as `eventGuestSettings`.

```
eventPrivacySettings:
  id                    INTEGER PK autoincrement
  eventId               INTEGER NOT NULL UNIQUE FK(events.id, onDelete cascade)
  enablePassword        BOOLEAN NOT NULL DEFAULT false
  pagePassword          TEXT (nullable, hashed)
  showGuestList         BOOLEAN NOT NULL DEFAULT false
  enableSocialPreview   BOOLEAN NOT NULL DEFAULT true
  createdAt             INTEGER NOT NULL DEFAULT unixepoch()
  updatedAt             INTEGER NOT NULL DEFAULT unixepoch()
```

Note: `isPublic` and `slug` live on the `events` table and are updated via the existing event update endpoint. This settings table only stores the additional privacy-specific fields.

---

## API Endpoints

### Privacy Settings (new)

- `GET  /api/v1/events/:uuid/privacy-settings` - Fetch privacy settings (auto-create defaults if not exist)
- `PATCH /api/v1/events/:uuid/privacy-settings` - Update privacy settings (partial update)

### Event Updates (existing)

- `PATCH /api/v1/events/:uuid` - Update `isPublic` and `slug` (already supported, uses existing event update route)

### Slug Validation (new)

- `GET /api/v1/events/check-slug?slug=:slug&eventUuid=:uuid` - Check if a slug is available (excludes current event)

### Validation Rules

- `slug`: 3-60 chars, lowercase alphanumeric + hyphens, unique, not reserved
- `pagePassword`: max 50 characters, stored hashed (bcrypt or similar)
- `enablePassword` requires `isPublic = true` to be effective
- `showGuestList` requires `isPublic = true` to be effective

---

## Frontend Components

### New Component: `PrivacySharingSettings`

- Located at `frontend/src/components/events/PrivacySharingSettings.tsx`
- Follows same local-state-with-save/reset pattern as `GuestFieldSettings`
- Renders inside a new accordion item "Privacy & Sharing" in `EventSettingsView`

### UI Layout

```
[Toggle] Make event public
  └─ (when public, show below)
  [Input] Custom URL: planloo.com/rsvp/ [___slug-input___]
    └─ (real-time availability check with debounce)
    └─ [Preview] Full URL shown below input

  [Toggle] Require password to view event
    └─ (when enabled)
    [PasswordInput] Event page password

  [Toggle] Show guest list to confirmed attendees
    └─ (note: only confirmed guests visible, shown as "First L.")

  [Toggle] Enable social sharing preview
    └─ (note: controls Open Graph meta tags for link previews)

[Save] [Reset]
```

---

## Hooks

### `usePrivacySettings(eventUuid: string)`

- TanStack Query hook
- Query key: `['events', eventUuid, 'privacy-settings']`
- 5-minute stale time

### `useUpdatePrivacySettings(eventUuid: string)`

- Mutation hook, invalidates privacy-settings query on success
- Also invalidates event detail query when `isPublic` or `slug` changes

### `useCheckSlug(slug: string, eventUuid: string)`

- TanStack Query hook with debounce
- Query key: `['events', 'check-slug', slug]`
- Enabled only when slug is non-empty and meets format requirements
- Returns `{ available: boolean }`

---

## Dependencies

- Existing `isPublic` and `slug` columns on `events` table (no migration needed for these)
- Existing event update API (for `isPublic` and `slug`)
- RSVP settings (password protection applies to the RSVP page flow)

---

## Out of Scope (for initial implementation)

- Custom branding for public event page (logo, colors)
- Domain aliasing (custom domain for event pages)
- Analytics on public page views
- Embed widget for external websites
- Fine-grained guest list visibility controls (e.g., show only certain categories)
