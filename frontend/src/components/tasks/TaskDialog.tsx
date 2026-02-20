"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCreateTask, useUpdateTask, useTask, useTasks, useAddDependency, useRemoveDependency } from '@/hooks/use-tasks';
import type { TaskResponse } from '@/hooks/use-tasks';
import { useCollaborators } from '@/hooks/use-collaborators';
import { useEvent } from '@/hooks/use-events';
import { useOrgMembers } from '@/hooks/use-organizations';
import { cn } from '@/lib/utils';

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.date().optional().nullable(),
  assignedToUserId: z.string().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskDialogProps {
  eventUuid: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskResponse | undefined;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  completed: 'default',
  in_progress: 'secondary',
  pending: 'outline',
};

export function TaskDialog({ eventUuid, open, onOpenChange, task }: TaskDialogProps) {
  const createTask = useCreateTask(eventUuid);
  const updateTask = useUpdateTask(eventUuid);
  const isEditing = !!task;
  const isPending = createTask.isPending || updateTask.isPending;

  // Fetch collaborators, event owner, and org members for assignee picker
  const { data: collaborators } = useCollaborators(eventUuid);
  const { data: event } = useEvent(eventUuid);
  const { data: orgMembers } = useOrgMembers(event?.organizationId ?? '');

  // Fetch task detail (for dependencies) only when editing
  const { data: taskDetail } = useTask(eventUuid, isEditing ? task?.uuid : undefined);

  // Fetch all tasks for dependency picker (only when editing)
  const { data: allTasksData } = useTasks(eventUuid, isEditing ? { limit: 200 } : undefined);

  // Dependency mutations
  const addDependency = useAddDependency(eventUuid);
  const removeDependency = useRemoveDependency(eventUuid);

  const [depPickerValue, setDepPickerValue] = useState('');

  // Build assignee options: owner + org members + collaborators (deduplicated)
  const assigneeOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { id: string; label: string }[] = [];

    if (event) {
      const ownerLabel = event.ownerName || event.ownerEmail || 'Owner';
      options.push({ id: event.userId, label: `${ownerLabel} (Owner)` });
      seen.add(event.userId);
    }

    // Add org members for organization-owned events
    if (orgMembers) {
      for (const m of orgMembers) {
        if (seen.has(m.userId)) continue;
        seen.add(m.userId);
        options.push({ id: m.userId, label: m.userName || m.userEmail });
      }
    }

    // Add event collaborators
    if (collaborators) {
      for (const c of collaborators) {
        if (seen.has(c.userId)) continue;
        seen.add(c.userId);
        options.push({ id: c.userId, label: c.userName || c.userEmail });
      }
    }

    return options;
  }, [event, collaborators, orgMembers]);

  // Dependencies from task detail
  const dependencies = taskDetail?.dependencies ?? [];

  // Available tasks for dependency picker (exclude self + already-added)
  const availableDeps = useMemo(() => {
    if (!allTasksData?.items || !task) return [];
    const depUuids = new Set(dependencies.map((d) => d.uuid));
    return allTasksData.items.filter(
      (t) => t.uuid !== task.uuid && !depUuids.has(t.uuid)
    );
  }, [allTasksData, task, dependencies]);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      priority: 'medium',
      dueDate: null,
      assignedToUserId: null,
    },
  });

  useEffect(() => {
    if (open && task) {
      form.reset({
        title: task.title,
        description: task.description ?? '',
        category: task.category ?? '',
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        assignedToUserId: task.assignedToUserId ?? null,
      });
    } else if (open) {
      form.reset({
        title: '',
        description: '',
        category: '',
        priority: 'medium',
        dueDate: null,
        assignedToUserId: null,
      });
    }
    setDepPickerValue('');
  }, [open, task, form]);

  const onSubmit = async (values: TaskFormValues) => {
    const payload = {
      title: values.title,
      description: values.description || null,
      category: values.category || null,
      priority: values.priority,
      dueDate: values.dueDate ?? null,
      assignedToUserId: values.assignedToUserId || null,
    };

    if (isEditing && task) {
      updateTask.mutate(
        { taskUuid: task.uuid, data: payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createTask.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const handleAddDependency = () => {
    if (!depPickerValue || !task) return;
    addDependency.mutate(
      { taskUuid: task.uuid, dependsOnTaskUuid: depPickerValue },
      { onSuccess: () => setDepPickerValue('') }
    );
  };

  const handleRemoveDependency = (depUuid: string) => {
    if (!task) return;
    removeDependency.mutate({ taskUuid: task.uuid, depUuid });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="What needs to be done?"
              disabled={isPending}
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Additional details..."
              rows={3}
              disabled={isPending}
              {...form.register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="e.g. Venue, Catering"
                disabled={isPending}
                {...form.register('category')}
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Controller
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Controller
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={isPending}
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
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
                          <path d="M8 2v4" />
                          <path d="M16 2v4" />
                          <rect width="18" height="18" x="3" y="4" rx="2" />
                          <path d="M3 10h18" />
                        </svg>
                        {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={(date) => field.onChange(date ?? null)}
                        initialFocus
                      />
                      {field.value && (
                        <div className="border-t p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => field.onChange(null)}
                          >
                            Clear date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Assign to</Label>
              <Controller
                control={form.control}
                name="assignedToUserId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? '__unassigned'}
                    onValueChange={(val) => field.onChange(val === '__unassigned' ? null : val)}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unassigned">Unassigned</SelectItem>
                      {assigneeOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>

        {/* Dependencies section - only shown when editing */}
        {isEditing && task && (
          <div className="space-y-3 border-t pt-4">
            <Label className="text-sm font-medium">Dependencies</Label>

            {dependencies.length > 0 ? (
              <ul className="space-y-2">
                {dependencies.map((dep) => (
                  <li key={dep.uuid} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{dep.title}</span>
                      <Badge variant={STATUS_VARIANT[dep.status] ?? 'outline'} className="shrink-0 text-xs">
                        {dep.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0"
                      disabled={removeDependency.isPending}
                      onClick={() => handleRemoveDependency(dep.uuid)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No dependencies</p>
            )}

            {availableDeps.length > 0 && (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    value={depPickerValue}
                    onValueChange={setDepPickerValue}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add dependency..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDeps.map((t) => (
                        <SelectItem key={t.uuid} value={t.uuid}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={!depPickerValue || addDependency.isPending}
                  onClick={handleAddDependency}
                >
                  Add
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
