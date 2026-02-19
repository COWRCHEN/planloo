/**
 * Dashboard View
 *
 * Main dashboard page content with QueryProvider wrapper.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardStats } from './DashboardStats';
import { RecentEvents } from './RecentEvents';
import { RecentActivity } from './RecentActivity';
import { UpcomingTasks } from './UpcomingTasks';
import { PendingInvitationsBanner } from './PendingInvitationsBanner';
import { useSession } from '@/hooks/use-auth';

function DashboardContent() {
  const { data: session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please sign in to access your dashboard.</p>
          <Button asChild className="mt-4">
            <a href="/login">Sign in</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending organization invitations */}
      <PendingInvitationsBanner />

      {/* Stats */}
      <DashboardStats />

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Button asChild>
          <a href="/dashboard/events/new">
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Event
          </a>
        </Button>
      </div>

      {/* Activity & Upcoming Tasks */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentActivity />
        <UpcomingTasks />
      </div>

      {/* Recent Events */}
      <RecentEvents />
    </div>
  );
}

export function DashboardView() {
  return (
    <QueryProvider>
      <DashboardContent />
    </QueryProvider>
  );
}
