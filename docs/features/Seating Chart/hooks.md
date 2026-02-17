# Seating Chart Data Hooks & Stores

## Nanostores (Canvas UI State)

**File:** `frontend/src/stores/seating.ts`

Client-side UI state for the floor plan canvas. These stores are **not** synced to the server — they control local rendering behavior only.

| Store | Type | Default | Description |
|-------|------|---------|-------------|
| `$activeSeatingTab` | `'planner' \| 'designer'` | `'planner'` | Active tab on the seating page. Synced by `SeatingTabs`. |
| `$zoom` | `number` | `1` | Current zoom level (1 = 100%). Range: 0.25x to 3x |
| `$panOffset` | `{ x: number; y: number }` | `{ x: 0, y: 0 }` | Stage x/y position (pan offset). Updated by Stage drag and zoom-to-cursor. Reset button sets to `{0,0}`. |
| `$selectedObjectUuids` | `string[]` | `[]` | Currently selected object UUIDs |
| `$isDragging` | `boolean` | `false` | Whether user is dragging an object on canvas (legacy — no longer set by canvas after Konva migration, retained for potential external use) |
| `$gridVisible` | `boolean` | `true` | Whether to show the grid overlay |
| `$activePanel` | `'palette' \| 'properties' \| 'guests' \| null` | `'palette'` | Which right-side panel is open |

**Usage:** Stores are read via `useStore()` from `@nanostores/react`. `$activeSeatingTab` is read/written by `SeatingTabs`. Canvas stores (`$zoom`, `$panOffset`, etc.) are read/written by `FloorPlanCanvas`, `FloorPlanToolbar`, and `SeatingChartInner`.

---

## Query Keys

**File:** `frontend/src/hooks/use-floor-plans.ts`

All query keys follow a hierarchical factory pattern for targeted invalidation.

```typescript
floorPlanKeys = {
  all:        (eventUuid) => ['floor-plans', eventUuid],
  lists:      (eventUuid) => ['floor-plans', eventUuid, 'list'],
  detail:     (eventUuid, planUuid) => ['floor-plans', eventUuid, 'detail', planUuid],
  unassigned: (eventUuid, planUuid) => ['floor-plans', eventUuid, 'unassigned', planUuid],
  conflicts:  (eventUuid, planUuid) => ['floor-plans', eventUuid, 'conflicts', planUuid],
};
```

**File:** `frontend/src/hooks/use-guest-relationships.ts`

```typescript
relationshipKeys = {
  all: (eventUuid) => ['guest-relationships', eventUuid],
};
```

---

## Floor Plan Hooks

**File:** `frontend/src/hooks/use-floor-plans.ts`

### `useFloorPlans(eventUuid)`

List all floor plans for an event.

| Property | Value |
|----------|-------|
| Query key | `floorPlanKeys.lists(eventUuid)` |
| Enabled | `!!eventUuid` |
| Stale time | 60s |
| Returns | `FloorPlanResponse[]` |

---

### `useFloorPlan(eventUuid, planUuid)`

Get floor plan detail with all objects and seat assignments (includes guest info on each assignment).

| Property | Value |
|----------|-------|
| Query key | `floorPlanKeys.detail(eventUuid, planUuid)` |
| Enabled | `!!eventUuid && !!planUuid` |
| Stale time | 30s |
| Returns | `FloorPlanDetailResponse` (plan + `objects[]` with nested `assignments[]`) |

---

### `useCreateFloorPlan(eventUuid)`

Create a new floor plan. First plan auto-sets `isDefault: true`.

| Property | Value |
|----------|-------|
| Input | `CreateFloorPlanInput` (`name` required; `widthFt`, `heightFt`, `gridSnap`, `isDefault` optional) |
| Invalidates | `floorPlanKeys.lists(eventUuid)` |
| Returns | `FloorPlanResponse` |

---

### `useUpdateFloorPlan(eventUuid, planUuid)`

Update floor plan metadata (name, dimensions, grid, default status).

| Property | Value |
|----------|-------|
| Input | `UpdateFloorPlanInput` (all fields optional) |
| Invalidates | `floorPlanKeys.lists(eventUuid)`, `floorPlanKeys.detail(eventUuid, planUuid)` |

---

### `useDeleteFloorPlan(eventUuid)`

Soft-delete a floor plan.

| Property | Value |
|----------|-------|
| Input | `planUuid: string` |
| Invalidates | `floorPlanKeys.lists(eventUuid)` |

---

## Floor Plan Object Hooks

**File:** `frontend/src/hooks/use-floor-plan-objects.ts`

### `useCreateObject(eventUuid, planUuid)`

Create a table or venue element on the floor plan.

| Property | Value |
|----------|-------|
| Input | `CreateObjectInput` (`objectType`, `label` required; shape/element type, position, dimensions optional) |
| Invalidates | `floorPlanKeys.detail(eventUuid, planUuid)` |
| Returns | `FloorPlanObjectResponse` |

---

### `useUpdateObject(eventUuid, planUuid)`

Update a single object's properties.

| Property | Value |
|----------|-------|
| Input | `{ objectUuid: string; data: UpdateObjectInput }` |
| Invalidates | `floorPlanKeys.detail(eventUuid, planUuid)` |

---

### `useDeleteObject(eventUuid, planUuid)`

Delete an object. Cascade-deletes seat assignments.

| Property | Value |
|----------|-------|
| Input | `objectUuid: string` |
| Invalidates | `floorPlanKeys.detail(...)`, `floorPlanKeys.unassigned(...)` |

---

### `useBulkUpdatePositions(eventUuid, planUuid)`

Debounced bulk position save. Collects position updates and flushes to server 1 second after the last update.

| Property | Value |
|----------|-------|
| Debounce | 1000ms after last call |
| Input | `BulkPositionUpdate` (`uuid`, `posX`, `posY`, optional `rotation`) |
| Mechanism | `useRef` for pending updates + `setTimeout`. Replaces existing entry for same UUID. |
| Returns | `{ debouncedSave, isPending, ...mutationResult }` |

**Implementation detail:** Uses `useRef` (not state) to accumulate pending updates without triggering re-renders. On each call, the timer resets. When the timer fires, all pending updates are sent in a single `PUT` request.

---

## Seat Assignment Hooks

**File:** `frontend/src/hooks/use-floor-plan-objects.ts`

### `useAssignGuest(eventUuid, planUuid)`

Assign one or more guests to specific seats at a table.

| Property | Value |
|----------|-------|
| Input | `{ objectUuid: string; assignments: AssignGuestInput[] }` where `AssignGuestInput = { guestUuid, seatNumber }` |
| Invalidates | `detail`, `unassigned`, `conflicts` |

---

### `useUnassignGuest(eventUuid, planUuid)`

Remove a guest from their seat at a table.

| Property | Value |
|----------|-------|
| Input | `{ objectUuid: string; guestUuid: string }` |
| Invalidates | `detail`, `unassigned`, `conflicts` |

---

### `useAutoAssign(eventUuid, planUuid)`

Randomly assign selected guests to available seats across all tables.

| Property | Value |
|----------|-------|
| Input | `guestUuids: string[]` |
| Invalidates | `detail`, `unassigned`, `conflicts` |
| Returns | `{ assigned, totalRequested, availableSeatsRemaining }` |

---

### `useUnassignedGuests(eventUuid, planUuid)`

Get guests not assigned to any table in this plan.

| Property | Value |
|----------|-------|
| Query key | `floorPlanKeys.unassigned(eventUuid, planUuid)` |
| Enabled | `!!eventUuid && !!planUuid` |
| Stale time | 30s |
| Returns | `UnassignedGuestResponse[]` |

---

### `useConflicts(eventUuid, planUuid)`

Check for over-capacity tables and avoid-pair violations.

| Property | Value |
|----------|-------|
| Query key | `floorPlanKeys.conflicts(eventUuid, planUuid)` |
| Enabled | `!!eventUuid && !!planUuid` |
| Stale time | 30s |
| Returns | `ConflictResponse[]` |

---

## Guest Relationship Hooks

**File:** `frontend/src/hooks/use-guest-relationships.ts`

### `useGuestRelationships(eventUuid)`

List all prefer/avoid pairs for the event, including guest names.

| Property | Value |
|----------|-------|
| Query key | `relationshipKeys.all(eventUuid)` |
| Enabled | `!!eventUuid` |
| Stale time | 5 minutes |
| Returns | `GuestRelationshipResponse[]` |

---

### `useCreateRelationship(eventUuid)`

Create a guest relationship (prefer_together or avoid).

| Property | Value |
|----------|-------|
| Input | `CreateRelationshipInput` (`guestUuid1`, `guestUuid2`, `relationshipType`, optional `notes`) |
| Invalidates | `relationshipKeys.all(eventUuid)` |

---

### `useDeleteRelationship(eventUuid)`

Remove a guest relationship.

| Property | Value |
|----------|-------|
| Input | `relationshipId: number` |
| Invalidates | `relationshipKeys.all(eventUuid)` |

---

## Exported Types

### From `use-floor-plans.ts`

| Type | Description |
|------|-------------|
| `FloorPlanResponse` | Floor plan list item (id, uuid, name, dimensions, gridSnap, isDefault, sortOrder, timestamps) |
| `FloorPlanDetailResponse` | Extends `FloorPlanResponse` with `objects: FloorPlanObjectResponse[]` |
| `FloorPlanObjectResponse` | Object with all properties + nested `assignments: SeatAssignmentResponse[]` |
| `SeatAssignmentResponse` | Seat assignment with guest info (uuid, name, rsvpStatus, dietaryRestrictions) |
| `CreateFloorPlanInput` | Create payload |
| `UpdateFloorPlanInput` | Update payload |

### From `use-floor-plan-objects.ts`

| Type | Description |
|------|-------------|
| `CreateObjectInput` | Object creation payload (objectType, label, shape/element type, position, dimensions) |
| `UpdateObjectInput` | Object update payload (all fields optional) |
| `BulkPositionUpdate` | Position update entry (uuid, posX, posY, optional rotation) |
| `AssignGuestInput` | `{ guestUuid, seatNumber }` |
| `UnassignedGuestResponse` | Guest not assigned in current plan (uuid, name, rsvpStatus, dietary, category) |
| `ConflictResponse` | Conflict entry (type, message, optional objectUuid, optional guestUuids) |

### From `use-guest-relationships.ts`

| Type | Description |
|------|-------------|
| `GuestRelationshipResponse` | Relationship with guest names (id, type, notes, guest1, guest2) |
| `CreateRelationshipInput` | `{ guestUuid1, guestUuid2, relationshipType, notes? }` |

---

## Cache Invalidation Map

Shows which queries are invalidated by each mutation:

| Mutation | lists | detail | unassigned | conflicts |
|----------|:-----:|:------:|:----------:|:---------:|
| createFloorPlan | x | | | |
| updateFloorPlan | x | x | | |
| deleteFloorPlan | x | | | |
| createObject | | x | | |
| updateObject | | x | | |
| deleteObject | | x | x | |
| assignGuest | | x | x | x |
| unassignGuest | | x | x | x |
| autoAssign | | x | x | x |
