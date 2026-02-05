/**
 * Recent Events Component
 *
 * Displays the user's most recent events on the dashboard.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEvents, type EventResponse, type EventStatus } from '@/hooks/use-events';

const statusColors: Record<EventStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  planning: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  confirmed: 'bg-green-100 text-green-700 hover:bg-green-100',
  completed: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  cancelled: 'bg-red-100 text-red-700 hover:bg-red-100',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface EventItemProps {
  event: EventResponse;
}

function EventItem({ event }: EventItemProps) {
  return (
    <a
      href={`/dashboard/events/${event.uuid}`}
      className="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-medium">{event.title}</h4>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span>{formatDate(event.startDate)}</span>
          {event.locationCity && (
            <>
              <span>•</span>
              <span className="truncate">{event.locationCity}</span>
            </>
          )}
        </div>
      </div>
      <Badge variant="secondary" className={statusColors[event.status]}>
        {event.status}
      </Badge>
    </a>
  );
}

function EventItemSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

export function RecentEvents() {
  const { data, isLoading, error } = useEvents({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Events</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <a href="/dashboard/events">View all</a>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <EventItemSkeleton />
            <EventItemSkeleton />
            <EventItemSkeleton />
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">Failed to load recent events</p>
        ) : data?.events && data.events.length > 0 ? (
          <div className="space-y-3">
            {data.events.map((event) => (
              <EventItem key={event.uuid} event={event} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No events yet</p>
            <Button variant="link" asChild className="mt-2">
              <a href="/dashboard/events/new">Create your first event</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
