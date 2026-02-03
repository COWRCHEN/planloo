/**
 * Auth Guard
 *
 * Protects routes that require authentication.
 * Redirects to login if not authenticated.
 * Uses TanStack Query for session state.
 */

import { useEffect, type ReactNode } from 'react';
import { useSession } from '@/hooks/use-auth';

interface AuthGuardProps {
  children: ReactNode;
  requireVerified?: boolean;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requireVerified = false,
  redirectTo = '/login',
}: AuthGuardProps) {
  const { data: session, isLoading } = useSession();

  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      const currentPath = window.location.pathname;
      const returnUrl = encodeURIComponent(currentPath);
      window.location.href = `${redirectTo}?returnUrl=${returnUrl}`;
      return;
    }

    if (requireVerified && !session.user.emailVerified) {
      window.location.href = '/verify-email';
    }
  }, [session, isLoading, requireVerified, redirectTo]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (requireVerified && !session.user.emailVerified) {
    return null;
  }

  return <>{children}</>;
}
