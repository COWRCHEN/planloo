/**
 * User Profile Hooks
 *
 * TanStack Query hooks for user profile operations.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authKeys } from './use-auth';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787/api/v1';

// Query keys for user operations
export const userKeys = {
  all: ['users'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

interface UpdateProfileInput {
  name?: string | undefined;
  phone?: string | undefined;
  image?: string | undefined;
}

interface UpdateProfileResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    name: string | null;
    emailVerified: boolean;
    image: string | null;
    phone: string | null;
    platformRole: string;
    updatedAt: string;
  };
}

interface UploadAvatarResponse {
  success: boolean;
  data: {
    url: string;
    key: string;
  };
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * Hook to update user profile
 */
export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileInput): Promise<UpdateProfileResponse> => {
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error((result as { error?: { message?: string } }).error?.message || 'Failed to update profile');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate session to refresh user data
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
}

/**
 * Hook to upload avatar
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<UploadAvatarResponse> => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/uploads/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error((result as { error?: { message?: string } }).error?.message || 'Failed to upload avatar');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Update the cached session data with new avatar URL immediately
      // This bypasses Better Auth's cookie cache which may have stale data
      queryClient.setQueryData(authKeys.session(), (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object') return oldData;
        const session = oldData as { user?: { image?: string | null } };
        if (!session.user) return oldData;
        return {
          ...session,
          user: {
            ...session.user,
            image: data.data.url,
          },
        };
      });
      // Also invalidate to eventually sync with server
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
      
      // Dispatch custom event for cross-island communication (Astro islands)
      // This notifies other React islands (like UserMenu) to refetch session
      window.dispatchEvent(new CustomEvent('user-avatar-changed', { detail: { url: data.data.url } }));
    },
  });
}

/**
 * Hook to delete avatar
 */
export function useDeleteAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean }> => {
      const response = await fetch(`${API_URL}/uploads/avatar`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error((result as { error?: { message?: string } }).error?.message || 'Failed to delete avatar');
      }

      return response.json();
    },
    onSuccess: () => {
      // Clear the avatar in cached session data immediately
      queryClient.setQueryData(authKeys.session(), (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object') return oldData;
        const session = oldData as { user?: { image?: string | null } };
        if (!session.user) return oldData;
        return {
          ...session,
          user: {
            ...session.user,
            image: null,
          },
        };
      });
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
      
      // Dispatch custom event for cross-island communication (Astro islands)
      window.dispatchEvent(new CustomEvent('user-avatar-changed', { detail: { url: null } }));
    },
  });
}

/**
 * Hook to change password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: ChangePasswordInput): Promise<{ success: boolean }> => {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error((result as { error?: { message?: string } }).error?.message || 'Failed to change password');
      }

      return { success: true };
    },
  });
}
