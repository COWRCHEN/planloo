/**
 * Dashboard Hooks using TanStack Query
 *
 * Cross-event aggregation hooks for the dashboard:
 * - Recent activity feed
 * - Upcoming tasks/deadlines
 */

import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787/api/v1';

// ==================== TYPES ====================

export type ActivityType =
  | 'event_created'
  | 'event_updated'
  | 'task_created'
  | 'task_completed'
  | 'guest_added'
  | 'template_applied';

export interface ActivityItem {
  type: ActivityType;
  description: string;
  timestamp: string;
  eventUuid: string;
  eventTitle: string;
  entityUuid?: string;
}

export interface UpcomingTask {
  uuid: string;
  title: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress';
  eventUuid: string;
  eventTitle: string;
  isOverdue: boolean;
}

// ==================== QUERY KEYS ====================

export const dashboardKeys = {
  all: ['dashboard'] as const,
  activity: (limit: number) => [...dashboardKeys.all, 'activity', limit] as const,
  upcomingTasks: (limit: number) => [...dashboardKeys.all, 'upcoming-tasks', limit] as const,
};

// ==================== HELPERS ====================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Request failed');
  }
  return data;
}

// ==================== HOOKS ====================

export function useDashboardActivity(limit = 10) {
  return useQuery<ActivityItem[]>({
    queryKey: dashboardKeys.activity(limit),
    queryFn: async (): Promise<ActivityItem[]> => {
      const response = await fetch(`${API_URL}/dashboard/activity?limit=${limit}`, {
        credentials: 'include',
      });
      const result = await handleResponse<ActivityItem[]>(response);
      return result.data ?? [];
    },
    staleTime: 1000 * 60,
  });
}

export function useDashboardUpcomingTasks(limit = 10) {
  return useQuery<UpcomingTask[]>({
    queryKey: dashboardKeys.upcomingTasks(limit),
    queryFn: async (): Promise<UpcomingTask[]> => {
      const response = await fetch(`${API_URL}/dashboard/upcoming-tasks?limit=${limit}`, {
        credentials: 'include',
      });
      const result = await handleResponse<UpcomingTask[]>(response);
      return result.data ?? [];
    },
    staleTime: 1000 * 60,
  });
}
