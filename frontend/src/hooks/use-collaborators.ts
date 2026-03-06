/**
 * Collaborators Hooks using TanStack Query
 *
 * Provides React hooks for event collaborator operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventKeys } from './use-events';
import { PlanLimitError } from '@/lib/api-error';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787/api/v1';

// ==================== TYPES ====================

export const COLLABORATOR_ROLES = ['owner', 'editor', 'viewer'] as const;

export type CollaboratorRole = (typeof COLLABORATOR_ROLES)[number];

export interface CollaboratorResponse {
  id: number;
  userId: string;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
  role: CollaboratorRole;
  invitedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

export interface InviteCollaboratorInput {
  email: string;
  role?: CollaboratorRole;
}

// Query keys
export const collaboratorKeys = {
  all: (eventUuid: string) => [...eventKeys.detail(eventUuid), 'collaborators'] as const,
};

// API Response types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Helper to handle API errors
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 402) {
      throw new PlanLimitError({
        code: data.error?.code ?? 'PLAN_LIMIT',
        message: data.error?.message ?? 'This feature requires a plan upgrade.',
        limit: data.error?.limit,
        current: data.error?.current,
        upgradeTo: data.error?.upgradeTo,
        upgradeUrl: data.error?.upgradeUrl ?? '/dashboard/billing',
      });
    }
    throw new Error(data.error?.message || 'Request failed');
  }
  return data;
}

// ==================== HOOKS ====================

export function useCollaborators(eventUuid: string) {
  return useQuery({
    queryKey: collaboratorKeys.all(eventUuid),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/collaborators`, {
        credentials: 'include',
      });
      const result = await handleResponse<CollaboratorResponse[]>(response);
      return result.data ?? [];
    },
    enabled: !!eventUuid,
    staleTime: 1000 * 60 * 5,
  });
}

export function useInviteCollaborator(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InviteCollaboratorInput) => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await handleResponse<CollaboratorResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaboratorKeys.all(eventUuid) });
    },
  });
}

export function useUpdateCollaboratorRole(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ collaboratorId, role }: { collaboratorId: number; role: CollaboratorRole }) => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/collaborators/${collaboratorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });
      const result = await handleResponse<CollaboratorResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaboratorKeys.all(eventUuid) });
    },
  });
}

export function useRemoveCollaborator(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (collaboratorId: number) => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/collaborators/${collaboratorId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await handleResponse<{ deleted: boolean }>(response);
      return collaboratorId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaboratorKeys.all(eventUuid) });
    },
  });
}
