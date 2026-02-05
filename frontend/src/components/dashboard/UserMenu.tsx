/**
 * User Menu
 *
 * Displays authenticated user info in the dashboard sidebar.
 * Shows avatar, name, and a sign out button.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { useSession, useSignOut } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function UserMenuContent() {
  const { data: session, isLoading } = useSession();
  const signOut = useSignOut();

  const handleSignOut = async () => {
    await signOut.mutateAsync();
    window.location.href = '/login';
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        <div className="flex-1">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <a
        href="/login"
        className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground"
      >
        Sign in
      </a>
    );
  }

  const user = session.user;
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-8 w-8">
        {user.image && <AvatarImage src={user.image} alt={user.name || 'User'} />}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{user.name || 'User'}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      <button
        onClick={handleSignOut}
        disabled={signOut.isPending}
        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        title="Sign out"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      </button>
    </div>
  );
}

export function UserMenu() {
  return (
    <QueryProvider>
      <UserMenuContent />
    </QueryProvider>
  );
}
