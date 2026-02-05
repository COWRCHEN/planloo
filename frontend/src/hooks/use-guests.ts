/**
 * Guests Hooks using TanStack Query
 *
 * Provides React hooks for guest operations with proper
 * caching, loading states, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787';

// ==================== TYPES ====================

export const GUEST_CATEGORIES = ['vip', 'family', 'friend', 'colleague', 'other'] as const;
export const RSVP_STATUSES = ['pending', 'confirmed', 'declined', 'maybe'] as const;

export type GuestCategory = (typeof GUEST_CATEGORIES)[number];
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export interface GuestResponse {
  id: number;
  uuid: string;
  eventId: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  category: GuestCategory | null;
  rsvpStatus: RsvpStatus;
  rsvpToken: string;
  rsvpRespondedAt: string | null;
  plusOnesAllowed: number;
  plusOnesCount: number;
  dietaryRestrictions: string | null;
  notes: string | null;
  checkedIn: boolean;
  checkedInAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuestStatsResponse {
  total: number;
  pending: number;
  confirmed: number;
  declined: number;
  maybe: number;
  checkedIn: number;
  totalPlusOnes: number;
}

export interface CreateGuestInput {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  category?: GuestCategory | null;
  plusOnesAllowed?: number;
  dietaryRestrictions?: string | null;
  notes?: string | null;
}

export interface UpdateGuestInput {
  firstName?: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  category?: GuestCategory | null;
  rsvpStatus?: RsvpStatus;
  plusOnesAllowed?: number;
  plusOnesCount?: number;
  dietaryRestrictions?: string | null;
  notes?: string | null;
}

export interface ListGuestsQuery {
  category?: GuestCategory;
  rsvpStatus?: RsvpStatus;
  search?: string;
  checkedIn?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'firstName' | 'lastName' | 'createdAt' | 'rsvpStatus';
  sortOrder?: 'asc' | 'desc';
}

export interface RsvpPageData {
  event: {
    uuid: string;
    title: string;
    description: string | null;
    eventType: string | null;
    startDate: string;
    endDate: string | null;
    timezone: string | null;
    locationName: string | null;
    locationAddress: string | null;
    locationCity: string | null;
    locationState: string | null;
    locationCountry: string | null;
    coverImageUrl: string | null;
  };
  guest: {
    firstName: string;
    lastName: string | null;
    email: string | null;
    rsvpStatus: RsvpStatus;
    rsvpRespondedAt: string | null;
    plusOnesAllowed: number;
    plusOnesCount: number;
    dietaryRestrictions: string | null;
  };
}

export interface RsvpSubmitInput {
  rsvpStatus: 'confirmed' | 'declined' | 'maybe';
  plusOnesCount?: number;
  dietaryRestrictions?: string | null;
}

// Query keys
export const guestKeys = {
  all: ['guests'] as const,
  lists: () => [...guestKeys.all, 'list'] as const,
  list: (eventUuid: string, filters?: Partial<ListGuestsQuery>) =>
    [...guestKeys.lists(), eventUuid, filters] as const,
  details: () => [...guestKeys.all, 'detail'] as const,
  detail: (eventUuid: string, guestUuid: string) =>
    [...guestKeys.details(), eventUuid, guestUuid] as const,
  stats: (eventUuid: string) => [...guestKeys.all, 'stats', eventUuid] as const,
};

export const rsvpKeys = {
  all: ['rsvp'] as const,
  detail: (token: string) => [...rsvpKeys.all, token] as const,
};

// API Response types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Array<{ row: number; message: string }>;
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

interface UseGuestsOptions {
  refetchInterval?: number | false | undefined;
}

interface GuestsQueryResult {
  guests: GuestResponse[];
  meta: { total: number; limit: number; offset: number } | undefined;
}

/**
 * Hook to fetch paginated list of guests for an event
 */
export function useGuests(
  eventUuid: string,
  filters?: Partial<ListGuestsQuery>,
  options?: UseGuestsOptions
) {
  const refetchInterval = options?.refetchInterval;

  return useQuery<GuestsQueryResult>({
    queryKey: guestKeys.list(eventUuid, filters),
    queryFn: async (): Promise<GuestsQueryResult> => {
      const params = new URLSearchParams();
      if (filters?.category) params.set('category', filters.category);
      if (filters?.rsvpStatus) params.set('rsvpStatus', filters.rsvpStatus);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.checkedIn !== undefined) params.set('checkedIn', String(filters.checkedIn));
      if (filters?.limit) params.set('limit', filters.limit.toString());
      if (filters?.offset) params.set('offset', filters.offset.toString());
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);

      const url = `${API_URL}/events/${eventUuid}/guests${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url, {
        credentials: 'include',
      });

      const result = await handleResponse<GuestResponse[]>(response);
      return {
        guests: result.data ?? [],
        meta: result.meta,
      };
    },
    enabled: !!eventUuid,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: refetchInterval ?? false,
  });
}

/**
 * Hook to fetch guest statistics for an event
 */
export function useGuestStats(eventUuid: string, options?: UseGuestsOptions) {
  const refetchInterval = options?.refetchInterval;

  return useQuery<GuestStatsResponse | undefined>({
    queryKey: guestKeys.stats(eventUuid),
    queryFn: async (): Promise<GuestStatsResponse | undefined> => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/guests/stats`, {
        credentials: 'include',
      });

      const result = await handleResponse<GuestStatsResponse>(response);
      return result.data;
    },
    enabled: !!eventUuid,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: refetchInterval ?? false,
  });
}

/**
 * Hook to fetch a single guest
 */
export function useGuest(eventUuid: string, guestUuid: string | undefined) {
  return useQuery({
    queryKey: guestKeys.detail(eventUuid, guestUuid ?? ''),
    queryFn: async () => {
      if (!guestUuid) throw new Error('Guest UUID is required');

      const response = await fetch(
        `${API_URL}/events/${eventUuid}/guests/${guestUuid}`,
        { credentials: 'include' }
      );

      const result = await handleResponse<GuestResponse>(response);
      return result.data;
    },
    enabled: !!eventUuid && !!guestUuid,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to create a new guest
 */
export function useCreateGuest(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateGuestInput) => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await handleResponse<GuestResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: guestKeys.stats(eventUuid) });
    },
  });
}

/**
 * Hook to update an existing guest
 */
export function useUpdateGuest(eventUuid: string, guestUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateGuestInput) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/guests/${guestUuid}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );

      const result = await handleResponse<GuestResponse>(response);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: guestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: guestKeys.stats(eventUuid) });
      if (data) {
        queryClient.setQueryData(guestKeys.detail(eventUuid, guestUuid), data);
      }
    },
  });
}

/**
 * Hook to delete a guest
 */
export function useDeleteGuest(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guestUuid: string) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/guests/${guestUuid}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      await handleResponse<{ deleted: boolean }>(response);
      return guestUuid;
    },
    onSuccess: (guestUuid) => {
      queryClient.invalidateQueries({ queryKey: guestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: guestKeys.stats(eventUuid) });
      queryClient.removeQueries({ queryKey: guestKeys.detail(eventUuid, guestUuid) });
    },
  });
}

/**
 * Hook to toggle guest check-in status
 */
export function useCheckInGuest(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guestUuid: string) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/guests/${guestUuid}/checkin`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      const result = await handleResponse<GuestResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: guestKeys.stats(eventUuid) });
    },
  });
}

/**
 * Hook to resend RSVP invitation
 */
export function useResendRsvp(eventUuid: string) {
  return useMutation({
    mutationFn: async (guestUuid: string) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/guests/${guestUuid}/resend-rsvp`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      const result = await handleResponse<{ sent: boolean; email: string }>(response);
      return result.data;
    },
  });
}

/**
 * Hook to import guests from CSV
 */
export function useImportGuests(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (csvContent: string) => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/guests/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        credentials: 'include',
        body: csvContent,
      });

      const result = await handleResponse<{ imported: number; total: number }>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: guestKeys.stats(eventUuid) });
    },
  });
}

/**
 * Hook to fetch RSVP page data (public, no auth)
 */
export function useRsvpData(token: string | undefined) {
  return useQuery({
    queryKey: rsvpKeys.detail(token ?? ''),
    queryFn: async () => {
      if (!token) throw new Error('RSVP token is required');

      const response = await fetch(`${API_URL}/rsvp/${token}`);
      const result = await handleResponse<RsvpPageData>(response);
      return result.data;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to submit RSVP response (public, no auth)
 */
export function useSubmitRsvp(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RsvpSubmitInput) => {
      const response = await fetch(`${API_URL}/rsvp/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await handleResponse<GuestResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rsvpKeys.detail(token) });
    },
  });
}

/**
 * Helper to build RSVP URL
 */
export function buildRsvpUrl(rsvpToken: string): string {
  const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';
  return `${siteUrl}/rsvp/${rsvpToken}`;
}

/**
 * Helper to export guests (triggers download)
 */
export async function exportGuests(eventUuid: string): Promise<void> {
  const response = await fetch(`${API_URL}/events/${eventUuid}/guests/export`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to export guests');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `guests-${eventUuid}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
