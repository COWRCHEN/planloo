import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { VenueCard } from './VenueCard';
import { VenueFilters } from './VenueFilters';
import { VenueDialog } from './VenueDialog';
import { useVenues, type ListVenuesQuery, type VenueResponse } from '@/hooks/use-providers';

interface VenueListProps {
  onSelectVenue?: (venue: VenueResponse) => void;
}

export function VenueList({ onSelectVenue }: VenueListProps) {
  const [filters, setFilters] = useState<Partial<ListVenuesQuery>>({
    limit: 20,
    offset: 0,
  });

  const { data, isLoading, error } = useVenues(filters);
  const items = data?.items ?? [];
  const total = data?.meta?.total ?? 0;
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;
  const hasMore = offset + limit < total;
  const hasPrev = offset > 0;

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Failed to load venues.</p>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <VenueFilters filters={filters} onChange={setFilters} />
        <VenueDialog />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-6">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No venues found.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your filters or add a new venue.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((venue) => (
              <VenueCard
                key={venue.uuid}
                venue={venue}
                {...(onSelectVenue ? { onSelect: onSelectVenue } : {})}
              />
            ))}
          </div>

          {(hasPrev || hasMore) && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasPrev}
                  onClick={() => setFilters((prev) => ({ ...prev, offset: Math.max(0, offset - limit) }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasMore}
                  onClick={() => setFilters((prev) => ({ ...prev, offset: offset + limit }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
