# Test Cases: ics

**Source:** `frontend/src/lib/ics.ts`
**Test file:** `frontend/src/lib/ics.test.ts`
**Total tests:** 18

Generates RFC 5545-compliant `.ics` (iCalendar) file content from `AppointmentResponse[]`.
Only `generateICSContent` is unit-tested; `downloadICS` is DOM-dependent and excluded.

---

## `generateICSContent(appointments)`

Produces a `VCALENDAR` string with one `VEVENT` block per appointment. Uses CRLF (`\r\n`) line endings per RFC 5545.

### Structure

| # | Test | Input | Expected |
|---|------|-------|----------|
| 1 | wraps output in VCALENDAR block | any | starts with `BEGIN:VCALENDAR`, ends with `END:VCALENDAR` |
| 2 | includes required calendar properties | any | contains `VERSION:2.0`, `CALSCALE:GREGORIAN`, `METHOD:PUBLISH` |
| 3 | produces no VEVENT blocks for empty list | `[]` | does not contain `BEGIN:VEVENT` |
| 4 | produces one VEVENT block for single appointment | 1 appointment | exactly 1 `BEGIN:VEVENT` and 1 `END:VEVENT` |
| 5 | produces one VEVENT per appointment | 3 appointments | 3 × `BEGIN:VEVENT` |

### Date/Time

| # | Test | Input | Expected |
|---|------|-------|----------|
| 6 | includes DTSTART in UTC iCal format | `appointmentStart: '2025-06-15T14:00:00.000Z'` | `DTSTART:20250615T140000Z` |
| 7 | includes DTEND when appointmentEnd is provided | `appointmentEnd: '2025-06-15T16:00:00.000Z'` | `DTEND:20250615T160000Z` |
| 8 | defaults DTEND to 1 hour after DTSTART when appointmentEnd is null | `appointmentEnd: null`, start at 14:00 UTC | `DTEND:20250615T150000Z` |

### Content & Escaping

| # | Test | Input | Expected |
|---|------|-------|----------|
| 9 | includes SUMMARY with entity name | `entityName: 'DJ Services'` | `SUMMARY:DJ Services` |
| 10 | escapes semicolons in SUMMARY | `entityName: 'DJ; Music'` | `SUMMARY:DJ\; Music` |
| 11 | escapes commas in SUMMARY | `entityName: 'DJ, Band'` | `SUMMARY:DJ\, Band` |
| 12 | escapes backslashes in SUMMARY | `entityName: 'DJ\\Band'` | `SUMMARY:DJ\\\\Band` |
| 13 | includes DESCRIPTION with contactPerson | `contactPerson: 'John Doe'` | `DESCRIPTION` contains `Contact: John Doe` |
| 14 | includes DESCRIPTION with result | `result: 'Confirmed'` | `DESCRIPTION` contains `Result: Confirmed` |
| 15 | includes DESCRIPTION with notes | `notes: 'Bring extra gear'` | `DESCRIPTION` contains `Notes: Bring extra gear` |
| 16 | omits DESCRIPTION when all description fields are null | `contactPerson/result/notes = null` | does not contain `DESCRIPTION:` |

### Format

| # | Test | Input | Expected |
|---|------|-------|----------|
| 17 | uses CRLF line endings throughout | 1 appointment | `output.split('\r\n').length > 3` |
| 18 | UID contains the appointment id | `id: 42` | matches `/UID:planloo-appt-42-/` |
