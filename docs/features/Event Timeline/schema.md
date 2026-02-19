# Event Timeline Database Schema

## Tables

### `tasks` (existing — many-to-one with events)

**File:** `backend/src/db/schema/events.ts`

Core task/checklist table. Already existed in the schema; no modifications needed.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | INTEGER PK | auto | Primary key |
| `uuid` | TEXT UNIQUE | — | Public-facing identifier |
| `event_id` | INTEGER FK | — | References `events.id` (cascade delete) |
| `title` | TEXT | — | Task title (required) |
| `description` | TEXT | null | Optional detailed description |
| `category` | TEXT | null | Grouping label (e.g., "Venue", "Catering") |
| `assigned_to_user_id` | TEXT FK | null | References `user.id` (set null on delete) |
| `due_date` | TIMESTAMP | null | When the task should be completed |
| `priority` | TEXT | `'medium'` | Enum: `low`, `medium`, `high` |
| `status` | TEXT | `'pending'` | Enum: `pending`, `in_progress`, `completed` |
| `completed_at` | TIMESTAMP | null | Auto-set when status changes to `completed` |
| `sort_order` | INTEGER | `0` | Manual ordering within category |
| `created_at` | TIMESTAMP | `unixepoch()` | Row creation time |
| `updated_at` | TIMESTAMP | `unixepoch()` | Last update time |
| `deleted_at` | TIMESTAMP | null | Soft delete timestamp |

**Indexes:**
- `idx_tasks_event_id` on `event_id`
- `idx_tasks_uuid` on `uuid`
- `idx_tasks_status` on `status`
- `idx_tasks_assigned_to` on `assigned_to_user_id`
- `tasks_uuid_unique` on `uuid`

---

### `task_dependencies` (new — many-to-many self-join on tasks)

**File:** `backend/src/db/schema/events.ts`

Tracks which tasks depend on (are blocked by) other tasks. Both foreign keys cascade delete, so removing a task automatically cleans up its dependency records.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | INTEGER PK | auto | Primary key |
| `task_id` | INTEGER FK | — | The task that has a dependency |
| `depends_on_task_id` | INTEGER FK | — | The task that must be completed first |
| `created_at` | TIMESTAMP | `unixepoch()` | Row creation time |

**Indexes:**
- `idx_task_deps_task_id` on `task_id`
- `idx_task_deps_depends_on` on `depends_on_task_id`
- `idx_task_deps_unique` — UNIQUE on `(task_id, depends_on_task_id)`

**Constraints:**
- Both FKs reference `tasks.id` with `ON DELETE CASCADE`
- Unique index prevents duplicate dependency entries
- Application-level check prevents self-referential dependencies (task depending on itself)

---

## Relations

**File:** `backend/src/db/schema/relations.ts`

```
tasks ←──── task_dependencies ────→ tasks
  │ dependencies (taskDependency)    │ dependents (taskDependent)
  │                                  │
  ├── event (events)                 
  └── assignedTo (user)              
```

### `tasksRelations`

| Relation | Type | Description |
|----------|------|-------------|
| `event` | one | Parent event |
| `assignedTo` | one | Assigned user (nullable) |
| `dependencies` | many | Tasks this task depends on (via `taskDependencies.taskId`) |
| `dependents` | many | Tasks that depend on this task (via `taskDependencies.dependsOnTaskId`) |

### `taskDependenciesRelations`

| Relation | Type | Description |
|----------|------|-------------|
| `task` | one | The dependent task |
| `dependsOn` | one | The blocking task |

---

## Migration

**File:** `backend/drizzle/0021_add_task_dependencies.sql`

```sql
CREATE TABLE `task_dependencies` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `task_id` integer NOT NULL REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  `depends_on_task_id` integer NOT NULL REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL
);
CREATE INDEX `idx_task_deps_task_id` ON `task_dependencies` (`task_id`);
CREATE INDEX `idx_task_deps_depends_on` ON `task_dependencies` (`depends_on_task_id`);
CREATE UNIQUE INDEX `idx_task_deps_unique` ON `task_dependencies` (`task_id`, `depends_on_task_id`);
```

---

## Types

**File:** `backend/src/db/types.ts`

```typescript
export type TaskDependency = InferSelectModel<typeof schema.taskDependencies>;
export type NewTaskDependency = InferInsertModel<typeof schema.taskDependencies>;
```

Existing types (unchanged): `Task`, `NewTask`, `TaskPriority`, `TaskStatus`.
