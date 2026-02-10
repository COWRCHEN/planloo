/**
 * Notification Settings Hooks using TanStack Query
 *
 * Provides React hooks for notification preferences with
 * caching, loading states, and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787/api/v1';

// ==================== TYPES ====================

export interface NotificationSettingsResponse {
  emailWelcome: boolean;
  emailRsvpReceived: boolean;
  emailRsvpInvitation: boolean;
  emailRsvpConfirmation: boolean;
  updatedAt: string;
}

export interface UpdateNotificationSettingsInput {
  emailWelcome?: boolean;
  emailRsvpReceived?: boolean;
  emailRsvpInvitation?: boolean;
  emailRsvpConfirmation?: boolean;
}

export type EmailType = 'verification' | 'password_reset' | 'welcome' | 'rsvp_invitation' | 'rsvp_confirmation';

export interface EmailLogEntry {
  id: number;
  recipientEmail: string;
  emailType: EmailType;
  subject: string;
  status: 'sent' | 'failed';
  errorMessage: string | null;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

interface PaginatedApiResponse<T> extends ApiResponse<T> {
  meta: { total: number; limit: number; offset: number };
}

// ==================== HELPERS ====================

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error((data as ApiResponse<T>).error?.message || 'Request failed');
  }
  return data as ApiResponse<T>;
}

// ==================== QUERY KEYS ====================

export const notificationSettingsKeys = {
  all: ['notification-settings'] as const,
  emailLog: (params: { limit: number; offset: number }) =>
    ['email-log', params] as const,
};

// ==================== HOOKS ====================

/**
 * Fetch notification settings for the current user.
 */
export function useNotificationSettings() {
  return useQuery({
    queryKey: notificationSettingsKeys.all,
    queryFn: async () => {
      const response = await fetch(`${API_URL}/me/notification-settings`, {
        credentials: 'include',
      });
      const result = await handleResponse<NotificationSettingsResponse>(response);
      return result.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Update notification settings with optimistic cache update.
 */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateNotificationSettingsInput) => {
      const response = await fetch(`${API_URL}/me/notification-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      });
      const result = await handleResponse<NotificationSettingsResponse>(response);
      return result.data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: notificationSettingsKeys.all });
      const previous = queryClient.getQueryData<NotificationSettingsResponse>(notificationSettingsKeys.all);
      if (previous) {
        queryClient.setQueryData<NotificationSettingsResponse>(notificationSettingsKeys.all, {
          ...previous,
          ...input,
        });
      }
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationSettingsKeys.all, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationSettingsKeys.all });
    },
  });
}

/**
 * Fetch paginated email log for the current user.
 */
export function useEmailLog(params: { limit: number; offset: number }) {
  return useQuery({
    queryKey: notificationSettingsKeys.emailLog(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        limit: String(params.limit),
        offset: String(params.offset),
      });
      const response = await fetch(
        `${API_URL}/me/notification-settings/email-log?${searchParams}`,
        { credentials: 'include' }
      );
      const result = (await response.json()) as PaginatedApiResponse<EmailLogEntry[]>;
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch email log');
      }
      return { items: result.data, meta: result.meta };
    },
    staleTime: 1000 * 60 * 2,
  });
}
