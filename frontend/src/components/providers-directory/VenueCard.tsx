import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VenueDialog } from './VenueDialog';
import type { VenueResponse } from '@/hooks/use-providers';

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

interface VenueCardProps {
  venue: VenueResponse;
  onSelect?: (venue: VenueResponse) => void;
  showCheckbox?: boolean;
  isChecked?: boolean;
  onToggleCheck?: (uuid: string) => void;
}

export function VenueCard({ venue, onSelect, showCheckbox, isChecked, onToggleCheck }: VenueCardProps) {
  const locationParts = [venue.city, venue.state, venue.country].filter(Boolean);

  return (
    <Card className="relative flex flex-col">
      {showCheckbox && (
        <div className="absolute left-3 top-3 z-10">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => onToggleCheck?.(venue.uuid)}
            className="h-4 w-4 rounded border-gray-300"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{venue.name}</CardTitle>
          {venue.venueType && (
            <Badge variant="outline">{venueTypeLabels[venue.venueType] ?? venue.venueType}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        {venue.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{venue.description}</p>
        )}
        <div className="mt-auto space-y-1.5 text-sm">
          {(venue.capacityMin || venue.capacityMax) && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {venue.capacityMin && venue.capacityMax
                ? `${venue.capacityMin}-${venue.capacityMax} guests`
                : venue.capacityMax
                  ? `Up to ${venue.capacityMax} guests`
                  : `From ${venue.capacityMin} guests`}
            </div>
          )}
          {venue.pricePerDay && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatCurrency(venue.pricePerDay, venue.currency)}/day
            </div>
          )}
          {locationParts.length > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {locationParts.join(', ')}
            </div>
          )}
          {venue.amenities && venue.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {venue.amenities.slice(0, 3).map((amenity) => (
                <Badge key={amenity} variant="secondary" className="text-xs">
                  {amenity}
                </Badge>
              ))}
              {venue.amenities.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{venue.amenities.length - 3}
                </Badge>
              )}
            </div>
          )}
          {venue.ratingCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-0.5 text-yellow-500">
                {'★'.repeat(Math.round(venue.ratingAverage))}{'☆'.repeat(5 - Math.round(venue.ratingAverage))}
              </span>
              <span className="text-muted-foreground">{venue.ratingAverage.toFixed(1)} ({venue.ratingCount})</span>
            </div>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            asChild
          >
            <a href={`/dashboard/providers/venues/${venue.uuid}`}>View Details</a>
          </Button>
          {venue.isOwner && (
            <VenueDialog
              venue={venue}
              trigger={
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              }
            />
          )}
          {onSelect && (
            <Button variant="outline" size="sm" onClick={() => onSelect(venue)}>
              Select
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
