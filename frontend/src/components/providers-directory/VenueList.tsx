import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VenueCard } from './VenueCard';
import { VenueFilters } from './VenueFilters';
import { VenueDialog } from './VenueDialog';
import { VenueCompareView } from './VenueCompareView';
import { useVenues, type ListVenuesQuery, type VenueResponse } from '@/hooks/use-providers';
import { useUserLocation } from '@/hooks/use-location';
import { NearYouBanner } from './NearYouBanner';

interface VenueListProps {
  onSelectVenue?: (venue: VenueResponse) => void;
}

export function VenueList({ onSelectVenue }: VenueListProps) {
  const [filters, setFilters] = useState<Partial<ListVenuesQuery>>({
    limit: 20,
    offset: 0,
  });
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  type NearbyTier = 'city' | 'state' | 'country';
  const nearbyLocationRef = useRef<{ city: string | null; state: string | null; country: string } | null>(null);
  const [nearbyTier, setNearbyTier] = useState<NearbyTier | null>(null);

  const { data: locationData } = useUserLocation();
  const { data, isLoading, error } = useVenues(filters);
  const items = data?.items ?? [];
  const total = data?.meta?.total ?? 0;
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;
  const hasMore = offset + limit < total;
  const hasPrev = offset > 0;

  const toggleCompareSelect = (uuid: string) => {
    setSelectedForCompare((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) {
        next.delete(uuid);
      } else if (next.size < 3) {
        next.add(uuid);
      }
      return next;
    });
  };

  const removeFromCompare = (uuid: string) => {
    setSelectedForCompare((prev) => {
      const next = new Set(prev);
      next.delete(uuid);
      return next;
    });
    if (selectedForCompare.size <= 1) {
      setShowCompareDialog(false);
    }
  };

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
        <div className="flex items-center gap-2">
          <Button
            variant={compareMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) {
                setSelectedForCompare(new Set());
              }
            }}
          >
            {compareMode ? 'Cancel Compare' : 'Compare'}
          </Button>
          <VenueDialog />
        </div>
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
                showCheckbox={compareMode}
                isChecked={selectedForCompare.has(venue.uuid)}
                onToggleCheck={toggleCompareSelect}
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

      {/* Floating compare button */}
      {compareMode && selectedForCompare.size >= 2 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <Button
            size="lg"
            className="shadow-lg"
            onClick={() => setShowCompareDialog(true)}
          >
            Compare {selectedForCompare.size} venues
          </Button>
        </div>
      )}

      {/* Compare dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Venue Comparison</DialogTitle>
          </DialogHeader>
          <VenueCompareView
            venueUuids={Array.from(selectedForCompare)}
            onRemove={removeFromCompare}
            onClose={() => setShowCompareDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
