"use client";

import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { TaskResponse } from '@/hooks/use-tasks';

interface TaskTimelineProps {
  tasks: TaskResponse[];
  isLoading: boolean;
  eventStartDate?: string;
}

interface TimelineGroup {
  label: string;
  tasks: TaskResponse[];
  sortKey: number;
}

function getStatusColor(status: TaskResponse['status'], isOverdue: boolean) {
  if (isOverdue) return 'text-destructive';
  switch (status) {
    case 'completed':
      return 'text-emerald-600';
    case 'in_progress':
      return 'text-blue-600';
    default:
      return 'text-muted-foreground';
  }
}

function getStatusIcon(status: TaskResponse['status'], isOverdue: boolean) {
  if (isOverdue) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="8" y2="12" />
        <line x1="12" x2="12.01" y1="16" y2="16" />
      </svg>
    );
  }
  switch (status) {
    case 'completed':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
      );
    case 'in_progress':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

function groupTasksByTimePeriod(tasks: TaskResponse[]): TimelineGroup[] {
  const now = new Date();
  const groups = new Map<string, TimelineGroup>();

  const addToGroup = (label: string, task: TaskResponse, sortKey: number) => {
    const group = groups.get(label) ?? { label, tasks: [], sortKey };
    group.tasks.push(task);
    groups.set(label, group);
  };

  for (const task of tasks) {
    if (!task.dueDate) {
      addToGroup('No Due Date', task, 999);
      continue;
    }

    const dueDate = new Date(task.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (task.status !== 'completed' && daysUntilDue < 0) {
      addToGroup('Overdue', task, -1);
    } else if (daysUntilDue <= 7) {
      addToGroup('This Week', task, 0);
    } else if (daysUntilDue <= 30) {
      addToGroup('This Month', task, 1);
    } else if (daysUntilDue <= 90) {
      addToGroup('1–3 Months', task, 2);
    } else if (daysUntilDue <= 180) {
      addToGroup('3–6 Months', task, 3);
    } else if (daysUntilDue <= 365) {
      addToGroup('6–12 Months', task, 4);
    } else {
      addToGroup('12+ Months', task, 5);
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.sortKey - b.sortKey);
}

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return '';
  return new Date(dueDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function TaskTimeline({ tasks, isLoading, eventStartDate: _eventStartDate }: TaskTimelineProps) {
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }),
    [tasks]
  );

  const groups = useMemo(
    () => groupTasksByTimePeriod(sortedTasks),
    [sortedTasks]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
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
          <path d="M12 2v20" />
          <path d="M2 5h20" />
          <path d="M3 3v18" />
        </svg>
        <h3 className="text-lg font-medium">No tasks to show</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Tasks will appear here once created.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => {
        const completedCount = group.tasks.filter((t) => t.status === 'completed').length;
        const progressPercent = group.tasks.length > 0
          ? Math.round((completedCount / group.tasks.length) * 100)
          : 0;

        return (
          <div key={group.label}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className={cn(
                'text-sm font-semibold',
                group.label === 'Overdue' && 'text-destructive'
              )}>
                {group.label}
              </h3>
              <span className="text-xs text-muted-foreground">
                {completedCount}/{group.tasks.length} completed
              </span>
            </div>
            <Progress value={progressPercent} className="mb-4 h-2" />

            <div className="relative space-y-0">
              {group.tasks.map((task, index) => {
                const isOverdue =
                  task.status !== 'completed' &&
                  task.dueDate != null &&
                  new Date(task.dueDate) < new Date();
                const isLast = index === group.tasks.length - 1;

                return (
                  <div key={task.uuid} className="relative flex gap-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className={cn('shrink-0', getStatusColor(task.status, isOverdue))}>
                        {getStatusIcon(task.status, isOverdue)}
                      </div>
                      {!isLast && (
                        <div className="mt-1 w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            task.status === 'completed' && 'text-muted-foreground line-through'
                          )}
                        >
                          {task.title}
                        </span>
                        {task.status === 'completed' && (
                          <Badge variant="secondary" className="text-xs">Done</Badge>
                        )}
                        {task.status === 'in_progress' && (
                          <Badge variant="outline" className="border-blue-300 text-xs text-blue-700">In Progress</Badge>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                        {task.dueDate && (
                          <span className={cn(isOverdue && 'font-medium text-destructive')}>
                            {formatDueDate(task.dueDate)}
                          </span>
                        )}
                        {task.assignedToName && (
                          <span>{task.assignedToName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
