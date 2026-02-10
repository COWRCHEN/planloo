/**
 * Email Log Hook using TanStack Query
 *
 * Provides a React hook for fetching event-scoped email history.
 */

import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787/api/v1';

// ==================== TYPES ====================

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

// ==================== QUERY KEYS ====================

export const emailLogKeys = {
  all: (eventUuid: string) => ['email-log', eventUuid] as const,
  list: (eventUuid: string, params: { limit: number; offset: number }) =>
    ['email-log', eventUuid, params] as const,
};

// ==================== HOOKS ====================

/**
 * Fetch paginated email log for a specific event.
 */
export function useEmailLog(eventUuid: string, params: { limit: number; offset: number }) {
  return useQuery({
    queryKey: emailLogKeys.list(eventUuid, params),
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        limit: String(params.limit),
        offset: String(params.offset),
      });
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/email-log?${searchParams}`,
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
