# Seating Chart Interactions & Flows

## 1. Page Load

```
User navigates to /dashboard/events/[uuid]/seating
    │
    ▼
seating.astro (SSR)
    ├── Fetches event title server-side (for heading)
    └── Renders SeatingChartView island (client:only="react")
            │
            ▼
SeatingChartView mounts
    ├── Creates own QueryClientProvider
    └── Renders SeatingChartInner
            │
            ▼
useFloorPlans(eventUuid) fires
    ├── Loading → Skeleton placeholder
    └── Success → Auto-select default/first plan via useEffect
            │
            ▼
useFloorPlan(eventUuid, activePlanUuid) fires
    ├── Returns plan detail with objects + assignments
    └── Triggers full canvas render
```

---

## 2. Create Floor Plan

```
User clicks "+ New Plan"
    │
    ▼
Text input appears (inline)
    │
    ├── Type name + Enter (or click "Add")
    │       │
    │       ▼
    │   createPlan.mutate({ name })
    │       │
    │       ├── POST /floor-plans
    │       │   └── First plan auto-sets isDefault: true
    │       │
    │       ├── onSuccess: set activePlanUuid to new plan's UUID
    │       └── Invalidates: floorPlanKeys.lists
    │
    └── Click "Cancel" → hides input
```

---

## 3. Add Object from Palette

```
User clicks a table/element preset in ObjectPalette
    │
    ▼
handleAddObject(CreateObjectInput) called
    │
    ▼
createObject.mutate(input)
    │
    ├── POST /floor-plans/:planUuid/objects
    │   ├── Auto-assigns tableNumber for tables
    │   └── Applies default dimensions if not specified
    │
    ├── Response: new object with empty assignments[]
    └── Invalidates: floorPlanKeys.detail
            │
            ▼
Canvas re-renders with new object at default position
```

**Palette presets include:**
- 6 table types: Round (8 seats), Rectangular (10 seats), Square (4 seats), Oval (8 seats), Semicircle (6 seats), Head Table (12 seats)
- 7 element types: Dance Floor, Bar, Buffet, Stage, DJ Booth, Photo Booth, Gift Table

---

## 4. Drag Object on Canvas

```
User presses pointer down on object (if not locked)
    │
    ▼
Konva detects drag target (Group with draggable=true)
    │
    ▼
dragBoundFunc fires on each move
    │
    ├── Convert pixel position → feet (pos / pixelsPerFoot)
    ├── Apply grid snapping (round to nearest gridSnap value)
    ├── Clamp within plan bounds (0..planWidthFt-widthFt, 0..planHeightFt-heightFt)
    └── Return snapped pixel position (feet * pixelsPerFoot)
    │
    ▼
onDragMove fires
    └── Call handleObjectDragged(BulkPositionUpdate)
            │
            ├── Optimistic: setLocalPositions (immediate visual update)
            └── debouncedSave: accumulates in useRef, flushes after 1s idle
                    │
                    ▼ (after 1s with no new drags)
                PUT /floor-plans/:planUuid/objects/bulk-positions
                    └── { updates: [{ uuid, posX, posY }] }
    │
    ▼
onDragEnd fires → final position save
```

**Coordinate system:** All positions stored in feet. `pixelsPerFoot = min(containerWidth / planWidthFt, containerHeight / planHeightFt)`. Objects convert via `posX * ppf` / `posY * ppf`.

---

## 5. Select Object

```
User clicks an object on canvas
    │
    ▼
handleSelectObject(uuid)
    ├── Sets selectedObjectUuid state
    └── Updates $selectedObjectUuids nanostore
            │
            ▼
Right panel renders based on object type:
    │
    ├── objectType === 'table'
    │       └── GuestAssignmentPanel
    │           ├── Shows numbered seat list (1..seatCount)
    │           ├── Each seat: assigned guest name + RSVP badge, or "Empty"
    │           ├── × button to unassign
    │           └── Search box to quick-assign unassigned guests
    │
    └── objectType === 'element'
            └── ObjectPropertyPanel
                ├── Label (text input, saves on blur)
                ├── Width/Height (number inputs)
                ├── Rotation (range slider 0-359°)
                ├── Locked toggle (Switch)
                └── Delete button (destructive)
```

**Click on background** → deselects (`handleSelectObject(null)`), hides right panel.

---

## 6. Assign Guest to Seat

```
In GuestAssignmentPanel (table selected):

User types in search box
    │
    ▼
Filter unassigned guests by first/last name
    │
    ▼
User clicks a guest name
    │
    ▼
Find next available seat number (first empty slot 1..seatCount)
    │
    ▼
assignGuest.mutate({
    objectUuid: selectedTable.uuid,
    assignments: [{ guestUuid, seatNumber }]
})
    │
    ├── POST /floor-plans/:planUuid/objects/:objectUuid/assign
    │   ├── Removes existing assignments for this guest at this table
    │   ├── Inserts new seat_assignment row
    │   └── Updates guests.tableAssignment to table's label
    │
    └── Invalidates: detail, unassigned, conflicts
            │
            ▼
Canvas updates:
    ├── Seat circle turns RSVP color (green/amber/red/purple)
    ├── Dietary icon appears if applicable
    └── Capacity text updates (e.g., "3/8")
```

---

## 7. Unassign Guest

```
In GuestAssignmentPanel, user clicks × next to a guest name
    │
    ▼
unassignGuest.mutate({ objectUuid, guestUuid })
    │
    ├── DELETE /floor-plans/:planUuid/objects/:objectUuid/assign/:guestUuid
    │   ├── Removes seat_assignment row
    │   └── If no remaining assignments in plan → clears guests.tableAssignment
    │
    └── Invalidates: detail, unassigned, conflicts
            │
            ▼
Seat circle returns to gray (empty)
Guest reappears in unassigned list
```

---

## 8. Auto-Assign Guests

```
User clicks "Auto-Assign" button in action bar
    │
    ▼
AutoAssignDialog opens
    ├── Lists all unassigned guests with checkboxes
    ├── Select All / Deselect All buttons
    └── "Auto-Assign N Guests" button
            │
            ▼
autoAssign.mutate(selectedGuestUuids)
    │
    ├── POST /floor-plans/:planUuid/auto-assign
    │   ├── Collects all available seats across all tables
    │   ├── Fisher-Yates shuffle the available seats
    │   ├── Assigns guests in order to shuffled seats
    │   └── Updates guests.tableAssignment for each
    │
    ├── Response: { assigned, totalRequested, availableSeatsRemaining }
    └── Invalidates: detail, unassigned, conflicts
            │
            ▼
Canvas updates with newly assigned seats
Dialog closes
```

---

## 9. Apply Preset Arrangement

```
User clicks "Presets" button
    │
    ▼
ArrangementPresetPicker dialog opens
    ├── 5 preset options with descriptions:
    │   ├── Round Tables (6) — 6 round tables, 8 seats each, grid layout
    │   ├── Banquet Style — Head table + 4 round guest tables
    │   ├── Conference U-Shape — U-shaped rectangular tables
    │   ├── Classroom Style — 3 rows of paired rectangular tables
    │   └── Workshop Groups — 6 small round group tables, 5 seats each
    │
    ▼
User clicks a preset
    │
    ▼
handleApplyPreset(CreateObjectInput[])
    └── For each object in the preset array:
            createObject.mutate(obj)
                │
                ├── POST /floor-plans/:planUuid/objects (per object)
                └── Invalidates: detail (after each)
```

---

## 10. Manage Guest Relationships

```
User clicks "Relationships" button
    │
    ▼
GuestRelationshipsDialog opens
    ├── useGuestRelationships(eventUuid) → loads existing pairs
    │
    ├── Existing relationships list:
    │   ├── Guest A ↔ Guest B, type badge (green "Together" / red "Avoid")
    │   ├── Notes text
    │   └── Delete button → useDeleteRelationship.mutate(id)
    │
    └── Add new relationship form:
        ├── Guest 1 dropdown (Select)
        ├── Guest 2 dropdown (Select)
        ├── Type selector (prefer_together / avoid)
        ├── Notes textarea (optional)
        └── "Add Relationship" button
                │
                ▼
        useCreateRelationship.mutate({
            guestUuid1, guestUuid2,
            relationshipType, notes
        })
                │
                ├── POST /floor-plans/relationships
                │   ├── Stores guest IDs in consistent order (lower ID first)
                │   └── Returns 409 if duplicate pair exists
                │
                └── Invalidates: relationshipKeys.all
```

---

## 11. Conflict Detection

```
Conflicts are fetched via useConflicts(eventUuid, planUuid)
    │
    ├── GET /floor-plans/:planUuid/conflicts
    │   ├── Checks each table: assigned count > seatCount → over_capacity
    │   └── Checks avoid pairs: both guests at same table → avoid_pair
    │
    ▼
ConflictAlerts renders banners (if any conflicts):
    │
    ├── Over-capacity: "Table 1 has 10 guests but only 8 seats"
    │   └── "Show" link → selects the table on canvas
    │
    └── Avoid-pair: "Avoid-pair seated at same table: Table 2"
        └── "Show" link → selects the conflicting table

Conflicts auto-refresh after:
    ├── assignGuest
    ├── unassignGuest
    └── autoAssign
```

---

## 12. Canvas Controls

### Zoom

```
Mouse wheel on canvas → zoom-to-cursor
    │
    ├── Calculate point under cursor in stage coordinates
    ├── Apply scale factor (ZOOM_SPEED = 1.1, range 0.25x to 3x)
    ├── Recalculate $panOffset so cursor point stays fixed
    └── Update $zoom and $panOffset atomically

Toolbar buttons: [-] zoom out, [+] zoom in, [Reset] → 1x + pan reset
Zoom percentage displayed in toolbar
```

### Pan

```
Stage has draggable=true
Drag on empty canvas background (Konva resolves target)
    ├── Stage.x / Stage.y update live during drag
    └── onDragEnd → persist to $panOffset store
```

### Grid

```
Toggle button in FloorPlanToolbar
    └── Sets $gridVisible store
            │
            ▼
FloorPlanCanvas renders/hides grid lines
    └── Grid lines spaced by plan.gridSnap feet
```

---

## 13. Delete Object

```
In ObjectPropertyPanel, user clicks "Delete Object"
    │
    ▼
deleteObject.mutate(objectUuid)
    │
    ├── DELETE /floor-plans/:planUuid/objects/:objectUuid
    │   └── Cascade-deletes all seat_assignments for this object
    │
    ├── handleSelectObject(null) → deselects
    └── Invalidates: detail, unassigned
```

---

## 14. Plan Tab Switching

```
User clicks a plan tab
    │
    ▼
setActivePlanUuid(plan.uuid)
    │
    ├── useFloorPlan fires for new planUuid
    ├── setLocalPositions({}) — reset optimistic state
    ├── setSelectedObjectUuid(null) — deselect
    └── Canvas re-renders with new plan's objects
```

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    SeatingChartView                          │
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌────────────────────┐    │
│  │useFloor  │    │useFloor  │    │useUnassignedGuests │    │
│  │Plans     │    │Plan      │    │                    │    │
│  │(list)    │    │(detail)  │    │useConflicts        │    │
│  └────┬─────┘    └────┬─────┘    └────────┬───────────┘    │
│       │               │                   │                 │
│       ▼               ▼                   ▼                 │
│  Plan Tabs      planWithLocal       Stats + Alerts          │
│                 Positions                                   │
│                      │                                      │
│       ┌──────────────┼──────────────┐                      │
│       ▼              ▼              ▼                       │
│  ObjectPalette  FloorPlanCanvas  GuestAssignment            │
│  (createObject) (drag → bulk    Panel / Object              │
│                  positions)     PropertyPanel                │
│                                (assign/unassign/            │
│                                 update/delete)              │
└─────────────────────────────────────────────────────────────┘
```
