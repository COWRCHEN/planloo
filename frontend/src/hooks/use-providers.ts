/**
 * Provider & Venue Hooks using TanStack Query
 *
 * Provides React hooks for provider/venue directory and event-scoped
 * linking operations with proper caching, loading states, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ==================== ENUMS ====================

export const PROVIDER_CATEGORIES = ['catering', 'photography', 'dj', 'florist', 'venue', 'decoration', 'other'] as const;
export const PRICE_RANGES = ['$$', '$$$', '$$$$'] as const;
export const VENUE_TYPES = ['banquet_hall', 'outdoor', 'hotel', 'restaurant', 'conference_center', 'other'] as const;
export const BOOKING_STATUSES = ['inquiry', 'quoted', 'booked', 'confirmed', 'completed', 'cancelled'] as const;

export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number];
export type PriceRange = (typeof PRICE_RANGES)[number];
export type VenueType = (typeof VENUE_TYPES)[number];
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// ==================== TYPES ====================

export interface ServiceProviderResponse {
  uuid: string;
  businessName: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  category: ProviderCategory;
  description: string | null;
  servicesOffered: string[] | null;
  priceRange: PriceRange | null;
  locationAddress: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationCountry: string | null;
  locationPostalCode: string | null;
  ratingAverage: number;
  ratingCount: number;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RatingBreakdown {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface VenueReviewItem {
  id: number;
  userName: string;
  rating: number | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VenueReviewsResult {
  reviews: VenueReviewItem[];
  breakdown: RatingBreakdown;
  meta: { total: number; limit: number; offset: number };
}

export interface VenueResponse {
  uuid: string;
  name: string;
  description: string | null;
  venueType: VenueType | null;
  address: string;
  city: string;
  state: string | null;
  country: string;
  postalCode: string | null;
  capacityMin: number | null;
  capacityMax: number | null;
  pricePerHour: number | null;
  pricePerDay: number | null;
  currency: string;
  amenities: string[] | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  ratingAverage: number;
  ratingCount: number;
  ratingBreakdown: RatingBreakdown | null;
  isOwner: boolean;
  userRating: number | null;
  userComment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityCheckResult {
  available: boolean;
  conflictCount: number;
  date: string;
}

export interface EventServiceProviderResponse {
  id: number;
  status: BookingStatus;
  quoteAmount: number | null;
  finalAmount: number | null;
  currency: string;
  contractUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  provider: ServiceProviderResponse;
}

export interface EventVenueResponse {
  id: number;
  status: BookingStatus;
  bookingDate: string | null;
  quoteAmount: number | null;
  finalAmount: number | null;
  currency: string;
  depositAmount: number | null;
  depositPaid: boolean;
  contractUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  venue: VenueResponse;
}

export interface CreateProviderInput {
  businessName: string;
  contactName?: string | null;
  email: string;
  phone?: string | null;
  website?: string | null;
  category: ProviderCategory;
  description?: string | null;
  servicesOffered?: string[] | null;
  priceRange?: PriceRange | null;
  locationAddress: string;
  locationCity: string;
  locationState: string;
  locationCountry: string;
  locationPostalCode: string;
}

export interface UpdateProviderInput {
  businessName?: string;
  contactName?: string | null;
  email?: string;
  phone?: string | null;
  website?: string | null;
  category?: ProviderCategory;
  description?: string | null;
  servicesOffered?: string[] | null;
  priceRange?: PriceRange | null;
  locationAddress?: string;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
  locationPostalCode?: string;
}

export interface CreateVenueInput {
  name: string;
  description?: string | null;
  venueType?: VenueType | null;
  address: string;
  city: string;
  state?: string | null;
  country: string;
  postalCode?: string | null;
  capacityMin?: number | null;
  capacityMax?: number | null;
  pricePerHour?: number | null;
  pricePerDay?: number | null;
  currency?: string;
  amenities?: string[] | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
}

export interface UpdateVenueInput {
  name?: string;
  description?: string | null;
  venueType?: VenueType | null;
  address?: string;
  city?: string;
  state?: string | null;
  country?: string;
  postalCode?: string | null;
  capacityMin?: number | null;
  capacityMax?: number | null;
  pricePerHour?: number | null;
  pricePerDay?: number | null;
  currency?: string;
  amenities?: string[] | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
}

export interface ListProvidersQuery {
  search?: string;
  category?: ProviderCategory;
  priceRange?: PriceRange;
  city?: string;
  state?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'businessName' | 'ratingAverage' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ListVenuesQuery {
  search?: string;
  venueType?: VenueType;
  city?: string;
  state?: string;
  country?: string;
  capacityMin?: number;
  priceMax?: number;
  amenities?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'ratingAverage' | 'capacityMax' | 'pricePerDay' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface NearbyQuery {
  city?: string;
  postalCode?: string;
  country?: string;
  category?: ProviderCategory;
  venueType?: VenueType;
  limit?: number;
}

export interface LinkProviderInput {
  providerUuid: string;
  status?: BookingStatus;
  quoteAmount?: number | null;
  currency?: string;
  notes?: string | null;
}

export interface UpdateEventProviderInput {
  status?: BookingStatus;
  quoteAmount?: number | null;
  finalAmount?: number | null;
  currency?: string;
  contractUrl?: string | null;
  notes?: string | null;
}

export interface LinkVenueInput {
  venueUuid: string;
  status?: BookingStatus;
  bookingDate?: Date | null;
  quoteAmount?: number | null;
  currency?: string;
  notes?: string | null;
}

export interface UpdateEventVenueInput {
  status?: BookingStatus;
  bookingDate?: Date | null;
  quoteAmount?: number | null;
  finalAmount?: number | null;
  currency?: string;
  depositAmount?: number | null;
  depositPaid?: boolean;
  contractUrl?: string | null;
  notes?: string | null;
}

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787/api/v1';

// ==================== QUERY KEYS ====================

export const providerKeys = {
  all: ['providers'] as const,
  lists: () => [...providerKeys.all, 'list'] as const,
  list: (filters?: Partial<ListProvidersQuery>) => [...providerKeys.lists(), filters] as const,
  details: () => [...providerKeys.all, 'detail'] as const,
  detail: (uuid: string) => [...providerKeys.details(), uuid] as const,
  nearby: (params?: Partial<NearbyQuery>) => [...providerKeys.all, 'nearby', params] as const,
};

export const venueKeys = {
  all: ['venues'] as const,
  lists: () => [...venueKeys.all, 'list'] as const,
  list: (filters?: Partial<ListVenuesQuery>) => [...venueKeys.lists(), filters] as const,
  details: () => [...venueKeys.all, 'detail'] as const,
  detail: (uuid: string) => [...venueKeys.details(), uuid] as const,
  availability: (uuid: string, date: string) => [...venueKeys.all, 'availability', uuid, date] as const,
  nearby: (params?: Partial<NearbyQuery>) => [...venueKeys.all, 'nearby', params] as const,
  reviews: (uuid: string, params?: { limit?: number; offset?: number }) => [...venueKeys.all, 'reviews', uuid, params] as const,
};

export const eventProviderKeys = {
  all: ['eventProviders'] as const,
  list: (eventUuid: string) => [...eventProviderKeys.all, 'list', eventUuid] as const,
};

export const eventVenueKeys = {
  all: ['eventVenues'] as const,
  list: (eventUuid: string) => [...eventVenueKeys.all, 'list', eventUuid] as const,
};

// ==================== HELPERS ====================

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

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Request failed');
  }
  return data;
}

// ==================== PROVIDER QUERY HOOKS ====================

interface ProvidersQueryResult {
  items: ServiceProviderResponse[];
  meta: { total: number; limit: number; offset: number } | undefined;
}

export function useProviders(filters?: Partial<ListProvidersQuery>) {
  return useQuery<ProvidersQueryResult>({
    queryKey: providerKeys.list(filters),
    queryFn: async (): Promise<ProvidersQueryResult> => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.category) params.set('category', filters.category);
      if (filters?.priceRange) params.set('priceRange', filters.priceRange);
      if (filters?.city) params.set('city', filters.city);
      if (filters?.state) params.set('state', filters.state);
      if (filters?.limit) params.set('limit', filters.limit.toString());
      if (filters?.offset) params.set('offset', filters.offset.toString());
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);

      const url = `${API_URL}/providers${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      const result = await handleResponse<ServiceProviderResponse[]>(response);
      return { items: result.data ?? [], meta: result.meta };
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useProvider(uuid: string | undefined) {
  return useQuery<ServiceProviderResponse | undefined>({
    queryKey: providerKeys.detail(uuid ?? ''),
    queryFn: async (): Promise<ServiceProviderResponse | undefined> => {
      if (!uuid) throw new Error('Provider UUID is required');
      const response = await fetch(`${API_URL}/providers/${uuid}`, { credentials: 'include' });
      const result = await handleResponse<ServiceProviderResponse>(response);
      return result.data;
    },
    enabled: !!uuid,
    staleTime: 1000 * 60 * 5,
  });
}

// ==================== VENUE QUERY HOOKS ====================

interface VenuesQueryResult {
  items: VenueResponse[];
  meta: { total: number; limit: number; offset: number } | undefined;
}

export function useVenues(filters?: Partial<ListVenuesQuery>) {
  return useQuery<VenuesQueryResult>({
    queryKey: venueKeys.list(filters),
    queryFn: async (): Promise<VenuesQueryResult> => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.venueType) params.set('venueType', filters.venueType);
      if (filters?.city) params.set('city', filters.city);
      if (filters?.state) params.set('state', filters.state);
      if (filters?.country) params.set('country', filters.country);
      if (filters?.capacityMin !== undefined) params.set('capacityMin', filters.capacityMin.toString());
      if (filters?.priceMax !== undefined) params.set('priceMax', filters.priceMax.toString());
      if (filters?.amenities) params.set('amenities', filters.amenities);
      if (filters?.limit) params.set('limit', filters.limit.toString());
      if (filters?.offset) params.set('offset', filters.offset.toString());
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);

      const url = `${API_URL}/venues${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      const result = await handleResponse<VenueResponse[]>(response);
      return { items: result.data ?? [], meta: result.meta };
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useVenue(uuid: string | undefined) {
  return useQuery<VenueResponse | undefined>({
    queryKey: venueKeys.detail(uuid ?? ''),
    queryFn: async (): Promise<VenueResponse | undefined> => {
      if (!uuid) throw new Error('Venue UUID is required');
      const response = await fetch(`${API_URL}/venues/${uuid}`, { credentials: 'include' });
      const result = await handleResponse<VenueResponse>(response);
      return result.data;
    },
    enabled: !!uuid,
    staleTime: 1000 * 60 * 5,
  });
}

export function useVenueReviews(
  venueUuid: string | undefined,
  params?: { limit?: number; offset?: number },
  enabled = false,
) {
  return useQuery<VenueReviewsResult>({
    queryKey: venueKeys.reviews(venueUuid ?? '', params),
    queryFn: async (): Promise<VenueReviewsResult> => {
      if (!venueUuid) throw new Error('Venue UUID is required');
      const searchParams = new URLSearchParams();
      if (params?.limit !== undefined) searchParams.set('limit', params.limit.toString());
      if (params?.offset !== undefined) searchParams.set('offset', params.offset.toString());
      const url = `${API_URL}/venues/${venueUuid}/reviews${searchParams.toString() ? `?${searchParams}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      const result = await handleResponse<VenueReviewsResult>(response);
      return result.data!;
    },
    enabled: !!venueUuid && enabled,
    staleTime: 1000 * 60 * 2,
  });
}

// ==================== VENUE AVAILABILITY + RATINGS HOOKS ====================

export function useVenueAvailability(venueUuid: string | undefined, date: string | undefined) {
  return useQuery<AvailabilityCheckResult | undefined>({
    queryKey: venueKeys.availability(venueUuid ?? '', date ?? ''),
    queryFn: async (): Promise<AvailabilityCheckResult | undefined> => {
      if (!venueUuid || !date) throw new Error('Venue UUID and date are required');
      const params = new URLSearchParams({ venueUuid, date });
      const response = await fetch(`${API_URL}/venues/check-availability?${params}`, { credentials: 'include' });
      const result = await handleResponse<AvailabilityCheckResult>(response);
      return result.data;
    },
    enabled: !!venueUuid && !!date,
    staleTime: 1000 * 60 * 5,
  });
}

export function useRateVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ venueUuid, rating }: { venueUuid: string; rating: number | null }) => {
      if (rating === null) {
        const response = await fetch(`${API_URL}/venues/ratings/${venueUuid}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const result = await handleResponse<{ rating: null }>(response);
        return result.data;
      }
      const response = await fetch(`${API_URL}/venues/ratings/${venueUuid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rating }),
      });
      const result = await handleResponse<{ rating: number }>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: venueKeys.lists() });
      queryClient.invalidateQueries({ queryKey: venueKeys.details() });
    },
  });
}

export function useCommentVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ venueUuid, comment }: { venueUuid: string; comment: string | null }) => {
      const response = await fetch(`${API_URL}/venues/comments/${venueUuid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment }),
      });
      const result = await handleResponse<{ comment: string | null }>(response);
      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: venueKeys.detail(variables.venueUuid) });
      queryClient.invalidateQueries({ queryKey: venueKeys.lists() });
    },
  });
}

// ==================== NEARBY HOOKS ====================

export function useNearbyVenues(params?: Partial<NearbyQuery>) {
  return useQuery<VenueResponse[]>({
    queryKey: venueKeys.nearby(params),
    queryFn: async (): Promise<VenueResponse[]> => {
      const searchParams = new URLSearchParams();
      if (params?.city) searchParams.set('city', params.city);
      if (params?.postalCode) searchParams.set('postalCode', params.postalCode);
      if (params?.country) searchParams.set('country', params.country);
      if (params?.venueType) searchParams.set('venueType', params.venueType);
      if (params?.limit) searchParams.set('limit', params.limit.toString());

      const url = `${API_URL}/venues/nearby${searchParams.toString() ? `?${searchParams}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      const result = await handleResponse<VenueResponse[]>(response);
      return result.data ?? [];
    },
    enabled: !!(params?.city || params?.postalCode),
    staleTime: 1000 * 60 * 5,
  });
}

export function useNearbyProviders(params?: Partial<NearbyQuery>) {
  return useQuery<ServiceProviderResponse[]>({
    queryKey: providerKeys.nearby(params),
    queryFn: async (): Promise<ServiceProviderResponse[]> => {
      const searchParams = new URLSearchParams();
      if (params?.city) searchParams.set('city', params.city);
      if (params?.postalCode) searchParams.set('postalCode', params.postalCode);
      if (params?.country) searchParams.set('country', params.country);
      if (params?.category) searchParams.set('category', params.category);
      if (params?.limit) searchParams.set('limit', params.limit.toString());

      const url = `${API_URL}/providers/nearby${searchParams.toString() ? `?${searchParams}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      const result = await handleResponse<ServiceProviderResponse[]>(response);
      return result.data ?? [];
    },
    enabled: !!(params?.city || params?.postalCode),
    staleTime: 1000 * 60 * 5,
  });
}

// ==================== EVENT PROVIDER QUERY HOOKS ====================

export function useEventProviders(eventUuid: string) {
  return useQuery<EventServiceProviderResponse[]>({
    queryKey: eventProviderKeys.list(eventUuid),
    queryFn: async (): Promise<EventServiceProviderResponse[]> => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/providers`,
        { credentials: 'include' }
      );
      const result = await handleResponse<EventServiceProviderResponse[]>(response);
      return result.data ?? [];
    },
    enabled: !!eventUuid,
    staleTime: 1000 * 30,
  });
}

export function useEventVenues(eventUuid: string) {
  return useQuery<EventVenueResponse[]>({
    queryKey: eventVenueKeys.list(eventUuid),
    queryFn: async (): Promise<EventVenueResponse[]> => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/providers/venues`,
        { credentials: 'include' }
      );
      const result = await handleResponse<EventVenueResponse[]>(response);
      return result.data ?? [];
    },
    enabled: !!eventUuid,
    staleTime: 1000 * 30,
  });
}

// ==================== PROVIDER MUTATIONS ====================

export function useCreateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProviderInput) => {
      const response = await fetch(`${API_URL}/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await handleResponse<ServiceProviderResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerKeys.lists() });
    },
  });
}

export function useUpdateProvider(uuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProviderInput) => {
      const response = await fetch(`${API_URL}/providers/${uuid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await handleResponse<ServiceProviderResponse>(response);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.lists() });
      if (data) {
        queryClient.setQueryData(providerKeys.detail(uuid), data);
      }
    },
  });
}

export function useDeleteProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uuid: string) => {
      const response = await fetch(`${API_URL}/providers/${uuid}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await handleResponse<{ deleted: boolean }>(response);
      return uuid;
    },
    onSuccess: (uuid) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.lists() });
      queryClient.removeQueries({ queryKey: providerKeys.detail(uuid) });
    },
  });
}

// ==================== VENUE MUTATIONS ====================

export function useCreateVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateVenueInput) => {
      const response = await fetch(`${API_URL}/venues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await handleResponse<VenueResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: venueKeys.lists() });
    },
  });
}

export function useUpdateVenue(uuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateVenueInput) => {
      const response = await fetch(`${API_URL}/venues/${uuid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await handleResponse<VenueResponse>(response);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: venueKeys.lists() });
      if (data) {
        queryClient.setQueryData(venueKeys.detail(uuid), data);
      }
    },
  });
}

export function useDeleteVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uuid: string) => {
      const response = await fetch(`${API_URL}/venues/${uuid}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await handleResponse<{ deleted: boolean }>(response);
      return uuid;
    },
    onSuccess: (uuid) => {
      queryClient.invalidateQueries({ queryKey: venueKeys.lists() });
      queryClient.removeQueries({ queryKey: venueKeys.detail(uuid) });
    },
  });
}

// ==================== EVENT PROVIDER LINK MUTATIONS ====================

export function useLinkProvider(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LinkProviderInput) => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await handleResponse<EventServiceProviderResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventProviderKeys.list(eventUuid) });
    },
  });
}

export function useUpdateEventProvider(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, data }: { linkId: number; data: UpdateEventProviderInput }) => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/providers/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await handleResponse<EventServiceProviderResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventProviderKeys.list(eventUuid) });
    },
  });
}

export function useUnlinkProvider(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: number) => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/providers/${linkId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await handleResponse<{ deleted: boolean }>(response);
      return linkId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventProviderKeys.list(eventUuid) });
    },
  });
}

// ==================== EVENT VENUE LINK MUTATIONS ====================

export function useLinkVenue(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LinkVenueInput) => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/providers/venues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await handleResponse<EventVenueResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventVenueKeys.list(eventUuid) });
    },
  });
}

export function useUpdateEventVenue(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, data }: { linkId: number; data: UpdateEventVenueInput }) => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/providers/venues/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await handleResponse<EventVenueResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventVenueKeys.list(eventUuid) });
    },
  });
}

export function useUnlinkVenue(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: number) => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/providers/venues/${linkId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await handleResponse<{ deleted: boolean }>(response);
      return linkId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventVenueKeys.list(eventUuid) });
    },
  });
}
