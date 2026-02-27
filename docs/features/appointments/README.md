# Appointment Scheduling for Providers & Venues

**Feature:** Lightweight appointment layer on top of provider/venue contact logs
**Status:** Implemented (P1)
**Last Updated:** 2026-02-27

---

## Overview

Event planners regularly schedule meetings with providers and venues — site visits, consultation calls, tastings — before committing to a booking. This feature adds an "appointment" flag to existing `eventProviderLogs` entries, allowing planners to mark a future log entry as a scheduled appointment rather than a retrospective interaction note.

Upcoming appointments are surfaced on the event detail page as a full-width "Upcoming Appointments" card, sorted by start time.

### Key Capabilities

- **Appointment Toggle** — Switch in the contact log form: "This is a scheduled appointment"
- **Time Fields** — Appointment start (required) and end (optional) shown whenever the toggle is on, regardless of booking status
- **Appointment Badge** — Blue "Appointment" badge on log items in the activity accordion
- **Upcoming Appointments Card** — Full-width card on the event detail page listing future appointments from all linked providers and venues, sorted by start time
- **Cache Invalidation** — Creating a log that is an appointment immediately refreshes the appointments card
- **P2 Calendar Ready** — Response shape includes all fields needed for `.ics` generation or Google/Outlook API calls; no schema changes needed for future calendar integration

---

## Design Spec

### Appointment Toggle in Log Form

```
┌──────────────────────────────────────────────────┐
│ ○ This is a scheduled appointment                 │
│                                                   │
│ Status Change     [No status change ▼]            │
│                                                   │
│ Appointment Start *   [datetime-local input]      │
│ Appointment End       [datetime-local input]      │
│                                                   │
│ Contact Person    [Name or role...]               │
│ Result            [e.g. Confirmed pricing...]     │
│ Notes             [Additional notes...]           │
│                                [Cancel] [Add Log] │
└──────────────────────────────────────────────────┘
```

When toggle is OFF and status is "booked", the same time fields show with labels "Booking Start" / "Booking End" (existing behaviour preserved).

### Log Item with Badge

```
┌─────────────────────────────────────────────────┐
│ Feb 27, 2026  [Appointment] [Booked]  by Jane    │
│ Appointment: Mar 5, 2026, 2:00 PM – 3:00 PM     │
│ Contact: John Smith                              │
│ Notes: Site visit for ceremony space             │
└─────────────────────────────────────────────────┘
```

### Upcoming Appointments Card (Event Detail Page)

```
┌────────────────────────────────────────────────────────────────┐
│ Upcoming Appointments                                          │
│ ──────────────────────────────────────────────────────────── │
│ 📅  Grand Ballroom                          banquet hall      │
│     Today at 2:00 PM · John Smith                            │
│ ──────────────────────────────────────────────────────────── │
│ 📅  Best Caterers Co.                       catering         │
│     Tomorrow at 10:00 AM                                     │
│ ──────────────────────────────────────────────────────────── │
│ 📅  Premier Photography                     photography      │
│     Mar 5 at 3:30 PM · Sarah Lee                             │
└────────────────────────────────────────────────────────────────┘
```

- Only future appointments shown (`bookingStartTime > now`)
- Up to 10 items, sorted ascending by start time
- Clicking any item navigates to `/dashboard/events/:uuid/providers`

---

## Database Schema

### `event_provider_logs` — new column

```sql
ALTER TABLE event_provider_logs
  ADD COLUMN is_appointment INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_event_provider_logs_appointment
  ON event_provider_logs (is_appointment, booking_start_time);
```

**Migration file:** `backend/drizzle/0037_add_is_appointment.sql`

**Drizzle schema** (`backend/src/db/schema/providers.ts`):
```typescript
isAppointment: integer('is_appointment', { mode: 'boolean' }).notNull().default(false),
```

The `is_appointment` column is a boolean integer (0/1) on `eventProviderLogs`. No new tables. When `isAppointment=true`, `bookingStartTime` must be set — enforced by both backend Zod schema and frontend form validation.

---

## API Endpoints

All routes are mounted under `/api/v1/events/:eventUuid/providers`.

### Existing log endpoints (updated)

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/:linkId/logs` | `isAppointment` added to select projection |
| `POST` | `/:linkId/logs` | `isAppointment` accepted in request body |
| `GET` | `/venues/:linkId/logs` | `isAppointment` added to select projection |
| `POST` | `/venues/:linkId/logs` | `isAppointment` accepted in request body |

**Log request body** (updated `createLogSchema`):
```typescript
{
  // ...existing fields...
  isAppointment: boolean  // default: false
  // requires bookingStartTime when true (Zod .refine())
}
```

### New endpoint

#### `GET /events/:eventUuid/providers/appointments`

Returns upcoming appointments (future, flagged logs) for the event, merged across providers and venues.

**Auth:** `requireAuth`
**Route order:** Declared before `/:linkId` parameterised routes to avoid shadowing.

**Query logic:**
1. Parallel queries: provider logs joined through `eventServiceProviders → serviceProviders`, and venue logs joined through `eventVenues → venues`
2. Filter: `isAppointment = true` AND `bookingStartTime > now()` AND event ID matches
3. Merge results, sort ascending by `bookingStartTime`, return up to 10

**Response:**
```typescript
{
  success: true,
  data: Array<{
    id: number;
    entityType: 'provider' | 'venue';
    entityName: string;         // businessName or venue name
    entityCategory: string;     // provider.category or venue.venueType
    linkId: number;
    appointmentStart: string;   // ISO 8601
    appointmentEnd: string | null;
    contactPerson: string | null;
    notes: string | null;
    result: string | null;
    statusChange: BookingStatus | null;
    createdAt: string;
  }>
}
```

---

## Frontend Architecture

```
EventDetailView
└── EventUpcomingAppointments         (new, full-width below 2-col grid)
    └── useEventAppointments()        (TanStack Query, staleTime: 5 min)

EventProvidersView
└── ContactLogsAccordion
    ├── isAppointment Switch toggle   (new, top of log form)
    ├── Appointment time fields       (show when isAppointment OR status='booked')
    └── Log list items
        └── [Appointment] badge       (new, when isAppointment=true)
```

### New Files

| File | Description |
|------|-------------|
| `frontend/src/components/events/EventUpcomingAppointments.tsx` | Upcoming appointments card component |

### Modified Files

| File | Change |
|------|--------|
| `backend/src/db/schema/providers.ts` | `isAppointment` column + index |
| `backend/src/routes/event-providers.ts` | Schema, log handlers, `/appointments` route |
| `frontend/src/hooks/use-providers.ts` | Types, `appointmentKeys`, `useEventAppointments`, cache invalidation |
| `frontend/src/components/providers-directory/EventProvidersView.tsx` | Toggle, time fields, badge |
| `frontend/src/components/events/EventDetailView.tsx` | Renders `EventUpcomingAppointments` |

---

## Data Flow

```
User toggles "This is a scheduled appointment" ON in log form
  → bookingStartTime/End fields appear (labelled "Appointment Start/End")
  → onSubmit sends { isAppointment: true, bookingStartTime: Date, ... }
  → POST /events/:uuid/providers/:linkId/logs
  → Backend validates: isAppointment=true requires bookingStartTime
  → Inserts log with is_appointment=1
  → onSuccess invalidates:
      providerLogKeys.provider(eventUuid, linkId)
      eventProviderKeys.list(eventUuid)
      appointmentKeys.list(eventUuid)   ← refreshes the upcoming card

Event Detail Page loads
  → EventUpcomingAppointments mounts
  → useEventAppointments(eventUuid) fetches GET /providers/appointments
  → Backend: parallel queries, filter future + isAppointment, merge, sort, slice(10)
  → Card renders sorted appointment items
```

---

## Validation Rules

| Rule | Enforced By |
|------|-------------|
| `bookingStartTime` required when `isAppointment=true` | Backend: Zod `.refine()` on `createLogSchema`; Frontend: Zod `.refine()` on `logFormSchema` |
| Only future appointments returned by `/appointments` | Backend: `gt(bookingStartTime, now)` filter |
| Max 10 appointments returned | Backend: `.slice(0, 10)` after merge+sort |

---

## P2 Calendar Integration Readiness

No schema changes needed for future calendar sync. The `/appointments` response already includes:

| Field | Used For |
|-------|----------|
| `appointmentStart` / `appointmentEnd` | `.ics` DTSTART/DTEND or Google Calendar event times |
| `entityName` | Event summary |
| `contactPerson` | Attendee name |
| `notes` | Event description |

A future `calendarEventId` column on `event_provider_logs` would enable two-way sync (create → store remote ID → update/delete by ID).

---

## Feature Priority

| Priority | Feature | Status |
|----------|---------|--------|
| P1 | Schema: `isAppointment` column on `event_provider_logs` | Done |
| P1 | Backend: `createLogSchema` validation + log POST/GET handlers | Done |
| P1 | Backend: `GET /appointments` endpoint | Done |
| P1 | Frontend: appointment toggle in log form | Done |
| P1 | Frontend: appointment badge on log items | Done |
| P1 | Frontend: `EventUpcomingAppointments` card | Done |
| P1 | Frontend: `useEventAppointments` hook + cache invalidation | Done |
| P2 | Calendar export (`.ics` download) | Planned |
| P2 | Google Calendar / Outlook sync | Planned |
| P2 | Appointment reminders (email notification) | Planned |
| P2 | Edit / cancel individual appointments | Planned |
| P3 | Appointment confirmation from provider side | Planned |
