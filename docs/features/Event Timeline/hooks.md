# Event Timeline Data Hooks

**File:** `frontend/src/hooks/use-tasks.ts`

All hooks use TanStack Query for caching, loading states, and automatic cache invalidation.

---

## Query Keys

```typescript
export const taskKeys = {
  all: ['tasks'],
  lists: () => [...taskKeys.all, 'list'],
  list: (eventUuid, filters?) => [...taskKeys.lists(), eventUuid, filters],
  details: () => [...taskKeys.all, 'detail'],
  detail: (eventUuid, taskUuid) => [...taskKeys.details(), eventUuid, taskUuid],
  summary: (eventUuid) => [...taskKeys.all, 'summary', eventUuid],
  templates: (eventUuid) => [...taskKeys.all, 'templates', eventUuid],
};
```

---

## Query Hooks

### `useTasks(eventUuid, filters?)`

Fetches paginated task list with optional filters.

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventUuid` | `string` | Event identifier |
| `filters` | `Partial<ListTasksQuery>` | Optional: status, priority, category, assignedToUserId, limit, offset, sortBy, sortOrder |

**Returns:** `{ items: TaskResponse[], meta: { total, limit, offset } }`

**Stale time:** 30 seconds

---

### `useTask(eventUuid, taskUuid)`

Fetches a single task with its dependency list.

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventUuid` | `string` | Event identifier |
| `taskUuid` | `string \| undefined` | Task identifier (disabled when undefined) |

**Returns:** `TaskResponse | undefined`

---

### `useTaskSummary(eventUuid)`

Fetches task statistics for the summary bar.

**Returns:** `TaskSummaryResponse | undefined`

```typescript
interface TaskSummaryResponse {
  total: number;
  byStatus: { status: TaskStatus; count: number }[];
  byPriority: { priority: TaskPriority; count: number }[];
  overdueCount: number;
}
```

---

### `useTaskTemplates(eventUuid)`

Fetches available pre-built templates.

**Returns:** `TaskTemplateInfo[]`

**Stale time:** 10 minutes (static data)

---

## Mutation Hooks

All mutations invalidate relevant query caches on success.

### `useCreateTask(eventUuid)`

Creates a new task.

**Input:** `CreateTaskInput` (title, description?, category?, assignedToUserId?, dueDate?, priority?, sortOrder?)

**Invalidates:** `taskKeys.lists()`, `taskKeys.summary(eventUuid)`

---

### `useUpdateTask(eventUuid)`

Updates an existing task.

**Input:** `{ taskUuid: string, data: UpdateTaskInput }`

**Invalidates:** `taskKeys.lists()`, `taskKeys.summary(eventUuid)`. Also sets query data for the specific task detail.

---

### `useDeleteTask(eventUuid)`

Soft-deletes a task.

**Input:** `taskUuid: string`

**Invalidates:** `taskKeys.lists()`, `taskKeys.summary(eventUuid)`. Removes the task detail query.

---

### `useApplyTemplate(eventUuid)`

Bulk creates tasks from a template with an optional planning start date.

**Input:** `{ templateId: string, startDate?: string }`

When `startDate` is provided (ISO 8601 string), task due dates are computed forward from that date, capped at the event date. When omitted, due dates are computed backward from the event's stored `startDate`.

**Invalidates:** `taskKeys.lists()`, `taskKeys.summary(eventUuid)`

---

### `useDeleteTasksByCategory(eventUuid)`

Bulk soft-deletes all tasks in a category.

**Input:** `category: string`

**Invalidates:** `taskKeys.lists()`, `taskKeys.summary(eventUuid)`

---

### `useReorderTasks(eventUuid)`

Bulk updates sortOrder for multiple tasks.

**Input:** `{ uuid: string, sortOrder: number }[]`

**Invalidates:** `taskKeys.lists()`

---

### `useAddDependency(eventUuid)`

Adds a task dependency.

**Input:** `{ taskUuid: string, dependsOnTaskUuid: string }`

**Invalidates:** `taskKeys.lists()`, `taskKeys.details()`

---

### `useRemoveDependency(eventUuid)`

Removes a task dependency.

**Input:** `{ taskUuid: string, depUuid: string }`

**Invalidates:** `taskKeys.lists()`, `taskKeys.details()`

---

## Type Reference

```typescript
interface TaskResponse {
  uuid: string;
  title: string;
  description: string | null;
  category: string | null;
  assignedToUserId: string | null;
  assignedToName: string | null;
  dueDate: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  dependencyCount?: number;
  dependencies?: TaskDependencyResponse[];
}

interface TaskDependencyResponse {
  uuid: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface TaskTemplateInfo {
  id: string;
  name: string;
  description: string;
  taskCount: number;
  categories: string[];
}
```
