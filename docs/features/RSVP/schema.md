# RSVP Database Schema

## Tables

### `eventRsvpSettings` (1:1 with events)

**File:** `backend/src/db/schema/events.ts`

Stores per-event RSVP configuration. One row per event, auto-created on first GET.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | INTEGER PK | auto | Primary key |
| `eventId` | INTEGER UNIQUE FK | - | References `events.id` (cascade delete) |
| `enableRsvp` | BOOLEAN | `false` | Master toggle for RSVP functionality |
| `allowMaybeResponse` | BOOLEAN | `true` | Allow "Maybe" as a response option |
| `rsvpDeadline` | TIMESTAMP | `null` | When RSVP closes (nullable) |
| `rsvpConfirmationMessage` | TEXT | `null` | Custom message shown after submission (max 500 chars) |
| `allowRsvpUpdate` | BOOLEAN | `true` | Can guests change their response after submitting |
| `allowRsvpPlusOnes` | BOOLEAN | `false` | Allow plus-ones via the RSVP form |
| `sendRsvpInvitation` | BOOLEAN | `true` | Send invitation emails when triggering invitations |
| `sendRsvpConfirmation` | BOOLEAN | `true` | Send confirmation email after guest submits RSVP |
| `rsvpFormFields` | TEXT (JSON) | `null` | Controls which fields appear on the RSVP form |
| `createdAt` | TIMESTAMP | `unixepoch()` | Row creation time |
| `updatedAt` | TIMESTAMP | `unixepoch()` | Last update time |

**Index:** `idx_event_rsvp_settings_event_id` on `eventId`

### `rsvpFormFields` JSON Structure

Stored as JSON text in `eventRsvpSettings.rsvpFormFields`:

```json
{
  "dietaryRestrictions": true,
  "mealChoice": false,
  "notes": false,
  "address": false,
  "transportation": false,
  "accessibility": false,
  "customFields": false
}
```

When `null`, defaults are applied:
- `dietaryRestrictions`: `true`
- All others: `false`

### RSVP-Related Columns in `guests` Table

The `guests` table contains columns that store RSVP response data:

| Column | Type | Description |
|--------|------|-------------|
| `rsvpStatus` | TEXT | Enum: `pending`, `invited`, `confirmed`, `declined`, `maybe` |
| `rsvpToken` | TEXT UNIQUE | Unique token for public RSVP access |
| `rsvpRespondedAt` | TIMESTAMP | When the guest submitted their RSVP |
| `plusOnesAllowed` | INTEGER | Maximum plus-ones this guest can bring |
| `plusOnesCount` | INTEGER | Total plus-ones (adults + children) |
| `plusOnesCountAdults` | INTEGER | Adult plus-ones count |
| `plusOnesCountChildren` | INTEGER | Children plus-ones count |
| `dietaryRestrictions` | TEXT | Dietary needs (free text) |
| `needsAccommodation` | BOOLEAN | Whether guest needs accommodation |
| `hotelName` | TEXT | Selected hotel name |
| `checkInDate` | TIMESTAMP | Hotel check-in date |
| `checkOutDate` | TIMESTAMP | Hotel check-out date |
| `mealChoice` | TEXT | Selected meal option key |
| `notes` | TEXT | Guest notes/message |
| `addressStreet` | TEXT | Mailing address - street |
| `addressCity` | TEXT | Mailing address - city |
| `addressState` | TEXT | Mailing address - state |
| `addressZipCode` | TEXT | Mailing address - ZIP |
| `addressCountry` | TEXT | Mailing address - country |
| `transportationNeeded` | BOOLEAN | Whether guest needs transportation |
| `accessibilityNeeds` | TEXT | Accessibility requirements |
| `customFieldData` | TEXT (JSON) | Custom field responses |

## Relationships

```
events (1) ──── (1) eventRsvpSettings
events (1) ──── (N) guests
guests (1) ──── (N) guestAudit
```

## Cross-Table Dependencies

The RSVP form field visibility depends on both `eventRsvpSettings.rsvpFormFields` AND `eventGuestSettings`:

| RSVP Form Field | Requires in Guest Settings |
|-----------------|---------------------------|
| `dietaryRestrictions` | None |
| `mealChoice` | `enableMealChoice = true` |
| `notes` | None |
| `address` | `enableAddress = true` |
| `transportation` | `enableTransportation = true` |
| `accessibility` | `enableAccessibility = true` |
| `customFields` | `customFieldDefinitions` is non-empty |

The backend computes "effective fields" by AND-ing both toggles before sending to the frontend.
