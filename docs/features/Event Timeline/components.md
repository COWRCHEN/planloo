# Event Timeline Frontend Components

**Directory:** `frontend/src/components/tasks/`

---

## Component Tree

```
tasks.astro (SSR page)
└── TasksView (QueryProvider wrapper)
    └── TasksViewContent
        ├── TaskSummaryBar
        │   └── useTaskSummary()
        ├── Filter controls (status, priority)
        ├── Tabs
        │   ├── TaskList (Checklist tab)
        │   │   └── TaskItem (per task)
        │   └── TaskTimeline (Timeline tab)
        ├── TaskDialog (create/edit)
        └── TemplatePickerDialog
```

---

## TasksView

**File:** `TasksView.tsx`

Main entry point wrapped in `QueryProvider`. Renders:

1. **TaskSummaryBar** — Four stat cards (total, completed, in progress, overdue)
2. **Action buttons** — "New Task" and "Apply Template"
3. **Filter controls** — Status and priority select dropdowns
4. **Tabs** — "Checklist" (`TaskList`) and "Timeline" (`TaskTimeline`)
5. **Dialogs** — `TaskDialog` and `TemplatePickerDialog` (controlled via state)

| Prop | Type | Description |
|------|------|-------------|
| `eventUuid` | `string` | Event identifier |

### State Management

- `statusFilter` / `priorityFilter` — Passed to `useTasks()` as query params
- `dialogOpen` / `editingTask` — Controls TaskDialog (create vs edit mode)
- `templateDialogOpen` — Controls TemplatePickerDialog

---

## TaskList

**File:** `TaskList.tsx`

Checklist view that groups tasks by `category` into collapsible sections with per-category delete.

| Prop | Type | Description |
|------|------|-------------|
| `tasks` | `TaskResponse[]` | Task data |
| `isLoading` | `boolean` | Show skeleton loading state |
| `onToggleComplete` | `(task) => void` | Toggle completed status |
| `onEdit` | `(task) => void` | Open edit dialog |
| `onDelete` | `(task) => void` | Delete task |
| `onDeleteCategory` | `(category) => void` | Optional. Delete all tasks in a category |
| `isDeletingCategory` | `boolean` | Optional. Disables delete buttons during mutation |

### Features

- Groups tasks by `category` field (defaults to "Uncategorized")
- Each group header shows completed/total count and is collapsible
- **Category delete**: Trash icon button on each category header. Clicking opens an `AlertDialog` confirmation ("Delete all X tasks in {Category}?"). On confirm, calls `onDeleteCategory` which triggers a bulk soft-delete via `DELETE /bulk`.
- Empty state with illustration when no tasks exist

---

## TaskTimeline

**File:** `TaskTimeline.tsx`

Vertical timeline view grouping tasks by time period relative to current date.

| Prop | Type | Description |
|------|------|-------------|
| `tasks` | `TaskResponse[]` | Task data |
| `isLoading` | `boolean` | Show skeleton loading state |
| `eventStartDate` | `string?` | Optional event start date (reserved for future use) |

### Features

- Tasks sorted by due date, then grouped into time periods (Overdue, This Week, This Month, 1–3 Months, etc.)
- Each group shows a `Progress` bar (completed/total percentage)
- Status-colored icons: green (completed), blue (in progress), red (overdue), gray (pending)
- Tasks without a due date grouped under "No Due Date"

---

## TaskItem

**File:** `TaskItem.tsx`

Individual task row in the checklist view.

| Prop | Type | Description |
|------|------|-------------|
| `task` | `TaskResponse` | Task data |
| `onToggleComplete` | `(task) => void` | Toggle checkbox |
| `onEdit` | `(task) => void` | Edit action |
| `onDelete` | `(task) => void` | Delete action |

### Visual Elements

- **Checkbox** — Toggles `completed` status
- **Title** — Strikethrough when completed
- **Priority badge** — Color-coded: high=destructive, medium=amber outline, low=secondary
- **Due date** — Red text when overdue and not completed
- **Assignee name** — Shown when `assignedToName` is present
- **Dependency icon** — Link icon when `dependencyCount > 0`
- **Actions dropdown** — Edit (pencil) and Delete (trash)

---

## TaskDialog

**File:** `TaskDialog.tsx`

Create/edit dialog using shadcn Dialog + react-hook-form + Zod.

| Prop | Type | Description |
|------|------|-------------|
| `eventUuid` | `string` | Event identifier |
| `open` | `boolean` | Dialog visibility |
| `onOpenChange` | `(open) => void` | Visibility callback |
| `task` | `TaskResponse?` | If provided, edit mode; otherwise create mode |

### Form Fields

| Field | Component | Validation |
|-------|-----------|------------|
| Title | `Input` | Required, 1–200 chars |
| Description | `Textarea` | Optional, max 2000 chars |
| Category | `Input` | Optional, max 100 chars |
| Priority | `Select` | Enum: low, medium, high (default: medium) |
| Due Date | `Calendar` + `Popover` | Optional, with clear button |

### Behavior

- Form resets on open via `useEffect` on `open` + `task` props
- Edit mode: calls `useUpdateTask` mutation
- Create mode: calls `useCreateTask` mutation
- Dialog closes on successful save

---

## TemplatePickerDialog

**File:** `TemplatePickerDialog.tsx`

Two-step dialog for selecting a template and setting a planning start date.

| Prop | Type | Description |
|------|------|-------------|
| `eventUuid` | `string` | Event identifier |
| `open` | `boolean` | Dialog visibility |
| `onOpenChange` | `(open) => void` | Visibility callback |

### Two-Step Flow

1. **Step 1 — Pick a template**: Displays available templates as Cards (name, description, task count, category badges). Clicking "Apply Template" on a card advances to step 2.
2. **Step 2 — Set start date**: Shows a date picker (Calendar + Popover) defaulting to today. The user selects when planning should begin. "Apply Template" sends both `templateId` and `startDate` to the backend. A "Back" button returns to step 1.

### Features

- Fetches templates via `useTaskTemplates(eventUuid)`
- Start date picker uses shadcn `Calendar` + `Popover` (same pattern as `TaskDialog`)
- Template summary (name + task/category counts) shown alongside the date picker for context
- Shows "Applying..." state during mutation
- Skeleton loading state while fetching templates
- Dialog state resets on close

---

## shadcn/ui Components Used

| Component | Usage |
|-----------|-------|
| `Checkbox` | Task completion toggle in TaskItem |
| `Progress` | Time period progress bars in TaskTimeline |
| `Badge` | Priority badges, status badges, category tags |
| `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` | Checklist/Timeline view switching |
| `Dialog` | TaskDialog, TemplatePickerDialog |
| `AlertDialog` | Category delete confirmation in TaskList |
| `Select` | Filter dropdowns, priority picker |
| `Calendar` + `Popover` | Due date picker |
| `Card` | Template cards, summary stats |
| `Input` / `Textarea` / `Label` | Form fields |
| `Button` | Actions throughout |
| `DropdownMenu` | Task item actions (edit/delete) |
| `Skeleton` | Loading states |
