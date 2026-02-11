# RSVP Data Hooks

All hooks follow the project pattern: TanStack Query with `handleResponse`, `staleTime: 5min`, credentials where needed.

---

## RSVP Settings Hooks (Authenticated)

**File:** `frontend/src/hooks/use-events.ts`

### `useRsvpSettings(eventUuid: string)`

Fetches RSVP settings for an event.

```typescript
useQuery<EventRsvpSettings | undefined>({
  queryKey: ['events', 'details', eventUuid, 'rsvp-settings'],
  queryFn: () => GET /events/${eventUuid}/rsvp-settings (with credentials),
  staleTime: 5 minutes,
  enabled: !!eventUuid,
})
```

**Returns:** `EventRsvpSettings | undefined`

### `useUpdateRsvpSettings(eventUuid: string)`

Updates RSVP settings (partial update).

```typescript
useMutation({
  mutationFn: (data: UpdateRsvpSettingsInput) =>
    PATCH /events/${eventUuid}/rsvp-settings (with credentials),
  onSuccess: () => invalidateQueries(['events', 'details', eventUuid, 'rsvp-settings']),
})
```

---

## Types (from `use-events.ts`)

```typescript
interface RsvpFormFields {
  dietaryRestrictions?: boolean;
  mealChoice?: boolean;
  notes?: boolean;
  address?: boolean;
  transportation?: boolean;
  accessibility?: boolean;
  customFields?: boolean;
}

interface EventRsvpSettings {
  id: number;
  eventId: number;
  enableRsvp: boolean;
  allowMaybeResponse: boolean;
  rsvpDeadline: string | null;
  rsvpConfirmationMessage: string | null;
  allowRsvpUpdate: boolean;
  allowRsvpPlusOnes: boolean;
  sendRsvpInvitation: boolean;
  sendRsvpConfirmation: boolean;
  rsvpFormFields: RsvpFormFields | null;
  createdAt: string;
  updatedAt: string;
}

interface UpdateRsvpSettingsInput {
  enableRsvp?: boolean;
  allowMaybeResponse?: boolean;
  rsvpDeadline?: Date | null;
  rsvpConfirmationMessage?: string | null;
  allowRsvpUpdate?: boolean;
  allowRsvpPlusOnes?: boolean;
  sendRsvpInvitation?: boolean;
  sendRsvpConfirmation?: boolean;
  rsvpFormFields?: RsvpFormFields;
}
```

---

## Public RSVP Hooks (No Authentication)

**File:** `frontend/src/hooks/use-guests.ts`

### `useRsvpData(token: string | undefined)`

Fetches all data for the public RSVP page.

```typescript
useQuery({
  queryKey: ['rsvp', token],
  queryFn: () => GET /rsvp/${token} (no credentials),
  staleTime: 5 minutes,
  enabled: !!token,
})
```

**Returns:** `RsvpPageData`

### `useSubmitRsvp(token: string)`

Submits or updates an RSVP response.

```typescript
useMutation({
  mutationFn: (data: RsvpSubmitInput) =>
    POST /rsvp/${token} (no credentials),
  onSuccess: () => invalidateQueries(['rsvp', token]),
})
```

---

## Invitation Hooks (Authenticated)

**File:** `frontend/src/hooks/use-guests.ts`

### `useResendRsvp(eventUuid: string)`

Resends an RSVP invitation to a single guest.

```typescript
useMutation({
  mutationFn: (guestUuid: string) =>
    POST /events/${eventUuid}/guests/${guestUuid}/resend-rsvp (with credentials),
})
```

### `useSendInvitations(eventUuid: string)`

Batch sends RSVP invitations.

```typescript
useMutation({
  mutationFn: (guestUuids: string[] | 'all-eligible') =>
    POST /events/${eventUuid}/guests/send-invitations (with credentials),
})
```

**Returns:** `SendInvitationsResult`

```typescript
interface SendInvitationsResult {
  sent: number;
  failed: Array<{
    guestUuid: string;
    name: string;
    email: string;
    success: boolean;
    error?: string;
  }>;
  total: number;
}
```

---

## Types (from `use-guests.ts`)

```typescript
type RsvpStatus = 'pending' | 'invited' | 'confirmed' | 'declined' | 'maybe';

interface RsvpPageData {
  event: {
    uuid: string;
    title: string;
    description: string | null;
    eventType: string | null;
    startDate: string;
    endDate: string | null;
    timezone: string | null;
    locationName: string | null;
    locationAddress: string | null;
    locationCity: string | null;
    locationState: string | null;
    locationCountry: string | null;
    coverImageUrl: string | null;
  };
  guest: {
    firstName: string;
    lastName: string | null;
    email: string | null;
    rsvpStatus: RsvpStatus;
    rsvpRespondedAt: string | null;
    plusOnesAllowed: number;
    plusOnesCount: number;
    plusOnesCountAdults?: number;
    plusOnesCountChildren?: number;
    dietaryRestrictions: string | null;
    needsAccommodation?: boolean | null;
    hotelName?: string | null;
    checkInDate?: string | null;
    checkOutDate?: string | null;
    mealChoice?: string | null;
    notes?: string | null;
    addressStreet?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressZipCode?: string | null;
    addressCountry?: string | null;
    transportationNeeded?: boolean | null;
    accessibilityNeeds?: string | null;
    customFieldData?: Record<string, unknown> | null;
  };
  guestSettings?: { ... };
  rsvpSettings?: {
    enabled: boolean;
    allowMaybeResponse: boolean;
    rsvpDeadline: string | null;
    deadlinePassed: boolean;
    allowRsvpUpdate: boolean;
    confirmationMessage: string | null;
    canRespond: boolean;
    rsvpFormFields?: RsvpFormFields;
  };
}

interface RsvpSubmitInput {
  rsvpStatus: 'confirmed' | 'declined' | 'maybe';
  plusOnesCount?: number;
  plusOnesCountAdults?: number;
  plusOnesCountChildren?: number;
  dietaryRestrictions?: string | null;
  needsAccommodation?: boolean | null;
  hotelName?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  mealChoice?: string | null;
  notes?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipCode?: string | null;
  addressCountry?: string | null;
  transportationNeeded?: boolean | null;
  accessibilityNeeds?: string | null;
  customFieldData?: Record<string, unknown> | null;
}
```

---

## Helper

### `buildRsvpUrl(rsvpToken: string): string`

Builds the full public RSVP URL for a guest.

```typescript
const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';
return `${siteUrl}/rsvp/${rsvpToken}`;
```
