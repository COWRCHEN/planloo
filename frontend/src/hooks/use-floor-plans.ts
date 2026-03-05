/**
 * Floor Plans Hooks using TanStack Query
 *
 * Provides React hooks for floor plan CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { objectTemplateKeys } from './use-object-templates';
import { handleApiResponse } from '@/lib/api-error';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787/api/v1';

// ==================== TYPES ====================

export interface FloorPlanResponse {
  id: number;
  uuid: string;
  eventId: number;
  name: string;
  widthFt: number;
  heightFt: number;
  gridSnap: number;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SeatAssignmentResponse {
  id: number;
  seatNumber: number;
  guestId: number;
  guestUuid: string;
  guestFirstName: string;
  guestLastName: string | null;
  guestRsvpStatus: string | null;
  guestDietaryRestrictions: string | null;
}

export interface FloorPlanObjectResponse {
  id: number;
  uuid: string;
  floorPlanId: number;
  objectType: 'table' | 'element';
  tableShape: string | null;
  elementType: string | null;
  label: string;
  posX: number;
  posY: number;
  widthFt: number;
  heightFt: number;
  rotation: number;
  seatCount: number | null;
  seatTop: number | null;
  seatBottom: number | null;
  seatLeft: number | null;
  seatRight: number | null;
  tableNumber: number | null;
  style: string | null;
  isLocked: boolean;
  sortOrder: number;
  assignments: SeatAssignmentResponse[];
}

export interface FloorPlanDetailResponse extends FloorPlanResponse {
  objects: FloorPlanObjectResponse[];
}

export interface CreateFloorPlanInput {
  name: string;
  widthFt?: number;
  heightFt?: number;
  gridSnap?: number;
  isDefault?: boolean;
}

export interface UpdateFloorPlanInput {
  name?: string;
  widthFt?: number;
  heightFt?: number;
  gridSnap?: number;
  isDefault?: boolean;
  sortOrder?: number;
}

// ==================== QUERY KEYS ====================

export const floorPlanKeys = {
  all: (eventUuid: string) => ['floor-plans', eventUuid] as const,
  lists: (eventUuid: string) => [...floorPlanKeys.all(eventUuid), 'list'] as const,
  detail: (eventUuid: string, planUuid: string) => [...floorPlanKeys.all(eventUuid), 'detail', planUuid] as const,
  unassigned: (eventUuid: string, planUuid: string) => [...floorPlanKeys.all(eventUuid), 'unassigned', planUuid] as const,
  conflicts: (eventUuid: string, planUuid: string) => [...floorPlanKeys.all(eventUuid), 'conflicts', planUuid] as const,
};

// ==================== HOOKS ====================

/**
 * List floor plans for an event
 */
export function useFloorPlans(eventUuid: string) {
  return useQuery({
    queryKey: floorPlanKeys.lists(eventUuid),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/floor-plans`, {
        credentials: 'include',
      });
      const result = await handleApiResponse<FloorPlanResponse[]>(response);
      return result.data ?? [];
    },
    enabled: !!eventUuid,
    staleTime: 1000 * 60,
  });
}

/**
 * Get floor plan detail with objects and seat assignments
 */
export function useFloorPlan(eventUuid: string, planUuid: string | undefined) {
  return useQuery({
    queryKey: floorPlanKeys.detail(eventUuid, planUuid ?? ''),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/floor-plans/${planUuid}`, {
        credentials: 'include',
      });
      const result = await handleApiResponse<FloorPlanDetailResponse>(response);
      return result.data;
    },
    enabled: !!eventUuid && !!planUuid,
    staleTime: 1000 * 30,
  });
}

/**
 * Create a new floor plan
 */
export function useCreateFloorPlan(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFloorPlanInput) => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/floor-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await handleApiResponse<FloorPlanResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: floorPlanKeys.lists(eventUuid) });
    },
  });
}

/**
 * Update floor plan metadata
 */
export function useUpdateFloorPlan(eventUuid: string, planUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateFloorPlanInput) => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/floor-plans/${planUuid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await handleApiResponse<FloorPlanResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: floorPlanKeys.lists(eventUuid) });
      queryClient.invalidateQueries({ queryKey: floorPlanKeys.detail(eventUuid, planUuid) });
    },
  });
}

/**
 * Delete (soft) a floor plan
 */
export function useDeleteFloorPlan(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planUuid: string) => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/floor-plans/${planUuid}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await handleApiResponse<{ deleted: boolean }>(response);
      return planUuid;
    },
    onSuccess: (deletedPlanUuid) => {
      queryClient.invalidateQueries({ queryKey: floorPlanKeys.lists(eventUuid) });
      queryClient.removeQueries({ queryKey: floorPlanKeys.detail(eventUuid, deletedPlanUuid) });
      queryClient.removeQueries({ queryKey: floorPlanKeys.unassigned(eventUuid, deletedPlanUuid) });
      queryClient.removeQueries({ queryKey: floorPlanKeys.conflicts(eventUuid, deletedPlanUuid) });
      queryClient.removeQueries({ queryKey: objectTemplateKeys.all(eventUuid, deletedPlanUuid) });
    },
  });
}
