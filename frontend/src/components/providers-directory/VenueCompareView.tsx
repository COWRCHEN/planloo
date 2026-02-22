import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useVenue } from '@/hooks/use-providers';

const venueTypeLabels: Record<string, string> = {
  banquet_hall: 'Banquet Hall',
  outdoor: 'Outdoor',
  hotel: 'Hotel',
  restaurant: 'Restaurant',
  conference_center: 'Conference Center',
  other: 'Other',
};

function formatCurrency(amount: number | null, currency: string): string {
  if (amount === null) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

interface VenueCompareViewProps {
  venueUuids: string[];
  onRemove: (uuid: string) => void;
  onClose: () => void;
}

function VenueColumn({ uuid, onRemove }: { uuid: string; onRemove: (uuid: string) => void }) {
  const { data: venue, isLoading } = useVenue(uuid);

  if (isLoading) {
    return (
      <div className="min-w-[200px] flex-1 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-w-[200px] flex-1 text-center text-sm text-muted-foreground">
        Venue not found
      </div>
    );
  }

  return (
    <div className="min-w-[200px] flex-1">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug">{venue.name}</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onRemove(uuid)}>
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      {/* Rows */}
      <div className="space-y-2 text-sm">
        <Row label="Type" value={venue.venueType ? venueTypeLabels[venue.venueType] ?? venue.venueType : '-'} />
        <Row label="Location" value={[venue.city, venue.state, venue.country].filter(Boolean).join(', ') || '-'} />
        <Row
          label="Capacity"
          value={
            venue.capacityMin && venue.capacityMax
              ? `${venue.capacityMin}-${venue.capacityMax}`
              : venue.capacityMax
                ? `Up to ${venue.capacityMax}`
                : venue.capacityMin
                  ? `From ${venue.capacityMin}`
                  : '-'
          }
        />
        <Row label="Price/Hour" value={formatCurrency(venue.pricePerHour, venue.currency)} />
        <Row label="Price/Day" value={formatCurrency(venue.pricePerDay, venue.currency)} />
        <div>
          <span className="text-muted-foreground">Amenities</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {venue.amenities && venue.amenities.length > 0 ? (
              venue.amenities.map((a) => (
                <Badge key={a} variant="secondary" className="text-xs">
                  {a}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        </div>
        <Row
          label="Rating"
          value={venue.ratingCount > 0 ? `${venue.ratingAverage.toFixed(1)} (${venue.ratingCount})` : '-'}
        />
        <div>
          <span className="text-muted-foreground">Contact</span>
          <div className="mt-1 space-y-1 text-xs">
            {venue.contactEmail && <div>{venue.contactEmail}</div>}
            {venue.contactPhone && <div>{venue.contactPhone}</div>}
            {venue.website && (
              <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Website
              </a>
            )}
            {!venue.contactEmail && !venue.contactPhone && !venue.website && (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

export function VenueCompareView({ venueUuids, onRemove, onClose }: VenueCompareViewProps) {
  if (venueUuids.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No venues selected for comparison.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Compare Venues</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-4">
          {venueUuids.map((uuid) => (
            <Card key={uuid} className="flex-1 min-w-[220px]">
              <CardContent className="p-4">
                <VenueColumn uuid={uuid} onRemove={onRemove} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
