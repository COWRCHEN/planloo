# Venue Frontend Components

All components are in `frontend/src/components/providers-directory/`.

Barrel exports: `frontend/src/components/providers-directory/index.ts`

---

## VenueList

**File:** `VenueList.tsx`

Main venue listing with filtering, pagination, and compare mode.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `onSelectVenue` | `(venue: VenueResponse) => void` | Optional callback when "Select" is clicked (used in event-venue linking) |

**Features:**
- Renders `VenueFilters`, `VenueDialog` (create), and a grid of `VenueCard` components
- Pagination with Previous/Next buttons and "Showing X-Y of Z" text
- **Compare mode**: Toggle button switches cards to show checkboxes; select 2-3 venues, then click floating "Compare N venues" button to open `VenueCompareView` in a dialog

**State:**
- `filters` — `Partial<ListVenuesQuery>` (search, type, capacity, price, amenities, favoritesOnly, sort, pagination)
- `compareMode` — boolean toggle
- `selectedForCompare` — `Set<string>` of venue UUIDs (max 3)
- `showCompareDialog` — boolean

---

## VenueCard

**File:** `VenueCard.tsx`

Card displaying venue summary info.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `venue` | `VenueResponse` | Venue data |
| `onSelect` | `(venue) => void` | Optional select callback (shows "Select" button) |
| `showCheckbox` | `boolean` | Show compare checkbox overlay |
| `isChecked` | `boolean` | Whether checked for compare |
| `onToggleCheck` | `(uuid) => void` | Toggle compare selection |

**Displays:** Name, type badge, favorite button, description (2-line clamp), capacity, price/day, location (city, state, country), amenities (first 3 + overflow badge), rating. Bottom: "View Details" link and optional "Select" button.

---

## VenueFilters

**File:** `VenueFilters.tsx`

Filter bar for the venue list.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `filters` | `Partial<ListVenuesQuery>` | Current filter state |
| `onChange` | `(filters) => void` | Callback when filters change |

**Fields:**
- Search input (debounced 300ms)
- Venue type select dropdown
- Country select dropdown (All / United States / Canada)
- Min capacity number input
- Max price/day number input
- Amenities text input (comma-separated, debounced 300ms)
- "Favorites only" switch toggle
- Clear button (resets all filters)

---

## VenueFavoriteButton

**File:** `VenueFavoriteButton.tsx`

Heart icon button that toggles favorite status.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `venueUuid` | `string` | Venue UUID |
| `isFavorited` | `boolean \| undefined` | Current favorite state |

Uses `useToggleFavorite()` mutation. Filled heart when favorited, outline when not. Prevents event propagation (safe inside clickable cards/links).

---

## VenueDetailView

**File:** `VenueDetailView.tsx`

Full-page venue detail view. Used in the `[uuid].astro` page with `client:load`.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `uuid` | `string` | Venue UUID from URL params |

**Layout sections:**
1. **Back link** — navigates to `/dashboard/providers`
2. **Header** — Name, type badge, rating, favorite button, delete button
3. **Description** — Full description text
4. **Info grid** (2 columns):
   - Location card (address, city, state code, postal code, country on a second line)
   - Capacity & Pricing card (capacity range, price/hour, price/day)
5. **Amenities** — Badges for each amenity
6. **Contact** — mailto button, tel button, website button
7. **Availability check** — Date picker (Popover + Calendar), check button, result display (green/red)

**Hooks used:** `useVenue(uuid)`, `useVenueAvailability(uuid, date)`, `useDeleteVenue()`

**shadcn/ui components:** Card, Badge, Button, Separator, Skeleton, Popover, Calendar

---

## VenueCompareView

**File:** `VenueCompareView.tsx`

Side-by-side comparison of 2-3 venues, rendered inside a Dialog.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `venueUuids` | `string[]` | UUIDs of venues to compare |
| `onRemove` | `(uuid) => void` | Remove a venue from comparison |
| `onClose` | `() => void` | Close the comparison view |

**Comparison rows per venue:**
- Name (header with remove button)
- Type
- Location
- Capacity
- Price/Hour
- Price/Day
- Amenities (badges)
- Rating
- Contact info

Each venue is fetched independently via `useVenue(uuid)` (parallel TanStack queries, cached). Responsive horizontal scroll for small screens.

---

## VenueDialog

**File:** `VenueDialog.tsx`

Create/edit venue dialog with full address validation.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `venue` | `VenueResponse` | Optional — if provided, dialog is in edit mode |
| `trigger` | `React.ReactNode` | Optional custom trigger element |
| `onSuccess` | `() => void` | Optional callback after successful create/update |

**Form fields:**
- Venue name *, Venue type (select dropdown)
- Address * (full-width text input)
- City *, State/Province * (select dropdown, filtered by country — US states or CA provinces)
- Country * (select: United States / Canada), Postal Code * (with country-specific placeholder)
- Capacity min/max, Price per hour/day
- Amenities (comma-separated text input)
- Contact email, Contact phone
- Website, Description

**Address validation:** Uses `validateVenueAddress` superRefine from shared schemas. Cross-validates:
- Country → state code must be valid for that country
- Country → postal code format (US: `12345` or `12345-1234`, CA: `A1A 1A1`)
- Changing country resets state if the current selection is invalid for the new country

**Hooks used:** `useCreateVenue()`, `useUpdateVenue(uuid)`

---

## NearbyVenueSuggestions

**File:** `frontend/src/components/events/NearbyVenueSuggestions.tsx`

Debounced nearby venue suggestions shown in the event creation form (Step 3: Location).

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `city` | `string` | Current city value from event form |
| `postalCode` | `string` | Current postal code value from event form |
| `country` | `string` | Current country value from event form |

**Behavior:**
- Debounces input changes by 500ms before making API call
- Only queries when city or postalCode is non-empty
- Calls `useNearbyVenues({ city, postalCode, country, limit: 5 })`
- Shows loading skeletons while fetching
- Shows "No venues found nearby" for empty results
- Renders compact venue cards with: name, type badge, city/state, star rating, "View" link (opens venue detail in new tab)

**shadcn/ui components:** Card, Badge, Button, Skeleton

---

## Pages

### `/dashboard/providers/venues/[uuid]`

**File:** `frontend/src/pages/dashboard/providers/venues/[uuid].astro`

SSR page (`export const prerender = false`) wrapped in `DashboardLayout`. Renders `<VenueDetailView client:load uuid={uuid} />`.
