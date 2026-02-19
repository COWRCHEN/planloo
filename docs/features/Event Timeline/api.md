# Event Timeline API Endpoints

All endpoints require authentication. Access is resolved via `resolveEventAccess()`.

**Base path:** `/api/v1/events/:eventUuid/tasks`

**File:** `backend/src/routes/tasks.ts`

---

## Task CRUD

### GET `/`

List tasks for an event (paginated, filterable).

**Access:** Any event access (read-only)

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | — | Filter: `pending`, `in_progress`, `completed` |
| `priority` | string | — | Filter: `low`, `medium`, `high` |
| `category` | string | — | Filter by category name |
| `assignedToUserId` | string | — | Filter by assigned user ID |
| `limit` | number | `100` | Max results (1–200) |
| `offset` | number | `0` | Pagination offset |
| `sortBy` | string | `sortOrder` | Sort column: `title`, `priority`, `status`, `dueDate`, `sortOrder`, `createdAt` |
| `sortOrder` | string | `asc` | Sort direction: `asc`, `desc` |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "uuid": "abc-123",
      "title": "Book venue",
      "description": "Research and book the reception venue.",
      "category": "Venue",
      "assignedToUserId": "user-1",
      "assignedToName": "Jane Doe",
      "dueDate": "2026-06-01T00:00:00.000Z",
      "priority": "high",
      "status": "pending",
      "completedAt": null,
      "sortOrder": 0,
      "createdAt": "2026-02-18T...",
      "updatedAt": "2026-02-18T...",
      "dependencyCount": 1
    }
  ],
  "meta": { "total": 18, "limit": 100, "offset": 0 }
}
```

---

### POST `/`

Create a new task.

**Access:** `canEdit` + verified email

**Body:**

```json
{
  "title": "Book venue",
  "description": "Research and book the reception venue.",
  "category": "Venue",
  "assignedToUserId": "user-1",
  "dueDate": "2026-06-01",
  "priority": "high",
  "sortOrder": 0
}
```

Only `title` is required. `sortOrder` auto-increments if omitted.

**Response (201):** Created task object.

---

### GET `/:uuid`

Get a single task with its dependency list.

**Access:** Any event access (read-only)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "uuid": "abc-123",
    "title": "Book venue",
    "description": "...",
    "category": "Venue",
    "assignedToUserId": "user-1",
    "assignedToName": "Jane Doe",
    "dueDate": "2026-06-01T...",
    "priority": "high",
    "status": "pending",
    "completedAt": null,
    "sortOrder": 0,
    "createdAt": "...",
    "updatedAt": "...",
    "dependencies": [
      { "uuid": "dep-1", "title": "Set a budget", "status": "completed" }
    ]
  }
}
```

---

### PATCH `/:uuid`

Update a task. All fields optional.

**Access:** `canEdit` + verified email

**Body:**

```json
{
  "title": "Book reception venue",
  "status": "completed",
  "priority": "medium"
}
```

**Status change behavior:**
- When `status` changes to `completed`, `completedAt` is automatically set to `now`.
- When `status` changes away from `completed`, `completedAt` is cleared to `null`.

**Response (200):** Updated task object.

---

### DELETE `/:uuid`

Soft-delete a task (sets `deletedAt`).

**Access:** `canEdit` + verified email

**Response (200):**

```json
{ "success": true, "data": { "deleted": true } }
```

---

## Bulk Operations

### POST `/bulk`

Bulk create tasks from a pre-built template.

When `startDate` is provided, due dates are computed **forward** from the start date (the earliest template task is due on the start date, subsequent tasks are spread forward). No task due date will exceed the event's `startDate` from the database.

When `startDate` is omitted, due dates are computed **backward** from the event's `startDate` using each template task's `daysBeforeEvent` offset.

**Access:** `canEdit` + verified email

**Body:**

```json
{
  "templateId": "wedding",
  "startDate": "2026-03-01T00:00:00.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `templateId` | string | Yes | Template ID: `wedding`, `birthday`, `corporate` |
| `startDate` | string (ISO 8601) | No | Planning start date. When provided, due dates are computed forward from this date. |

**Response (201):**

```json
{ "success": true, "data": { "created": 18 } }
```

---

### DELETE `/bulk`

Bulk soft-delete all tasks in a category. Sets `deletedAt` and `updatedAt` on all matching tasks.

**Access:** `canEdit` + verified email

**Body:**

```json
{ "category": "Planning" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `category` | string | Yes | Category name to delete (exact match) |

**Response (200):**

```json
{ "success": true, "data": { "deleted": 5 } }
```

Returns `{ "deleted": 0 }` if no tasks match the category.

---

### PATCH `/reorder`

Bulk update `sortOrder` for multiple tasks.

**Access:** `canEdit` + verified email

**Body:**

```json
{
  "tasks": [
    { "uuid": "abc-123", "sortOrder": 0 },
    { "uuid": "def-456", "sortOrder": 1 },
    { "uuid": "ghi-789", "sortOrder": 2 }
  ]
}
```

**Response (200):**

```json
{ "success": true, "data": { "updated": 3 } }
```

---

## Summary & Templates

### GET `/summary`

Task statistics for the event.

**Access:** Any event access (read-only)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "total": 18,
    "byStatus": [
      { "status": "pending", "count": 10 },
      { "status": "in_progress", "count": 3 },
      { "status": "completed", "count": 5 }
    ],
    "byPriority": [
      { "priority": "high", "count": 7 },
      { "priority": "medium", "count": 8 },
      { "priority": "low", "count": 3 }
    ],
    "overdueCount": 2
  }
}
```

---

### GET `/templates`

Returns available pre-built task templates.

**Access:** Any event access (read-only)

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "wedding",
      "name": "Wedding",
      "description": "Complete wedding planning checklist with 18 essential tasks.",
      "taskCount": 18,
      "categories": ["Planning", "Venue", "Vendors", "Catering", "Entertainment", "Attire", "Stationery", "Travel", "Decorations", "Logistics", "Events"]
    }
  ]
}
```

---

## Dependencies

### POST `/:uuid/dependencies`

Add a dependency (task depends on another task).

**Access:** `canEdit` + verified email

**Body:**

```json
{ "dependsOnTaskUuid": "dep-task-uuid" }
```

**Validation:**
- Both tasks must belong to the same event
- A task cannot depend on itself (returns 400)
- Duplicate dependencies are rejected (returns 409)

**Response (201):**

```json
{ "success": true, "data": { "added": true } }
```

---

### DELETE `/:uuid/dependencies/:depUuid`

Remove a dependency. `:depUuid` is the UUID of the task to stop depending on.

**Access:** `canEdit` + verified email

**Response (200):**

```json
{ "success": true, "data": { "deleted": true } }
```
