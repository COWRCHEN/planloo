/**
 * Guest List View
 *
 * Main guest list page wrapper with QueryProvider.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GuestList } from './GuestList';
import { useSession } from '@/hooks/use-auth';

interface GuestListViewProps {
  eventUuid: string;
}

function GuestListContent({ eventUuid }: GuestListViewProps) {
  const { data: session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading guests...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please sign in to view guests.</p>
          <Button asChild className="mt-4">
            <a href="/login">Sign in</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <GuestList eventUuid={eventUuid} />;
}

export function GuestListView({ eventUuid }: GuestListViewProps) {
  return (
    <QueryProvider>
      <GuestListContent eventUuid={eventUuid} />
    </QueryProvider>
  );
}
