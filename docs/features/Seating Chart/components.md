# Seating Chart Frontend Components

## Page

### `/dashboard/events/[uuid]/seating.astro`

**File:** `frontend/src/pages/dashboard/events/[uuid]/seating.astro`

SSR page (`prerender = false`). Fetches event title server-side for the page heading. Renders `SeatingTabs` as a client-only island (`client:only="react"`) to bypass SSR for Konva (which requires `window`/`document` at import time). Uses `DashboardLayout`.

**Navigation links:** "Back to Event" and "Guest List" buttons in header.

---

## Entry Point

### `SeatingTabs`

**File:** `frontend/src/components/seating/SeatingTabs.tsx`

**Props:** `{ eventUuid: string | undefined }`

Tab container that wraps the entire seating feature. Creates a shared `QueryClientProvider` so both tabs read/write the same TanStack Query cache — tables and assignments sync instantly between views.

**Responsibilities:**
- Creates and owns the `QueryClient` instance
- Renders shadcn `Tabs` with two tab triggers: "Table Planner" and "Floor Plan Designer"
- Syncs active tab with `$activeSeatingTab` nanostore

**Tab structure:**
- **Table Planner** (default) → `<TablePlannerView eventUuid={eventUuid} />`
- **Floor Plan Designer** → `<SeatingChartInner eventUuid={eventUuid} />`

---

## Table Planner Components

### `TablePlannerView`

**File:** `frontend/src/components/seating/TablePlannerView.tsx`

**Props:** `{ eventUuid: string }`

Main orchestrator for the card-based planner tab. Designed for users who need to plan table assignments without spatial layout.

**Responsibilities:**
- Auto-creates a default floor plan ("Main Floor Plan") on first visit if none exists
- Auto-selects the default/first plan
- Renders action bar, stats, conflicts, add form, and table grid
- Wires all table operations to existing hooks

**Layout:**
- Action bar: `AutoAssignDialog` + `GuestRelationshipsDialog`
- `SeatingChartStats` bar
- `ConflictAlerts` banners
- `AddTableForm`
- Responsive grid of `TableCard` components (1-4 columns depending on viewport)

**Reused components:** `SeatingChartStats`, `ConflictAlerts`, `AutoAssignDialog`, `GuestRelationshipsDialog`

---

### `AddTableForm`

**File:** `frontend/src/components/seating/AddTableForm.tsx`

**Props:** `{ onAdd, tableCount, isAdding? }`

Compact inline form for adding tables.

**Fields:**
| Field | Control | Default |
|-------|---------|---------|
| Shape | `Select` (Round, Rectangular, Square, Head Table) | Round |
| Seats | Number `Input` (1-50) | Auto per shape (round=8, rectangular=8, square=4, head_table=12) |
| Name | Text `Input` | Auto-default "Table N+1" (based on `tableCount`) |

Changing shape auto-updates the seat count to the shape's default. Press Enter or click "Add Table" to submit.

---

### `TableCard`

**File:** `frontend/src/components/seating/TableCard.tsx`

**Props:** `{ object, unassignedGuests, onAssign, onUnassign, onUpdate, onDelete, isAssigning? }`

A shadcn `Card` representing a single table. Provides all assignment operations without leaving the card.

**Header:**
- Shape icon (SVG — round circle, rectangular/head_table rect, square rect)
- Table label (truncated)
- Capacity badge (e.g., "6/8") — color-coded: `destructive` when over capacity, `default` when full, `secondary` otherwise
- Edit button (pencil icon) → toggles inline edit mode for label + seat count
- Delete button (trash icon)

**Body — Assigned guests:**
- List of assigned guests with seat number circle, name, RSVP badge initial (C/P/I/D/M), and unassign (×) button
- Collapsed by default to 3 guests; "+N more" / "Show less" toggle for tables with more

**Body — Quick assign:**
- Search input filters unassigned guests by name
- Click a guest to assign to the next available seat number (same logic as `GuestAssignmentPanel`)
- Shows only when seats are available; shows "Table full" when at capacity

**Visual states:**
- Over-capacity: `border-red-300 bg-red-50/30`
- Normal: default Card styling

---

## Floor Plan Designer Components

### `SeatingChartView` / `SeatingChartInner`

**File:** `frontend/src/components/seating/SeatingChartView.tsx`

**`SeatingChartView` Props:** `{ eventUuid: string | undefined }`
**`SeatingChartInner` Props:** `{ eventUuid: string }`

`SeatingChartView` is the backward-compatible standalone wrapper (creates its own `QueryClientProvider`). `SeatingChartInner` is the exported inner component used by `SeatingTabs` — it assumes a `QueryClientProvider` already exists in the tree.

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

**Rendering library:** [Konva.js](https://konvajs.org/) via `react-konva`. Uses a `<Stage>` with two `<Layer>`s:
1. **Background layer:** White floor plan rectangle, grid lines (`<Line>`), dimensions label — rarely redraws.
2. **Objects layer:** `TableObject` and `ElementObject` components — redraws on drag/selection.

**Container sizing:** A `ResizeObserver` on a wrapper `<div>` measures available space. `pixelsPerFoot` is derived as `min(containerWidth / plan.widthFt, containerHeight / plan.heightFt)`, and all child objects receive `ppf` to convert feet to canvas pixels.

**Features:**
- **Zoom-to-cursor:** Mouse wheel adjusts `$zoom` (0.25x to 3x) while keeping the point under the cursor fixed by recalculating `$panOffset`
- **Pan:** `Stage` is `draggable` — dragging empty background pans; dragging a child Group moves that object (Konva resolves drag target automatically)
- **Grid:** Lines rendered as Konva `<Line>` elements in the background layer, toggled via `$gridVisible`
- **Deselect:** `Stage.onClick` fires `onSelectObject(null)` when `e.target === stage` (click on empty area)
- **No manual pointer handling:** Drag, pan, and zoom are handled by Konva's built-in systems — no `dragState`, `isPanning`, `screenToSvg()`, or pointer capture

**State (Nanostores):** Reads `$zoom`, `$panOffset`, `$selectedObjectUuids`, `$gridVisible`. Writes to `$zoom` and `$panOffset` on wheel/pan events.

---

### `TableObject`

**File:** `frontend/src/components/seating/TableObject.tsx`

**Props:** `{ object, isSelected, onSelect, onDragMove, onDragEnd, pixelsPerFoot, gridSnap, planWidthFt, planHeightFt }`

Konva `<Group>` rendering a table shape with seat circles around the perimeter.

**Nested Group pattern:**
```
<Group x y draggable dragBoundFunc>   ← Outer: position + drag
  <Group rotation offsetX offsetY>    ← Inner: rotation around center
    <Ellipse | Rect />                ← Table shape
    <Text /> (label)
    <Text /> (seat count)
    <Circle /> × N (seats)
  </Group>
</Group>
```

The outer Group's `x`/`y` is `posX * ppf` / `posY * ppf` and handles dragging. The inner Group rotates around the object's center using `offsetX`/`offsetY`.

**Grid snapping:** `dragBoundFunc` converts pixel position back to feet, snaps to `gridSnap`, clamps within plan bounds, then converts back to pixels. This makes snapping feel instant during drag.

**Rendering logic:**
- **Round/oval:** `<Ellipse>` with seats distributed evenly around circumference
- **Rectangular/square/head_table:** `<Rect>` with seats distributed around perimeter
- **Seat circles:** `<Circle>` color-coded by RSVP status (green/amber/red/purple/gray)
- **Dietary icons:** Small `<Circle>` + `<Text>` with letter codes (V=vegan/vegetarian, G=gluten-free, K=kosher/halal, !=allergy, D=other)
- **Label + capacity:** `<Text>` with `align="center"` showing table name and assigned/total count

**Interaction:**
- `onClick` with `e.cancelBubble = true` to prevent Stage deselect
- `onMouseEnter`/`onMouseLeave` set cursor to `move` (or `default` if locked) via `stage.container().style.cursor`
- `onDragMove` fires optimistic position updates; `onDragEnd` fires final save

---

### `ElementObject`

**File:** `frontend/src/components/seating/ElementObject.tsx`

**Props:** `{ object, isSelected, onSelect, onDragMove, onDragEnd, pixelsPerFoot, gridSnap, planWidthFt, planHeightFt }`

Same nested Group pattern as `TableObject` but simpler — just a `<Rect>` body + `<Text>` label. Element-type-specific colors (amber for dance floor, blue for bar, green for buffet, pink for stage, etc.). Dance floor uses `dash={[1 * ppf, 0.5 * ppf]}` for a dashed border. Grid snapping and cursor behavior identical to TableObject.

---

### `FloorPlanToolbar`

**File:** `frontend/src/components/seating/FloorPlanToolbar.tsx`

**Props:** `{ planName, isSaving }`

Horizontal bar above the canvas. Shows plan name, "Saving..." indicator, grid toggle, zoom controls (-/+/reset), and current zoom percentage. The reset button resets both `$zoom` to 1 and `$panOffset` to `{x: 0, y: 0}`.

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
