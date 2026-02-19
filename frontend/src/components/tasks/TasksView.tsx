"use client";

import { useState, useCallback } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useTasks,
  useTaskSummary,
  useUpdateTask,
  useDeleteTask,
  useDeleteTasksByCategory,
} from '@/hooks/use-tasks';
import type { TaskResponse, TaskStatus, TaskPriority } from '@/hooks/use-tasks';
import { TaskList } from './TaskList';
import { TaskTimeline } from './TaskTimeline';
import { TaskDialog } from './TaskDialog';
import { TemplatePickerDialog } from './TemplatePickerDialog';

interface TasksViewProps {
  eventUuid: string;
}

function TaskSummaryBar({ eventUuid }: { eventUuid: string }) {
  const { data: summary, isLoading } = useTaskSummary(eventUuid);

  if (isLoading) {
    return (
      <div className="flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-32 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const statusCount = (status: TaskStatus) =>
    summary.byStatus.find((s) => s.status === status)?.count ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-lg border bg-card p-3">
        <p className="text-2xl font-bold">{summary.total}</p>
        <p className="text-xs text-muted-foreground">Total Tasks</p>
      </div>
      <div className="rounded-lg border bg-card p-3">
        <p className="text-2xl font-bold text-emerald-600">{statusCount('completed')}</p>
        <p className="text-xs text-muted-foreground">Completed</p>
      </div>
      <div className="rounded-lg border bg-card p-3">
        <p className="text-2xl font-bold text-blue-600">{statusCount('in_progress')}</p>
        <p className="text-xs text-muted-foreground">In Progress</p>
      </div>
      <div className="rounded-lg border bg-card p-3">
        <p className="text-2xl font-bold text-destructive">{summary.overdueCount}</p>
        <p className="text-xs text-muted-foreground">Overdue</p>
      </div>
    </div>
  );
}

function TasksViewContent({ eventUuid }: TasksViewProps) {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskResponse | undefined>();

  const filters = {
    ...(statusFilter !== 'all' ? { status: statusFilter as TaskStatus } : {}),
    ...(priorityFilter !== 'all' ? { priority: priorityFilter as TaskPriority } : {}),
    limit: 200,
  };

  const { data: tasksData, isLoading } = useTasks(eventUuid, filters);
  const updateTask = useUpdateTask(eventUuid);
  const deleteTask = useDeleteTask(eventUuid);
  const deleteCategory = useDeleteTasksByCategory(eventUuid);

  const handleToggleComplete = useCallback(
    (task: TaskResponse) => {
      const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
      updateTask.mutate({ taskUuid: task.uuid, data: { status: newStatus } });
    },
    [updateTask]
  );

  const handleEdit = useCallback((task: TaskResponse) => {
    setEditingTask(task);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    (task: TaskResponse) => {
      deleteTask.mutate(task.uuid);
    },
    [deleteTask]
  );

  const handleDeleteCategory = useCallback(
    (category: string) => {
      deleteCategory.mutate(category);
    },
    [deleteCategory]
  );

  const handleNewTask = () => {
    setEditingTask(undefined);
    setDialogOpen(true);
  };

  const tasks = tasksData?.items ?? [];

  return (
    <div className="space-y-6">
      <TaskSummaryBar eventUuid={eventUuid} />

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleNewTask}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          New Task
        </Button>
        <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Apply Template
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as TaskStatus | 'all')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={priorityFilter}
            onValueChange={(val) => setPriorityFilter(val as TaskPriority | 'all')}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="checklist">
        <TabsList>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="checklist" className="mt-4">
          <TaskList
            tasks={tasks}
            isLoading={isLoading}
            onToggleComplete={handleToggleComplete}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDeleteCategory={handleDeleteCategory}
            isDeletingCategory={deleteCategory.isPending}
          />
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <TaskTimeline tasks={tasks} isLoading={isLoading} />
        </TabsContent>
      </Tabs>

      <TaskDialog
        eventUuid={eventUuid}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
      />
      <TemplatePickerDialog
        eventUuid={eventUuid}
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
      />
    </div>
  );
}

export function TasksView({ eventUuid }: TasksViewProps) {
  return (
    <QueryProvider>
      <TasksViewContent eventUuid={eventUuid} />
    </QueryProvider>
  );
}
