/**
 * Floor Plan Objects Hooks using TanStack Query
 *
 * Provides React hooks for object CRUD, seat assignments,
 * auto-assign, unassigned guests, and conflict detection.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { floorPlanKeys, type FloorPlanObjectResponse } from './use-floor-plans';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787/api/v1';

// ==================== TYPES ====================

export interface CreateObjectInput {
  objectType: 'table' | 'element';
  tableShape?: string | undefined;
  elementType?: string | undefined;
  label: string;
  posX?: number | undefined;
  posY?: number | undefined;
  widthFt?: number | undefined;
  heightFt?: number | undefined;
  rotation?: number | undefined;
  seatCount?: number | undefined;
  seatTop?: number | undefined;
  seatBottom?: number | undefined;
  seatLeft?: number | undefined;
  seatRight?: number | undefined;
  style?: string | undefined;
}

export interface UpdateObjectInput {
  label?: string;
  posX?: number;
  posY?: number;
  widthFt?: number;
  heightFt?: number;
  rotation?: number;
  seatCount?: number;
  seatTop?: number;
  seatBottom?: number;
  seatLeft?: number;
  seatRight?: number;
  tableShape?: string;
  elementType?: string;
  style?: string;
  isLocked?: boolean;
  tableNumber?: number;
}

export interface BulkPositionUpdate {
  uuid: string;
  posX: number;
  posY: number;
  rotation?: number;
}

export interface AssignGuestInput {
  guestUuid: string;
  seatNumber: number;
}

export interface UnassignedGuestResponse {
  id: number;
  uuid: string;
  firstName: string;
  lastName: string | null;
  rsvpStatus: string | null;
  dietaryRestrictions: string | null;
  category: string | null;
}

export interface ConflictResponse {
  type: string;
  message: string;
  objectUuid?: string;
  guestUuids?: string[];
}

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

// ==================== OBJECT CRUD ====================

/**
 * Create a new object (table or element) on the floor plan
 */
export function useCreateObject(eventUuid: string, planUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateObjectInput) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/floor-plans/${planUuid}/objects`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );
      const result = await handleResponse<FloorPlanObjectResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: floorPlanKeys.detail(eventUuid, planUuid) });
    },
  });
}

/**
 * Update a single object
 */
export function useUpdateObject(eventUuid: string, planUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ objectUuid, data }: { objectUuid: string; data: UpdateObjectInput }) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/floor-plans/${planUuid}/objects/${objectUuid}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );
      const result = await handleResponse<FloorPlanObjectResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: floorPlanKeys.detail(eventUuid, planUuid) });
    },
  });
}

/**
 * Delete an object
 */
export function useDeleteObject(eventUuid: string, planUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objectUuid: string) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/floor-plans/${planUuid}/objects/${objectUuid}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      await handleResponse<{ deleted: boolean }>(response);
      return objectUuid;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: floorPlanKeys.detail(eventUuid, planUuid) });
      queryClient.invalidateQueries({ queryKey: floorPlanKeys.unassigned(eventUuid, planUuid) });
    },
  });
}

/**
 * Bulk update positions after drag (debounced)
 */
export function useBulkUpdatePositions(eventUuid: string, planUuid: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<BulkPositionUpdate[]>([]);

  const mutation = useMutation({
    mutationFn: async (updates: BulkPositionUpdate[]) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/floor-plans/${planUuid}/objects/bulk-positions`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ updates }),
        }
      );
      const result = await handleResponse<{ updated: number }>(response);
      return result.data;
    },
  });

  const debouncedSave = useCallback(
    (update: BulkPositionUpdate) => {
      // Replace existing entry for same uuid or add new
      const idx = pendingRef.current.findIndex((u) => u.uuid === update.uuid);
      if (idx >= 0) {
        pendingRef.current[idx] = update;
      } else {
        pendingRef.current.push(update);
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const updates = [...pendingRef.current];
        pendingRef.current = [];
        if (updates.length > 0) {
          mutation.mutate(updates);
        }
      }, 1000);
    },
    [mutation]
  );

  return { debouncedSave, ...mutation };
}

// ==================== SEAT ASSIGNMENTS ====================

/**
 * Assign guest(s) to specific seats
 */
export function useAssignGuest(eventUuid: string, planUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ objectUuid, assignments }: { objectUuid: string; assignments: AssignGuestInput[] }) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/floor-plans/${planUuid}/objects/${objectUuid}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ assignments }),
        }
      );
      const result = await handleResponse<{ assigned: number }>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: floorPlanKeys.detail(eventUuid, planUuid) });
      queryClient.invalidateQueries({ queryKey: floorPlanKeys.unassigned(eventUuid, planUuid) });
      queryClient.invalidateQueries({ queryKey: floorPlanKeys.conflicts(eventUuid, planUuid) });
    },
  });
}

/**
 * Unassign a guest from a seat
 */
export function useUnassignGuest(eventUuid: string, planUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ objectUuid, guestUuid }: { objectUuid: string; guestUuid: string }) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/floor-plans/${planUuid}/objects/${objectUuid}/assign/${guestUuid}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      await handleResponse<{ unassigned: boolean }>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: floorPlanKeys.detail(eventUuid, planUuid) });
      queryClient.invalidateQueries({ queryKey: floorPlanKeys.unassigned(eventUuid, planUuid) });
      queryClient.invalidateQueries({ queryKey: floorPlanKeys.conflicts(eventUuid, planUuid) });
    },
  });
}

/**
 * Auto-assign selected guests to available seats
 */
export function useAutoAssign(eventUuid: string, planUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guestUuids: string[]) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/floor-plans/${planUuid}/auto-assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ guestUuids }),
        }
      );
      const result = await handleResponse<{
        assigned: number;
        totalRequested: number;
        availableSeatsRemaining: number;
      }>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: floorPlanKeys.detail(eventUuid, planUuid) });
      queryClient.invalidateQueries({ queryKey: floorPlanKeys.unassigned(eventUuid, planUuid) });
      queryClient.invalidateQueries({ queryKey: floorPlanKeys.conflicts(eventUuid, planUuid) });
    },
  });
}

// ==================== UNASSIGNED GUESTS ====================

/**
 * Get guests not assigned in this plan
 */
export function useUnassignedGuests(eventUuid: string, planUuid: string | undefined) {
  return useQuery({
    queryKey: floorPlanKeys.unassigned(eventUuid, planUuid ?? ''),
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/floor-plans/${planUuid}/unassigned-guests`,
        { credentials: 'include' }
      );
      const result = await handleResponse<UnassignedGuestResponse[]>(response);
      return result.data ?? [];
    },
    enabled: !!eventUuid && !!planUuid,
    staleTime: 1000 * 30,
  });
}

// ==================== CONFLICTS ====================

/**
 * Check for over-capacity tables and avoid-pair violations
 */
export function useConflicts(eventUuid: string, planUuid: string | undefined) {
  return useQuery({
    queryKey: floorPlanKeys.conflicts(eventUuid, planUuid ?? ''),
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/floor-plans/${planUuid}/conflicts`,
        { credentials: 'include' }
      );
      const result = await handleResponse<ConflictResponse[]>(response);
      return result.data ?? [];
    },
    enabled: !!eventUuid && !!planUuid,
    staleTime: 1000 * 30,
  });
}
