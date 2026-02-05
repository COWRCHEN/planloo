/**
 * Events View
 *
 * Main events page wrapper with QueryProvider.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventList } from './EventList';
import { useSession } from '@/hooks/use-auth';

function EventsContent() {
  const { data: session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading events...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please sign in to view your events.</p>
          <Button asChild className="mt-4">
            <a href="/login">Sign in</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <EventList />;
}

export function EventsView() {
  return (
    <QueryProvider>
      <EventsContent />
    </QueryProvider>
  );
}
