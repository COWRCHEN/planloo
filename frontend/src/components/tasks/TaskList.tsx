"use client";

import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TaskItem } from './TaskItem';
import type { TaskResponse } from '@/hooks/use-tasks';

interface TaskListProps {
  tasks: TaskResponse[];
  isLoading: boolean;
  onToggleComplete: (task: TaskResponse) => void;
  onEdit: (task: TaskResponse) => void;
  onDelete: (task: TaskResponse) => void;
  onDeleteCategory?: (category: string) => void;
  isDeletingCategory?: boolean;
}

export function TaskList({
  tasks,
  isLoading,
  onToggleComplete,
  onEdit,
  onDelete,
  onDeleteCategory,
  isDeletingCategory,
}: TaskListProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [categoryToDelete, setCategoryToDelete] = useState<{ name: string; count: number } | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, TaskResponse[]>();
    for (const task of tasks) {
      const cat = task.category || 'Uncategorized';
      const list = map.get(cat) ?? [];
      list.push(task);
      map.set(cat, list);
    }
    return map;
  }, [tasks]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handleConfirmDelete = () => {
    if (categoryToDelete && onDeleteCategory) {
      onDeleteCategory(categoryToDelete.name);
      setCategoryToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-4 text-muted-foreground/50"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
        <h3 className="text-lg font-medium">No tasks yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a task or apply a template to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([category, categoryTasks]) => {
          const isCollapsed = collapsedCategories.has(category);
          const completedCount = categoryTasks.filter((t) => t.status === 'completed').length;

          return (
            <div key={category}>
              <div className="mb-2 flex w-full items-center gap-2">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                  <span className="text-sm font-semibold">{category}</span>
                  <span className="text-xs text-muted-foreground">
                    {completedCount}/{categoryTasks.length}
                  </span>
                </button>
                {onDeleteCategory && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={isDeletingCategory}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoryToDelete({ name: category, count: categoryTasks.length });
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                    <span className="sr-only">Delete {category}</span>
                  </Button>
                )}
              </div>
              {!isCollapsed && (
                <div className="space-y-1.5 pl-1">
                  {categoryTasks.map((task) => (
                    <TaskItem
                      key={task.uuid}
                      task={task}
                      onToggleComplete={onToggleComplete}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => { if (!open) setCategoryToDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all {categoryToDelete?.count}{' '}
              {categoryToDelete?.count === 1 ? 'task' : 'tasks'} in{' '}
              <span className="font-medium">{categoryToDelete?.name}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
