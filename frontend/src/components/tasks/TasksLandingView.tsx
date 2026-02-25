/**
 * Tasks Landing View
 *
 * Shows a list of events with links to their task lists.
 */

import { useState } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EventFilters } from '@/components/events/EventFilters';
import { useEvents, type EventStatus, type EventType } from '@/hooks/use-events';
import { useTaskSummary } from '@/hooks/use-tasks';
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
        <Skeleton className="h-4 w-full mb-3" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

function EventTaskCard({ event }: { event: { uuid: string; title: string; startDate: string; locationCity?: string | null } }) {
  const { data: summary } = useTaskSummary(event.uuid);

  const completedCount = summary?.byStatus.find((s) => s.status === 'completed')?.count ?? 0;
  const total = summary?.total ?? 0;
  const overdueCount = summary?.overdueCount ?? 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-1">
        <CardTitle className="truncate text-lg">{event.title}</CardTitle>
        <CardDescription>
          {formatDate(event.startDate)}
          {event.locationCity && ` · ${event.locationCity}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {total > 0 ? (
          <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{completedCount}</strong>/{total} done
            </span>
            {overdueCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdueCount} overdue
              </Badge>
            )}
          </div>
        ) : (
          <p className="mb-3 text-sm text-muted-foreground">No tasks yet</p>
        )}
        <Button variant="outline" asChild className="w-full">
          <a href={`/dashboard/events/${event.uuid}/tasks`}>Manage Tasks</a>
        </Button>
      </CardContent>
    </Card>
  );
}

function TasksLandingContent() {
  const { data: session, isLoading: sessionLoading } = useSession();

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
          <p className="text-muted-foreground">Please sign in to manage tasks.</p>
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <h3 className="font-medium">No events yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an event first to start managing tasks.
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

      {events.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventTaskCard key={event.uuid} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TasksLandingView() {
  return (
    <QueryProvider>
      <TasksLandingContent />
    </QueryProvider>
  );
}
