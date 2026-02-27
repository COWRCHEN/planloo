# Calendar Sync for Appointments

**Feature:** Google Calendar / Outlook sync for scheduled appointments
**Status:** Planned (P2)
**Last Updated:** 2026-02-27
**Depends On:** [Appointment Scheduling](../README.md) (P1, Done)

---

## Overview

When a planner marks a provider or venue log entry as an appointment, they should be able to push that appointment directly to their Google Calendar or Microsoft Outlook calendar with a single click. A sync button on the Upcoming Appointments card initiates the OAuth flow (if not already authorised) and creates a calendar event on the external service. The resulting remote event ID is stored on the log record so the same appointment can later be updated or deleted from the external calendar when the appointment changes.

### Key Capabilities

- **Google Calendar sync** — Pushes appointment to the user's primary Google Calendar via the Google Calendar API v3; supports create, update, and delete
- **Outlook Calendar sync** — Pushes appointment to the user's primary Outlook calendar via Microsoft Graph API v1.0; supports create, update, and delete
- **One-click sync button** — Sync icon in each row of `EventUpcomingAppointments`; shows synced state with provider badge when already synced
- **Idempotent re-sync** — If a `calendarEventId` already exists for the log, the backend issues a PATCH/update to the external event rather than creating a duplicate
- **Unsync / delete** — A delete (unsync) action removes the external event by stored ID and clears `calendarEventId` / `calendarProvider` from the log record
- **Token refresh** — Access tokens are refreshed automatically using stored refresh tokens before each API call; no user interaction required after initial OAuth
- **Per-provider auth** — Google and Outlook tokens are stored separately; the user can authorise both or only one

---

## Database Schema Changes

Two new columns on `event_provider_logs`:

```sql
ALTER TABLE event_provider_logs
  ADD COLUMN calendar_event_id TEXT;          -- remote event ID (null = not synced)

ALTER TABLE event_provider_logs
  ADD COLUMN calendar_provider TEXT;          -- 'google' | 'outlook' | null
```

**Migration file:** `backend/drizzle/XXXX_add_calendar_sync.sql`

**Drizzle schema** (`backend/src/db/schema/providers.ts`):
```typescript
calendarEventId: text('calendar_event_id'),
calendarProvider: text('calendar_provider').$type<'google' | 'outlook'>(),
```

No new tables are required. Tokens for Google and Outlook are stored in the existing `account` table (via Better Auth OAuth accounts), keyed by `providerId = 'google'` and `providerId = 'microsoft'`.

### Updated Log Response Shape

All log GET endpoints that currently return `isAppointment` will also return:

```typescript
{
  // ...existing fields...
  calendarEventId: string | null;
  calendarProvider: 'google' | 'outlook' | null;
}
```

The `useEventAppointments` hook and `EventUpcomingAppointments` component will use these fields to render the correct synced/unsynced state.

---

## API Endpoints

All new routes are mounted under `/api/v1/events/:eventUuid/providers`.

### `POST /logs/:logId/calendar-sync`

Syncs the appointment to the user's calendar. Creates the external event if no `calendarEventId` exists; updates the existing event if one does.

**Auth:** `requireAuth`

**Request body:**
```typescript
{
  provider: 'google' | 'outlook';
}
```

**Behaviour:**
1. Load log record by `logId`; verify `isAppointment = true` and that the caller has access to the event
2. Look up the user's OAuth account for the given provider in the `account` table
3. If the access token is expired, call the token refresh endpoint and update the stored token
4. Build the calendar event payload (see provider sections below)
5. If `calendarEventId` is null: `POST` to create a new event; store the returned event ID and provider on the log record
6. If `calendarEventId` is set: `PATCH`/`PUT` to update the existing event
7. Return the updated log record

**Response (`200`):**
```typescript
{
  success: true,
  data: {
    calendarEventId: string;
    calendarProvider: 'google' | 'outlook';
  }
}
```

---

### `DELETE /logs/:logId/calendar-sync`

Removes the calendar event from the external provider and clears the stored IDs.

**Auth:** `requireAuth`

**Behaviour:**
1. Load log record; verify access
2. If `calendarEventId` is null, return `400` (nothing to unsync)
3. Look up the user's OAuth account; refresh token if needed
4. Call provider delete endpoint with stored `calendarEventId`
5. On success (or `404` from provider — already deleted), clear `calendarEventId` and `calendarProvider` on the log record
6. Return success

**Response (`200`):**
```typescript
{
  success: true,
  data: {
    calendarEventId: null,
    calendarProvider: null,
  }
}
```

---

## Google Calendar API

### OAuth Scope Required

```
https://www.googleapis.com/auth/calendar.events
```

Add this scope to the Google OAuth configuration in `backend/src/lib/auth.ts` inside the `google` provider's `scope` array.

### Token Refresh

```
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

client_id=<GOOGLE_CLIENT_ID>
client_secret=<GOOGLE_CLIENT_SECRET>
refresh_token=<stored_refresh_token>
grant_type=refresh_token
```

Returns `{ access_token, expires_in }`. Store updated `accessToken` and `accessTokenExpiresAt` back to the `account` table.

### Create Event

```
POST https://www.googleapis.com/calendar/v3/calendars/primary/events
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "summary": "<entityName> – <entityCategory>",
  "description": "<notes>",
  "start": { "dateTime": "<appointmentStart ISO 8601>", "timeZone": "UTC" },
  "end":   { "dateTime": "<appointmentEnd ISO 8601 or appointmentStart + 1h>", "timeZone": "UTC" },
  "attendees": [
    { "displayName": "<contactPerson>" }   // only if contactPerson is set
  ]
}
```

Returns `{ id, htmlLink, ... }`. Store `id` as `calendarEventId`.

### Update Event

```
PATCH https://www.googleapis.com/calendar/v3/calendars/primary/events/<calendarEventId>
Authorization: Bearer <access_token>
Content-Type: application/json

{ /* same payload as create */ }
```

### Delete Event

```
DELETE https://www.googleapis.com/calendar/v3/calendars/primary/events/<calendarEventId>
Authorization: Bearer <access_token>
```

Returns `204 No Content` on success, `404` if already deleted (treat as success).

---

## Microsoft Outlook API (Graph)

### OAuth Scope Required

```
Calendars.ReadWrite offline_access
```

Add these scopes to the Microsoft OAuth configuration in `backend/src/lib/auth.ts` inside the `microsoft` provider's `scope` array.

### App Registration (Azure)

1. Go to [Azure Portal → App registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Create a new registration (or use the existing one used for Microsoft SSO)
3. Under **API permissions**, add **Microsoft Graph → Delegated → Calendars.ReadWrite**
4. Grant admin consent if required by the tenant
5. Under **Authentication**, add the redirect URI for your environment: `<FRONTEND_URL>/api/auth/callback/microsoft`
6. Confirm `offline_access` is included in the scope to receive refresh tokens

> **Note:** If Microsoft SSO is already configured, add `Calendars.ReadWrite` to the existing app registration rather than creating a new one. The existing `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` env vars are reused.

### Token Refresh

```
POST https://login.microsoftonline.com/common/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id=<MICROSOFT_CLIENT_ID>
client_secret=<MICROSOFT_CLIENT_SECRET>
refresh_token=<stored_refresh_token>
grant_type=refresh_token
scope=Calendars.ReadWrite offline_access
```

Returns `{ access_token, refresh_token, expires_in }`. Store updated tokens back to the `account` table.

### Create Event

```
POST https://graph.microsoft.com/v1.0/me/events
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "subject": "<entityName> – <entityCategory>",
  "body": { "contentType": "text", "content": "<notes>" },
  "start": { "dateTime": "<appointmentStart ISO 8601>", "timeZone": "UTC" },
  "end":   { "dateTime": "<appointmentEnd ISO 8601 or appointmentStart + 1h>", "timeZone": "UTC" },
  "attendees": [
    {
      "emailAddress": { "name": "<contactPerson>" },
      "type": "optional"
    }
  ]
}
```

Returns `{ id, webLink, ... }`. Store `id` as `calendarEventId`.

### Update Event

```
PATCH https://graph.microsoft.com/v1.0/me/events/<calendarEventId>
Authorization: Bearer <access_token>
Content-Type: application/json

{ /* same payload as create */ }
```

### Delete Event

```
DELETE https://graph.microsoft.com/v1.0/me/events/<calendarEventId>
Authorization: Bearer <access_token>
```

Returns `204 No Content` on success, `404` if already deleted (treat as success).

---

## Frontend Architecture

```
EventUpcomingAppointments
└── appointment row
    ├── CalendarSyncButton             (new inline component)
    │   ├── useCalendarSync(logId)     (mutation hook)
    │   └── useCalendarUnsync(logId)  (mutation hook)
    └── synced badge: [Google] or [Outlook]
```

### `useCalendarSync` hook

```typescript
// frontend/src/hooks/use-appointments.ts  (or use-providers.ts)

export function useCalendarSync(eventUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ logId, provider }: { logId: number; provider: 'google' | 'outlook' }) =>
      apiClient
        .post(`/api/v1/events/${eventUuid}/providers/logs/${logId}/calendar-sync`, { provider })
        .then(handleResponse),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.list(eventUuid) });
    },
  });
}
```

### `useCalendarUnsync` hook

```typescript
export function useCalendarUnsync(eventUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: number) =>
      apiClient
        .delete(`/api/v1/events/${eventUuid}/providers/logs/${logId}/calendar-sync`)
        .then(handleResponse),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.list(eventUuid) });
    },
  });
}
```

### Sync Button UI (sketch)

```
┌──────────────────────────────────────────────────────────────┐
│ 📅  Grand Ballroom                           banquet hall     │
│     Tomorrow at 10:00 AM · John Smith                        │
│                                    [✓ Google]  [📅 Outlook]  │
│                                       ↑ synced   ↑ not synced│
└──────────────────────────────────────────────────────────────┘
```

- If `calendarProvider = 'google'`: show a filled/checked Google button and a secondary Outlook button
- If `calendarProvider = 'outlook'`: reverse
- If neither: show both as outline buttons with a calendar icon
- Clicking an unsynced button: call `useCalendarSync` with the corresponding provider
- Clicking the synced button: open a confirmation popover → call `useCalendarUnsync`

### Modified Files

| File | Change |
|------|--------|
| `backend/src/db/schema/providers.ts` | `calendarEventId`, `calendarProvider` columns |
| `backend/src/routes/event-providers.ts` | `POST/DELETE /logs/:logId/calendar-sync` routes |
| `backend/src/lib/auth.ts` | Add `calendar.events` / `Calendars.ReadWrite` scopes |
| `frontend/src/hooks/use-providers.ts` (or `use-appointments.ts`) | `useCalendarSync`, `useCalendarUnsync` mutation hooks |
| `frontend/src/components/events/EventUpcomingAppointments.tsx` | Sync buttons per appointment row |

---

## Error Handling

| Scenario | HTTP Status | Error Code | Handling |
|----------|-------------|------------|----------|
| Log is not an appointment | `400` | `NOT_AN_APPOINTMENT` | Return early; should not reach sync UI |
| No OAuth account for provider | `400` | `OAUTH_ACCOUNT_NOT_FOUND` | Frontend: prompt user to connect the account via OAuth |
| No refresh token stored | `400` | `NO_REFRESH_TOKEN` | Frontend: prompt user to re-authorise (OAuth flow) |
| Token refresh failed (expired/revoked) | `401` | `TOKEN_REFRESH_FAILED` | Frontend: prompt user to re-authorise |
| External API rate limit | `429` | `CALENDAR_RATE_LIMIT` | Return error; frontend shows toast with retry guidance |
| External API returns `404` on delete | — | — | Treat as success; clear stored IDs |
| External API error (5xx) | `502` | `CALENDAR_API_ERROR` | Return error; frontend shows toast |
| User lacks access to the event | `403` | `FORBIDDEN` | Standard auth middleware handles this |

---

## Environment Variables

No new env vars are required if Google and Microsoft OAuth are already configured. Ensure the following are set:

| Variable | Used By |
|----------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth + Calendar token refresh |
| `GOOGLE_CLIENT_SECRET` | Google OAuth + Calendar token refresh |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth + Graph token refresh |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth + Graph token refresh |

---

## Setup Checklist

### Google Calendar

- [ ] Verify `https://www.googleapis.com/auth/calendar.events` is added to the `scope` array in the Google provider config in `backend/src/lib/auth.ts`
- [ ] In [Google Cloud Console](https://console.cloud.google.com/) → OAuth consent screen: add `Google Calendar API` to the list of enabled APIs
- [ ] Confirm `access_type=offline` is included in the Google OAuth flow so a refresh token is issued on first login

### Microsoft Outlook

- [ ] In [Azure Portal](https://portal.azure.com/) → App Registration → API Permissions: add `Microsoft Graph → Delegated → Calendars.ReadWrite`
- [ ] Grant admin consent for `Calendars.ReadWrite` if required by the tenant
- [ ] Confirm `offline_access` is in the Microsoft OAuth `scope` config so a refresh token is issued
- [ ] Verify redirect URI `<FRONTEND_URL>/api/auth/callback/microsoft` is registered in the Azure app

---

## Feature Priority

| Priority | Feature | Status |
|----------|---------|--------|
| P2 | Schema: `calendarEventId` + `calendarProvider` columns on `event_provider_logs` | Planned |
| P2 | Backend: `POST /logs/:logId/calendar-sync` (create/update) | Planned |
| P2 | Backend: `DELETE /logs/:logId/calendar-sync` (unsync) | Planned |
| P2 | Backend: token refresh helper for Google | Planned |
| P2 | Backend: token refresh helper for Outlook | Planned |
| P2 | Frontend: `useCalendarSync` mutation hook | Planned |
| P2 | Frontend: `useCalendarUnsync` mutation hook | Planned |
| P2 | Frontend: sync buttons in `EventUpcomingAppointments` | Planned |
| P3 | Two-way sync: pull external event updates back into log record | Planned |
| P3 | Sync on appointment edit/cancel (auto-update external event) | Planned |
| P3 | Appointment reminders via Google/Outlook reminder settings | Planned |
