# RSVP & Invitations Settings

**Feature:** Event-level RSVP configuration, deadlines, response options, and public RSVP page controls.
**Status:** Implemented
**Document Date:** 2026-02-08
**Updated:** 2026-02-11 (added RSVP Link Expiry feature)

> **Note:** This was the original planning document. For comprehensive implementation documentation, see [docs/features/RSVP/](../RSVP/README.md).

---

## Overview

The guest schema already supports RSVP (`rsvpStatus`, `rsvpToken`, `rsvpRespondedAt`) and the event schema has `isPublic` and `slug`. However, there is no UI for organizers to configure RSVP behavior. This feature adds an "RSVP & Invitations" section to event settings.

---

## Settings

### RSVP Collection

- **Enable RSVP** (`enableRsvp`: boolean, default `false`)
  - Master toggle for the entire RSVP workflow
  - When disabled, guests cannot respond via RSVP links and the RSVP status column is hidden from the guest list

### Response Options

- **Allow "Maybe" responses** (`allowMaybeResponse`: boolean, default `true`)
  - When disabled, guests can only Confirm or Decline
  - The existing `rsvp_status` enum includes `maybe`; this setting controls whether it's offered in the RSVP form

### RSVP Deadline

- **RSVP deadline** (`rsvpDeadline`: timestamp, nullable)
  - Date/time after which the RSVP form shows a "closed" message instead of accepting responses
  - Display relative countdown on the RSVP page ("5 days left to respond")
  - Organizer can still manually change guest RSVP status after deadline

### Confirmation Messaging

- **RSVP confirmation message** (`rsvpConfirmationMessage`: text, nullable)
  - Custom message shown to guests after they submit their RSVP
  - Defaults to a generic "Thank you for your response!" if not set
  - Supports basic text only (no HTML/markdown for now)

### Guest Self-Service

- **Allow guests to update their RSVP** (`allowRsvpUpdate`: boolean, default `true`)
  - When enabled, guests can change their response after submitting (until deadline)
  - When disabled, the RSVP form shows their current response as read-only after first submission

- **Allow guests to add plus-ones via RSVP** (`allowRsvpPlusOnes`: boolean, default `false`)
  - Only available when plus-ones are enabled in Guest Field Settings
  - When enabled, the RSVP form includes a plus-one section
  - Respects the `defaultPlusOnesAllowed` limit from guest settings

### RSVP Link Expiry

- **RSVP link expiry hours** (`rsvpLinkExpiryHours`: integer, default `12`, NOT NULL)
  - Hours each invitation link remains valid after sending
  - Range: 1-720 (1 hour to 30 days)
  - Always applies (organizer cannot disable, only adjust duration)
  - Capped to RSVP deadline if set and earlier than computed expiry
  - Resending an invitation refreshes the expiry timestamp
  - See [Link Expiry documentation](../RSVP/link-expiry.md) for full implementation details

### Waitlist (future consideration)

- **Enable waitlist** (`enableWaitlist`: boolean, default `false`)
  - When `guestCountExpected` is reached, new confirmations go to a waitlist
  - Organizer manually promotes from waitlist
  - Not in initial implementation scope; noted here for future reference

---

## Schema Changes

### New table: `eventRsvpSettings`

One-to-one relationship with `events`, same pattern as `eventGuestSettings`.

```
eventRsvpSettings:
  id                       INTEGER PK autoincrement
  eventId                  INTEGER NOT NULL UNIQUE FK(events.id, onDelete cascade)
  enableRsvp               BOOLEAN NOT NULL DEFAULT false
  allowMaybeResponse       BOOLEAN NOT NULL DEFAULT true
  rsvpDeadline             INTEGER (timestamp, nullable)
  rsvpConfirmationMessage  TEXT (nullable)
  allowRsvpUpdate          BOOLEAN NOT NULL DEFAULT true
  allowRsvpPlusOnes        BOOLEAN NOT NULL DEFAULT false
  createdAt                INTEGER NOT NULL DEFAULT unixepoch()
  updatedAt                INTEGER NOT NULL DEFAULT unixepoch()
```

---

## API Endpoints

Following the existing pattern from guest settings:

- `GET  /api/v1/events/:uuid/rsvp-settings` - Fetch RSVP settings (auto-create defaults if not exist)
- `PATCH /api/v1/events/:uuid/rsvp-settings` - Update RSVP settings (partial update)

### Validation Rules

- `rsvpDeadline` must be in the future when set (warn but allow if past on update)
- `allowRsvpPlusOnes` is only effective when `enablePlusOnes` is true in guest settings
- `rsvpConfirmationMessage` max 500 characters

---

## Frontend Components

### New Component: `RsvpSettings`

- Located at `frontend/src/components/events/RsvpSettings.tsx`
- Follows same local-state-with-save/reset pattern as `GuestFieldSettings`
- Renders inside a new accordion item "RSVP & Invitations" in `EventSettingsView`

### UI Layout

```
[Toggle] Enable RSVP
  └─ (when enabled, show below)
  [Toggle] Allow "Maybe" responses
  [DatePicker] RSVP Deadline (optional)
  [Textarea] Confirmation message (optional, placeholder: "Thank you for your response!")
  [Toggle] Allow guests to update their RSVP
  [Toggle] Allow guests to add plus-ones via RSVP
    └─ (note: requires plus-ones enabled in Guest Field Settings)

[Save] [Reset]
```

---

## Hooks

### `useRsvpSettings(eventUuid: string)`

- TanStack Query hook, same pattern as `useGuestSettings`
- Query key: `['events', eventUuid, 'rsvp-settings']`
- 5-minute stale time

### `useUpdateRsvpSettings(eventUuid: string)`

- Mutation hook, invalidates rsvp-settings query on success

---

## Dependencies

- Existing guest `rsvpStatus` enum and `rsvpToken` field (no changes needed)
- Existing `isPublic` and `slug` fields on events (used by Privacy & Sharing, not duplicated here)
- Guest Field Settings `enablePlusOnes` (for `allowRsvpPlusOnes` cross-check)

---

## Out of Scope (for initial implementation)

- Email sending / invitation delivery
- QR code generation for RSVP tokens
- Waitlist management
- RSVP analytics dashboard
- Automated reminders (requires email infrastructure)
