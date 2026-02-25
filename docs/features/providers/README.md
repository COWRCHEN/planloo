# Event Providers & Venues

**Feature:** Event-scoped provider and venue management with full booking lifecycle tracking
**Status:** Redesign in progress (P0)
**Last Updated:** 2026-02-24

---

## Overview

The Event Providers & Venues page (`/dashboard/events/:uuid/providers`) lets event planners manage all vendors and venues associated with a specific event. Each provider/venue link has its own booking status, payment tracking, and contact details drawn from the global provider/venue directory.

### Key Capabilities

- **Provider & Venue Cards** — Rich cards showing contact info, address, payment details, status, and notes
- **Booking Status** — Visual colored badges: Inquiry → Quoted → Booked → Confirmed → Completed | Cancelled
- **Payment Tracking** — Cost, deposit, balance due (auto-calculated), payment due date with overdue warnings
- **Price Includes** — Freeform text for what's included in the quoted/final price
- **Inline Edit Sheet** — Side-panel edit form for all booking fields (react-hook-form + zod)
- **Link Existing** — Search global directory and link provider/venue to event
- **Venue Availability** — Check if a venue is free on a specific date
- **Remove Link** — Unlink provider/venue from event (hard delete of junction row)

---

## Table of Contents

1. [Database Schema](./schema.md)
2. [API Endpoints](./api.md)
3. [Frontend Components](./components.md)
4. [Data Hooks](./hooks.md)

---

## Design Spec

### Vendor Card Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ [Status Badge]   Vendor Name                Category    [⋮ menu] │
│ ──────────────────────────────────────────────────────────────── │
│ 📍 123 Main St, Chicago, IL 60601           📞 555-123-4567      │
│ ✉️  vendor@example.com                       🌐 vendor.com        │
│ ──────────────────────────────────────────────────────────────── │
│ Cost          Deposit        Balance Due    Due Date              │
│ $5,000        $1,500 ✓ Paid  $3,500         Mar 15, 2026 ⚠️       │
│ ──────────────────────────────────────────────────────────────── │
│ ✓ Price includes: Setup, teardown, 6-hour service, linens        │
│ ──────────────────────────────────────────────────────────────── │
│ 📅 Booking date: Jun 15, 2026   (venue only)                     │
│ 📝 Notes: Ask about parking permits                              │
└──────────────────────────────────────────────────────────────────┘
```

### Status Badge Colors

| Status    | Color  | Meaning                          |
|-----------|--------|----------------------------------|
| inquiry   | Gray   | Initial contact made             |
| quoted    | Amber  | Quote received, under review     |
| booked    | Blue   | Booked but not yet confirmed     |
| confirmed | Green  | Confirmed and on calendar        |
| completed | Teal   | Event done, service delivered    |
| cancelled | Red    | Booking cancelled                |

### Payment Due Date Warnings

- **> 7 days away**: No indicator
- **≤ 7 days away**: Amber badge "Due soon"
- **Overdue (past date)**: Red badge "Overdue"
- **depositPaid = true**: Green "Paid" badge replaces all warnings

### Balance Due Calculation

```
Balance Due = finalAmount ?? quoteAmount - depositAmount
If depositPaid = true → show "Paid" badge on balance
```

---

## Feature Priority

| Priority | Feature                                              | Status      |
|----------|------------------------------------------------------|-------------|
| P0       | Schema: add depositAmount, depositPaid, paymentDueDate, priceIncludes to eventServiceProviders | Done |
| P0       | Schema: add paymentDueDate, priceIncludes to eventVenues | Done    |
| P0       | Card redesign: address, phone, email, payment grid   | Done        |
| P0       | Inline edit sheet (react-hook-form + zod)            | Done        |
| P1       | Create new provider/venue from event page            | Planned     |
| P1       | Payment due date warning badges                      | Done        |
| P1       | Balance due auto-calculation                         | Done        |
| P2       | Inline review/rating after event completion          | Planned     |
| P2       | Budget integration (add to budget button)            | Planned     |
| P2       | Total summary bar (outstanding / paid)               | Planned     |
| P3       | Vendor communication log                             | Planned     |
| P3       | Comparison view for same-category providers          | Planned     |

---

## Architecture

```
EventProvidersView (React island, client:load)
├── EventProvidersContent
│   ├── [Providers section]
│   │   ├── ProviderCard (per linked provider)
│   │   │   ├── StatusBadge
│   │   │   ├── ContactInfo (address, phone, email)
│   │   │   ├── PaymentGrid (cost, deposit, balance, due date)
│   │   │   ├── PriceIncludes
│   │   │   ├── Notes
│   │   │   ├── ProviderEditSheet (react-hook-form edit form)
│   │   │   └── DropdownMenu (Edit, Remove)
│   │   └── LinkProviderDialog (search + link existing)
│   └── [Venues section]
│       ├── VenueCard (per linked venue)
│       │   ├── StatusBadge
│       │   ├── ContactInfo (address, phone, email)
│       │   ├── PaymentGrid (cost, deposit, balance, due date)
│       │   ├── PriceIncludes
│       │   ├── BookingDate
│       │   ├── Notes
│       │   ├── VenueAvailabilityCheck
│       │   ├── VenueEditSheet (react-hook-form edit form)
│       │   └── DropdownMenu (Edit, Remove)
│       └── LinkVenueDialog (search + link existing)
```

### Data Flow

```
Hono Backend (event-providers.ts)
  GET  /events/:uuid/providers          → EventServiceProviderResponse[]
  POST /events/:uuid/providers          → link provider
  PATCH /events/:uuid/providers/:id     → update link (status, amounts, dates, notes)
  DELETE /events/:uuid/providers/:id    → unlink
  GET  /events/:uuid/providers/venues   → EventVenueResponse[]
  POST /events/:uuid/providers/venues   → link venue
  PATCH /events/:uuid/providers/venues/:id → update link
  DELETE /events/:uuid/providers/venues/:id → unlink
```

---

## Additional PM Ideas (Backlog)

1. **Budget integration** — "Add to budget" CTA creates a budget line item with vendor name + finalAmount
2. **Total summary bar** — Sticky header showing: Total confirmed | Total paid | Total outstanding
3. **Sort/filter** — Filter by status, type; sort by amount or due date
4. **Contract upload** — Replace URL text field with R2 file upload slot
5. **Communication log** — Per-vendor notes with timestamps ("Called Feb 24, left voicemail")
6. **Duplicate to other event** — Reuse vendor with same amounts for recurring events
7. **Comparison view** — Side-by-side compare of quoted same-category vendors
8. **Mobile collapse** — Cards collapse to name + status + balance on small screens
