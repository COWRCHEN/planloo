import { QueryProvider } from '@/components/providers/QueryProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from '@/hooks/use-auth';
import { ProviderList } from './ProviderList';
import { VenueList } from './VenueList';

function ProviderDirectoryContent() {
  const { data: session, isLoading: sessionLoading } = useSession();

  if (sessionLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please sign in to view the provider directory.</p>
          <Button asChild className="mt-4">
            <a href="/login">Sign in</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="providers" className="space-y-4">
      <TabsList>
        <TabsTrigger value="providers">Service Providers</TabsTrigger>
        <TabsTrigger value="venues">Venues</TabsTrigger>
      </TabsList>
      <TabsContent value="providers">
        <ProviderList />
      </TabsContent>
      <TabsContent value="venues">
        <VenueList />
      </TabsContent>
    </Tabs>
  );
}

export function ProviderDirectoryView() {
  return (
    <QueryProvider>
      <ProviderDirectoryContent />
    </QueryProvider>
  );
}
