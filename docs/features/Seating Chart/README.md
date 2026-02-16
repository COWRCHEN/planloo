# Seating Chart & Floor Plan Builder

**Feature:** Interactive floor plan builder with seat-level guest assignment
**Status:** Implemented (Phase 1)
**Last Updated:** 2026-02-15

---

## Overview

The Seating Chart feature provides an interactive floor plan builder powered by [Konva.js](https://konvajs.org/) (via `react-konva`) where event organizers can design venue layouts, place tables and venue elements, and assign guests to specific seats. It integrates with the existing guest list and RSVP data to show real-time status on the seating canvas.

### Key Capabilities

- Create multiple floor plans per event (e.g., ceremony vs reception)
- Place different table types (round, rectangular, square, head table) on a visual canvas
- Add venue elements (dance floor, bar, buffet, stage, DJ booth, etc.)
- Drag-and-drop tables/elements with grid snapping (`dragBoundFunc`) and auto-save
- Assign guests to specific numbered seats at each table
- RSVP status color-coding on seat indicators (green=confirmed, amber=pending, red=declined)
- Dietary restriction icons on occupied seats
- Auto-assign selected guests randomly to available seats
- Guest relationship mapping (prefer together / avoid pairs)
- Conflict detection: over-capacity tables and avoid-pair violations
- Preset table arrangements (Round Tables, Banquet, U-Shape, Classroom, Workshop)
- Pan/zoom canvas with zoom-to-cursor and configurable grid overlay
- Syncs `tableAssignment` text field on the guest record for guest list filtering

---

## Table of Contents

1. [Database Schema](./schema.md)
2. [API Endpoints](./api.md)
3. [Frontend Components](./components.md)
4. [Data Hooks & Stores](./hooks.md)
5. [Interactions & Flows](./flow.md)

---

## Architecture Summary

```
Event Detail Page                            Seating Chart Page
┌───────────────────┐                        ┌────────────────────────────────────┐
│ EventDetailView   │                        │  SeatingChartView                  │
│ "Seating Chart"   │──navigate──►           │  ┌──────┬──────────┬────────────┐ │
│  button           │                        │  │Palette│  Canvas  │ Properties │ │
└───────────────────┘                        │  │      │  (Konva)   │ / Assign   │ │
                                             │  └──────┴──────────┴────────────┘ │
                                             └────────────────┬──────────────────┘
                                                              │
                                                   REST API (Hono)
                                                              │
                                    ┌─────────────────────────┼─────────────────────┐
                                    ▼                         ▼                     ▼
                              ┌───────────┐          ┌──────────────┐      ┌──────────────┐
                              │floor_plans│          │floor_plan_   │      │seat_         │
                              │           │          │objects       │      │assignments   │
                              └───────────┘          └──────────────┘      └──────────────┘
                                                                                  │
                                                                           ┌──────┴──────┐
                                                                           ▼             ▼
                                                                     ┌─────────┐  ┌──────────┐
                                                                     │ guests  │  │guest_    │
                                                                     │         │  │relation- │
                                                                     │         │  │ships     │
                                                                     └─────────┘  └──────────┘
```

---

## File Manifest

### Backend

| File | Purpose |
|------|---------|
| `backend/src/db/schema/floorPlan.ts` | Schema: `floor_plans`, `floor_plan_objects`, `seat_assignments`, `guest_relationships` |
| `backend/src/db/schema/relations.ts` | Relations for all 4 new tables + extended `events`/`guests` relations |
| `backend/src/db/types.ts` | Inferred types: `FloorPlan`, `FloorPlanObject`, `SeatAssignment`, `GuestRelationship` |
| `backend/src/routes/floor-plans.ts` | All floor plan API routes (16 endpoints) |
| `backend/src/routes/index.ts` | Route mounting at `/events/:eventUuid/floor-plans` |
| `backend/drizzle/0016_messy_jackpot.sql` | Migration for the 4 new tables |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/pages/dashboard/events/[uuid]/seating.astro` | SSR page (`client:only="react"` for Konva SSR bypass) |
| `frontend/src/components/seating/index.ts` | Barrel exports |
| `frontend/src/components/seating/SeatingChartView.tsx` | Top-level wrapper: QueryClient, plan tabs, layout orchestration |
| `frontend/src/components/seating/FloorPlanCanvas.tsx` | Konva Stage/Layer canvas with zoom-to-cursor, pan, grid |
| `frontend/src/components/seating/FloorPlanToolbar.tsx` | Zoom controls, grid toggle, save indicator |
| `frontend/src/components/seating/ObjectPalette.tsx` | Left sidebar: draggable table/element presets |
| `frontend/src/components/seating/TableObject.tsx` | Konva table with draggable Group, seat circles (RSVP-colored + dietary icons) |
| `frontend/src/components/seating/ElementObject.tsx` | Konva venue element (Rect + Text) with drag and rotation |
| `frontend/src/components/seating/ObjectPropertyPanel.tsx` | Right panel: label, seats, dimensions, rotation, lock |
| `frontend/src/components/seating/GuestAssignmentPanel.tsx` | Right panel: per-seat assignment with guest search |
| `frontend/src/components/seating/UnassignedGuestsPanel.tsx` | Expandable panel with multi-select auto-assign |
| `frontend/src/components/seating/GuestRelationshipsDialog.tsx` | Dialog: prefer_together / avoid pair management |
| `frontend/src/components/seating/AutoAssignDialog.tsx` | Dialog: random guest assignment to available seats |
| `frontend/src/components/seating/SeatingChartStats.tsx` | Stats bar: tables, seats, assigned, unassigned |
| `frontend/src/components/seating/ConflictAlerts.tsx` | Alert banners: over-capacity + avoid-pair violations |
| `frontend/src/components/seating/ArrangementPresetPicker.tsx` | Dialog: 5 preset table arrangements |
| `frontend/src/hooks/use-floor-plans.ts` | TanStack Query hooks for floor plan CRUD |
| `frontend/src/hooks/use-floor-plan-objects.ts` | Hooks for objects, assignments, auto-assign, conflicts |
| `frontend/src/hooks/use-guest-relationships.ts` | Hooks for social mapping (prefer/avoid) |
| `frontend/src/stores/seating.ts` | Nanostores: zoom, panOffset, selectedObjects, gridVisible |
| `frontend/src/components/events/EventDetailView.tsx` | Modified: added "Seating Chart" nav button |

---

## Quick Reference

### Table Shapes

| Shape | Default Dimensions | Seat Layout |
|-------|--------------------|-------------|
| `round` | 6 × 6 ft | Evenly spaced around circumference |
| `rectangular` | 10 × 4 ft | Distributed around perimeter |
| `square` | 4 × 4 ft | Distributed around perimeter |
| `oval` | 6 × 6 ft | Evenly spaced around ellipse |
| `semicircle` | 6 × 6 ft | Around semicircle |
| `head_table` | 16 × 3 ft | Distributed around perimeter |

### Venue Element Types

`dance_floor` | `bar` | `buffet` | `stage` | `dj_booth` | `photo_booth` | `entrance` | `exit` | `restroom` | `dessert_station` | `gift_table` | `custom`

### RSVP Seat Colors

| Status | Color |
|--------|-------|
| Confirmed | Green (`#22c55e`) |
| Pending / Invited | Amber (`#f59e0b`) |
| Declined | Red (`#ef4444`) |
| Maybe | Purple (`#a855f7`) |
| Empty | Gray (`#d1d5db`) |

### Relationship Types

| Type | Description |
|------|-------------|
| `prefer_together` | Guests should ideally be at the same table |
| `avoid` | Guests should NOT be at the same table (triggers conflict alert) |
