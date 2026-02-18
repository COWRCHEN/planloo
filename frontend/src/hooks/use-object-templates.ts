/**
 * Object Templates Hooks using TanStack Query
 *
 * Provides React hooks for CRUD operations on reusable
 * table/element templates scoped per event.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787/api/v1';

// ==================== TYPES ====================

export interface ObjectTemplate {
  id: number;
  uuid: string;
  eventId: number;
  objectType: 'table' | 'element';
  tableShape: string | null;
  elementType: string | null;
  label: string;
  widthFt: number;
  heightFt: number;
  seatCount: number | null;
  seatTop: number | null;
  seatBottom: number | null;
  seatLeft: number | null;
  seatRight: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  objectType: 'table' | 'element';
  tableShape?: string;
  elementType?: string;
  label: string;
  widthFt: number;
  heightFt: number;
  seatCount?: number;
  seatTop?: number;
  seatBottom?: number;
  seatLeft?: number;
  seatRight?: number;
  sortOrder?: number;
}

export interface UpdateTemplateInput {
  label?: string;
  widthFt?: number;
  heightFt?: number;
  seatCount?: number;
  seatTop?: number;
  seatBottom?: number;
  seatLeft?: number;
  seatRight?: number;
  sortOrder?: number;
}

// ==================== QUERY KEYS ====================

export const objectTemplateKeys = {
  all: (eventUuid: string) => ['object-templates', eventUuid] as const,
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
 * List all object templates for an event (auto-seeds defaults on first call)
 */
export function useObjectTemplates(eventUuid: string | undefined) {
  return useQuery({
    queryKey: objectTemplateKeys.all(eventUuid ?? ''),
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/object-templates`,
        { credentials: 'include' }
      );
      const result = await handleResponse<ObjectTemplate[]>(response);
      return result.data ?? [];
    },
    enabled: !!eventUuid,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Create a new object template
 */
export function useCreateTemplate(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTemplateInput) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/object-templates`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );
      const result = await handleResponse<ObjectTemplate>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: objectTemplateKeys.all(eventUuid) });
    },
  });
}

/**
 * Update an existing object template
 */
export function useUpdateTemplate(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateUuid, data }: { templateUuid: string; data: UpdateTemplateInput }) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/object-templates/${templateUuid}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );
      const result = await handleResponse<ObjectTemplate>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: objectTemplateKeys.all(eventUuid) });
    },
  });
}

/**
 * Delete an object template
 */
export function useDeleteTemplate(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateUuid: string) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/object-templates/${templateUuid}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      await handleResponse<{ deleted: boolean }>(response);
      return templateUuid;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: objectTemplateKeys.all(eventUuid) });
    },
  });
}
