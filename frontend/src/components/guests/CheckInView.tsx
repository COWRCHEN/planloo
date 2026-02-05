/**
 * Check-In View
 *
 * Mobile-optimized interface for checking in guests at events.
 */

import { useState, useMemo } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useGuests, useGuestStats, useCheckInGuest, type GuestResponse } from '@/hooks/use-guests';
import { useSession } from '@/hooks/use-auth';

interface CheckInViewProps {
  eventUuid: string;
}

function CheckInStats({
  checkedIn,
  confirmed,
  isLoading,
}: {
  checkedIn: number;
  confirmed: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-4 py-4">
        <Skeleton className="h-16 w-32" />
      </div>
    );
  }

  const percentage = confirmed > 0 ? Math.round((checkedIn / confirmed) * 100) : 0;

  return (
    <div className="flex items-center justify-center gap-6 py-4 bg-muted rounded-lg">
      <div className="text-center">
        <div className="text-3xl font-bold">{checkedIn}</div>
        <div className="text-sm text-muted-foreground">Checked In</div>
      </div>
      <div className="text-2xl text-muted-foreground">/</div>
      <div className="text-center">
        <div className="text-3xl font-bold">{confirmed}</div>
        <div className="text-sm text-muted-foreground">Confirmed</div>
      </div>
      <div className="text-center pl-4 border-l">
        <div className="text-3xl font-bold">{percentage}%</div>
        <div className="text-sm text-muted-foreground">Attendance</div>
      </div>
    </div>
  );
}

function GuestCheckInCard({
  guest,
  onCheckIn,
  isChecking,
}: {
  guest: GuestResponse;
  onCheckIn: () => void;
  isChecking: boolean;
}) {
  const guestName = guest.lastName
    ? `${guest.firstName} ${guest.lastName}`
    : guest.firstName;

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border ${
        guest.checkedIn ? 'bg-green-50 border-green-200' : 'bg-background'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{guestName}</span>
          {guest.plusOnesCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              +{guest.plusOnesCount}
            </Badge>
          )}
        </div>
        {guest.email && (
          <div className="text-sm text-muted-foreground truncate">{guest.email}</div>
        )}
        {guest.dietaryRestrictions && (
          <div className="text-xs text-orange-600 mt-1">
            {guest.dietaryRestrictions}
          </div>
        )}
      </div>
      <Button
        variant={guest.checkedIn ? 'outline' : 'default'}
        size="lg"
        onClick={onCheckIn}
        disabled={isChecking}
        className="ml-4 min-w-[100px]"
      >
        {isChecking ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : guest.checkedIn ? (
          <>
            <svg
              className="mr-1 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Done
          </>
        ) : (
          'Check In'
        )}
      </Button>
    </div>
  );
}

function CheckInContent({ eventUuid }: CheckInViewProps) {
  const { data: session, isLoading: isLoadingSession } = useSession();
  const [search, setSearch] = useState('');
  const [checkingId, setCheckingId] = useState<string | null>(null);

  // Fetch confirmed guests with polling for real-time updates
  const { data, isLoading: isLoadingGuests } = useGuests(
    eventUuid,
    {
      rsvpStatus: 'confirmed',
      limit: 500, // Load all confirmed guests for check-in
      sortBy: 'lastName',
      sortOrder: 'asc',
    },
    { refetchInterval: 5000 } // Poll every 5 seconds
  );

  const { data: stats, isLoading: isLoadingStats } = useGuestStats(eventUuid, {
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const checkInGuest = useCheckInGuest(eventUuid);

  // Filter guests by search
  const filteredGuests = useMemo(() => {
    if (!data?.guests) return [];

    const searchLower = search.toLowerCase().trim();
    if (!searchLower) return data.guests;

    return data.guests.filter((guest) => {
      const fullName = `${guest.firstName} ${guest.lastName || ''}`.toLowerCase();
      const email = (guest.email || '').toLowerCase();
      return fullName.includes(searchLower) || email.includes(searchLower);
    });
  }, [data?.guests, search]);

  const handleCheckIn = async (guest: GuestResponse) => {
    setCheckingId(guest.uuid);
    try {
      await checkInGuest.mutateAsync(guest.uuid);
    } finally {
      setCheckingId(null);
    }
  };

  if (isLoadingSession) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please sign in to check in guests.</p>
          <Button asChild className="mt-4">
            <a href="/login">Sign in</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <CheckInStats
        checkedIn={stats?.checkedIn ?? 0}
        confirmed={stats?.confirmed ?? 0}
        isLoading={isLoadingStats}
      />

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <Input
          type="search"
          placeholder="Search guests by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 py-6 text-lg"
          autoFocus
        />
      </div>

      {/* Guest List */}
      {isLoadingGuests ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filteredGuests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {search
            ? 'No guests found matching your search.'
            : 'No confirmed guests to check in.'}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Show checked-in guests at the bottom */}
          {filteredGuests
            .sort((a, b) => {
              if (a.checkedIn === b.checkedIn) return 0;
              return a.checkedIn ? 1 : -1;
            })
            .map((guest) => (
              <GuestCheckInCard
                key={guest.uuid}
                guest={guest}
                onCheckIn={() => handleCheckIn(guest)}
                isChecking={checkingId === guest.uuid}
              />
            ))}
        </div>
      )}

      {/* Refresh hint */}
      <p className="text-center text-xs text-muted-foreground">
        Guest list updates automatically
      </p>
    </div>
  );
}

export function CheckInView({ eventUuid }: CheckInViewProps) {
  return (
    <QueryProvider>
      <CheckInContent eventUuid={eventUuid} />
    </QueryProvider>
  );
}
