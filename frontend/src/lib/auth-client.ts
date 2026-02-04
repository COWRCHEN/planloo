/**
 * Better Auth Client
 *
 * Frontend authentication client for Better Auth.
 */

import { createAuthClient } from 'better-auth/react';

// Extract base URL (without /api/v1 suffix) for Better Auth
// Better Auth is configured with basePath: '/api/v1/auth' on the server
const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787';
const AUTH_BASE_URL = new URL(API_URL).origin;

export const authClient = createAuthClient({
  baseURL: AUTH_BASE_URL,
  basePath: '/api/v1/auth',
  fetchOptions: {
    credentials: 'include',
  },
});

// Export individual methods for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

// Type exports - use base types since custom fields are added server-side
export type Session = typeof authClient.$Infer.Session;
export type User = Session['user'] & {
  platformRole?: 'super_admin' | 'operator' | 'user';
  isActive?: boolean;
};
