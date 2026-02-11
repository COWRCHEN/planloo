# RSVP Frontend Components

## Page

### `/rsvp/[token].astro`

**File:** `frontend/src/pages/rsvp/[token].astro`

Public SSR page (`prerender = false`). Extracts `token` from URL params and renders `RsvpView` as a client-side island (`client:load`). Uses `BaseLayout` with minimal chrome (just the Planloo logo).

---

## Organizer Components

### `RsvpSettings`

**File:** `frontend/src/components/events/RsvpSettings.tsx`

**Props:** `{ eventUuid: string }`

Configures RSVP behavior for an event. Rendered inside an accordion item in `EventSettingsView`.

**Controls:**

| Control | Type | Description |
|---------|------|-------------|
| Enable RSVP | Toggle | Master switch for RSVP functionality |
| Allow "Maybe" responses | Toggle | Show/hide Maybe option (shown when RSVP enabled) |
| RSVP Deadline | Calendar popover | Optional deadline with Clear button (future dates only) |
| Confirmation Message | Textarea | Custom post-submission message (max 500 chars with counter) |
| Allow RSVP updates | Toggle | Let guests change response after submitting |
| Allow plus-ones via RSVP | Toggle | Show plus-one section (note: requires Guest Field Settings) |

**State Pattern:**
- Local state via `useState<Partial<UpdateRsvpSettingsInput>>`
- Tracks `hasChanges` to show/hide Save + Reset buttons
- Resets on `settings?.updatedAt` change (server sync)
- Uses `useRsvpSettings()` for fetching, `useUpdateRsvpSettings()` for saving

**Conditional Rendering:**
- All controls except "Enable RSVP" are only shown when `enableRsvp = true`

---

### `RsvpFormFieldSettings`

**File:** `frontend/src/components/events/RsvpFormFieldSettings.tsx`

**Props:** `{ eventUuid: string }`

Configures which fields appear on the public RSVP form. Rendered in a separate accordion item (only visible when RSVP is enabled).

**Toggle Controls (7 fields):**

| Field | Default | Note |
|-------|---------|------|
| Dietary Restrictions | ON | No dependency |
| Meal Choice | OFF | Requires `enableMealChoice` in Guest Settings |
| Notes | OFF | No dependency |
| Address | OFF | Requires `enableAddress` in Guest Settings |
| Transportation | OFF | Requires `enableTransportation` in Guest Settings |
| Accessibility | OFF | Requires `enableAccessibility` in Guest Settings |
| Custom Fields | OFF | Requires `customFieldDefinitions` configured |

**State Pattern:** Same as `RsvpSettings` - local state, save/reset buttons, change tracking.

---

### `EventSettingsView` Integration

**File:** `frontend/src/components/events/EventSettingsView.tsx`

The settings page renders RSVP components in two accordion items:

1. **"RSVP & Invitations"** - Always shown, contains `RsvpSettings`
2. **"RSVP Form Fields"** - Only shown when `rsvpSettings?.enableRsvp` is `true`, contains `RsvpFormFieldSettings`

Both are wrapped in `QueryProvider` for TanStack Query context.

---

## Public Guest Component

### `RsvpView`

**File:** `frontend/src/components/guests/RsvpView.tsx`

**Props:** `{ token: string }`

The main public-facing RSVP form. Wrapped in `QueryProvider`.

**States & Screens:**

| State | What's Shown |
|-------|-------------|
| Loading | Skeleton placeholder |
| Error / Invalid token | Error card with "Invalid RSVP Link" message |
| RSVP disabled | Event header + "RSVP Not Available" message |
| Deadline passed | Event header + deadline date + contact organizer message |
| Already responded (updates locked) | Current status (color-coded) + "organizer does not allow updates" |
| Can respond | Full RSVP form (see below) |
| Submitted | Green checkmark + "Thank You!" + optional confirmation message |

**Form Sections (in order):**

1. **Event Header** - Cover image, title, description
2. **Event Details** - Date/time with calendar icon, location with pin icon
3. **Deadline Banner** - Alert with "Please respond by [date]" (if deadline set and not passed)
4. **Guest Greeting** - "Hello {name}!" with context message
5. **RSVP Status Buttons** - Flex row of buttons:
   - Always: "Yes, I'll be there" / "Sorry, can't make it"
   - Conditional: "Maybe" (if `allowMaybeResponse`)
6. **Plus-Ones** (if confirmed AND `plusOnesAllowed > 0`)
   - Two number inputs: Adults / Children
   - Auto-adjusts to stay within max allowed
   - Shows "Total: X of Y"
7. **Dietary Restrictions** (if toggle on AND confirmed/maybe)
8. **Meal Choice** (if toggle on AND has options AND confirmed/maybe)
   - Dropdown select from configured options
9. **Notes** (if toggle on AND confirmed/maybe)
10. **Address** (if toggle on AND confirmed/maybe)
    - Street, City + State (2-col), ZIP + Country (2-col)
11. **Transportation** (if toggle on AND confirmed/maybe)
    - Switch: "I need transportation assistance"
12. **Accessibility** (if toggle on AND confirmed/maybe)
13. **Custom Fields** (if toggle on AND has definitions AND confirmed/maybe)
    - Renders `CustomFields` component with field definitions
14. **Accommodation** (if enabled in guest settings AND has hotels AND confirmed/maybe)
    - Switch: "I need hotel accommodation"
    - Hotel dropdown (shows address of selected hotel)
    - Check-in / check-out date inputs (pre-filled from guest settings)
15. **Error Alert** (if submission failed)
16. **Submit Button** - "Submit Response" / "Submitting..."

**Local State:** 15+ `useState` hooks for each form field, synced from guest data on mount via `useEffect`.

**Data Flow:**
- `useRsvpData(token)` - fetches event + guest + settings
- `useSubmitRsvp(token)` - posts response, invalidates cache on success
- Only enabled fields are included in the submission payload

---

## shadcn/ui Components Used

| Component | Where Used |
|-----------|-----------|
| `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription` | All components |
| `Button` | Save/Reset, RSVP status selection, Submit |
| `Label` | All form fields |
| `Switch` | All toggle settings, accommodation, transportation |
| `Textarea` | Confirmation message, dietary, notes, accessibility |
| `Input` | Plus-ones (number), address fields, date inputs |
| `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` | Meal choice, hotel selection |
| `Calendar` | RSVP deadline picker |
| `Popover`, `PopoverContent`, `PopoverTrigger` | Calendar wrapper for deadline |
| `Skeleton` | Loading states |
| `Alert`, `AlertDescription` | Deadline banner, error messages |
