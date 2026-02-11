# RSVP Link Expiry

**Feature:** Per-invitation link expiry for RSVP tokens
**Status:** Implemented
**Added:** 2026-02-11

---

## Overview

Each RSVP invitation link has a configurable expiry time. When a guest clicks an expired link, they see a "Link Expired" screen and must contact the organizer for a new invitation. This is separate from the global RSVP deadline.

### Two Distinct Concepts

| Concept | Scope | Purpose |
|---------|-------|---------|
| **RSVP Deadline** (existing) | Event-level | A global date after which no one can RSVP |
| **Link Expiry** (new) | Per-invitation | A time window per invitation link. Refreshed each time the organizer sends/resends |

### Key Rules

1. **Default is 12 hours.** Every invitation link expires by default, even if the organizer never configures it. The organizer can change the duration (1 hour to 30 days) but cannot disable expiry entirely.
2. **Link expiry is capped to the RSVP deadline.** If a deadline is set and the computed expiry (`now + expiryHours`) falls after the deadline, the effective expiry is capped to the deadline instead.
3. **Resending refreshes the expiry.** When an organizer resends an invitation, `rsvpTokenExpiresAt` is recomputed from the current time.

---

## Schema

### `eventRsvpSettings` -- new column

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `rsvpLinkExpiryHours` | INTEGER NOT NULL | `12` | Hours each invitation link remains valid after sending (range: 1-720) |

### `guests` -- new column

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `rsvpTokenExpiresAt` | INTEGER (timestamp) | `null` | When this guest's current RSVP link expires. Null for guests who haven't been sent an invitation yet. |

Migration: `drizzle/0014_add_rsvp_link_expiry_and_token_expires.sql`

---

## Backend Logic

### Expiry Computation

When sending or resending invitations, the backend computes the effective expiry:

```typescript
function computeLinkExpiry(expiryHours: number, deadline: Date | null): Date {
  const computedExpiry = new Date(Date.now() + expiryHours * 3600_000);
  if (deadline && deadline < computedExpiry) {
    return deadline;
  }
  return computedExpiry;
}
```

This is called in:
- `POST /events/:uuid/guests/send-invitations` (batch send)
- `POST /events/:uuid/guests/:guestUuid/resend-rsvp` (single resend)

Both routes:
1. Fetch `rsvpLinkExpiryHours` and `rsvpDeadline` from `eventRsvpSettings`
2. Compute `rsvpTokenExpiresAt = computeLinkExpiry(expiryHours, deadline)`
3. Stamp `rsvpTokenExpiresAt` on the guest record
4. Pass the expiry to the email function for display

### Expiry Enforcement

In the public RSVP endpoints (`backend/src/routes/rsvp.ts`):

| Endpoint | Expired Response |
|----------|-----------------|
| `GET /rsvp/:token` | `200 { success: true, data: { expired: true } }` |
| `POST /rsvp/:token` | `410 { success: false, error: { code: 'RSVP_LINK_EXPIRED', message: '...' } }` |

Link expiry is checked **before** all other validations (enableRsvp, deadline, update policy).

### Validation Order (POST)

```
Find Guest → Check Link Expiry → Check enableRsvp → Check Deadline → Check Update Policy → ...
```

### Settings Endpoint

`PATCH /events/:uuid/rsvp-settings` accepts:

```typescript
rsvpLinkExpiryHours: z.coerce.number().int().min(1).max(720).optional()
```

---

## Email

The invitation email includes the link expiry time:

```
🔗 This invitation link expires on Wednesday, February 12, 2026 at 3:00 PM
```

This appears below the event details and RSVP deadline (if set), in both HTML and plain text versions.

---

## Frontend

### Expired Link Screen (`RsvpView.tsx`)

When the backend returns `{ expired: true }`, the RSVP page shows:

- Clock icon (amber)
- **"RSVP Link Expired"** heading
- Message: "This RSVP invitation link has expired. Please contact the event organizer to receive a new invitation."

This check runs before RSVP disabled, deadline passed, and already-responded screens.

### Settings UI (`RsvpSettings.tsx`)

A new "RSVP Link Expiry" section appears when RSVP is enabled, between the RSVP Deadline calendar and the Confirmation Message:

- **Label:** "RSVP Link Expiry"
- **Description:** "Set how long each invitation link remains valid after sending. Guests with expired links will need a new invitation."
- **Input:** Select with presets: 6 hours, 12 hours (default), 24 hours, 48 hours, 7 days, 30 days
- **Conditional note:** When an RSVP deadline is set, shows: "Note: If the link expiry extends past the RSVP deadline, the deadline will be used instead."

### TypeScript Types (`use-events.ts`)

```typescript
interface EventRsvpSettings {
  // ... existing fields ...
  rsvpLinkExpiryHours: number; // always present, default 12
}

interface UpdateRsvpSettingsInput {
  // ... existing fields ...
  rsvpLinkExpiryHours?: number; // optional on update
}
```

---

## Data Flow

```
Organizer sets rsvpLinkExpiryHours = 12
                    │
                    ▼
Organizer clicks "Send Invitations"
                    │
                    ▼
Backend computes: expiry = min(now + 12h, deadline)
                    │
                    ├──► UPDATE guests SET rsvpTokenExpiresAt = expiry
                    │
                    └──► Send email: "This link expires on Feb 12, 3:00 PM"
                                        │
                        ┌───────────────┴───────────────┐
                        ▼                               ▼
                 Within 12 hours                  After 12 hours
                        │                               │
                 GET /rsvp/:token              GET /rsvp/:token
                        │                               │
                  RSVP form shown              "Link Expired" screen
                                                        │
                                              Organizer resends
                                                        │
                                              New expiry computed
                                              Guest gets fresh email
```

---

## Files Modified

| File | Change |
|------|--------|
| `backend/src/db/schema/events.ts` | Added `rsvpLinkExpiryHours`, `rsvpTokenExpiresAt` columns |
| `backend/src/routes/guests.ts` | `computeLinkExpiry()`, stamp expiry on send/resend |
| `backend/src/routes/rsvp.ts` | Expiry check in GET and POST endpoints |
| `backend/src/routes/events.ts` | `rsvpLinkExpiryHours` in settings schema and PATCH handler |
| `backend/src/lib/email.ts` | `rsvpLinkExpiresAt` param, render in email body |
| `frontend/src/components/guests/RsvpView.tsx` | "Link Expired" screen |
| `frontend/src/components/events/RsvpSettings.tsx` | Link expiry select input |
| `frontend/src/hooks/use-events.ts` | `rsvpLinkExpiryHours` in types |
| `docs/features/RSVP/flow.md` | Updated flow diagrams and token lifecycle |
| `docs/features/RSVP/schema.md` | Documented new columns |
