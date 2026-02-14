# Seating Chart Frontend Components

## Page

### `/dashboard/events/[uuid]/seating.astro`

**File:** `frontend/src/pages/dashboard/events/[uuid]/seating.astro`

SSR page (`prerender = false`). Fetches event title server-side for the page heading. Renders `SeatingChartView` as a client-side island (`client:load`). Uses `DashboardLayout`.

**Navigation links:** "Back to Event" and "Guest List" buttons in header.

---

## Top-Level Component

### `SeatingChartView`

**File:** `frontend/src/components/seating/SeatingChartView.tsx`

**Props:** `{ eventUuid: string | undefined }`

Main orchestrator. Creates its own `QueryClientProvider` and manages all state coordination.

**Responsibilities:**
- Plan tab switching and creation
- Selected object state management
- Optimistic local position updates during drag
- Wiring all child components to their data hooks

**Layout:** Three-column layout inside a bordered container:
- **Left:** `ObjectPalette` (fixed 208px)
- **Center:** `FloorPlanToolbar` + `FloorPlanCanvas` (flex-1)
- **Right:** `GuestAssignmentPanel` (when table selected) or `ObjectPropertyPanel` (when element selected)

**Above the canvas:**
- Plan tabs + "New Plan" button
- Action buttons: Presets, Auto-Assign, Relationships
- `SeatingChartStats` bar
- `ConflictAlerts` banners

---

## Canvas Components

### `FloorPlanCanvas`

**File:** `frontend/src/components/seating/FloorPlanCanvas.tsx`

**Props:** `{ plan, onObjectDragged, onSelectObject }`

SVG-based canvas where `viewBox` maps to floor plan dimensions in feet.

**Features:**
- Grid lines based on `gridSnap` value
- Pan via pointer drag on background
- Zoom via mouse wheel (0.25x to 3x)
- Object selection on click
- Object drag via `onPointerDown/Move/Up` (not dnd-kit, for free-form positioning)
- Coordinate conversion: screen pixels to SVG feet
- Grid snapping during drag

**State (Nanostores):** Reads `$zoom`, `$panOffset`, `$selectedObjectUuids`, `$gridVisible`.

---

### `TableObject`

**File:** `frontend/src/components/seating/TableObject.tsx`

**Props:** `{ object, isSelected, onSelect, onDragStart }`

SVG group rendering a table shape with seat circles around the perimeter.

**Rendering logic:**
- **Round/oval:** `<ellipse>` with seats distributed evenly around circumference
- **Rectangular/square/head_table:** `<rect>` with seats distributed around perimeter
- **Seat circles:** Color-coded by RSVP status (green/amber/red/purple/gray)
- **Dietary icons:** Small colored circles with letter codes (V=vegan/vegetarian, G=gluten-free, K=kosher/halal, !=allergy, D=other)
- **Label + capacity:** Centered text showing table name and assigned/total count

**Selection:** Purple border highlight when selected. Click selects, pointer down starts drag (if not locked).

---

### `ElementObject`

**File:** `frontend/src/components/seating/ElementObject.tsx`

**Props:** `{ object, isSelected, onSelect, onDragStart }`

SVG rectangle with element-type-specific colors (amber for dance floor, blue for bar, green for buffet, pink for stage, etc.). Dashed border for dance floor.

---

### `FloorPlanToolbar`

**File:** `frontend/src/components/seating/FloorPlanToolbar.tsx`

**Props:** `{ planName, isSaving }`

Horizontal bar above the canvas. Shows plan name, "Saving..." indicator, grid toggle, zoom controls (-/+/reset), and current zoom percentage.

---

## Panel Components

### `ObjectPropertyPanel`

**File:** `frontend/src/components/seating/ObjectPropertyPanel.tsx`

**Props:** `{ object, onUpdate, onDelete, isUpdating }`

Right-side panel for editing a selected object's properties.

**Controls:**
| Control | Type | Description |
|---------|------|-------------|
| Label | Text input | Edit display name |
| Seats | Number input | Table seat count (tables only) |
| Width / Height | Number inputs | Dimensions in feet |
| Rotation | Range slider | 0-359 degrees |
| Locked | Toggle switch | Prevent accidental moves |
| Delete | Destructive button | Remove object from canvas |

Changes save on blur for text/number fields.

---

### `GuestAssignmentPanel`

**File:** `frontend/src/components/seating/GuestAssignmentPanel.tsx`

**Props:** `{ object, unassignedGuests, onAssign, onUnassign, isAssigning }`

Right-side panel shown when a **table** is selected. Shows all seat slots (1 through seatCount) with current assignments.

**Features:**
- Numbered seat list with assigned guest names and RSVP status badges
- Remove button (×) per assigned guest
- Quick-assign section: search unassigned guests, click to assign to next available seat
- Guest search filters by first/last name

---

### `UnassignedGuestsPanel`

**File:** `frontend/src/components/seating/UnassignedGuestsPanel.tsx`

**Props:** `{ guests, onAutoAssign, isAutoAssigning }`

Expandable panel with badge showing unassigned count. Contains:
- Search filter
- Multi-select checkboxes with Select All / Deselect All
- "Auto-Assign N Guests" button

---

## Dialog Components

### `GuestRelationshipsDialog`

**File:** `frontend/src/components/seating/GuestRelationshipsDialog.tsx`

**Props:** `{ eventUuid, allGuests }`

Modal dialog for managing prefer_together / avoid pairs.

**Sections:**
1. **Existing relationships:** List with guest names, type badge (green "Together" or red "Avoid"), notes, and delete button
2. **Add new:** Two guest dropdowns, type selector, optional notes, "Add" button

---

### `AutoAssignDialog`

**File:** `frontend/src/components/seating/AutoAssignDialog.tsx`

**Props:** `{ unassignedGuests, onAutoAssign, isAutoAssigning }`

Modal dialog for selecting guests to auto-assign. Checkbox list with Select All, then "Auto-Assign N Guests" confirmation button.

---

### `ArrangementPresetPicker`

**File:** `frontend/src/components/seating/ArrangementPresetPicker.tsx`

**Props:** `{ onApplyPreset }`

Dialog with 5 preset arrangements:

| Preset | Description |
|--------|-------------|
| Round Tables (6) | 6 round tables, 8 seats each, grid layout |
| Banquet Style | Head table + 4 round guest tables |
| Conference U-Shape | U-shaped rectangular tables |
| Classroom Style | 3 rows of paired rectangular tables |
| Workshop Groups | 6 small round group tables, 5 seats each |

Clicking a preset calls `onApplyPreset` with the array of `CreateObjectInput` objects.

---

## Stats & Alerts

### `SeatingChartStats`

**File:** `frontend/src/components/seating/SeatingChartStats.tsx`

**Props:** `{ plan, unassignedCount }`

Inline stats bar showing: **N** tables | **N** seats | **N** assigned | **N** unassigned.

---

### `ConflictAlerts`

**File:** `frontend/src/components/seating/ConflictAlerts.tsx`

**Props:** `{ conflicts, onSelectObject }`

Renders destructive `<Alert>` banners for each conflict. "Show" link selects the conflicting table on the canvas.
