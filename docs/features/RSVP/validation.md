# RSVP Validation & Business Rules

## Submission Enforcement (POST `/rsvp/:token`)

The backend enforces these rules in order. The first failing check short-circuits the request.

### 1. Token Validation

- Token must match a guest record
- Guest must not be soft-deleted (`deletedAt IS NULL`)
- **Error:** `404 NOT_FOUND` - "Invalid RSVP link"

### 2. RSVP Enabled Check

- `eventRsvpSettings.enableRsvp` must be `true`
- If no settings row exists, RSVP is treated as enabled (backward compat)
- **Error:** `403 RSVP_DISABLED` - "RSVP is not available for this event"

### 3. Deadline Check

- If `rsvpDeadline` is set, current time must be before the deadline
- Deadline is compared as `new Date(rsvpDeadline) < new Date()`
- **Error:** `410 RSVP_DEADLINE_PASSED` - "The RSVP deadline has passed ({formatted date})"

### 4. Update Policy Check

- If guest has already responded (`rsvpRespondedAt` is not null) AND `allowRsvpUpdate` is `false`, reject
- **Error:** `403 RSVP_UPDATE_NOT_ALLOWED` - "You have already responded to this invitation. The organizer does not allow response updates."

### 5. Maybe Response Check

- If `rsvpStatus` is `maybe` AND `allowMaybeResponse` is `false`, reject
- **Error:** `400 MAYBE_NOT_ALLOWED` - 'The "Maybe" response is not available for this event. Please select Yes or No.'

### 6. Plus-Ones Validation

- Total plus-ones (adults + children) must not exceed `guest.plusOnesAllowed`
- Prefers `plusOnesCountAdults` + `plusOnesCountChildren` if either is provided
- Falls back to `plusOnesCount` for backward compatibility
- **Error:** `400 VALIDATION_ERROR` - "Maximum {N} plus-ones allowed"

### 7. Accommodation Validation

Only checked when accommodation fields are provided:

- **Hotel name**: Must match one of the names in the configured hotel list
  - **Error:** `400 VALIDATION_ERROR` - "Hotel must be one of: {names}"
- **Dates**: Check-out must be on or after check-in
  - **Error:** `400 VALIDATION_ERROR` - "Check-out date must be on or after check-in date"

### 8. Meal Choice Validation

Only checked when `rsvpFormFields.mealChoice` is enabled and a value is provided:

- Meal choice key must match one of the configured `mealChoiceOptions` keys
- **Error:** `400 VALIDATION_ERROR` - "Meal choice must be one of: {labels}"

---

## Form Field Gating

Fields are only saved when their toggle is enabled in `rsvpFormFields`:

| Field | Saved When |
|-------|-----------|
| `dietaryRestrictions` | `rsvpFormFields.dietaryRestrictions = true` |
| `mealChoice` | `rsvpFormFields.mealChoice = true` |
| `notes` | `rsvpFormFields.notes = true` |
| `addressStreet/City/State/ZipCode/Country` | `rsvpFormFields.address = true` |
| `transportationNeeded` | `rsvpFormFields.transportation = true` |
| `accessibilityNeeds` | `rsvpFormFields.accessibility = true` |
| `customFieldData` | `rsvpFormFields.customFields = true` |

Fields not gated by `rsvpFormFields` (always saved if provided):
- `rsvpStatus`
- `plusOnesCount/Adults/Children`
- `needsAccommodation`, `hotelName`, `checkInDate`, `checkOutDate`

---

## Effective Fields Computation

The GET endpoint computes "effective fields" by AND-ing two sources:

```
effectiveField = rsvpFormFields toggle AND guestSettings gate
```

| RSVP Toggle | Guest Settings Gate | Effective |
|------------|--------------------|----|
| `mealChoice: true` | `enableMealChoice: true` | `true` |
| `mealChoice: true` | `enableMealChoice: false` | `false` |
| `mealChoice: false` | `enableMealChoice: true` | `false` |
| `address: true` | `enableAddress: true` | `true` |
| `transportation: true` | `enableTransportation: false` | `false` |
| `customFields: true` | `customFieldDefinitions: null` | `false` |

Fields without a guest settings gate:
- `dietaryRestrictions` - always follows RSVP toggle
- `notes` - always follows RSVP toggle

---

## Auto-Behavior on Status Change

When a guest responds with `declined` or `maybe`:
- `plusOnesCount` is automatically set to `0`
- `plusOnesCountAdults` is set to `0`
- `plusOnesCountChildren` is set to `0`

---

## Audit Trail

Every RSVP submission with at least one changed field creates a `guestAudit` entry:

```json
{
  "guestId": 123,
  "userId": null,
  "action": "update",
  "details": {
    "source": "rsvp",
    "changes": [
      { "field": "rsvpStatus", "from": "pending", "to": "confirmed" },
      { "field": "plusOnesCount", "from": 0, "to": 2 },
      { "field": "dietaryRestrictions", "from": null, "to": "Vegetarian" }
    ]
  }
}
```

- `userId: null` indicates a guest self-response (vs. organizer override which has a userId)
- `source: 'rsvp'` distinguishes RSVP submissions from dashboard edits (`source: 'dashboard'`)
- All changed fields are tracked with before/after values

---

## Email Behavior

After a successful RSVP submission:

1. Check `sendRsvpConfirmation` setting (default: `true`)
2. Check if guest has an email address
3. If both conditions met, send confirmation email via `sendRsvpConfirmationEmail()`
4. Log the email attempt to the email audit table (success or failure)
5. Email failures are logged but do not cause the RSVP submission to fail (best-effort)

---

## Frontend Validation

The `RsvpView` component enforces UI-level rules:

- Submit button disabled until a status is selected
- Plus-one inputs auto-adjust to stay within `plusOnesAllowed`
- Status-dependent fields only shown for `confirmed` or `maybe`
- Plus-ones section only shown for `confirmed`
- Form fields only shown when their toggle is `true` in `rsvpSettings.rsvpFormFields`
- Accommodation section only shown when `guestSettings.enableAccommodation` is `true` and hotels are configured
