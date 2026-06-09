/**
 * Guests Hooks using TanStack Query
 *
 * Provides React hooks for guest operations with proper
 * caching, loading states, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlanLimitError } from '@/lib/api-error';
import { AUTH_API_BASE_URL } from '@/lib/auth-client';

const API_URL = AUTH_API_BASE_URL;

// ==================== TYPES ====================

export const GUEST_CATEGORIES = ['vip', 'family', 'friend', 'colleague', 'other'] as const;
export const RSVP_STATUSES = ['pending', 'invited', 'confirmed', 'declined', 'maybe'] as const;

// Event types
export const EVENT_TYPES = ['wedding', 'birthday', 'corporate', 'conference', 'other', 'holiday_party', 'engagement_party', 'fundraiser', 'anniversary', 'graduation', 'retirement', 'baby_shower', 'bridal_shower', 'themed', 'celebration_of_life'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// Wedding-specific enums
export const WEDDING_GUEST_SIDES = ['bride', 'groom', 'both'] as const;
export const WEDDING_INVITED_TO = ['ceremony', 'reception', 'both'] as const;
export type WeddingGuestSide = (typeof WEDDING_GUEST_SIDES)[number];
export type WeddingInvitedTo = (typeof WEDDING_INVITED_TO)[number];

// Corporate-specific enums
export const ATTENDEE_TYPES = ['employee', 'client', 'vendor', 'partner', 'other'] as const;
export type AttendeeType = (typeof ATTENDEE_TYPES)[number];

// Conference-specific enums
export const BADGE_TYPES = ['speaker', 'vip', 'standard', 'press', 'exhibitor', 'staff'] as const;
export type BadgeType = (typeof BADGE_TYPES)[number];

// Birthday-specific enums
export const AGE_GROUPS = ['child', 'teen', 'adult'] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

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
  /** Option key from event's categoryOptions when enableCategory is true */
  category: string | null;
  rsvpStatus: RsvpStatus;
  rsvpToken: string;
  rsvpRespondedAt: string | null;
  plusOnesAllowed: number;
  plusOnesCount: number;
  plusOnesCountAdults?: number;
  plusOnesCountChildren?: number;
  dietaryRestrictions: string | null;
  notes: string | null;
  checkedIn: boolean;
  checkedInAt: string | null;
  // Optional fields (when enabled in event guest settings)
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipCode?: string | null;
  addressCountry?: string | null;
  mealChoice?: string | null;
  needsAccommodation?: boolean | null;
  hotelName?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  roomNumber?: string | null;
  plusOneName?: string | null;
  tableAssignment?: string | null;
  transportationNeeded?: boolean | null;
  accessibilityNeeds?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuestStatsResponse {
  total: number;
  pending: number;
  invited: number;
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
  category?: string | null;
  plusOnesAllowed?: number;
  plusOnesCountAdults?: number;
  plusOnesCountChildren?: number;
  dietaryRestrictions?: string | null;
  notes?: string | null;
  needsAccommodation?: boolean | null;
  hotelName?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  roomNumber?: string | null;
  plusOneName?: string | null;
  tableAssignment?: string | null;
  transportationNeeded?: boolean | null;
  accessibilityNeeds?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipCode?: string | null;
  addressCountry?: string | null;
  mealChoice?: string | null;
}

export interface UpdateGuestInput {
  firstName?: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
  rsvpStatus?: RsvpStatus;
  plusOnesAllowed?: number;
  plusOnesCountAdults?: number;
  plusOnesCountChildren?: number;
  dietaryRestrictions?: string | null;
  notes?: string | null;
  needsAccommodation?: boolean | null;
  hotelName?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  roomNumber?: string | null;
  plusOneName?: string | null;
  tableAssignment?: string | null;
  transportationNeeded?: boolean | null;
  accessibilityNeeds?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipCode?: string | null;
  addressCountry?: string | null;
  mealChoice?: string | null;
}

export interface ListGuestsQuery {
  category?: string;
  rsvpStatus?: RsvpStatus;
  search?: string;
  checkedIn?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'firstName' | 'lastName' | 'createdAt' | 'rsvpStatus';
  sortOrder?: 'asc' | 'desc';
}

export interface RsvpFormFields {
  dietaryRestrictions: boolean;
  mealChoice: boolean;
  notes: boolean;
  address: boolean;
  transportation: boolean;
  accessibility: boolean;
  customFields: Record<string, boolean>;
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
    plusOnesCountAdults?: number;
    plusOnesCountChildren?: number;
    dietaryRestrictions: string | null;
    needsAccommodation?: boolean | null;
    hotelName?: string | null;
    checkInDate?: string | null;
    checkOutDate?: string | null;
    // Configurable RSVP form fields
    mealChoice?: string | null;
    notes?: string | null;
    addressStreet?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressZipCode?: string | null;
    addressCountry?: string | null;
    transportationNeeded?: boolean | null;
    accessibilityNeeds?: string | null;
    customFieldData?: Record<string, unknown> | null;
  };
  guestSettings?: {
    enableAccommodation: boolean;
    accommodationHotels: AccommodationHotel[] | null;
    accommodationCheckInDate: string | null;
    accommodationCheckOutDate: string | null;
    mealChoiceOptions: MealChoiceOption[] | null;
    customFieldDefinitions: CustomFieldDefinition[] | null;
    requiredMealChoice: boolean;
    requiredAddress: boolean;
    requiredTransportation: boolean;
    requiredAccessibility: boolean;
  };
  rsvpSettings?: {
    enabled: boolean;
    allowMaybeResponse: boolean;
    rsvpDeadline: string | null;
    deadlinePassed: boolean;
    allowRsvpUpdate: boolean;
    confirmationMessage: string | null;
    canRespond: boolean;
    rsvpFormFields?: RsvpFormFields;
  };
}

export interface RsvpSubmitInput {
  rsvpStatus: 'confirmed' | 'declined' | 'maybe';
  plusOnesCount?: number;
  plusOnesCountAdults?: number;
  plusOnesCountChildren?: number;
  dietaryRestrictions?: string | null;
  needsAccommodation?: boolean | null;
  hotelName?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  // Configurable RSVP form fields
  mealChoice?: string | null;
  notes?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipCode?: string | null;
  addressCountry?: string | null;
  transportationNeeded?: boolean | null;
  accessibilityNeeds?: string | null;
  customFieldData?: Record<string, unknown> | null;
}

/** Audit entry for guest history (who created/updated, when, what changed) */
export interface GuestAuditEntryResponse {
  id: number;
  action: 'create' | 'update';
  createdAt: string;
  actor: { id: string; name: string | null; email: string | null } | null;
  details: {
    source?: 'dashboard' | 'rsvp';
    changes?: { field: string; from: unknown; to: unknown }[];
  };
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
  audit: (eventUuid: string, guestUuid: string) =>
    [...guestKeys.all, 'audit', eventUuid, guestUuid] as const,
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

// ==================== GUEST SETTINGS ====================

// Meal choice option type
export interface MealChoiceOption {
  key: string;
  label: string;
}

/** Default category options when enabling the Category guest field */
export const DEFAULT_CATEGORY_OPTIONS: MealChoiceOption[] = [
  { key: 'vip', label: 'VIP' },
  { key: 'family', label: 'Family' },
  { key: 'friend', label: 'Friend' },
  { key: 'colleague', label: 'Colleague' },
  { key: 'other', label: 'Other' },
];

// Custom field types
export const CUSTOM_FIELD_TYPES = ['text', 'number', 'select', 'multiselect', 'checkbox', 'date'] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

// Custom field definition type
export interface CustomFieldDefinition {
  id: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  helpText?: string;
  options?: string[]; // For select/multiselect types
}

export interface AccommodationHotel {
  id: string;
  name: string;
  streetNo?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface GuestSettingsResponse {
  id: number;
  eventId: number;
  eventType: string | null;
  enableAddress: boolean;
  enableMealChoice: boolean;
  enableAccommodation: boolean;
  enablePlusOnes: boolean;
  defaultPlusOnesAllowed: number;
  enablePlusOneName: boolean;
  enableTableAssignment: boolean;
  enableTransportation: boolean;
  enableAccessibility: boolean;
  enableCategory: boolean;
  requiredAddress: boolean;
  requiredMealChoice: boolean;
  requiredAccommodation: boolean;
  requiredPlusOneName: boolean;
  requiredTableAssignment: boolean;
  requiredTransportation: boolean;
  requiredAccessibility: boolean;
  requiredCategory: boolean;
  requiredFirstName: boolean;
  requiredLastName: boolean;
  requiredEmail: boolean;
  requiredPhone: boolean;
  mealChoiceOptions: MealChoiceOption[] | null;
  categoryOptions: MealChoiceOption[] | null;
  accommodationCheckInDate: string | null;
  accommodationCheckOutDate: string | null;
  accommodationHotels: AccommodationHotel[] | null;
  customFieldDefinitions: CustomFieldDefinition[] | null;
  createdAt: string;
  updatedAt: string;
}

// Alias for backward compatibility
export type EventGuestSettings = GuestSettingsResponse;

export const guestSettingsKeys = {
  all: ['guestSettings'] as const,
  detail: (eventUuid: string) => [...guestSettingsKeys.all, eventUuid] as const,
};

// Update guest settings input
export interface UpdateGuestSettingsInput {
  enableAddress?: boolean;
  enableMealChoice?: boolean;
  enableAccommodation?: boolean;
  enablePlusOnes?: boolean;
  defaultPlusOnesAllowed?: number;
  enablePlusOneName?: boolean;
  enableTableAssignment?: boolean;
  enableTransportation?: boolean;
  enableAccessibility?: boolean;
  enableCategory?: boolean;
  requiredAddress?: boolean;
  requiredMealChoice?: boolean;
  requiredAccommodation?: boolean;
  requiredPlusOneName?: boolean;
  requiredTableAssignment?: boolean;
  requiredTransportation?: boolean;
  requiredAccessibility?: boolean;
  requiredCategory?: boolean;
  requiredFirstName?: boolean;
  requiredLastName?: boolean;
  requiredEmail?: boolean;
  requiredPhone?: boolean;
  mealChoiceOptions?: MealChoiceOption[] | null;
  categoryOptions?: MealChoiceOption[] | null;
  accommodationCheckInDate?: string | null;
  accommodationCheckOutDate?: string | null;
  accommodationHotels?: AccommodationHotel[] | null;
  customFieldDefinitions?: CustomFieldDefinition[] | null;
}

/**
 * Hook to fetch guest field settings for an event
 */
export function useGuestSettings(eventUuid: string) {
  return useQuery<GuestSettingsResponse | undefined>({
    queryKey: guestSettingsKeys.detail(eventUuid),
    queryFn: async (): Promise<GuestSettingsResponse | undefined> => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/guest-settings`, {
        credentials: 'include',
      });

      const result = await handleResponse<GuestSettingsResponse>(response);
      return result.data;
    },
    enabled: !!eventUuid,
    staleTime: 1000 * 60 * 5, // 5 minutes - settings don't change often
  });
}

/**
 * Hook to update guest field settings for an event
 */
export function useUpdateGuestSettings(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateGuestSettingsInput) => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/guest-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await handleResponse<GuestSettingsResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guestSettingsKeys.detail(eventUuid) });
    },
  });
}

/**
 * Hook to fetch audit history for a guest
 */
export function useGuestAudit(eventUuid: string, guestUuid: string | undefined) {
  return useQuery<GuestAuditEntryResponse[]>({
    queryKey: guestKeys.audit(eventUuid, guestUuid ?? ''),
    queryFn: async (): Promise<GuestAuditEntryResponse[]> => {
      if (!eventUuid || !guestUuid) throw new Error('Event and guest UUIDs are required');
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/guests/${guestUuid}/audit`,
        { credentials: 'include' }
      );
      const result = await handleResponse<GuestAuditEntryResponse[]>(response);
      return result.data ?? [];
    },
    enabled: !!eventUuid && !!guestUuid,
    staleTime: 1000 * 60,
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
 * Hook to update RSVP status for a guest (inline update)
 */
export function useUpdateRsvpStatus(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ guestUuid, rsvpStatus }: { guestUuid: string; rsvpStatus: RsvpStatus }) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/guests/${guestUuid}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ rsvpStatus }),
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
 * Hook to batch send RSVP invitations
 */
export interface SendInvitationsResult {
  sent: number;
  failed: Array<{ guestUuid: string; name: string; email: string; success: boolean; error?: string }>;
  total: number;
}

export function useSendInvitations(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guestUuids: string[] | 'all-eligible') => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/guests/send-invitations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ guestUuids }),
        }
      );

      const result = await handleResponse<SendInvitationsResult>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: guestKeys.stats(eventUuid) });
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
