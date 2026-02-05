/**
 * Event Edit View
 *
 * Wrapper for EventForm for editing an existing event.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EventForm } from './EventForm';
import { useEvent, type EventResponse } from '@/hooks/use-events';
import { useSession } from '@/hooks/use-auth';

interface EventEditViewProps {
  uuid: string;
}

function EventEditSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Card>
        <CardContent className="space-y-4 py-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function EventEditContent({ uuid }: EventEditViewProps) {
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: event, isLoading, error } = useEvent(uuid);

  const handleSuccess = (result: EventResponse | undefined) => {
    if (result) {
      window.location.href = `/dashboard/events/${result.uuid}`;
    }
  };

  if (sessionLoading || isLoading) {
    return <EventEditSkeleton />;
  }

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please sign in to edit this event.</p>
          <Button asChild className="mt-4">
            <a href="/login">Sign in</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!session.user.emailVerified) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please verify your email to edit events.</p>
          <Button asChild variant="outline" className="mt-4">
            <a href="/dashboard/settings">Go to Settings</a>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <a
          href={`/dashboard/events/${uuid}`}
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
          <h1 className="text-2xl font-bold sm:text-3xl">Edit Event</h1>
          <p className="text-muted-foreground">{event.title}</p>
        </div>
      </div>

      <EventForm event={event} onSuccess={handleSuccess} />
    </div>
  );
}

export function EventEditView({ uuid }: EventEditViewProps) {
  return (
    <QueryProvider>
      <EventEditContent uuid={uuid} />
    </QueryProvider>
  );
}
