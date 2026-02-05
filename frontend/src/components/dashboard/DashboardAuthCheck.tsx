/**
 * Dashboard Auth Check
 *
 * Client-side authentication check for dashboard pages.
 * Shows loading state while checking auth, redirects to login if not authenticated.
 */

import { useEffect, useState } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { useSession } from '@/hooks/use-auth';

function AuthChecker() {
  const { data: session, isLoading, error } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isLoading || isRedirecting) return;

    if (error || !session) {
      setIsRedirecting(true);
      const currentPath = window.location.pathname;
      const returnUrl = encodeURIComponent(currentPath);
      window.location.href = `/login?returnUrl=${returnUrl}`;
    }
  }, [session, isLoading, error, isRedirecting]);

  // Show loading overlay while checking auth
  if (isLoading || isRedirecting || !session) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">
            {isRedirecting ? 'Redirecting to login...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Auth check passed - render nothing, let the page content show
  return null;
}

export function DashboardAuthCheck() {
  return (
    <QueryProvider>
      <AuthChecker />
    </QueryProvider>
  );
}
