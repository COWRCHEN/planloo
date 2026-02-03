/**
 * Better Auth Client
 *
 * Frontend authentication client for Better Auth.
 */

import { createAuthClient } from 'better-auth/react';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787';

export const authClient = createAuthClient({
  baseURL: API_URL,
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
