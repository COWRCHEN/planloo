# RSVP API Endpoints

## Public Endpoints (No Authentication)

### GET `/api/v1/rsvp/:token`

Fetch all data needed to render the public RSVP page.

**File:** `backend/src/routes/rsvp.ts`

**Path Parameters:**
- `token` (string) - Unique RSVP token from guest invitation link

**Response (200):**

```json
{
  "success": true,
  "data": {
    "event": {
      "uuid": "...",
      "title": "...",
      "description": "...",
      "eventType": "wedding",
      "startDate": "...",
      "endDate": "...",
      "timezone": "America/New_York",
      "locationName": "...",
      "locationAddress": "...",
      "locationCity": "...",
      "locationState": "...",
      "locationCountry": "...",
      "coverImageUrl": "..."
    },
    "guest": {
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com",
      "rsvpStatus": "pending",
      "rsvpRespondedAt": null,
      "plusOnesAllowed": 2,
      "plusOnesCount": 0,
      "plusOnesCountAdults": 0,
      "plusOnesCountChildren": 0,
      "dietaryRestrictions": null,
      "needsAccommodation": null,
      "hotelName": null,
      "checkInDate": null,
      "checkOutDate": null,
      "mealChoice": null,
      "notes": null,
      "addressStreet": null,
      "addressCity": null,
      "addressState": null,
      "addressZipCode": null,
      "addressCountry": null,
      "transportationNeeded": null,
      "accessibilityNeeds": null,
      "customFieldData": null
    },
    "guestSettings": {
      "enableAccommodation": true,
      "accommodationHotels": [
        { "id": "1", "name": "Grand Hotel", "street": "123 Main St", "city": "NYC" }
      ],
      "accommodationCheckInDate": "2026-06-14",
      "accommodationCheckOutDate": "2026-06-16",
      "mealChoiceOptions": [
        { "key": "chicken", "label": "Grilled Chicken" },
        { "key": "fish", "label": "Pan-Seared Salmon" }
      ],
      "customFieldDefinitions": [...],
      "requiredMealChoice": false,
      "requiredAddress": false,
      "requiredTransportation": false,
      "requiredAccessibility": false
    },
    "rsvpSettings": {
      "enabled": true,
      "allowMaybeResponse": true,
      "rsvpDeadline": "2026-06-01T00:00:00.000Z",
      "deadlinePassed": false,
      "allowRsvpUpdate": true,
      "confirmationMessage": "Thank you! See you there!",
      "canRespond": true,
      "rsvpFormFields": {
        "dietaryRestrictions": true,
        "mealChoice": true,
        "notes": false,
        "address": false,
        "transportation": false,
        "accessibility": false,
        "customFields": false
      }
    }
  }
}
```

**Computed Fields:**
- `rsvpSettings.deadlinePassed` - `true` if current time is past `rsvpDeadline`
- `rsvpSettings.canRespond` - `true` if RSVP is enabled AND deadline not passed AND (not yet responded OR updates allowed)
- `rsvpSettings.rsvpFormFields` - "Effective fields" computed as RSVP toggle AND guest settings gate

**Error Responses:**
- `404` - Invalid or expired token / event not found

---

### POST `/api/v1/rsvp/:token`

Submit or update an RSVP response.

**File:** `backend/src/routes/rsvp.ts`

**Path Parameters:**
- `token` (string) - Unique RSVP token

**Request Body (Zod validated):**

```json
{
  "rsvpStatus": "confirmed",
  "plusOnesCountAdults": 1,
  "plusOnesCountChildren": 0,
  "dietaryRestrictions": "Vegetarian",
  "needsAccommodation": true,
  "hotelName": "Grand Hotel",
  "checkInDate": "2026-06-14",
  "checkOutDate": "2026-06-16",
  "mealChoice": "fish",
  "notes": "Looking forward to it!",
  "addressStreet": "456 Oak Ave",
  "addressCity": "Brooklyn",
  "addressState": "NY",
  "addressZipCode": "11201",
  "addressCountry": "US",
  "transportationNeeded": false,
  "accessibilityNeeds": null,
  "customFieldData": { "shirt_size": "M" }
}
```

**Validation Schema:**

| Field | Type | Constraints |
|-------|------|-------------|
| `rsvpStatus` | enum | Required. `confirmed`, `declined`, or `maybe` |
| `plusOnesCount` | integer | 0-10, optional (backward compat) |
| `plusOnesCountAdults` | integer | 0-10, optional |
| `plusOnesCountChildren` | integer | 0-10, optional |
| `dietaryRestrictions` | string | Max 500 chars, optional, nullable |
| `needsAccommodation` | boolean | Optional, nullable |
| `hotelName` | string | Max 200 chars, optional, nullable |
| `checkInDate` | date | Optional, nullable |
| `checkOutDate` | date | Optional, nullable |
| `mealChoice` | string | Max 200 chars, optional, nullable |
| `notes` | string | Max 1000 chars, optional, nullable |
| `addressStreet` | string | Max 200 chars, optional, nullable |
| `addressCity` | string | Max 100 chars, optional, nullable |
| `addressState` | string | Max 100 chars, optional, nullable |
| `addressZipCode` | string | Max 20 chars, optional, nullable |
| `addressCountry` | string | Max 100 chars, optional, nullable |
| `transportationNeeded` | boolean | Optional, nullable |
| `accessibilityNeeds` | string | Max 500 chars, optional, nullable |
| `customFieldData` | object | Optional, nullable |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "uuid": "...",
    "firstName": "Jane",
    "lastName": "Doe",
    "rsvpStatus": "confirmed",
    "plusOnesCount": 1,
    "dietaryRestrictions": "Vegetarian",
    "rsvpRespondedAt": "2026-02-10T15:30:00.000Z"
  }
}
```

**Error Responses:**

| Code | Error Code | When |
|------|-----------|------|
| `404` | `NOT_FOUND` | Invalid RSVP token |
| `403` | `RSVP_DISABLED` | `enableRsvp = false` |
| `410` | `RSVP_DEADLINE_PASSED` | Deadline has passed |
| `403` | `RSVP_UPDATE_NOT_ALLOWED` | Already responded + updates disabled |
| `400` | `MAYBE_NOT_ALLOWED` | Status is `maybe` but `allowMaybeResponse = false` |
| `400` | `VALIDATION_ERROR` | Plus-ones exceed limit, invalid hotel, invalid meal, dates invalid |

**Side Effects:**
1. Updates guest record with new RSVP data
2. Sets `rsvpRespondedAt` to current timestamp
3. Auto-sets `plusOnesCount` to 0 if status is `declined` or `maybe`
4. Only saves fields that are enabled in `rsvpFormFields`
5. Creates audit entry in `guestAudit` with `source: 'rsvp'`
6. Sends confirmation email (if `sendRsvpConfirmation` is enabled)

---

## Authenticated Endpoints (Organizer)

### GET `/api/v1/events/:uuid/rsvp-settings`

Fetch RSVP settings for an event. Auto-creates default settings row if none exists.

**Auth:** Required (event owner)

**Response:** `EventRsvpSettings` object

---

### PATCH `/api/v1/events/:uuid/rsvp-settings`

Update RSVP settings (partial update).

**Auth:** Required (event owner)

**Request Body:** Any subset of `UpdateRsvpSettingsInput` fields

---

### POST `/api/v1/events/:eventUuid/guests/send-invitations`

Batch send RSVP invitations to eligible guests.

**File:** `backend/src/routes/guests.ts`

**Auth:** Required (event owner, verified email)

**Request Body:**

```json
{
  "guestUuids": ["uuid1", "uuid2"]
}
```

Or to send to all eligible:

```json
{
  "guestUuids": "all-eligible"
}
```

**Behavior:**
- Only sends to guests with status `pending` and a valid email
- Sets guest status to `invited`
- Generates `rsvpToken` if not present
- Respects `sendRsvpInvitation` toggle
- Returns count of sent/failed

---

### POST `/api/v1/events/:eventUuid/guests/:guestUuid/resend-rsvp`

Resend RSVP invitation to a single guest.

**File:** `backend/src/routes/guests.ts`

**Auth:** Required (event owner, verified email)

**Behavior:**
- Sends invitation email to the specified guest
- Generates new `rsvpToken` if not present
- Logs the email send attempt
