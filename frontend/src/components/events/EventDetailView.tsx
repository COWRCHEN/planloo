/**
 * Event Detail View
 *
 * Displays full event details with actions.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EventStatusBadge } from './EventStatusBadge';
import { DeleteEventDialog } from './DeleteEventDialog';
import { useEvent } from '@/hooks/use-events';
import { useSession } from '@/hooks/use-auth';

interface EventDetailViewProps {
  uuid: string;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount);
}

const eventTypeLabels: Record<string, string> = {
  wedding: 'Wedding',
  birthday: 'Birthday',
  corporate: 'Corporate Event',
  conference: 'Conference',
  other: 'Other',
};

function EventDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EventDetailContent({ uuid }: EventDetailViewProps) {
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: event, isLoading, error } = useEvent(uuid);

  const handleDeleted = () => {
    window.location.href = '/dashboard/events';
  };

  if (sessionLoading || isLoading) {
    return <EventDetailSkeleton />;
  }

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please sign in to view this event.</p>
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
          <p className="text-destructive">Failed to load event.</p>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <Button asChild variant="outline" className="mt-4">
            <a href="/dashboard/events">Back to Events</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!event) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Event not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <a href="/dashboard/events">Back to Events</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const locationParts = [
    event.locationAddress,
    event.locationCity,
    event.locationState,
    event.locationPostalCode,
    event.locationCountry,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <a
            href="/dashboard/events"
            className="flex h-10 w-10 items-center justify-center rounded-lg border hover:bg-muted"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </a>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold sm:text-3xl">{event.title}</h1>
              <EventStatusBadge status={event.status} />
            </div>
            {event.eventType && (
              <p className="text-muted-foreground">{eventTypeLabels[event.eventType]}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={`/dashboard/events/${event.uuid}/guests`}>Guest List</a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/dashboard/events/${event.uuid}/budget`}>Budget</a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/dashboard/events/${event.uuid}/providers`}>Providers</a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/dashboard/events/${event.uuid}/notifications`}>Notifications</a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/dashboard/events/${event.uuid}/settings`}>Settings</a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/dashboard/events/${event.uuid}/edit`}>Edit</a>
          </Button>
          <DeleteEventDialog
            uuid={event.uuid}
            eventTitle={event.title}
            onDeleted={handleDeleted}
          />
        </div>
      </div>

      {/* Cover Image */}
      {event.coverImageUrl && (
        <div className="aspect-video overflow-hidden rounded-lg">
          <img
            src={event.coverImageUrl}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Date & Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Date & Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Start</dt>
                <dd className="font-medium">
                  {formatDate(event.startDate)}
                  {event.startDate && ` at ${formatTime(event.startDate)}`}
                </dd>
              </div>
              {event.endDate && (
                <div>
                  <dt className="text-muted-foreground">End</dt>
                  <dd className="font-medium">
                    {formatDate(event.endDate)} at {formatTime(event.endDate)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Timezone</dt>
                <dd>{event.timezone || 'UTC'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            {locationParts.length > 0 || event.locationName ? (
              <dl className="space-y-3 text-sm">
                {event.locationName && (
                  <div>
                    <dt className="text-muted-foreground">Venue</dt>
                    <dd className="font-medium">{event.locationName}</dd>
                  </div>
                )}
                {locationParts.length > 0 && (
                  <div>
                    <dt className="text-muted-foreground">Address</dt>
                    <dd>{locationParts.join(', ')}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No location set</p>
            )}
          </CardContent>
        </Card>

        {/* Guests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Guests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Expected</dt>
                <dd className="font-medium">{event.guestCountExpected ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Confirmed</dt>
                <dd className="font-medium">{event.guestCountConfirmed ?? 0}</dd>
              </div>
            </dl>
            <div className="mt-4 flex gap-2">
              <Button size="sm" asChild>
                <a href={`/dashboard/events/${event.uuid}/guests`}>Manage Guests</a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={`/dashboard/events/${event.uuid}/checkin`}>Check-In</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Budget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Total Budget</dt>
                <dd className="text-xl font-bold">
                  {formatCurrency(event.budgetTotal, event.budgetCurrency)}
                </dd>
              </div>
            </dl>
            <div className="mt-4">
              <Button size="sm" asChild>
                <a href={`/dashboard/events/${event.uuid}/budget`}>Manage Budget</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {event.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{event.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Created: {new Date(event.createdAt).toLocaleDateString()}</span>
            <span>Updated: {new Date(event.updatedAt).toLocaleDateString()}</span>
            <span>Visibility: {event.isPublic ? 'Public' : 'Private'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function EventDetailView({ uuid }: EventDetailViewProps) {
  return (
    <QueryProvider>
      <EventDetailContent uuid={uuid} />
    </QueryProvider>
  );
}
