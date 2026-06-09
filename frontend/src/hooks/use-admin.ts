/**
 * Admin Hooks using TanStack Query
 *
 * Provides React hooks for admin operations with proper
 * caching, loading states, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AUTH_API_BASE_URL } from '@/lib/auth-client';

const API_URL = AUTH_API_BASE_URL;

// ==================== TYPES ====================

export interface AdminStatsResponse {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalEvents: number;
}

export interface AdminUserResponse {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  platformRole: 'super_admin' | 'operator' | 'user';
  isActive: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
}

export interface AdminUserDetailResponse extends AdminUserResponse {
  emailVerified: boolean;
  phone: string | null;
  updatedAt: string;
  eventCount: number;
}

export interface AuditLogEntry {
  id: number;
  actorId: string;
  actorRole: string;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface ListAdminUsersQuery {
  search?: string;
  platformRole?: 'super_admin' | 'operator' | 'user';
  isActive?: 'true' | 'false';
  sortBy?: 'name' | 'email' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ListAuditLogQuery {
  action?: string;
  targetType?: string;
  actorId?: string;
  limit?: number;
  offset?: number;
}

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

// ==================== QUERY KEYS ====================

export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  userLists: () => [...adminKeys.all, 'users'] as const,
  userList: (filters?: Partial<ListAdminUsersQuery>) => [...adminKeys.userLists(), filters] as const,
  userDetails: () => [...adminKeys.all, 'user-detail'] as const,
  userDetail: (id: string) => [...adminKeys.userDetails(), id] as const,
  auditLogLists: () => [...adminKeys.all, 'audit-log'] as const,
  auditLogList: (filters?: Partial<ListAuditLogQuery>) => [...adminKeys.auditLogLists(), filters] as const,
};

// ==================== HOOKS ====================

/**
 * Hook to fetch platform stats
 */
export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/admin/stats`, {
        credentials: 'include',
      });
      const result = await handleResponse<AdminStatsResponse>(response);
      return result.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch paginated user list
 */
export function useAdminUsers(filters?: Partial<ListAdminUsersQuery>) {
  return useQuery({
    queryKey: adminKeys.userList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.platformRole) params.set('platformRole', filters.platformRole);
      if (filters?.isActive) params.set('isActive', filters.isActive);
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
      if (filters?.limit) params.set('limit', filters.limit.toString());
      if (filters?.offset) params.set('offset', filters.offset.toString());

      const url = `${API_URL}/admin/users${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url, {
        credentials: 'include',
      });

      const result = await handleResponse<AdminUserResponse[]>(response);
      return {
        users: result.data ?? [],
        meta: result.meta,
      };
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to fetch a single user detail
 */
export function useAdminUserDetail(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.userDetail(id ?? ''),
    queryFn: async () => {
      if (!id) throw new Error('User ID is required');
      const response = await fetch(`${API_URL}/admin/users/${id}`, {
        credentials: 'include',
      });
      const result = await handleResponse<AdminUserDetailResponse>(response);
      return result.data;
    },
    enabled: !!id,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to change a user's role
 */
export function useChangeUserRole(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (platformRole: 'super_admin' | 'operator' | 'user') => {
      const response = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platformRole }),
      });
      const result = await handleResponse<{ id: string; platformRole: string }>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.userLists() });
      queryClient.invalidateQueries({ queryKey: adminKeys.userDetail(userId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
  });
}

/**
 * Hook to suspend a user
 */
export function useSuspendUser(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reason: string) => {
      const response = await fetch(`${API_URL}/admin/users/${userId}/suspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      const result = await handleResponse<{ id: string; isActive: boolean }>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.userLists() });
      queryClient.invalidateQueries({ queryKey: adminKeys.userDetail(userId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
  });
}

/**
 * Hook to unsuspend a user
 */
export function useUnsuspendUser(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/admin/users/${userId}/unsuspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const result = await handleResponse<{ id: string; isActive: boolean }>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.userLists() });
      queryClient.invalidateQueries({ queryKey: adminKeys.userDetail(userId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
  });
}

/**
 * Hook to fetch paginated audit log
 */
export function useAuditLog(filters?: Partial<ListAuditLogQuery>) {
  return useQuery({
    queryKey: adminKeys.auditLogList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.action) params.set('action', filters.action);
      if (filters?.targetType) params.set('targetType', filters.targetType);
      if (filters?.actorId) params.set('actorId', filters.actorId);
      if (filters?.limit) params.set('limit', filters.limit.toString());
      if (filters?.offset) params.set('offset', filters.offset.toString());

      const url = `${API_URL}/admin/audit-log${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url, {
        credentials: 'include',
      });

      const result = await handleResponse<AuditLogEntry[]>(response);
      return {
        entries: result.data ?? [],
        meta: result.meta,
      };
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}
