import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type UniqueIdentifier,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { TaskResponse } from '@/hooks/use-tasks';
import { useReorderTasks, useUpdateTask } from '@/hooks/use-tasks';

interface UseDndTaskReorderOptions {
  tasks: TaskResponse[];
  eventUuid: string;
}

/**
 * Builds a category → sorted tasks Map from a flat task list.
 */
function groupAndSort(tasks: TaskResponse[]): Map<string, TaskResponse[]> {
  const map = new Map<string, TaskResponse[]>();
  for (const task of tasks) {
    const cat = task.category || 'Uncategorized';
    const list = map.get(cat) ?? [];
    list.push(task);
    map.set(cat, list);
  }
  // Sort each category by sortOrder so visual order is deterministic
  for (const [, list] of map) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return map;
}

/**
 * Find which category contains a given id (could be a task uuid or category droppable id).
 */
function resolveContainer(
  id: UniqueIdentifier,
  grouped: Map<string, TaskResponse[]>
): string | undefined {
  const idStr = String(id);
  // Check if it's a task uuid
  for (const [cat, tasks] of grouped) {
    if (tasks.some((t) => t.uuid === idStr)) return cat;
  }
  // Check if it's a category container droppable id (prefixed)
  if (idStr.startsWith('category:')) {
    const catName = idStr.slice('category:'.length);
    if (grouped.has(catName)) return catName;
  }
  return undefined;
}

export function useDndTaskReorder({ tasks, eventUuid }: UseDndTaskReorderOptions) {
  const [localTasks, setLocalTasks] = useState<TaskResponse[]>(tasks);
  const [activeTask, setActiveTask] = useState<TaskResponse | null>(null);
  const snapshotRef = useRef<TaskResponse[]>([]);
  // Prevents the sync effect from overwriting optimistic state right after drag ends
  const skipSyncRef = useRef(false);

  const reorderTasks = useReorderTasks(eventUuid);
  const updateTask = useUpdateTask(eventUuid);

  // Sync local state with server data — but skip immediately after a drag
  useEffect(() => {
    if (activeTask) return; // don't overwrite while dragging
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    setLocalTasks(tasks);
  }, [tasks, activeTask]);

  // Group tasks by category, sorted by sortOrder
  const grouped = useMemo(() => groupAndSort(localTasks), [localTasks]);

  // Category names for droppable container registration
  const categoryNames = useMemo(() => Array.from(grouped.keys()), [grouped]);

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = localTasks.find((t) => t.uuid === event.active.id);
      if (task) {
        snapshotRef.current = localTasks;
        setActiveTask(task);
      }
    },
    [localTasks]
  );

  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      const activeCategory = resolveContainer(active.id, grouped);
      const overCategory = resolveContainer(over.id, grouped);

      if (!activeCategory || !overCategory || activeCategory === overCategory) return;

      // Cross-container: move the task into the new category
      setLocalTasks((prev) => {
        const next = prev.map((t) =>
          t.uuid === activeId
            ? { ...t, category: overCategory === 'Uncategorized' ? null : overCategory }
            : t
        );
        return next;
      });
    },
    [grouped]
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Tell the sync effect to skip the next run so our optimistic update survives
      skipSyncRef.current = true;
      setActiveTask(null);

      if (!over) {
        setLocalTasks(snapshotRef.current);
        return;
      }

      const activeId = String(active.id);
      const overId = String(over.id);

      // Rebuild grouped from current state (includes any onDragOver changes)
      const currentGrouped = groupAndSort(localTasks);
      const activeCategory = resolveContainer(active.id, currentGrouped);
      const overCategory = resolveContainer(over.id, currentGrouped);

      if (!activeCategory || !overCategory) {
        setLocalTasks(snapshotRef.current);
        return;
      }

      // Determine if category actually changed from the original
      const originalCategory = (() => {
        for (const task of snapshotRef.current) {
          if (task.uuid === activeId) return task.category || 'Uncategorized';
        }
        return activeCategory;
      })();
      const categoryChanged = originalCategory !== activeCategory;
      // (activeCategory reflects the current container after onDragOver moves)

      // Reorder within the target container
      const categoryTasks = [...(currentGrouped.get(activeCategory) ?? [])];
      const oldIndex = categoryTasks.findIndex((t) => t.uuid === activeId);
      // overId is a task uuid or a container id
      const overIsTask = categoryTasks.some((t) => t.uuid === overId);
      const newIndex = overIsTask
        ? categoryTasks.findIndex((t) => t.uuid === overId)
        : categoryTasks.length - 1; // dropped on container itself → append

      let reorderedTasks: TaskResponse[];
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorderedTasks = arrayMove(categoryTasks, oldIndex, newIndex);
      } else {
        reorderedTasks = categoryTasks;
      }

      // Assign sequential sortOrders
      const sortOrderUpdates = reorderedTasks.map((t, i) => ({
        uuid: t.uuid,
        sortOrder: i,
      }));

      // Optimistically update local state with new sortOrders
      setLocalTasks((prev) => {
        const updated = prev.map((t) => {
          const upd = sortOrderUpdates.find((u) => u.uuid === t.uuid);
          return upd ? { ...t, sortOrder: upd.sortOrder } : t;
        });
        return updated;
      });

      // Persist to server
      const rollback = () => setLocalTasks(snapshotRef.current);

      if (categoryChanged) {
        const newCategoryValue = activeCategory === 'Uncategorized' ? null : activeCategory;
        updateTask.mutate(
          { taskUuid: activeId, data: { category: newCategoryValue } },
          {
            onSuccess: () => {
              // Fix sort orders in both old and new categories
              const allUpdates = [...sortOrderUpdates];

              const oldCatTasks = groupAndSort(snapshotRef.current)
                .get(originalCategory)
                ?.filter((t) => t.uuid !== activeId) ?? [];

              for (let i = 0; i < oldCatTasks.length; i++) {
                const t = oldCatTasks[i]!;
                if (!allUpdates.some((u) => u.uuid === t.uuid)) {
                  allUpdates.push({ uuid: t.uuid, sortOrder: i });
                }
              }

              if (allUpdates.length > 0) {
                reorderTasks.mutate(allUpdates, { onError: rollback });
              }
            },
            onError: rollback,
          }
        );
      } else if (oldIndex !== newIndex) {
        reorderTasks.mutate(sortOrderUpdates, { onError: rollback });
      }
    },
    [localTasks, reorderTasks, updateTask]
  );

  const onDragCancel = useCallback(() => {
    setActiveTask(null);
    setLocalTasks(snapshotRef.current);
  }, []);

  return {
    grouped,
    categoryNames,
    activeTask,
    sensors,
    collisionDetection: closestCorners,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
  };
}
