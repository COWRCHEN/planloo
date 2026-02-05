/**
 * Event Form View
 *
 * Wrapper for EventForm with QueryProvider for creating new events.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventForm } from './EventForm';
import { useSession } from '@/hooks/use-auth';
import type { EventResponse } from '@/hooks/use-events';

interface EventFormViewProps {
  event?: EventResponse | undefined;
  mode?: 'create' | 'edit' | undefined;
}

function EventFormContent({ event, mode = 'create' }: EventFormViewProps) {
  const { data: session, isLoading } = useSession();

  const handleSuccess = (result: EventResponse | undefined) => {
    if (result) {
      window.location.href = `/dashboard/events/${result.uuid}`;
    }
  };

  if (isLoading) {
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
          <p className="text-muted-foreground">Please sign in to {mode === 'create' ? 'create' : 'edit'} events.</p>
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
          <p className="text-muted-foreground">Please verify your email to {mode === 'create' ? 'create' : 'edit'} events.</p>
          <Button asChild variant="outline" className="mt-4">
            <a href="/dashboard/settings">Go to Settings</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <EventForm event={event} onSuccess={handleSuccess} />;
}

export function EventFormView({ event, mode = 'create' }: EventFormViewProps) {
  return (
    <QueryProvider>
      <EventFormContent event={event} mode={mode} />
    </QueryProvider>
  );
}
