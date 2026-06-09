/**
 * Auth Hooks using TanStack Query
 *
 * Provides React hooks for authentication operations with proper
 * caching, loading states, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient, AUTH_API_BASE_URL } from '@/lib/auth-client';

const API_URL = AUTH_API_BASE_URL;

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  user: () => [...authKeys.all, 'user'] as const,
};

// Types
type PlatformRole = 'super_admin' | 'operator' | 'user';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  image: string | null;
  platformRole: PlatformRole;
  isActive: boolean;
}

export interface AuthSession {
  user: AuthUser;
  session: {
    id: string;
    expiresAt: Date;
  };
}

function extractSessionPayload(value: unknown): { user: unknown; session: unknown } | null {
  if (!value || typeof value !== 'object') return null;

  const direct = value as {
    user?: unknown;
    session?: unknown;
    data?: unknown;
  };

  if (direct.user && direct.session) {
    return { user: direct.user, session: direct.session };
  }

  if (direct.data && typeof direct.data === 'object') {
    const nested = direct.data as { user?: unknown; session?: unknown };
    if (nested.user && nested.session) {
      return { user: nested.user, session: nested.session };
    }
  }

  return null;
}

/**
 * Hook to get current session
 */
export function useSession() {
  return useQuery({
    queryKey: authKeys.session(),
    queryFn: async (): Promise<AuthSession | null> => {
      try {
        const result = await authClient.getSession();
        
        // Handle the response - Better Auth may return data directly or wrapped
        const data = result?.data ?? result;
        const error = result?.error;
        
        if (error) {
          if (import.meta.env.DEV) console.error('[useSession] Auth error:', error);
          return null;
        }
        
        if (!data || !data.user) {
          return null;
        }

        // Cast to include custom fields from server
        const user = data.user as unknown as {
          id: string;
          email: string;
          name?: string | null;
          emailVerified: boolean;
          image?: string | null;
          platformRole?: PlatformRole;
          isActive?: boolean;
        };

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name ?? null,
            emailVerified: user.emailVerified,
            image: user.image ?? null,
            platformRole: user.platformRole ?? 'user',
            isActive: user.isActive ?? true,
          },
          session: {
            id: data.session.id,
            expiresAt: data.session.expiresAt,
          },
        };
      } catch (err) {
        if (import.meta.env.DEV) console.error('[useSession] Failed to fetch session:', err);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}

/**
 * Hook for email/password sign in
 */
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const signInResult = await authClient.signIn.email({ email, password });
      const signInError = signInResult?.error;

      if (signInError) {
        throw new Error(signInError.message || 'Invalid email or password');
      }

      // Some Better Auth responses already include session/user payload.
      // Use it directly when present to avoid immediate get-session race conditions.
      const signInPayload = extractSessionPayload(signInResult);
      if (signInPayload) {
        return signInPayload;
      }

      // Better Auth can return 200 without throwing when email verification is required.
      // Treat "no active session" as a failed login so the UI shows actionable feedback.
      const sessionResult = await authClient.getSession();
      const sessionError = sessionResult?.error;
      const sessionData = sessionResult?.data ?? sessionResult;

      if (sessionError) {
        throw new Error(sessionError.message || 'Sign in failed. Please try again.');
      }

      const sessionPayload = extractSessionPayload(sessionData);
      if (sessionPayload) {
        return sessionPayload;
      }

      // Fallback: do a direct backend session check. In some edge cases the client helper
      // can lag right after sign-in even though the cookie is already set.
      const sessionResponse = await fetch(`${API_URL}/auth/get-session`, {
        method: 'GET',
        credentials: 'include',
      });

      if (sessionResponse.ok) {
        const directSession = await sessionResponse.json();
        const directSessionPayload = extractSessionPayload(directSession);
        if (directSessionPayload) {
          return directSessionPayload;
        }

        if (import.meta.env.DEV) {
          console.warn('[useSignIn] get-session returned no usable payload', directSession);
        }
      }

      {
        throw new Error(
          'Sign in was not completed. Please verify your email address, then try again.'
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
  });
}

/**
 * Hook for email/password sign up
 */
export function useSignUp() {
  return useMutation({
    mutationFn: async ({
      email,
      password,
      name,
      callbackURL,
    }: {
      email: string;
      password: string;
      name: string;
      /** Passed through to the verification email link so the user is redirected back after verifying. */
      callbackURL?: string;
    }) => {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: callbackURL || '/',
      });
      if (error) {
        throw new Error(error.message || 'Registration failed');
      }
      return { success: true };
    },
  });
}

/**
 * Hook for sign out
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await authClient.signOut();
    },
    onSuccess: () => {
      queryClient.setQueryData(authKeys.session(), null);
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
}

/**
 * Hook for OAuth sign in
 */
export function useOAuthSignIn() {
  return useMutation({
    mutationFn: async ({
      provider,
      callbackURL,
    }: {
      provider: 'google';
      callbackURL?: string;
    }) => {
      await authClient.signIn.social({ provider, callbackURL });
    },
  });
}

/**
 * Hook for forgot password
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: async ({ email, redirectTo }: { email: string; redirectTo: string }) => {
      const response = await fetch(`${API_URL}/auth/forget-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, redirectTo }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || 'Failed to send reset email');
      }

      return { success: true };
    },
  });
}

/**
 * Hook for reset password
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ token, newPassword }: { token: string; newPassword: string }) => {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || 'Failed to reset password');
      }

      return { success: true };
    },
  });
}

/**
 * Hook for email verification
 */
export function useVerifyEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      const response = await fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || 'Failed to verify email');
      }

      return { success: true };
    },
    onSuccess: () => {
      // Invalidate session to pick up verified status
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
  });
}

/**
 * Derived helpers
 */
export function useUser() {
  const { data } = useSession();
  return data?.user ?? null;
}

export function useIsAuthenticated() {
  const { data, isLoading } = useSession();
  return { isAuthenticated: !!data, isLoading };
}
