/**
 * Organizations Hooks using TanStack Query
 *
 * Provides React hooks for organization operations with proper
 * caching, loading states, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787/api/v1';

// ==================== TYPES ====================

export const ORG_TYPES = ['company', 'family'] as const;
export const ORG_ROLES = ['admin', 'member', 'viewer'] as const;

export type OrgType = (typeof ORG_TYPES)[number];
export type OrgRole = (typeof ORG_ROLES)[number];

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  type: OrgType;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  createdBy: string;
  memberCount: number;
  userRole: OrgRole;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMemberResponse {
  id: number;
  userId: string;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
  role: OrgRole;
  createdAt: string;
}

export interface OrgInvitationResponse {
  id: string;
  email: string;
  role: OrgRole;
  invitedByName: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface CreateOrgInput {
  name: string;
  slug: string;
  type?: OrgType;
  description?: string | null;
}

export interface UpdateOrgInput {
  name?: string;
  description?: string | null;
  type?: OrgType;
  website?: string | null;
  logoUrl?: string | null;
}

export interface InviteMemberInput {
  email: string;
  role?: OrgRole;
}

export interface InvitationDetailsResponse {
  id: string;
  organizationName: string;
  organizationType: OrgType;
  email: string;
  role: OrgRole;
  invitedByName: string | null;
  expiresAt: string;
}

// Query keys
export const orgKeys = {
  all: ['organizations'] as const,
  lists: () => [...orgKeys.all, 'list'] as const,
  details: () => [...orgKeys.all, 'detail'] as const,
  detail: (orgId: string) => [...orgKeys.details(), orgId] as const,
  members: (orgId: string) => [...orgKeys.detail(orgId), 'members'] as const,
  invitations: (orgId: string) => [...orgKeys.detail(orgId), 'invitations'] as const,
  events: (orgId: string) => [...orgKeys.detail(orgId), 'events'] as const,
  checkSlug: (slug: string) => [...orgKeys.all, 'check-slug', slug] as const,
  invitationDetails: (token: string) => [...orgKeys.all, 'invitation', token] as const,
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

// ==================== LIST HOOKS ====================

export function useOrganizations() {
  return useQuery({
    queryKey: orgKeys.lists(),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/organizations`, {
        credentials: 'include',
      });
      const result = await handleResponse<OrganizationResponse[]>(response);
      return result.data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useOrganization(orgId: string | undefined) {
  return useQuery({
    queryKey: orgKeys.detail(orgId ?? ''),
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID is required');
      const response = await fetch(`${API_URL}/organizations/${orgId}`, {
        credentials: 'include',
      });
      const result = await handleResponse<OrganizationResponse>(response);
      return result.data;
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCheckOrgSlug(slug: string) {
  return useQuery<boolean>({
    queryKey: orgKeys.checkSlug(slug),
    queryFn: async (): Promise<boolean> => {
      const params = new URLSearchParams({ slug });
      const response = await fetch(`${API_URL}/organizations/check-slug?${params}`, {
        credentials: 'include',
      });
      const result = await handleResponse<{ available: boolean }>(response);
      return result.data?.available ?? false;
    },
    enabled: !!slug && slug.length >= 3 && /^[a-z0-9-]+$/.test(slug),
    staleTime: 1000 * 30,
  });
}

// ==================== MUTATION HOOKS ====================

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrgInput) => {
      const response = await fetch(`${API_URL}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await handleResponse<OrganizationResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.lists() });
    },
  });
}

export function useUpdateOrganization(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateOrgInput) => {
      const response = await fetch(`${API_URL}/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await handleResponse<OrganizationResponse>(response);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.lists() });
      if (data) {
        queryClient.setQueryData(orgKeys.detail(orgId), data);
      }
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orgId: string) => {
      const response = await fetch(`${API_URL}/organizations/${orgId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await handleResponse<{ deleted: boolean }>(response);
      return orgId;
    },
    onSuccess: (orgId) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.lists() });
      queryClient.removeQueries({ queryKey: orgKeys.detail(orgId) });
    },
  });
}

// ==================== MEMBER HOOKS ====================

export function useOrgMembers(orgId: string) {
  return useQuery({
    queryKey: orgKeys.members(orgId),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/organizations/${orgId}/members`, {
        credentials: 'include',
      });
      const result = await handleResponse<OrgMemberResponse[]>(response);
      return result.data ?? [];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateMemberRole(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: number; role: OrgRole }) => {
      const response = await fetch(`${API_URL}/organizations/${orgId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });
      const result = await handleResponse<OrgMemberResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.members(orgId) });
    },
  });
}

export function useRemoveMember(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: number) => {
      const response = await fetch(`${API_URL}/organizations/${orgId}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await handleResponse<{ deleted: boolean }>(response);
      return memberId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.members(orgId) });
      queryClient.invalidateQueries({ queryKey: orgKeys.lists() });
    },
  });
}

// ==================== INVITATION HOOKS ====================

export function useOrgInvitations(orgId: string) {
  return useQuery({
    queryKey: orgKeys.invitations(orgId),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/organizations/${orgId}/invitations`, {
        credentials: 'include',
      });
      const result = await handleResponse<OrgInvitationResponse[]>(response);
      return result.data ?? [];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useInviteMember(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InviteMemberInput) => {
      const response = await fetch(`${API_URL}/organizations/${orgId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await handleResponse<OrgInvitationResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.invitations(orgId) });
    },
  });
}

export function useRevokeInvitation(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(`${API_URL}/organizations/${orgId}/invitations/${invitationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await handleResponse<{ deleted: boolean }>(response);
      return invitationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.invitations(orgId) });
    },
  });
}

// ==================== PENDING INVITATIONS HOOK ====================

export interface PendingInvitationResponse {
  id: string;
  token: string;
  role: OrgRole;
  organizationName: string;
  invitedByName: string | null;
  expiresAt: string;
}

/**
 * Fetch pending invitations for the current user's email.
 * Used to display a banner on the dashboard.
 */
export function usePendingInvitations() {
  return useQuery({
    queryKey: [...orgKeys.all, 'pending-invitations'] as const,
    queryFn: async () => {
      const response = await fetch(`${API_URL}/invitations/pending`, {
        credentials: 'include',
      });
      const result = await handleResponse<PendingInvitationResponse[]>(response);
      return result.data ?? [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// ==================== INVITATION ACCEPT HOOKS ====================

export function useInvitationDetails(token: string | undefined) {
  return useQuery({
    queryKey: orgKeys.invitationDetails(token ?? ''),
    queryFn: async () => {
      if (!token) throw new Error('Token is required');
      const response = await fetch(`${API_URL}/invitations/${token}`, {
        credentials: 'include',
      });
      const result = await handleResponse<InvitationDetailsResponse>(response);
      return result.data;
    },
    enabled: !!token,
    staleTime: 1000 * 60,
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch(`${API_URL}/invitations/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });
      const result = await handleResponse<{ organizationId: string }>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...orgKeys.all, 'pending-invitations'] });
    },
  });
}

// ==================== ORG EVENT ASSIGNMENT HOOKS ====================

export interface OrgEventResponse {
  id: number;
  uuid: string;
  userId: string;
  organizationId: string | null;
  title: string;
  description: string | null;
  eventType: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  timezone: string | null;
  locationName: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  guestCountExpected: number | null;
  guestCountConfirmed: number | null;
  budgetTotal: number | null;
  budgetCurrency: string | null;
  isPublic: boolean;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch events assigned to an organization.
 */
export function useOrgEvents(orgId: string) {
  return useQuery({
    queryKey: orgKeys.events(orgId),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/organizations/${orgId}/events`, {
        credentials: 'include',
      });
      const result = await handleResponse<OrgEventResponse[]>(response);
      return result.data ?? [];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60,
  });
}

/**
 * Assign an event to an organization. Admin only, event must be owned by the caller.
 */
export function useAssignEvent(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventUuid: string) => {
      const response = await fetch(`${API_URL}/organizations/${orgId}/events/${eventUuid}`, {
        method: 'PUT',
        credentials: 'include',
      });
      const result = await handleResponse<{ assigned: boolean; eventUuid: string; organizationId: string }>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.events(orgId) });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

/**
 * Unassign an event from an organization. Admin only.
 */
export function useUnassignEvent(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventUuid: string) => {
      const response = await fetch(`${API_URL}/organizations/${orgId}/events/${eventUuid}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await handleResponse<{ unassigned: boolean; eventUuid: string }>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.events(orgId) });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
