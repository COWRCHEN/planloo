/**
 * Admin Dashboard Stats
 *
 * Displays platform-wide statistics cards.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminStats } from '@/hooks/use-admin';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconBgClass: string;
  iconColorClass: string;
}

function StatCard({ title, value, icon, iconBgClass, iconColorClass }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconBgClass}`}>
            <div className={iconColorClass}>{icon}</div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const UsersIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ActiveIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SuspendedIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export function AdminDashboardStats() {
  const { data: stats, isLoading, error } = useAdminStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-destructive">Failed to load statistics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Users"
        value={stats?.totalUsers ?? 0}
        icon={<UsersIcon />}
        iconBgClass="bg-primary/10"
        iconColorClass="text-primary"
      />
      <StatCard
        title="Active Users"
        value={stats?.activeUsers ?? 0}
        icon={<ActiveIcon />}
        iconBgClass="bg-green-500/10"
        iconColorClass="text-green-500"
      />
      <StatCard
        title="Suspended Users"
        value={stats?.suspendedUsers ?? 0}
        icon={<SuspendedIcon />}
        iconBgClass="bg-red-500/10"
        iconColorClass="text-red-500"
      />
      <StatCard
        title="Total Events"
        value={stats?.totalEvents ?? 0}
        icon={<CalendarIcon />}
        iconBgClass="bg-blue-500/10"
        iconColorClass="text-blue-500"
      />
    </div>
  );
}
