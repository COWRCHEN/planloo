# Task Templates

**File:** `backend/src/lib/task-templates.ts`

Pre-built task templates that can be bulk-applied to an event. Each template task has a `daysBeforeEvent` offset used to compute actual `dueDate` values relative to the event's `startDate`.

---

## How Templates Work

1. User clicks "Apply Template" in the frontend
2. User selects a template card, then picks a **planning start date** (defaults to today)
3. Frontend sends `POST /events/:uuid/tasks/bulk` with `{ templateId: "wedding", startDate: "2026-03-01T..." }`
4. Backend looks up the template and the event's `startDate` from the database
5. Due dates are computed forward from the planning start date, capped at the event date
6. All tasks are batch-inserted with ascending `sortOrder`

### Due Date Calculation

There are two computation modes depending on whether the user provides a start date:

#### With start date (forward scheduling)

Tasks are scheduled forward from the user-chosen start date. The earliest task in the template (highest `daysBeforeEvent`) is due on the start date; subsequent tasks are spread forward while preserving their relative spacing. No due date exceeds the event date.

```
maxDays = max(daysBeforeEvent across all template tasks)
dueDate = min(startDate + (maxDays - daysBeforeEvent), eventDate)
```

For example, if start date is **2026-03-01**, the wedding template has `maxDays = 365`:

| Task | daysBeforeEvent | Due Date |
|------|----------------|----------|
| Set a budget | 365 | 2026-03-01 (day 0) |
| Create guest list | 360 | 2026-03-06 (day 5) |
| Book venue | 330 | 2026-04-05 (day 35) |
| Rehearsal dinner | 1 | 2027-02-28 (day 364) |

If a computed date would exceed the event's `startDate`, it is clamped to the event date.

#### Without start date (backward scheduling, fallback)

When no start date is provided, due dates are computed backward from the event date (original behavior):

```
dueDate = event.startDate - daysBeforeEvent
```

For example, if the event is on **2026-12-15** and a task has `daysBeforeEvent: 90`:

```
dueDate = 2026-12-15 - 90 days = 2026-09-16
```

---

## Wedding Template (18 tasks)

| # | Task | Category | Priority | Days Before |
|---|------|----------|----------|-------------|
| 1 | Set a budget | Planning | High | 365 |
| 2 | Create guest list | Planning | High | 360 |
| 3 | Book venue | Venue | High | 330 |
| 4 | Hire photographer/videographer | Vendors | High | 300 |
| 5 | Book caterer | Catering | High | 270 |
| 6 | Choose wedding party | Planning | Medium | 270 |
| 7 | Book entertainment/DJ | Entertainment | Medium | 240 |
| 8 | Shop for wedding attire | Attire | High | 210 |
| 9 | Order invitations | Stationery | Medium | 180 |
| 10 | Book florist | Decorations | Medium | 180 |
| 11 | Plan honeymoon | Travel | Low | 150 |
| 12 | Send invitations | Stationery | High | 90 |
| 13 | Finalize menu | Catering | Medium | 60 |
| 14 | Arrange transportation | Logistics | Low | 45 |
| 15 | Final dress fitting | Attire | Medium | 30 |
| 16 | Confirm final guest count | Planning | High | 14 |
| 17 | Rehearsal dinner | Events | Medium | 1 |
| 18 | Prepare day-of timeline | Planning | High | 7 |

---

## Birthday Party Template (10 tasks)

| # | Task | Category | Priority | Days Before |
|---|------|----------|----------|-------------|
| 1 | Set a budget | Planning | High | 60 |
| 2 | Choose theme | Planning | Medium | 45 |
| 3 | Book venue | Venue | High | 40 |
| 4 | Create guest list & send invitations | Planning | High | 30 |
| 5 | Order cake | Catering | High | 14 |
| 6 | Plan food & drinks | Catering | Medium | 14 |
| 7 | Book entertainment | Entertainment | Medium | 21 |
| 8 | Buy decorations | Decorations | Medium | 7 |
| 9 | Prepare party favors | Decorations | Low | 3 |
| 10 | Set up party space | Logistics | High | 0 |

---

## Corporate Event Template (12 tasks)

| # | Task | Category | Priority | Days Before |
|---|------|----------|----------|-------------|
| 1 | Define objectives & budget | Planning | High | 90 |
| 2 | Book venue | Venue | High | 75 |
| 3 | Confirm speakers/presenters | Speakers | High | 60 |
| 4 | Arrange AV & tech setup | Technology | High | 45 |
| 5 | Book catering | Catering | Medium | 45 |
| 6 | Design event branding | Branding | Medium | 40 |
| 7 | Set up registration | Registration | High | 35 |
| 8 | Send invitations | Marketing | High | 30 |
| 9 | Prepare event materials | Materials | Medium | 7 |
| 10 | Confirm final headcount | Planning | High | 5 |
| 11 | Conduct venue walkthrough | Venue | Medium | 3 |
| 12 | Day-of coordination | Logistics | High | 0 |

---

## Data Structure

### Template Definition

```typescript
interface TaskTemplate {
  id: string;        // URL-safe identifier
  name: string;      // Display name
  description: string;
  tasks: TemplateTask[];
}

interface TemplateTask {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  daysBeforeEvent: number;  // offset from event startDate
}
```

### Template List Response (GET `/templates`)

```typescript
interface TaskTemplateInfo {
  id: string;
  name: string;
  description: string;
  taskCount: number;
  categories: string[];  // unique categories in the template
}
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `getTemplateList()` | `() => TaskTemplateInfo[]` | Returns metadata for the template picker UI |
| `resolveTemplate()` | `(templateId, eventDate) => ResolvedTask[] \| null` | Computes due dates backward from the event date |
| `resolveTemplateFromStartDate()` | `(templateId, startDate, eventDate) => ResolvedTask[] \| null` | Computes due dates forward from start date, capped at event date |

---

## Adding New Templates

To add a new template, add an entry to the `TASK_TEMPLATES` array in `backend/src/lib/task-templates.ts`:

```typescript
{
  id: 'conference',
  name: 'Conference',
  description: 'Conference planning checklist.',
  tasks: [
    {
      title: 'Book keynote speaker',
      description: 'Research and confirm keynote.',
      category: 'Speakers',
      priority: 'high',
      daysBeforeEvent: 120,
    },
    // ... more tasks
  ],
}
```

No migration or schema change is needed — templates are static data in code.
