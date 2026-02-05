/**
 * Events Hooks using TanStack Query
 *
 * Provides React hooks for event operations with proper
 * caching, loading states, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787';

// ==================== TYPES ====================

export const EVENT_TYPES = ['wedding', 'birthday', 'corporate', 'conference', 'other'] as const;
export const EVENT_STATUSES = ['draft', 'planning', 'confirmed', 'completed', 'cancelled'] as const;

export type EventType = (typeof EVENT_TYPES)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];

export interface EventResponse {
  id: number;
  uuid: string;
  userId: string | null;
  organizationId: string | null;
  title: string;
  description: string | null;
  eventType: EventType | null;
  status: EventStatus;
  startDate: string;
  endDate: string | null;
  timezone: string | null;
  locationName: string | null;
  locationAddress: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationCountry: string | null;
  locationPostalCode: string | null;
  locationLat: number | null;
  locationLng: number | null;
  guestCountExpected: number | null;
  guestCountConfirmed: number | null;
  budgetTotal: number | null;
  budgetCurrency: string | null;
  isPublic: boolean;
  slug: string | null;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventStatsResponse {
  totalEvents: number;
  upcomingEvents: number;
  draftEvents: number;
  completedEvents: number;
  totalGuests: number;
  confirmedGuests: number;
}

export interface CreateEventInput {
  title: string;
  description?: string | null;
  eventType?: EventType | null;
  startDate: Date;
  endDate?: Date | null;
  timezone?: string;
  locationName?: string | null;
  locationAddress?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  locationCountry?: string | null;
  locationPostalCode?: string | null;
  guestCountExpected?: number | null;
  budgetTotal?: number | null;
  budgetCurrency?: string;
  isPublic?: boolean;
}

export interface UpdateEventInput {
  title?: string;
  description?: string | null;
  eventType?: EventType | null;
  status?: EventStatus;
  startDate?: Date;
  endDate?: Date | null;
  timezone?: string;
  locationName?: string | null;
  locationAddress?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  locationCountry?: string | null;
  locationPostalCode?: string | null;
  guestCountExpected?: number | null;
  budgetTotal?: number | null;
  budgetCurrency?: string;
  isPublic?: boolean;
  coverImageUrl?: string | null;
}

export interface ListEventsQuery {
  status?: EventStatus;
  eventType?: EventType;
  limit?: number;
  offset?: number;
  sortBy?: 'startDate' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

// Query keys
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters?: Partial<ListEventsQuery>) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (uuid: string) => [...eventKeys.details(), uuid] as const,
  stats: () => [...eventKeys.all, 'stats'] as const,
};

// API Response types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
}

// Helper to handle API errors
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Request failed');
  }
  return data;
}

/**
 * Hook to fetch paginated list of events
 */
export function useEvents(filters?: Partial<ListEventsQuery>) {
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.eventType) params.set('eventType', filters.eventType);
      if (filters?.limit) params.set('limit', filters.limit.toString());
      if (filters?.offset) params.set('offset', filters.offset.toString());
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);

      const url = `${API_URL}/events${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url, {
        credentials: 'include',
      });

      const result = await handleResponse<EventResponse[]>(response);
      return {
        events: result.data ?? [],
        meta: result.meta,
      };
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to fetch a single event by UUID
 */
export function useEvent(uuid: string | undefined) {
  return useQuery({
    queryKey: eventKeys.detail(uuid ?? ''),
    queryFn: async () => {
      if (!uuid) throw new Error('Event UUID is required');

      const response = await fetch(`${API_URL}/events/${uuid}`, {
        credentials: 'include',
      });

      const result = await handleResponse<EventResponse>(response);
      return result.data;
    },
    enabled: !!uuid,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to fetch dashboard statistics
 */
export function useEventStats() {
  return useQuery({
    queryKey: eventKeys.stats(),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/events/stats`, {
        credentials: 'include',
      });

      const result = await handleResponse<EventStatsResponse>(response);
      return result.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to create a new event
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEventInput) => {
      const response = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await handleResponse<EventResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.stats() });
    },
  });
}

/**
 * Hook to update an existing event
 */
export function useUpdateEvent(uuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateEventInput) => {
      const response = await fetch(`${API_URL}/events/${uuid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await handleResponse<EventResponse>(response);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.stats() });
      if (data) {
        queryClient.setQueryData(eventKeys.detail(uuid), data);
      }
    },
  });
}

/**
 * Hook to delete an event
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uuid: string) => {
      const response = await fetch(`${API_URL}/events/${uuid}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      await handleResponse<{ deleted: boolean }>(response);
      return uuid;
    },
    onSuccess: (uuid) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.stats() });
      queryClient.removeQueries({ queryKey: eventKeys.detail(uuid) });
    },
  });
}
