# Seating Chart Database Schema

## Tables

### `floor_plans` (many-to-one with events)

**File:** `backend/src/db/schema/floorPlan.ts`

One event can have multiple floor plans (e.g., ceremony vs reception). Supports soft deletes.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | INTEGER PK | auto | Primary key |
| `uuid` | TEXT UNIQUE | - | Public-facing identifier |
| `event_id` | INTEGER FK | - | References `events.id` (cascade delete) |
| `name` | TEXT | - | Display name, e.g., "Reception Hall" |
| `width_ft` | REAL | `100` | Floor plan width in feet |
| `height_ft` | REAL | `80` | Floor plan height in feet |
| `grid_snap` | INTEGER | `1` | Snap grid size in feet (0 = off) |
| `is_default` | BOOLEAN | `false` | Primary floor plan for this event |
| `sort_order` | INTEGER | `0` | Tab ordering |
| `created_at` | TIMESTAMP | `unixepoch()` | Row creation time |
| `updated_at` | TIMESTAMP | `unixepoch()` | Last update time |
| `deleted_at` | TIMESTAMP | `null` | Soft delete timestamp |

**Indexes:**
- `idx_floor_plans_event_id` on `event_id`
- `idx_floor_plans_uuid` on `uuid`
- `floor_plans_uuid_unique` on `uuid`

---

### `floor_plan_objects` (many-to-one with floor_plans)

**File:** `backend/src/db/schema/floorPlan.ts`

Tables AND venue elements stored in one table, discriminated by `object_type`.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | INTEGER PK | auto | Primary key |
| `uuid` | TEXT UNIQUE | - | Public-facing identifier |
| `floor_plan_id` | INTEGER FK | - | References `floor_plans.id` (cascade delete) |
| `object_type` | TEXT | - | Discriminator: `table` or `element` |
| `table_shape` | TEXT | `null` | Required when `object_type = 'table'`: `round`, `rectangular`, `square`, `oval`, `semicircle`, `head_table` |
| `element_type` | TEXT | `null` | Required when `object_type = 'element'`: `dance_floor`, `bar`, `buffet`, `stage`, `dj_booth`, `photo_booth`, `entrance`, `exit`, `restroom`, `dessert_station`, `gift_table`, `custom` |
| `label` | TEXT | - | Display label, e.g., "Table 1", "Bar" |
| `pos_x` | REAL | `10` | X position in feet from top-left |
| `pos_y` | REAL | `10` | Y position in feet from top-left |
| `width_ft` | REAL | `6` | Object width in feet |
| `height_ft` | REAL | `6` | Object height in feet |
| `rotation` | INTEGER | `0` | Rotation in degrees (0-359) |
| `seat_count` | INTEGER | `null` | Max seats (tables only) |
| `table_number` | INTEGER | `null` | Auto-assigned numbering for tables |
| `style` | TEXT | `null` | Optional JSON: `{ fillColor, borderColor }` |
| `is_locked` | BOOLEAN | `false` | Prevent accidental moves |
| `sort_order` | INTEGER | `0` | Render order / z-index |
| `created_at` | TIMESTAMP | `unixepoch()` | Row creation time |
| `updated_at` | TIMESTAMP | `unixepoch()` | Last update time |

**Indexes:**
- `idx_floor_plan_objects_floor_plan_id` on `floor_plan_id`
- `idx_floor_plan_objects_uuid` on `uuid`
- `floor_plan_objects_uuid_unique` on `uuid`

---

### `seat_assignments` (guest to seat mapping)

**File:** `backend/src/db/schema/floorPlan.ts`

Maps a guest to a specific numbered seat at a table.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | INTEGER PK | auto | Primary key |
| `floor_plan_object_id` | INTEGER FK | - | References `floor_plan_objects.id` (cascade delete) |
| `guest_id` | INTEGER FK | - | References `guests.id` (cascade delete) |
| `seat_number` | INTEGER | - | 1-based seat position at the table |
| `created_at` | TIMESTAMP | `unixepoch()` | Row creation time |

**Constraints:**
- `uq_seat_assignment_guest_object` — UNIQUE on `(guest_id, floor_plan_object_id)` — one guest per table

**Indexes:**
- `idx_seat_assignments_object_id` on `floor_plan_object_id`
- `idx_seat_assignments_guest_id` on `guest_id`

---

### `guest_relationships` (social mapping)

**File:** `backend/src/db/schema/floorPlan.ts`

Stores social preferences between guest pairs for seating optimization.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | INTEGER PK | auto | Primary key |
| `event_id` | INTEGER FK | - | References `events.id` (cascade delete) |
| `guest_id_1` | INTEGER FK | - | References `guests.id` (cascade delete) — always the lower ID |
| `guest_id_2` | INTEGER FK | - | References `guests.id` (cascade delete) — always the higher ID |
| `relationship_type` | TEXT | - | `prefer_together` or `avoid` |
| `notes` | TEXT | `null` | Optional reason/context |
| `created_at` | TIMESTAMP | `unixepoch()` | Row creation time |

**Constraints:**
- `uq_guest_relationship_pair` — UNIQUE on `(event_id, guest_id_1, guest_id_2)` — one relationship per pair per event

**Indexes:**
- `idx_guest_relationships_event_id` on `event_id`

---

## Relations

### New Relations

```
events ──< floor_plans ──< floor_plan_objects ──< seat_assignments >── guests
events ──< guest_relationships >── guests (guestId1 + guestId2)
```

### Extended Existing Relations

| Table | New Relation | Direction |
|-------|-------------|-----------|
| `events` | `floorPlans` | `many(floorPlans)` |
| `events` | `guestRelationships` | `many(guestRelationships)` |
| `guests` | `seatAssignments` | `many(seatAssignments)` |

---

## Sync with Guests Table

When assigning/unassigning seats, the backend also updates `guests.tableAssignment` (text field) to keep existing guest list filtering working:

- **Assign:** Sets `tableAssignment` to the table's label (e.g., "Table 1")
- **Unassign:** If the guest has no remaining assignments in the plan, clears `tableAssignment` to `null`

---

## Migration

**File:** `backend/drizzle/0016_messy_jackpot.sql`

Creates 4 tables with all indexes and constraints. No modifications to existing tables.

```bash
npm run db:generate      # Already generated
npm run db:migrate:local # Already applied locally
npm run db:migrate       # Apply to remote D1
```
