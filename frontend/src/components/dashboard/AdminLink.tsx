/**
 * Admin Link
 *
 * Conditionally renders a link to the admin panel
 * for users with admin roles (super_admin or operator).
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { useSession } from '@/hooks/use-auth';

function AdminLinkContent() {
  const { data: session, isLoading } = useSession();

  if (isLoading || !session) return null;

  const role = session.user.platformRole;
  if (role !== 'super_admin' && role !== 'operator') return null;

  return (
    <a
      href="/admin"
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
      Admin
    </a>
  );
}

export function AdminLink() {
  return (
    <QueryProvider>
      <AdminLinkContent />
    </QueryProvider>
  );
}
