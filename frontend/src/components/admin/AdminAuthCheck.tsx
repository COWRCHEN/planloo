/**
 * Admin Auth Check
 *
 * Client-side auth check for admin pages.
 * Redirects non-admin users to /dashboard, unauthenticated to /login.
 */

import { useEffect, useState } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { useSession } from '@/hooks/use-auth';

function AdminChecker() {
  const { data: session, isLoading, error } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isLoading || isRedirecting) return;

    if (error || !session) {
      setIsRedirecting(true);
      const currentPath = window.location.pathname;
      const returnUrl = encodeURIComponent(currentPath);
      window.location.href = `/login?returnUrl=${returnUrl}`;
      return;
    }

    const role = session.user.platformRole;
    if (role !== 'super_admin' && role !== 'operator') {
      setIsRedirecting(true);
      window.location.href = '/dashboard';
    }
  }, [session, isLoading, error, isRedirecting]);

  if (isLoading || isRedirecting || !session) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">
            {isRedirecting ? 'Redirecting...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  const role = session.user.platformRole;
  if (role !== 'super_admin' && role !== 'operator') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return null;
}

export function AdminAuthCheck() {
  return (
    <QueryProvider>
      <AdminChecker />
    </QueryProvider>
  );
}
