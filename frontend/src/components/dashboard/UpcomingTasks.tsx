/**
 * Upcoming Tasks Component
 *
 * Displays incomplete tasks with due dates across all the user's events,
 * sorted by due date. Highlights overdue tasks.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardUpcomingTasks, type UpcomingTask } from '@/hooks/use-dashboard';

const priorityStyles: Record<UpcomingTask['priority'], string> = {
  high: 'bg-red-100 text-red-700 hover:bg-red-100',
  medium: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  low: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
};

function formatDueDate(dateString: string, isOverdue: boolean): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (isOverdue) {
    const overdueDays = Math.abs(diffDays);
    if (overdueDays === 0) return 'Due today';
    if (overdueDays === 1) return '1 day overdue';
    return `${overdueDays} days overdue`;
  }

  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `Due in ${diffDays} days`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function TaskItemSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-5 w-14 rounded-full" />
    </div>
  );
}

interface TaskItemProps {
  task: UpcomingTask;
}

function TaskItem({ task }: TaskItemProps) {
  return (
    <a
      href={`/dashboard/events/${task.eventUuid}/tasks`}
      className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-muted/50 -mx-2 px-2 rounded-md"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{task.title}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={task.isOverdue ? 'font-medium text-destructive' : ''}>
            {formatDueDate(task.dueDate, task.isOverdue)}
          </span>
          <span>&middot;</span>
          <span className="truncate">{task.eventTitle}</span>
        </div>
      </div>
      <Badge variant="secondary" className={priorityStyles[task.priority]}>
        {task.priority}
      </Badge>
    </a>
  );
}

export function UpcomingTasks() {
  const { data: tasks, isLoading, error } = useDashboardUpcomingTasks(8);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Upcoming Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="divide-y">
            <TaskItemSkeleton />
            <TaskItemSkeleton />
            <TaskItemSkeleton />
            <TaskItemSkeleton />
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">Failed to load tasks</p>
        ) : tasks && tasks.length > 0 ? (
          <div className="divide-y">
            {tasks.map((task) => (
              <TaskItem key={task.uuid} task={task} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No upcoming tasks
          </p>
        )}
      </CardContent>
    </Card>
  );
}
