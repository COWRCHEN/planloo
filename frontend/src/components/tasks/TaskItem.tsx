"use client";

import type { TaskResponse } from '@/hooks/use-tasks';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface TaskItemProps {
  task: TaskResponse;
  onToggleComplete: (task: TaskResponse) => void;
  onEdit: (task: TaskResponse) => void;
  onDelete: (task: TaskResponse) => void;
}

function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

function getPriorityBadgeVariant(
  priority: TaskResponse['priority']
): React.ComponentProps<typeof Badge>['variant'] {
  switch (priority) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'outline';
    case 'low':
      return 'secondary';
    default:
      return 'secondary';
  }
}

function getPriorityBadgeClassName(priority: TaskResponse['priority']): string {
  if (priority === 'medium') {
    return 'bg-warning-100 text-warning-700 border-warning-300';
  }
  return '';
}

function isOverdue(dueDate: string | null, completed: boolean): boolean {
  if (!dueDate || completed) return false;
  return new Date(dueDate) < new Date();
}

export function TaskItem({ task, onToggleComplete, onEdit, onDelete }: TaskItemProps) {
  const completed = task.status === 'completed';
  const dueDateFormatted = formatDueDate(task.dueDate);
  const overdue = isOverdue(task.dueDate, completed);
  const hasDependencies = (task.dependencyCount ?? 0) > 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
        'hover:bg-muted/50'
      )}
    >
      <Checkbox
        checked={completed}
        onCheckedChange={() => onToggleComplete(task)}
        aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
      />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className={cn(
            'truncate font-medium',
            completed && 'text-muted-foreground line-through'
          )}
        >
          {task.title}
        </span>
        <Badge
          variant={getPriorityBadgeVariant(task.priority)}
          className={cn('shrink-0 capitalize', getPriorityBadgeClassName(task.priority))}
        >
          {task.priority}
        </Badge>
        {dueDateFormatted && (
          <span
            className={cn(
              'shrink-0 text-sm',
              overdue ? 'font-medium text-destructive' : 'text-muted-foreground'
            )}
          >
            {dueDateFormatted}
          </span>
        )}
        {task.assignedToName && (
          <span className="shrink-0 text-sm text-muted-foreground">
            {task.assignedToName}
          </span>
        )}
        {hasDependencies && (
          <span
            className="shrink-0 text-muted-foreground"
            title={`${task.dependencyCount} dependenc${(task.dependencyCount ?? 0) === 1 ? 'y' : 'ies'}`}
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
              className="inline-block"
            >
              <path d="M9 17H7A5 5 0 0 1 7 7h2" />
              <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
              <path d="M8 12h8" />
            </svg>
          </span>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(task)}>
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
              className="mr-2"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(task)}
            className="text-destructive focus:text-destructive"
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
              className="mr-2"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" x2="10" y1="11" y2="17" />
              <line x1="14" x2="14" y1="11" y2="17" />
            </svg>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
