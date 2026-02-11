# RSVP System Flow

## End-to-End Flow Diagram

```
                           ORGANIZER SIDE
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  1. Create Event                                        │
│     └─► Add guests (with emails)                        │
│                                                         │
│  2. Configure Guest Settings                            │
│     └─► Enable optional fields (meal, address, etc.)    │
│     └─► Configure hotels, meal options, custom fields   │
│                                                         │
│  3. Configure RSVP Settings                             │
│     └─► Enable RSVP                                     │
│     └─► Set deadline, maybe toggle, update policy       │
│     └─► Configure RSVP form fields                      │
│                                                         │
│  4. Send Invitations                                    │
│     └─► POST /events/:uuid/guests/send-invitations      │
│     └─► Compute link expiry = min(now + expiryHours,    │
│         rsvpDeadline)                                   │
│     └─► Stamp rsvpTokenExpiresAt on each guest          │
│     └─► Guests receive email with RSVP link             │
│     └─► Email includes link expiry time + deadline      │
│     └─► Guest status: pending → invited                 │
│                                                         │
└─────────────────────────────────────────────────────────┘

                            GUEST SIDE
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  5. Guest opens RSVP link (/rsvp/:token)                │
│     └─► GET /api/v1/rsvp/:token                         │
│     └─► Receives: event info, guest data, settings      │
│                                                         │
│  6. Frontend determines what to show:                   │
│     ├─► Link expired? → "Link Expired" screen           │
│     ├─► RSVP disabled? → "Not Available" screen         │
│     ├─► Deadline passed? → "Deadline Passed" screen     │
│     ├─► Already responded + no updates? → Read-only     │
│     └─► Can respond → Show full RSVP form               │
│                                                         │
│  7. Guest fills form and submits                        │
│     └─► POST /api/v1/rsvp/:token                        │
│     └─► Backend validates (see validation.md)           │
│     └─► Guest record updated                            │
│     └─► Audit entry created                             │
│     └─► Confirmation email sent (if enabled)            │
│     └─► "Thank You" screen shown                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Invitation Flow

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Organizer   │────►│  Send Invitations│────►│  Email Service │
│  Dashboard   │     │  API Endpoint    │     │  (Resend)      │
└──────────────┘     └────────┬─────────┘     └───────┬────────┘
                              │                       │
                     For each eligible guest:         │
                     ┌────────▼─────────┐             │
                     │ Generate rsvpToken│            │
                     │ if not present    │            │
                     │ Compute expiry =  │            │
                     │ min(now+hours,    │            │
                     │     deadline)     │            │
                     │ Stamp expiresAt   │            │
                     │ Set status to     │            │
                     │ 'invited'         │            │
                     └────────┬─────────┘             │
                              │                       │
                     ┌────────▼─────────┐    ┌───────▼────────┐
                     │  Log to email    │    │ Guest receives │
                     │  audit table     │    │ invitation     │
                     └──────────────────┘    │ email with     │
                                             │ RSVP link +    │
                                             │ link expiry +  │
                                             │ deadline (when │
                                             │ set)           │
                                             └────────────────┘
```

## RSVP Submission Flow (Backend Detail)

```
POST /rsvp/:token
        │
        ▼
┌─── Find Guest by Token ───┐
│   (not soft-deleted)       │──── 404 NOT_FOUND
└────────────┬───────────────┘
             │
             ▼
┌─── Check Link Expiry ─────┐
│   rsvpTokenExpiresAt       │──── 410 RSVP_LINK_EXPIRED
└────────────┬───────────────┘
             │
             ▼
┌─── Load RSVP Settings ────┐
│                            │
└────────────┬───────────────┘
             │
             ▼
┌─── Check enableRsvp ──────┐
│                            │──── 403 RSVP_DISABLED
└────────────┬───────────────┘
             │
             ▼
┌─── Check Deadline ────────┐
│                            │──── 410 RSVP_DEADLINE_PASSED
└────────────┬───────────────┘
             │
             ▼
┌─── Check Update Policy ───┐
│   (if already responded)   │──── 403 RSVP_UPDATE_NOT_ALLOWED
└────────────┬───────────────┘
             │
             ▼
┌─── Check Maybe Allowed ───┐
│   (if status = maybe)      │──── 400 MAYBE_NOT_ALLOWED
└────────────┬───────────────┘
             │
             ▼
┌─── Validate Plus-Ones ────┐
│   total ≤ plusOnesAllowed   │──── 400 VALIDATION_ERROR
└────────────┬───────────────┘
             │
             ▼
┌─── Validate Accommodation ┐
│   hotel name, dates        │──── 400 VALIDATION_ERROR
└────────────┬───────────────┘
             │
             ▼
┌─── Validate Meal Choice ──┐
│   against options list     │──── 400 VALIDATION_ERROR
└────────────┬───────────────┘
             │
             ▼
┌─── Build Update Payload ──┐
│   Only enabled fields      │
│   Auto-zero plus-ones if   │
│   declined/maybe           │
└────────────┬───────────────┘
             │
             ▼
┌─── Update Guest Record ───┐
│   + set rsvpRespondedAt    │
└────────────┬───────────────┘
             │
             ├──────────────────────────┐
             ▼                          ▼
┌─── Create Audit Entry ──┐  ┌─── Send Email ─────────┐
│   source: 'rsvp'         │  │   (if enabled + has    │
│   changes: [{field,      │  │    email, best-effort)  │
│     from, to}]           │  │   + log to email audit  │
└──────────────────────────┘  └─────────────────────────┘
             │
             ▼
        200 OK + updated guest data
```

## Form Field Visibility Decision Tree

```
For each configurable field on the RSVP form:

Is field enabled in rsvpFormFields?
  │
  ├── NO → Field hidden
  │
  └── YES → Does field have a Guest Settings gate?
              │
              ├── NO (dietary, notes) → Field shown
              │
              └── YES → Is gate enabled in Guest Settings?
                          │
                          ├── NO → Field hidden
                          │
                          └── YES → Is guest status confirmed or maybe?
                                      │
                                      ├── NO → Field hidden
                                      │
                                      └── YES → Field shown
```

## State Lifecycle

```
Guest Status Flow:
  pending ──[send invitation]──► invited ──[guest responds]──► confirmed
                                                              │ declined
                                                              │ maybe

RSVP Settings Lifecycle:
  Event created → No settings row
  First GET /rsvp-settings → Auto-create with defaults
  Organizer toggles → PATCH updates
  Guest opens RSVP link → Settings enforced on GET + POST

RSVP Token Lifecycle:
  Guest created → Token may be null, expiresAt null
  Send invitation → Token generated (if null)
                  → rsvpTokenExpiresAt = min(now + expiryHours, deadline)
  Guest uses link → Check expiresAt, if expired → "Link Expired"
                  → Token matched, response recorded
  Resend invitation → expiresAt refreshed with new computed expiry
  Token is permanent per guest (not rotated), but expiry refreshes on each send
```
