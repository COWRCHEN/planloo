/**
 * Auth Provider
 *
 * Wraps the app with TanStack Query provider for auth state management.
 */

import type { ReactNode } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return <QueryProvider>{children}</QueryProvider>;
}
