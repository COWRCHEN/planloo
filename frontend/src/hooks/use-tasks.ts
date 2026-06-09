/**
 * Task Hooks using TanStack Query
 *
 * Provides React hooks for task/checklist operations with proper
 * caching, loading states, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AUTH_API_BASE_URL } from '@/lib/auth-client';

// ==================== ENUMS ====================

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export const TASK_STATUSES = ['pending', 'in_progress', 'completed'] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];

// ==================== TYPES ====================

export interface TaskLinkedProvider {
  linkId: number;
  name: string;
  category: string;
  bookingStatus: string;
}

export interface TaskLinkedVenue {
  linkId: number;
  name: string;
  bookingStatus: string;
}

export interface TaskResponse {
  uuid: string;
  title: string;
  description: string | null;
  category: string | null;
  assignedToUserId: string | null;
  assignedToName: string | null;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  dependencyCount?: number;
  dependencies?: TaskDependencyResponse[];
  linkedProvider: TaskLinkedProvider | null;
  linkedVenue: TaskLinkedVenue | null;
}

export interface TaskDependencyResponse {
  uuid: string;
  title: string;
  status: TaskStatus;
}

export interface TaskSummaryResponse {
  total: number;
  byStatus: { status: TaskStatus; count: number }[];
  byPriority: { priority: TaskPriority; count: number }[];
  overdueCount: number;
}

export interface TaskTemplateInfo {
  id: string;
  name: string;
  description: string;
  taskCount: number;
  categories: string[];
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  category?: string | null;
  assignedToUserId?: string | null;
  dueDate?: Date | null;
  priority?: TaskPriority;
  sortOrder?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  category?: string | null;
  assignedToUserId?: string | null;
  dueDate?: Date | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  sortOrder?: number;
  linkedEventProviderLinkId?: number | null;
  linkedEventVenueLinkId?: number | null;
}

export interface ListTasksQuery {
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  assignedToUserId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'title' | 'priority' | 'status' | 'dueDate' | 'sortOrder' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

const API_URL = AUTH_API_BASE_URL;

// ==================== QUERY KEYS ====================

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (eventUuid: string, filters?: Partial<ListTasksQuery>) =>
    [...taskKeys.lists(), eventUuid, filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (eventUuid: string, taskUuid: string) =>
    [...taskKeys.details(), eventUuid, taskUuid] as const,
  summary: (eventUuid: string) => [...taskKeys.all, 'summary', eventUuid] as const,
  templates: (eventUuid: string) => [...taskKeys.all, 'templates', eventUuid] as const,
};

// ==================== HELPERS ====================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { total: number; limit: number; offset: number };
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Request failed');
  }
  return data;
}

// ==================== QUERY HOOKS ====================

interface TasksQueryResult {
  items: TaskResponse[];
  meta: { total: number; limit: number; offset: number } | undefined;
}

export function useTasks(eventUuid: string, filters?: Partial<ListTasksQuery>) {
  return useQuery<TasksQueryResult>({
    queryKey: taskKeys.list(eventUuid, filters),
    queryFn: async (): Promise<TasksQueryResult> => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.priority) params.set('priority', filters.priority);
      if (filters?.category) params.set('category', filters.category);
      if (filters?.assignedToUserId) params.set('assignedToUserId', filters.assignedToUserId);
      if (filters?.limit) params.set('limit', filters.limit.toString());
      if (filters?.offset) params.set('offset', filters.offset.toString());
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);

      const url = `${API_URL}/events/${eventUuid}/tasks${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      const result = await handleResponse<TaskResponse[]>(response);
      return { items: result.data ?? [], meta: result.meta };
    },
    enabled: !!eventUuid,
    staleTime: 1000 * 30,
  });
}

export function useTask(eventUuid: string, taskUuid: string | undefined) {
  return useQuery<TaskResponse | undefined>({
    queryKey: taskKeys.detail(eventUuid, taskUuid ?? ''),
    queryFn: async (): Promise<TaskResponse | undefined> => {
      if (!taskUuid) throw new Error('Task UUID is required');
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/tasks/${taskUuid}`,
        { credentials: 'include' }
      );
      const result = await handleResponse<TaskResponse>(response);
      return result.data;
    },
    enabled: !!eventUuid && !!taskUuid,
    staleTime: 1000 * 30,
  });
}

export function useTaskSummary(eventUuid: string) {
  return useQuery<TaskSummaryResponse | undefined>({
    queryKey: taskKeys.summary(eventUuid),
    queryFn: async (): Promise<TaskSummaryResponse | undefined> => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/tasks/summary`,
        { credentials: 'include' }
      );
      const result = await handleResponse<TaskSummaryResponse>(response);
      return result.data;
    },
    enabled: !!eventUuid,
    staleTime: 1000 * 30,
  });
}

export function useTaskTemplates(eventUuid: string) {
  return useQuery<TaskTemplateInfo[]>({
    queryKey: taskKeys.templates(eventUuid),
    queryFn: async (): Promise<TaskTemplateInfo[]> => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/tasks/templates`,
        { credentials: 'include' }
      );
      const result = await handleResponse<TaskTemplateInfo[]>(response);
      return result.data ?? [];
    },
    enabled: !!eventUuid,
    staleTime: 1000 * 60 * 10,
  });
}

// ==================== MUTATION HOOKS ====================

export function useCreateTask(eventUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await handleResponse<TaskResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.summary(eventUuid) });
    },
  });
}

export function useUpdateTask(eventUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskUuid, data }: { taskUuid: string; data: UpdateTaskInput }) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/tasks/${taskUuid}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );
      const result = await handleResponse<TaskResponse>(response);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.summary(eventUuid) });
      if (data) {
        queryClient.setQueryData(taskKeys.detail(eventUuid, data.uuid), data);
      }
    },
  });
}

export function useDeleteTask(eventUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskUuid: string) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/tasks/${taskUuid}`,
        { method: 'DELETE', credentials: 'include' }
      );
      await handleResponse<{ deleted: boolean }>(response);
      return taskUuid;
    },
    onSuccess: (taskUuid) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.summary(eventUuid) });
      queryClient.removeQueries({ queryKey: taskKeys.detail(eventUuid, taskUuid) });
    },
  });
}

export function useApplyTemplate(eventUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, startDate }: { templateId: string; startDate?: string }) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/tasks/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ templateId, startDate }),
        }
      );
      const result = await handleResponse<{ created: number }>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.summary(eventUuid) });
    },
  });
}

export function useDeleteTasksByCategory(eventUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: string) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/tasks/bulk`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ category }),
        }
      );
      const result = await handleResponse<{ deleted: number }>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.summary(eventUuid) });
    },
  });
}

export function useReorderTasks(eventUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tasks: { uuid: string; sortOrder: number }[]) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/tasks/reorder`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ tasks }),
        }
      );
      await handleResponse<{ updated: number }>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useAddDependency(eventUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskUuid, dependsOnTaskUuid }: { taskUuid: string; dependsOnTaskUuid: string }) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/tasks/${taskUuid}/dependencies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ dependsOnTaskUuid }),
        }
      );
      await handleResponse<{ added: boolean }>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.details() });
    },
  });
}

export function useRemoveDependency(eventUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskUuid, depUuid }: { taskUuid: string; depUuid: string }) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/tasks/${taskUuid}/dependencies/${depUuid}`,
        { method: 'DELETE', credentials: 'include' }
      );
      await handleResponse<{ deleted: boolean }>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.details() });
    },
  });
}
