/**
 * Event List
 *
 * Displays events in a grid/list with pagination.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EventCard } from './EventCard';
import { EventFilters } from './EventFilters';
import { EmptyEventState } from './EmptyEventState';
import { useEvents, type EventStatus, type EventType } from '@/hooks/use-events';

const ITEMS_PER_PAGE = 12;

function EventCardSkeleton() {
  return (
    <div className="rounded-lg border p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
}

export function EventList() {
  const [status, setStatus] = useState<EventStatus | undefined>(undefined);
  const [eventType, setEventType] = useState<EventType | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'startDate' | 'createdAt' | 'title'>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const filters = {
    ...(status && { status }),
    ...(eventType && { eventType }),
    sortBy,
    sortOrder,
    limit: ITEMS_PER_PAGE,
    offset: page * ITEMS_PER_PAGE,
  };
  const { data, isLoading, error } = useEvents(filters);

  const handleClearFilters = () => {
    setStatus(undefined);
    setEventType(undefined);
    setPage(0);
  };

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy as 'startDate' | 'createdAt' | 'title');
    setSortOrder(newSortOrder);
    setPage(0);
  };

  const hasFilters = status !== undefined || eventType !== undefined;
  const totalPages = Math.ceil((data?.meta?.total ?? 0) / ITEMS_PER_PAGE);

  if (error) {
    return (
      <div className="rounded-lg border bg-destructive/10 p-8 text-center">
        <p className="text-destructive">Failed to load events. Please try again.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <EventFilters
          status={status ?? undefined}
          eventType={eventType ?? undefined}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onStatusChange={(s) => {
            setStatus(s);
            setPage(0);
          }}
          onEventTypeChange={(t) => {
            setEventType(t);
            setPage(0);
          }}
          onSortChange={handleSortChange}
          onClearFilters={handleClearFilters}
        />
        <Button asChild>
          <a href="/dashboard/events/new">
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Event
          </a>
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data?.events.length === 0 && (
        <EmptyEventState hasFilters={hasFilters} onClearFilters={handleClearFilters} />
      )}

      {/* Events Grid */}
      {!isLoading && data?.events && data.events.length > 0 && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.events.map((event) => (
              <EventCard key={event.uuid} event={event} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="px-4 text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
