import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNearbyVenues } from '@/hooks/use-providers';

interface NearbyVenueSuggestionsProps {
  city: string;
  postalCode: string;
  country: string;
}

export function NearbyVenueSuggestions({ city, postalCode, country }: NearbyVenueSuggestionsProps) {
  const [debouncedParams, setDebouncedParams] = useState({ city, postalCode, country });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedParams({ city, postalCode, country });
    }, 500);
    return () => clearTimeout(timeout);
  }, [city, postalCode, country]);

  const hasSearch = !!(debouncedParams.city || debouncedParams.postalCode);

  const { data: venues, isLoading } = useNearbyVenues(
    hasSearch
      ? {
          ...(debouncedParams.city ? { city: debouncedParams.city } : {}),
          ...(debouncedParams.postalCode ? { postalCode: debouncedParams.postalCode } : {}),
          ...(debouncedParams.country ? { country: debouncedParams.country } : {}),
          limit: 5,
        }
      : undefined
  );

  if (!hasSearch) return null;

  return (
    <div className="space-y-3 pt-2">
      <h4 className="text-sm font-medium text-muted-foreground">Nearby Venues</h4>
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}
      {!isLoading && venues && venues.length === 0 && (
        <p className="text-sm text-muted-foreground">No venues found nearby.</p>
      )}
      {!isLoading && venues && venues.length > 0 && (
        <div className="space-y-2">
          {venues.map((venue) => (
            <Card key={venue.uuid} className="p-0">
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{venue.name}</span>
                    {venue.venueType && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {venue.venueType.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{[venue.city, venue.state].filter(Boolean).join(', ')}</span>
                    {venue.ratingCount > 0 && (
                      <span className="flex items-center gap-0.5">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {venue.ratingAverage.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="shrink-0" asChild>
                  <a href={`/dashboard/providers/venues/${venue.uuid}`} target="_blank" rel="noopener noreferrer">
                    View
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
