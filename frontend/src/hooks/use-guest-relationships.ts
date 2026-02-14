/**
 * Guest Relationships Hooks using TanStack Query
 *
 * Provides React hooks for managing guest social mapping
 * (prefer_together / avoid pairs).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787/api/v1';

// ==================== TYPES ====================

export interface GuestRelationshipResponse {
  id: number;
  relationshipType: 'prefer_together' | 'avoid';
  notes: string | null;
  guest1: { uuid: string; firstName: string; lastName: string | null } | null;
  guest2: { uuid: string; firstName: string; lastName: string | null } | null;
}

export interface CreateRelationshipInput {
  guestUuid1: string;
  guestUuid2: string;
  relationshipType: 'prefer_together' | 'avoid';
  notes?: string | undefined;
}

// ==================== QUERY KEYS ====================

export const relationshipKeys = {
  all: (eventUuid: string) => ['guest-relationships', eventUuid] as const,
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

/**
 * List all guest relationships for an event
 */
export function useGuestRelationships(eventUuid: string) {
  return useQuery({
    queryKey: relationshipKeys.all(eventUuid),
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/floor-plans/relationships`,
        { credentials: 'include' }
      );
      const result = await handleResponse<GuestRelationshipResponse[]>(response);
      return result.data ?? [];
    },
    enabled: !!eventUuid,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Create a guest relationship
 */
export function useCreateRelationship(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRelationshipInput) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/floor-plans/relationships`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );
      const result = await handleResponse<GuestRelationshipResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: relationshipKeys.all(eventUuid) });
    },
  });
}

/**
 * Delete a guest relationship
 */
export function useDeleteRelationship(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (relationshipId: number) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/floor-plans/relationships/${relationshipId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      await handleResponse<{ deleted: boolean }>(response);
      return relationshipId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: relationshipKeys.all(eventUuid) });
    },
  });
}
