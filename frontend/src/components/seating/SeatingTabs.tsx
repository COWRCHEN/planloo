import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStore } from '@nanostores/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { $activeSeatingTab } from '@/stores/seating';
import { TablePlannerView } from './TablePlannerView';
import { SeatingChartInner } from './SeatingChartView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

interface Props {
  eventUuid: string | undefined;
}

export function SeatingTabs({ eventUuid }: Props) {
  if (!eventUuid) return <p className="text-muted-foreground">No event UUID provided.</p>;

  return (
    <QueryClientProvider client={queryClient}>
      <SeatingTabsInner eventUuid={eventUuid} />
    </QueryClientProvider>
  );
}

function SeatingTabsInner({ eventUuid }: { eventUuid: string }) {
  const activeTab = useStore($activeSeatingTab);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => $activeSeatingTab.set(v as 'planner' | 'designer')}
    >
      <TabsList>
        <TabsTrigger value="planner">Table Planner</TabsTrigger>
        <TabsTrigger value="designer">Floor Plan Designer</TabsTrigger>
      </TabsList>
      <TabsContent value="planner" className="mt-4">
        <TablePlannerView eventUuid={eventUuid} />
      </TabsContent>
      <TabsContent value="designer" className="mt-4">
        <SeatingChartInner eventUuid={eventUuid} />
      </TabsContent>
    </Tabs>
  );
}
