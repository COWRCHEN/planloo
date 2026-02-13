/**
 * Guests Landing View
 *
 * Shows a list of events with links to their guest lists.
 */

import { useState } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EventFilters } from '@/components/events/EventFilters';
import { useEvents, type EventStatus, type EventType } from '@/hooks/use-events';
import { useSession } from '@/hooks/use-auth';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function EventCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

function GuestsLandingContent() {
  const { data: session, isLoading: sessionLoading } = useSession();
  
  // Filter and sort state
  const [status, setStatus] = useState<EventStatus | undefined>(undefined);
  const [eventType, setEventType] = useState<EventType | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'startDate' | 'createdAt' | 'title'>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filters = {
    ...(status && { status }),
    ...(eventType && { eventType }),
    sortBy,
    sortOrder,
    limit: 50,
  };
  
  const { data, isLoading, error } = useEvents(filters);

  const handleClearFilters = () => {
    setStatus(undefined);
    setEventType(undefined);
  };

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy as 'startDate' | 'createdAt' | 'title');
    setSortOrder(newSortOrder);
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please sign in to manage guests.</p>
          <Button asChild className="mt-4">
            <a href="/login">Sign in</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Failed to load events.</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const events = data?.events ?? [];
  const hasFilters = status !== undefined || eventType !== undefined;

  if (events.length === 0 && !hasFilters) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-muted-foreground">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="font-medium">No events yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an event first to start managing guests.
          </p>
          <Button asChild className="mt-4">
            <a href="/dashboard/events/new">Create Event</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <EventFilters
        status={status}
        eventType={eventType}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onStatusChange={setStatus}
        onEventTypeChange={setEventType}
        onSourceChange={() => {}}
        onSortChange={handleSortChange}
        onClearFilters={handleClearFilters}
      />

      {/* Empty State with Filters */}
      {events.length === 0 && hasFilters && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 h-12 w-12 text-muted-foreground">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="font-medium">No events match your filters</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your filters to see more events.
            </p>
            <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Events Grid */}
      {events.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.uuid} className="flex flex-col">
              <CardHeader className="flex-1">
                <CardTitle className="text-lg">{event.title}</CardTitle>
                <CardDescription>
                  {formatDate(event.startDate)}
                  {event.locationCity && ` · ${event.locationCity}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    <strong className="text-foreground">{event.guestCountConfirmed ?? 0}</strong> confirmed
                  </span>
                  <span>
                    <strong className="text-foreground">{event.guestCountExpected ?? 0}</strong> expected
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild className="flex-1">
                    <a href={`/dashboard/events/${event.uuid}/guests`}>Manage Guests</a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={`/dashboard/events/${event.uuid}/checkin`}>Check-In</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function GuestsLandingView() {
  return (
    <QueryProvider>
      <GuestsLandingContent />
    </QueryProvider>
  );
}
