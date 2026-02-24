# Service Providers vs Venues

**Last Updated:** 2026-02-24

---

## Why They Are Separate Entities

Service providers and venues look similar on the surface — both are external businesses linked to events — but they model fundamentally different real-world concepts with different data shapes, pricing models, and booking flows.

---

## Conceptual Difference

| | Service Provider | Venue |
|---|---|---|
| **What it is** | A business that delivers a service | A physical space where an event takes place |
| **Relationship to event** | Travels to you (or works remotely) | You travel to it |
| **Primary value** | Skilled people / equipment | Location / capacity |

---

## Schema Comparison

| Field | Service Provider | Venue |
|---|---|---|
| **Capacity** | — | `capacityMin`, `capacityMax` |
| **Geo coordinates** | — | `lat`, `lng` |
| **Pricing model** | Categorical: `$$` / `$$$` / `$$$$` | Exact: `pricePerHour`, `pricePerDay` |
| **Currency** | — | `currency` (default `USD`) |
| **Amenities** | — | `amenities` (JSON array) |
| **Policies** | — | `policies` (JSON: cancellation, deposit) |
| **Venue type** | — | `venueType` enum (banquet hall, outdoor, hotel, …) |
| **Service area** | `serviceAreaRadius` (travels to client) | — |
| **Category** | `catering`, `photography`, `dj`, `florist`, `decoration`, `other` | N/A — use `venueType` instead |
| **Address** | `locationAddress`, `locationCity`, `locationState`, `locationCountry`, `locationPostalCode` | `address`, `city`, `state`, `country`, `postalCode` |
| **Contact** | `email` (required), `phone`, `website` | `contactEmail`, `contactPhone`, `website` |
| **Ratings** | Aggregate only (`ratingAverage`, `ratingCount`) | Aggregate + per-user (`userVenueRatings` table) + breakdown (1–5 stars) |
| **Availability** | — | Checked against `eventVenues` for date conflicts |
| **Soft delete** | `deletedAt` | `deletedAt` |

### Booking / Junction Table Differences

| | `eventServiceProviders` | `eventVenues` |
|---|---|---|
| `quoteAmount` / `finalAmount` | ✓ | ✓ |
| `currency` | ✓ | ✓ |
| `contractUrl` | ✓ | ✓ |
| `notes` | ✓ | ✓ |
| `bookingDate` | — | ✓ |
| `bookingStartTime` / `bookingEndTime` | — | ✓ |
| `depositAmount` / `depositPaid` | — | ✓ |

---

## Feature Comparison

| Feature | Service Provider | Venue |
|---|---|---|
| Directory listing + search | ✓ | ✓ |
| Create / edit / delete | ✓ | ✓ |
| Link to event | ✓ | ✓ |
| Booking status tracking | ✓ | ✓ |
| Per-user favorites | — | ✓ |
| Availability date check | — | ✓ (`/venues/check-availability`) |
| Side-by-side comparison | — | ✓ (`VenueCompareView`) |
| Nearby suggestions | ✓ (`/providers/nearby`) | ✓ (`/venues/nearby`) |
| Per-user star rating + comment | — | ✓ (`userVenueRatings`) |
| Rating breakdown (1–5 histogram) | — | ✓ |
| Full detail page | ✓ | ✓ |
| Amenity badges | — | ✓ |
| Capacity display | — | ✓ |

---

## The `'venue'` Category Was Removed

Previously, `serviceProviders.category` included `'venue'` as an option. This was ambiguous — it implied a service provider *could be* a venue, creating overlap with the dedicated `venues` table.

**As of 2026-02-24, `'venue'` was removed from the `serviceProviders.category` enum.**

A business that *is* a venue belongs in the `venues` table, which has richer fields (capacity, geo, amenities, hourly/daily pricing, availability checking, per-user ratings). The `serviceProviders.category` enum contains service-oriented categories only:

```
catering | photography | videography | dj | entertainment
florist | decoration | transportation | av_technology | hair_makeup | other
```

No data migration was required because the `category` column is stored as plain `TEXT` in SQLite (Drizzle enums are TypeScript-only); the Zod validation layer at the API boundary enforces valid values.

---

## Decision Guide: Which Table to Use?

Use **`venues`** when the entity:
- Has a fixed physical address that event guests attend
- Has a capacity (min/max headcount)
- Charges by the hour or by the day
- Has amenities (parking, AV, catering-included, etc.)
- Needs availability conflict checking

Use **`serviceProviders`** when the entity:
- Provides a professional service (photography, catering, entertainment, florals, decoration)
- Travels to the event location or works off-site
- Charges per service (quoted), not per hour/day for a space
- Has a service radius rather than a fixed catchment area
