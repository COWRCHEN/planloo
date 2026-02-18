import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
      <SeatingChartInner eventUuid={eventUuid} />
    </QueryClientProvider>
  );
}
