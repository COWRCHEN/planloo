/**
 * Guest Stats
 *
 * Displays statistics cards for guest counts with an RSVP status pie chart.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { GuestStatsResponse } from '@/hooks/use-guests';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

const RSVP_COLORS = {
  Confirmed: '#10b981',
  Invited: '#3b82f6',
  Pending: '#f59e0b',
  Declined: '#ef4444',
  Maybe: '#8b5cf6',
};

interface TooltipEntry {
  name: string;
  value: number;
}

interface RsvpTooltipProps {
  active?: boolean | undefined;
  payload?: ReadonlyArray<{ payload: TooltipEntry }> | undefined;
}

function RsvpTooltip({ active, payload }: RsvpTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-semibold">{entry.name}</p>
      <p className="text-muted-foreground">{entry.value} guest{entry.value !== 1 ? 's' : ''}</p>
    </div>
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

  const pieData: Array<{ name: string; value: number; color: string }> = [
    { name: 'Confirmed', value: stats.confirmed, color: RSVP_COLORS.Confirmed },
    { name: 'Invited', value: stats.invited, color: RSVP_COLORS.Invited },
    { name: 'Pending', value: stats.pending, color: RSVP_COLORS.Pending },
    { name: 'Declined', value: stats.declined, color: RSVP_COLORS.Declined },
    { name: 'Maybe', value: stats.maybe, color: RSVP_COLORS.Maybe },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
      <div className="grid gap-4 grid-cols-2 content-start">
        <StatCard label="Total Guests" value={stats.total} />
        <StatCard
          label="Checked In"
          value={`${stats.checkedIn}/${stats.confirmed}`}
          sublabel={stats.confirmed > 0 ? `${Math.round((stats.checkedIn / stats.confirmed) * 100)}%` : undefined}
        />
        {stats.totalPlusOnes > 0 && (
          <StatCard
            label="Confirmed"
            value={stats.confirmed}
            sublabel={`+${stats.totalPlusOnes} plus-ones = ${confirmedWithPlusOnes}`}
          />
        )}
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">RSVP Status</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No guests yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={(props) => (
                    <RsvpTooltip
                      active={props.active}
                      payload={props.payload as RsvpTooltipProps['payload']}
                    />
                  )} />
                  <Legend
                    iconType="circle"
                    iconSize={10}
                    formatter={(value) => <span className="text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
