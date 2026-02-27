'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateTask } from '@/hooks/use-tasks';
import { useEventProviders, useEventVenues } from '@/hooks/use-providers';
import { cn } from '@/lib/utils';

interface TaskItemProps {
  task: TaskResponse;
  eventUuid: string;
  onToggleComplete: (task: TaskResponse) => void;
  onChangeStatus: (task: TaskResponse, status: TaskResponse['status']) => void;
  onEdit: (task: TaskResponse) => void;
  onDelete: (task: TaskResponse) => void;
  dragDisabled?: boolean;
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

function getStatusBadge(status: TaskResponse['status'], overdue: boolean) {
  return (
    <>
      {overdue && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          Overdue
        </span>
      )}
      {status === 'in_progress' && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          In Progress
        </span>
      )}
    </>
  );
}

function GripIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-muted-foreground/50"
    >
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}

const bookingStatusLabels: Record<string, string> = {
  inquiry: 'Inquiry',
  quoted: 'Quoted',
  booked: 'Booked',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function TaskItemContent({
  task,
  eventUuid,
  onToggleComplete,
  onChangeStatus,
  onEdit,
  onDelete,
  dragDisabled,
  dragHandleProps,
  isDragging,
}: TaskItemProps & {
  dragHandleProps?: Record<string, unknown> | undefined;
  isDragging?: boolean | undefined;
}) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('__none');
  const updateTask = useUpdateTask(eventUuid);
  const { data: eventProviders } = useEventProviders(eventUuid);
  const { data: eventVenues } = useEventVenues(eventUuid);

  const completed = task.status === 'completed';
  const dueDateFormatted = formatDueDate(task.dueDate);
  const overdue = isOverdue(task.dueDate, completed);
  const hasDependencies = (task.dependencyCount ?? 0) > 0;

  const handleLinkSave = () => {
    let linkedEventProviderLinkId: number | null = null;
    let linkedEventVenueLinkId: number | null = null;
    if (linkValue.startsWith('provider-')) {
      linkedEventProviderLinkId = parseInt(linkValue.slice('provider-'.length), 10);
    } else if (linkValue.startsWith('venue-')) {
      linkedEventVenueLinkId = parseInt(linkValue.slice('venue-'.length), 10);
    }
    updateTask.mutate(
      { taskUuid: task.uuid, data: { linkedEventProviderLinkId, linkedEventVenueLinkId } },
      { onSuccess: () => setLinkDialogOpen(false) }
    );
  };

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border bg-background px-4 py-3 transition-colors',
          'hover:bg-muted/50',
          isDragging && 'ring-primary/30 opacity-50 ring-2'
        )}
      >
        {!dragDisabled && (
          <button
            type="button"
            className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
            aria-label="Drag to reorder"
            {...dragHandleProps}
          >
            <GripIcon />
          </button>
        )}
        <Checkbox
          checked={completed}
          onCheckedChange={() => onToggleComplete(task)}
          aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
          className={cn(completed && 'data-[state=checked]:!text-emerald-500')}
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
            <span className="shrink-0 text-sm text-muted-foreground">{task.assignedToName}</span>
          )}
          {getStatusBadge(task.status, overdue)}
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
          {task.linkedProvider && (
            <a
              href={`/dashboard/events/${eventUuid}/providers`}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={e => e.stopPropagation()}
            >
              <span className="font-semibold text-foreground/70">Provider:</span>
              <span>{task.linkedProvider.name}</span>
              <span className="text-[10px] opacity-90">
                ·{' '}
                {bookingStatusLabels[task.linkedProvider.bookingStatus] ??
                  task.linkedProvider.bookingStatus}
              </span>
            </a>
          )}
          {task.linkedVenue && (
            <a
              href={`/dashboard/events/${eventUuid}/providers`}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={e => e.stopPropagation()}
            >
              <span className="font-semibold text-foreground/80">Venue:</span>
              <span>{task.linkedVenue.name}</span>
              <span className="text-[10px] opacity-90">
                ·{' '}
                {bookingStatusLabels[task.linkedVenue.bookingStatus] ??
                  task.linkedVenue.bookingStatus}
              </span>
            </a>
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
            {task.status !== 'in_progress' && (
              <DropdownMenuItem onClick={() => onChangeStatus(task, 'in_progress')}>
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
                  className="mr-2 text-blue-600"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M10 15V9l5 3-5 3z" />
                </svg>
                Mark as In Progress
              </DropdownMenuItem>
            )}
            {task.status === 'in_progress' && (
              <DropdownMenuItem onClick={() => onChangeStatus(task, 'pending')}>
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
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 9h6v6H9z" />
                </svg>
                Mark as Pending
              </DropdownMenuItem>
            )}
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
              onClick={() => {
                const current = task.linkedProvider
                  ? `provider-${task.linkedProvider.linkId}`
                  : task.linkedVenue
                    ? `venue-${task.linkedVenue.linkId}`
                    : '__none';
                setLinkValue(current);
                setLinkDialogOpen(true);
              }}
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
                <path d="M9 17H7A5 5 0 0 1 7 7h2" />
                <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
                <path d="M8 12h8" />
              </svg>
              Link Provider / Venue
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
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Link Provider / Venue</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Provider or Venue</Label>
            <Select value={linkValue} onValueChange={setLinkValue} disabled={updateTask.isPending}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">None</SelectItem>
                {eventProviders && eventProviders.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Providers</SelectLabel>
                    {eventProviders.map(link => (
                      <SelectItem key={`provider-${link.id}`} value={`provider-${link.id}`}>
                        {link.provider.businessName}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {eventVenues && eventVenues.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Venues</SelectLabel>
                    {eventVenues.map(link => (
                      <SelectItem key={`venue-${link.id}`} value={`venue-${link.id}`}>
                        {link.venue.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLinkDialogOpen(false)}
              disabled={updateTask.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleLinkSave} disabled={updateTask.isPending}>
              {updateTask.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TaskItem(props: TaskItemProps) {
  const { task, dragDisabled } = props;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.uuid,
    disabled: dragDisabled ?? false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskItemContent {...props} dragHandleProps={listeners} isDragging={isDragging} />
    </div>
  );
}

/** Static visual clone used inside DragOverlay */
export function TaskItemOverlay({ task }: { task: TaskResponse }) {
  const completed = task.status === 'completed';
  const dueDateFormatted = formatDueDate(task.dueDate);
  const overdue = isOverdue(task.dueDate, completed);
  const hasDependencies = (task.dependencyCount ?? 0) > 0;

  return (
    <div className="ring-primary/20 flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg ring-2">
      <span className="shrink-0 cursor-grabbing">
        <GripIcon />
      </span>
      <Checkbox
        checked={completed}
        disabled
        className={cn(completed && 'data-[state=checked]:!text-emerald-500')}
      />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className={cn('truncate font-medium', completed && 'text-muted-foreground line-through')}
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
          <span className="shrink-0 text-sm text-muted-foreground">{task.assignedToName}</span>
        )}
        {getStatusBadge(task.status, overdue)}
        {hasDependencies && (
          <span className="shrink-0 text-muted-foreground">
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
        {task.linkedProvider && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Provider:</span>
            <span>{task.linkedProvider.name}</span>
            <span className="text-[10px] opacity-70">
              ·{' '}
              {bookingStatusLabels[task.linkedProvider.bookingStatus] ??
                task.linkedProvider.bookingStatus}
            </span>
          </span>
        )}
        {task.linkedVenue && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Venue:</span>
            <span>{task.linkedVenue.name}</span>
            <span className="text-[10px] opacity-70">
              ·{' '}
              {bookingStatusLabels[task.linkedVenue.bookingStatus] ??
                task.linkedVenue.bookingStatus}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
