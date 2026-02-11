/**
 * Guest Stats
 *
 * Displays statistics cards for guest counts.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { GuestStatsResponse } from '@/hooks/use-guests';

interface GuestStatsProps {
  stats: GuestStatsResponse | undefined;
  isLoading: boolean;
}

interface StatCardProps {
  label: string;
  value: number | string;
  sublabel?: string | undefined;
}

function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <Skeleton className="h-4 w-16 mb-2" />
        <Skeleton className="h-8 w-12" />
      </CardContent>
    </Card>
  );
}

export function GuestStats({ stats, isLoading }: GuestStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const confirmedWithPlusOnes = stats.confirmed + stats.totalPlusOnes;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Guests" value={stats.total} />
      <StatCard
        label="Confirmed"
        value={stats.confirmed}
        sublabel={stats.totalPlusOnes > 0 ? `+${stats.totalPlusOnes} plus-ones = ${confirmedWithPlusOnes}` : undefined}
      />
      <StatCard label="Pending" value={stats.pending} sublabel="Not yet invited" />
      <StatCard label="Invited" value={stats.invited} sublabel="Awaiting response" />
      <StatCard label="Declined" value={stats.declined} />
      <StatCard label="Maybe" value={stats.maybe} />
      <StatCard
        label="Checked In"
        value={`${stats.checkedIn}/${stats.confirmed}`}
        sublabel={stats.confirmed > 0 ? `${Math.round((stats.checkedIn / stats.confirmed) * 100)}%` : undefined}
      />
    </div>
  );
}
