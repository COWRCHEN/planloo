/**
 * Better Auth Client
 *
 * Frontend authentication client for Better Auth.
 */

import { createAuthClient } from 'better-auth/react';

// Extract base URL (without /api/v1 suffix) for Better Auth
// Better Auth is configured with basePath: '/api/v1/auth' on the server
const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787/api/v1';
const DEV_HOSTS = new Set(['localhost', '127.0.0.1', '10.0.48.174']);

function resolveApiOrigin(): string {
  const configuredUrl = new URL(API_URL);

  // In local development, keep frontend/backend on the same host so cookie-based auth
  // stays same-site (SameSite=Lax) and session cookies are sent on fetch.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const pageHostname = window.location.hostname;
    if (DEV_HOSTS.has(pageHostname) && configuredUrl.hostname !== pageHostname) {
      configuredUrl.hostname = pageHostname;
      configuredUrl.protocol = window.location.protocol;
    }
  }

  return configuredUrl.origin;
}

export const AUTH_BASE_URL = resolveApiOrigin();
export const AUTH_API_BASE_URL = `${AUTH_BASE_URL}/api/v1`;

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
