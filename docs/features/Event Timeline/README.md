# Event Timeline / Checklist

**Feature:** Task management with checklist, timeline, and pre-built templates
**Status:** Implemented
**Last Updated:** 2026-02-18

---

## Overview

The Event Timeline feature provides **task and checklist management** scoped to each event. Users can create individual tasks, apply pre-built templates (Wedding, Birthday, Corporate), and track progress through two views:

1. **Checklist View** — Tasks grouped by category with collapsible sections, checkbox completion toggling, and inline actions (edit, delete).

2. **Timeline View** — Tasks sorted by due date and grouped into time periods relative to the current date (e.g., "Overdue", "This Week", "1–3 Months"), each with a progress bar showing completed vs total.

### Key Capabilities

- Create, edit, and soft-delete tasks with title, description, category, priority, due date, and assignee
- Toggle task completion with automatic `completedAt` timestamp management
- Filter tasks by status (pending / in_progress / completed) and priority (low / medium / high)
- Apply pre-built templates with an optional planning start date — due dates are computed forward from the start date (capped at the event date), or backward from the event date when no start date is given
- Delete entire task categories in bulk with a confirmation dialog
- Task dependencies: declare which tasks block other tasks
- Bulk reorder tasks within categories
- Summary stats: total tasks, completed count, in-progress count, overdue count

---

## Table of Contents

1. [Database Schema](./schema.md)
2. [API Endpoints](./api.md)
3. [Frontend Components](./components.md)
4. [Data Hooks](./hooks.md)
5. [Task Templates](./templates.md)

---

## Architecture Summary

```
Event Detail Page                    Tasks Page
┌───────────────────┐                ┌──────────────────────────────────────────┐
│ EventDetailView   │                │  TasksView (QueryClientProvider)         │
│ "Tasks" button    │──navigate──►   │  ┌─────────────────────────────────┐    │
│                   │                │  │ TaskSummaryBar                  │    │
└───────────────────┘                │  │ (total | completed | in progress│    │
                                     │  │  | overdue)                     │    │
                                     │  ├─────────────────────────────────┤    │
                                     │  │ [New Task] [Apply Template]     │    │
                                     │  │ Status filter  Priority filter  │    │
                                     │  ├─────────────────────────────────┤    │
                                     │  │ Tabs: Checklist | Timeline      │    │
                                     │  │ ┌────────────┬───────────────┐  │    │
                                     │  │ │ TaskList   │ TaskTimeline  │  │    │
                                     │  │ │ (grouped   │ (grouped by   │  │    │
                                     │  │ │  by cat.)  │  time period) │  │    │
                                     │  │ └────────────┴───────────────┘  │    │
                                     │  └─────────────────────────────────┘    │
                                     │  + TaskDialog (create/edit)             │
                                     │  + TemplatePickerDialog                 │
                                     └──────────────────┬─────────────────────┘
                                                        │
                                             REST API (Hono)
                                                        │
                                     ┌──────────────────┼──────────────────┐
                                     ▼                  ▼                  ▼
                               ┌──────────┐   ┌────────────────┐   ┌──────────┐
                               │  tasks   │   │task_dependencies│   │  events  │
                               └──────────┘   └────────────────┘   └──────────┘
```

---

## File Manifest

### Backend

| File | Purpose |
|------|---------|
| `backend/src/db/schema/events.ts` | Schema: `tasks` (existing) + `task_dependencies` (new) |
| `backend/src/db/schema/relations.ts` | Relations for `taskDependencies` + updated `tasks` relations |
| `backend/src/db/types.ts` | Inferred types: `TaskDependency`, `NewTaskDependency` |
| `backend/src/routes/tasks.ts` | All task API routes (11 endpoints, includes bulk delete by category) |
| `backend/src/routes/index.ts` | Route mounting at `/events/:eventUuid/tasks` |
| `backend/src/lib/task-templates.ts` | Pre-built templates (Wedding, Birthday, Corporate) + `resolveTemplateFromStartDate()` |
| `backend/drizzle/0021_add_task_dependencies.sql` | Migration for `task_dependencies` table |

### Shared

| File | Purpose |
|------|---------|
| `shared/schemas/task.ts` | Zod validation schemas + TypeScript response types |
| `shared/schemas/index.ts` | Barrel export (updated) |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/pages/dashboard/events/[uuid]/tasks.astro` | SSR page, renders `TasksView` (`client:load`) |
| `frontend/src/components/tasks/index.ts` | Barrel exports |
| `frontend/src/components/tasks/TasksView.tsx` | Main wrapper: summary bar, filters, tabs, dialogs |
| `frontend/src/components/tasks/TaskList.tsx` | Checklist view: tasks grouped by category, collapsible, category delete |
| `frontend/src/components/tasks/TaskTimeline.tsx` | Timeline view: tasks grouped by time period with progress bars |
| `frontend/src/components/tasks/TaskItem.tsx` | Individual task row: checkbox, priority badge, due date, actions |
| `frontend/src/components/tasks/TaskDialog.tsx` | Create/edit dialog: react-hook-form + Zod + Calendar |
| `frontend/src/components/tasks/TemplatePickerDialog.tsx` | Two-step template selection: pick template, set start date, apply |
| `frontend/src/hooks/use-tasks.ts` | TanStack Query hooks for all task operations |
| `frontend/src/components/events/EventDetailView.tsx` | Modified: added "Tasks" nav button |

---

## Quick Reference

### Task Statuses

| Status | Description |
|--------|-------------|
| `pending` | Not yet started (default) |
| `in_progress` | Currently being worked on |
| `completed` | Done — `completedAt` is auto-set |

### Task Priorities

| Priority | Badge Color |
|----------|-------------|
| `high` | Red (destructive) |
| `medium` | Amber (warning/outline) |
| `low` | Gray (secondary) |

### Timeline Time Periods

Tasks are grouped into these buckets based on days until due:

| Period | Days Until Due |
|--------|----------------|
| Overdue | < 0 (not completed) |
| This Week | 0–7 |
| This Month | 8–30 |
| 1–3 Months | 31–90 |
| 3–6 Months | 91–180 |
| 6–12 Months | 181–365 |
| 12+ Months | > 365 |
| No Due Date | `dueDate` is null |

### Available Templates

| Template | Tasks | Categories |
|----------|-------|------------|
| Wedding | 18 | Planning, Venue, Vendors, Catering, Entertainment, Attire, Stationery, Travel, Decorations, Logistics, Events |
| Birthday | 10 | Planning, Venue, Catering, Entertainment, Decorations, Logistics |
| Corporate | 12 | Planning, Venue, Speakers, Technology, Catering, Branding, Registration, Marketing, Materials, Logistics |
