# Venue/Location Management

**Feature:** Venue directory with search, favorites, availability check, comparison, and nearby suggestions
**Status:** Implemented (MVP)
**Last Updated:** 2026-02-22

---

## Overview

The Venue Management feature provides a full directory for browsing, filtering, and managing event venues. Users can search by amenities, favorite venues for quick access, check date availability, view full venue details with contact info, compare multiple venues side-by-side, and discover nearby venues when creating events.

### Key Capabilities

- **Venue Directory** — Browse, search, and filter venues by type, capacity, price, city, country, and amenities
- **Venue Detail Page** — Full-page view with location, capacity, pricing, amenities, contact section, and availability checker
- **Favorites** — Toggle favorites on any venue; filter the list to show only favorites
- **Availability Check** — Pick a date and check if a venue has conflicting bookings
- **Compare Venues** — Select 2-3 venues and compare them side-by-side in a dialog
- **Contact Section** — Direct mailto, tel, and website links on the detail page
- **Event-Venue Linking** — Link venues to events with booking status tracking (pre-existing)
- **Address Validation** — US/CA only: validates state/province codes and postal code formats (US 5-digit/5+4, CA A1A 1A1)
- **Nearby Suggestions** — When creating events, shows nearby venues matching the event's city or postal code prefix

---

## Table of Contents

1. [Database Schema](./schema.md)
2. [API Endpoints](./api.md)
3. [Frontend Components](./components.md)
4. [Data Hooks](./hooks.md)

---

## Architecture Summary

```
Provider Directory Page              Venue Detail Page
┌─────────────────────────┐          ┌──────────────────────────────┐
│ ProviderDirectoryView   │          │ VenueDetailView              │
│ ┌─────────────────────┐ │          │ ┌──────────────────────────┐ │
│ │ Tabs: Providers |   │ │          │ │ Header + Favorite Button │ │
│ │       Venues        │ │          │ ├──────────────────────────┤ │
│ └──────────┬──────────┘ │          │ │ Location | Capacity &    │ │
│            │            │          │ │          | Pricing        │ │
│ ┌──────────▼──────────┐ │          │ ├──────────────────────────┤ │
│ │ VenueList           │ │          │ │ Amenities (badges)       │ │
│ │ ┌────────────────┐  │ │          │ ├──────────────────────────┤ │
│ │ │ VenueFilters   │  │ │          │ │ Contact (email/phone/web)│ │
│ │ │ + amenities    │  │ │          │ ├──────────────────────────┤ │
│ │ │ + country      │  │ │          │ │ Availability Checker     │ │
│ │ │ + fav toggle   │  │ │          │ │ (Calendar + Check btn)   │ │
│ │ ├────────────────┤  │ │          │ └──────────────────────────┘ │
│ │ │ VenueCard grid │  │──navigate──│                              │
│ │ │ (+ ♥ + link)   │  │ │          └──────────────────────────────┘
│ │ ├────────────────┤  │ │
│ │ │ Compare Mode   │  │ │          Compare Dialog
│ │ │ (checkboxes)   │  │──open──►  ┌────────────────────────────┐
│ │ └────────────────┘  │ │          │ VenueCompareView           │
│ └─────────────────────┘ │          │ ┌──────┬──────┬──────┐     │
└─────────────────────────┘          │ │Venue1│Venue2│Venue3│     │
                                     │ │ type │ type │ type │     │
          REST API (Hono)            │ │ cap  │ cap  │ cap  │     │
┌─────────────────────────────────┐  │ │price │price │price │     │
│ GET  /venues?amenities&country  │  │ │amen. │amen. │amen. │     │
│ GET  /venues/check-availability │  │ └──────┴──────┴──────┘     │
│ GET  /venues/favorites          │  └────────────────────────────┘
│ POST /venues/favorites/:uuid    │
│ GET  /venues/nearby             │  Event Form (Step 3)
│ GET  /venues/:uuid              │  ┌────────────────────────────┐
│ POST /venues                    │  │ Location fields            │
│ PATCH /venues/:uuid             │  │ ┌──────────────────────┐   │
│ DELETE /venues/:uuid            │  │ │ NearbyVenueSuggestions│   │
└─────────────────────────────────┘  │ │ (debounced 500ms)    │   │
         │                           │ │ compact venue cards   │   │
    ┌────┴────┐                      │ └──────────────────────┘   │
    ▼         ▼                      └────────────────────────────┘
┌────────┐ ┌──────────────────┐
│ venues │ │user_venue_       │
│        │ │favorites         │
└────────┘ └──────────────────┘
```

---

## File Manifest

### Backend

| File | Purpose |
|------|---------|
| `backend/src/db/schema/providers.ts` | Schema: `venues`, `eventVenues`, `userVenueFavorites` (+ providers, images, reviews); includes `cityCountryIdx` and `postalCodeIdx` indexes for nearby queries |
| `backend/src/db/schema/relations.ts` | Relations for `userVenueFavorites` (user, venue) |
| `backend/src/db/types.ts` | Inferred types: `UserVenueFavorite`, `NewUserVenueFavorite` |
| `backend/src/routes/venues.ts` | All venue API routes (9 endpoints, including `/nearby`) |
| `backend/drizzle/0023_add_user_venue_favorites.sql` | Migration for favorites table |
| `backend/drizzle/0024_provider_address_fields.sql` | Migration for provider address columns + nearby indexes |

### Shared

| File | Purpose |
|------|---------|
| `shared/schemas/provider.ts` | Zod schemas + response types; address constants (`SUPPORTED_COUNTRIES`, `US_STATES`, `CA_PROVINCES`, `STATE_LABELS`); postal code regex; `validateVenueAddress` helper; `nearbyQuerySchema` |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/pages/dashboard/providers/index.astro` | Provider directory page (tabs: Providers / Venues) |
| `frontend/src/pages/dashboard/providers/venues/[uuid].astro` | SSR venue detail page |
| `frontend/src/components/providers-directory/VenueList.tsx` | Venue list with filters, pagination, compare mode |
| `frontend/src/components/providers-directory/VenueCard.tsx` | Card with favorite button, detail link, compare checkbox; shows country in location |
| `frontend/src/components/providers-directory/VenueFilters.tsx` | Search, type, country, capacity, price, amenities, favorites toggle |
| `frontend/src/components/providers-directory/VenueDetailView.tsx` | Full detail: info, amenities, contact, availability check |
| `frontend/src/components/providers-directory/VenueFavoriteButton.tsx` | Heart toggle button (ghost icon) |
| `frontend/src/components/providers-directory/VenueCompareView.tsx` | Side-by-side comparison of 2-3 venues |
| `frontend/src/components/providers-directory/VenueDialog.tsx` | Create/edit venue dialog with country/state Select dropdowns and address validation |
| `frontend/src/components/providers-directory/index.ts` | Barrel exports |
| `frontend/src/components/events/NearbyVenueSuggestions.tsx` | Debounced nearby venue suggestions for event form (Step 3) |
| `frontend/src/hooks/use-providers.ts` | TanStack Query hooks for all venue operations, including `useNearbyVenues` |
