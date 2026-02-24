# Location-Based Provider/Venue Discovery

Detects the user's approximate location from Cloudflare Workers metadata and offers a non-intrusive opt-in banner to filter the provider and venue directories by proximity.

## Overview

- **No GPS or browser permission required** — Cloudflare automatically injects `request.cf` (city, state, country, postalCode) into every Worker request.
- **Opt-in only** — the banner is shown but filters are never applied automatically.
- **Graceful degradation** — in local dev where `request.cf` is absent, `detected: false` is returned and the banner never appears.
- **Supported countries**: US, CA (gated by `SUPPORTED_COUNTRIES` from shared schema).
- **Tiered broadening** — "Show nearby" starts at city precision and automatically widens to state/province, then country, if each tier returns zero results.

## UX Flow

```
Page loads → useUserLocation() fetches /api/v1/location/detect (cached 30 min)
  ├── CF unavailable (local dev) → { detected: false } → no banner
  ├── Country not US/CA          → { detected: false } → no banner
  └── City detected (e.g. "Kitchener", "ON", "CA")
        → Banner: "We detected you are near Kitchener. Show providers near you?"
              ├── "Dismiss"    → banner gone, no filter change
              └── "Show nearby"
                    → Tier 1: filter city=Kitchener, country=CA
                          ├── results found → done
                          └── 0 results → auto-broaden
                    → Tier 2: filter state=ON, country=CA
                          ├── results found → done (shows Waterloo, Guelph, etc.)
                          └── 0 results → auto-broaden
                    → Tier 3: filter country=CA only
```

The banner disappears as soon as any tier is applied. Broadening between tiers happens silently — no user interaction required.

## Files

### Backend

| File | Purpose |
|------|---------|
| `backend/src/routes/location.ts` | `GET /detect` — reads CF metadata, returns location or `detected: false` |
| `backend/src/routes/index.ts` | Mounts location router at `/api/v1/location` |
| `backend/src/routes/providers.ts` | List endpoint applies `country` filter and case-insensitive `city`/`state` filters |
| `backend/src/routes/venues.ts` | Same as providers; list endpoint applies `country`, `state`, case-insensitive `city` |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/hooks/use-location.ts` | TanStack Query hook for `/api/v1/location/detect` |
| `frontend/src/components/providers-directory/NearYouBanner.tsx` | Dismissible alert banner; forwards `city`, `state`, `country` to `onApply` |
| `frontend/src/components/providers-directory/ProviderList.tsx` | Tiered nearby logic; country filter in filter bar |
| `frontend/src/components/providers-directory/VenueList.tsx` | Same tiered logic |
| `frontend/src/components/providers-directory/ProviderFilters.tsx` | Country filter dropdown (US / Canada) |
| `shared/schemas/provider.ts` | `listProvidersQuerySchema` includes `country` field |

## API

### `GET /api/v1/location/detect`

Requires authentication. Reads `request.cf` from the Cloudflare Workers runtime.

**Response — detected:**
```json
{
  "success": true,
  "data": {
    "detected": true,
    "city": "Kitchener",
    "state": "ON",
    "postalCode": "N2G",
    "country": "CA"
  }
}
```

**Response — not detected (local dev, unsupported country, or CF unavailable):**
```json
{
  "success": true,
  "data": { "detected": false }
}
```

**CF fields used:**

| CF field | Mapped to | Example |
|----------|-----------|---------|
| `cf.city` | `city` | `"Kitchener"` |
| `cf.regionCode` | `state` | `"ON"` |
| `cf.postalCode` | `postalCode` | `"N2G"` |
| `cf.country` | `country` | `"CA"` |

> `cf.region` (full name e.g. "Ontario") is intentionally omitted; `cf.regionCode` gives the short code that matches the database.

## Hook

```typescript
import { useUserLocation } from '@/hooks/use-location';

const { data } = useUserLocation();
// data.detected === true  → data.city, data.state, data.postalCode, data.country
// data.detected === false → no location info
```

- `staleTime`: 30 minutes (avoids redundant fetches within a session)
- `retry: false` (silently fails; banner simply won't appear)

## Tiered Nearby Logic

Implemented in both `ProviderList` and `VenueList` via a `useEffect` that watches query results:

```
nearbyTier: null | 'city' | 'state' | 'country'
nearbyLocationRef: { city, state, country }  ← set when banner is confirmed
```

On "Show nearby":
1. Store detected location in `nearbyLocationRef`
2. Apply tier-1 filter (`city + country`), set `nearbyTier = 'city'`

After each query settles:
- If `total > 0` → stop, display results
- If `total === 0` and `nearbyTier === 'city'` and `state` available → promote to `'state'`, apply `state + country` filter
- If `total === 0` and `nearbyTier === 'city'` and no `state` → promote to `'country'`
- If `total === 0` and `nearbyTier === 'state'` → promote to `'country'`
- `'country'` is the final tier; no further broadening

The banner is hidden as soon as `nearbyTier !== null`, so it doesn't flash during tier transitions.

## Country Filter

Both the **Provider** and **Venue** filter bars include a country dropdown (All Countries / United States / Canada). This is independent of the "Show nearby" banner and can be used manually at any time.

- Shared source of truth: `SUPPORTED_COUNTRIES` from `shared/schemas/provider.ts`
- Backend validates via `z.enum(SUPPORTED_COUNTRIES)` in both `listProvidersQuerySchema` and `listVenuesQuerySchema`

## Case-Insensitive City Matching

CF returns city names in title case (e.g. `"Kitchener"`) while the database may store them in any casing. Both list endpoints use `LOWER()` on both sides:

```sql
-- venues
WHERE LOWER(city) = LOWER('Kitchener')

-- providers
WHERE LOWER(location_city) = LOWER('Kitchener')
```

This is consistent with the existing `/venues/nearby` and `/providers/nearby` endpoints.

## Banner Component

`NearYouBanner` is a self-dismissing component built on shadcn/ui `Alert`:

- Renders `null` immediately if dismissed, or if both `city` and `postalCode` are null.
- "Show nearby" triggers `onApply({ city, state, postalCode, country })` then self-dismisses.
- "Dismiss" hides the banner with no filter change.
- No persistence — the banner re-appears on hard reload, but the 30-minute TanStack Query cache prevents repeated backend calls within a session.
