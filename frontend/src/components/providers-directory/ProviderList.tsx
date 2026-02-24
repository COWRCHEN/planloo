import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProviderCard } from './ProviderCard';
import { ProviderFilters } from './ProviderFilters';
import { ProviderDialog } from './ProviderDialog';
import { useProviders, type ListProvidersQuery, type ServiceProviderResponse } from '@/hooks/use-providers';
import { useUserLocation } from '@/hooks/use-location';
import { NearYouBanner } from './NearYouBanner';

interface ProviderListProps {
  onSelectProvider?: (provider: ServiceProviderResponse) => void;
}

export function ProviderList({ onSelectProvider }: ProviderListProps) {
  const [filters, setFilters] = useState<Partial<ListProvidersQuery>>({
    limit: 20,
    offset: 0,
  });

  type NearbyTier = 'city' | 'state' | 'country';
  const nearbyLocationRef = useRef<{ city: string | null; state: string | null; country: string } | null>(null);
  const [nearbyTier, setNearbyTier] = useState<NearbyTier | null>(null);

  const { data: locationData } = useUserLocation();
  const { data, isLoading, error } = useProviders(filters);
  const items = data?.items ?? [];
  const total = data?.meta?.total ?? 0;
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;
  const hasMore = offset + limit < total;
  const hasPrev = offset > 0;

  // Auto-broaden: city → state → country when each tier returns 0 results
  useEffect(() => {
    if (!nearbyTier || isLoading) return;
    if ((data?.meta?.total ?? 0) > 0) return;
    const loc = nearbyLocationRef.current;
    if (!loc) return;

    if (nearbyTier === 'city') {
      if (loc.state) {
        setNearbyTier('state');
        setFilters((prev) => ({ ...prev, city: undefined, state: loc.state!, country: loc.country, offset: 0 }));
      } else {
        setNearbyTier('country');
        setFilters((prev) => ({ ...prev, city: undefined, country: loc.country, offset: 0 }));
      }
    } else if (nearbyTier === 'state') {
      setNearbyTier('country');
      setFilters((prev) => ({ ...prev, state: undefined, country: loc.country, offset: 0 }));
    }
  }, [data, isLoading, nearbyTier]);

  const detected = locationData?.detected ? locationData : null;
  const showBanner = !!detected && !nearbyTier;

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Failed to load providers.</p>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ProviderFilters filters={filters} onChange={setFilters} />
        <ProviderDialog />
      </div>

      {showBanner && (
        <NearYouBanner
          city={detected.city}
          state={detected.state}
          postalCode={detected.postalCode}
          country={detected.country}
          onApply={({ city, state, country }) => {
            nearbyLocationRef.current = { city: city ?? null, state: state ?? null, country };
            if (city) {
              setNearbyTier('city');
              setFilters((prev) => ({ ...prev, city, state: undefined, country, offset: 0 }));
            } else if (state) {
              setNearbyTier('state');
              setFilters((prev) => ({ ...prev, city: undefined, state, country, offset: 0 }));
            } else {
              setNearbyTier('country');
              setFilters((prev) => ({ ...prev, city: undefined, state: undefined, country, offset: 0 }));
            }
          }}
        />
      )}

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
            <p className="text-muted-foreground">No providers found.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your filters or add a new provider.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((provider) => (
              <ProviderCard
                key={provider.uuid}
                provider={provider}
                {...(onSelectProvider ? { onSelect: onSelectProvider } : {})}
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
