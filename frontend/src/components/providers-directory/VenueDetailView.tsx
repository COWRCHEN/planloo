import { useState } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { VenueStarRating } from './VenueStarRating';
import { VenueCommentForm } from './VenueCommentForm';
import { VenueDialog } from './VenueDialog';
import { VenueReviewsDialog, RatingBreakdownBars } from './VenueReviewsDialog';
import { useVenue, useDeleteVenue } from '@/hooks/use-providers';

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

interface VenueDetailViewProps {
  uuid: string;
}

function VenueDetailContent({ uuid }: VenueDetailViewProps) {
  const { data: venue, isLoading, error } = useVenue(uuid);
  const deleteVenue = useDeleteVenue();
  const [hoverOpen, setHoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">{error?.message ?? 'Venue not found.'}</p>
          <Button variant="outline" className="mt-4" asChild>
            <a href="/dashboard/providers">Back to directory</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild>
        <a href="/dashboard/providers">
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to directory
        </a>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{venue.name}</h1>
            {venue.venueType && (
              <Badge variant="outline">{venueTypeLabels[venue.venueType] ?? venue.venueType}</Badge>
            )}
          </div>
          {venue.ratingCount > 0 && (
            <>
              <Popover open={hoverOpen} onOpenChange={setHoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    onMouseEnter={() => setHoverOpen(true)}
                    onMouseLeave={() => setHoverOpen(false)}
                    onClick={() => { setHoverOpen(false); setDialogOpen(true); }}
                  >
                    <span className="flex items-center gap-0.5 text-yellow-500">
                      {'★'.repeat(Math.round(venue.ratingAverage))}{'☆'.repeat(5 - Math.round(venue.ratingAverage))}
                    </span>
                    <span>{venue.ratingAverage.toFixed(1)} ({venue.ratingCount} {venue.ratingCount === 1 ? 'review' : 'reviews'})</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-56 p-3"
                  onMouseEnter={() => setHoverOpen(true)}
                  onMouseLeave={() => setHoverOpen(false)}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  side="bottom"
                  align="start"
                >
                  {venue.ratingBreakdown
                    ? <RatingBreakdownBars breakdown={venue.ratingBreakdown} total={venue.ratingCount} />
                    : <p className="text-xs text-muted-foreground">No breakdown available</p>}
                  <button
                    type="button"
                    className="mt-2 w-full text-xs text-primary hover:underline text-left"
                    onClick={() => { setHoverOpen(false); setDialogOpen(true); }}
                  >
                    See all reviews
                  </button>
                </PopoverContent>
              </Popover>
              <VenueReviewsDialog
                venueUuid={venue.uuid}
                venueName={venue.name}
                ratingAverage={venue.ratingAverage}
                ratingCount={venue.ratingCount}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
              />
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {venue.isOwner && (
            <>
              <VenueDialog
                venue={venue}
                trigger={
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                }
              />
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteVenue.isPending}
                onClick={() => {
                  if (confirm('Are you sure you want to delete this venue?')) {
                    deleteVenue.mutate(venue.uuid, {
                      onSuccess: () => {
                        window.location.href = '/dashboard/providers';
                      },
                    });
                  }
                }}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {venue.description && (
        <p className="text-muted-foreground">{venue.description}</p>
      )}

      {/* Info grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Location card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{venue.address}</p>
            <p>{[venue.city, venue.state].filter(Boolean).join(', ')} {venue.postalCode}</p>
            <p>{venue.country}</p>
          </CardContent>
        </Card>

        {/* Capacity & Pricing card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Capacity & Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(venue.capacityMin || venue.capacityMax) && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capacity</span>
                <span>
                  {venue.capacityMin && venue.capacityMax
                    ? `${venue.capacityMin}-${venue.capacityMax}`
                    : venue.capacityMax
                      ? `Up to ${venue.capacityMax}`
                      : `From ${venue.capacityMin}`}
                </span>
              </div>
            )}
            {venue.pricePerHour !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price per hour</span>
                <span>{formatCurrency(venue.pricePerHour, venue.currency)}</span>
              </div>
            )}
            {venue.pricePerDay !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price per day</span>
                <span>{formatCurrency(venue.pricePerDay, venue.currency)}</span>
              </div>
            )}
            {!venue.capacityMin && !venue.capacityMax && venue.pricePerHour === null && venue.pricePerDay === null && (
              <p className="text-muted-foreground">No capacity or pricing info available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Amenities */}
      {venue.amenities && venue.amenities.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Amenities</h3>
          <div className="flex flex-wrap gap-2">
            {venue.amenities.map((amenity) => (
              <Badge key={amenity} variant="secondary">
                {amenity}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Contact section */}
      {(venue.contactEmail || venue.contactPhone || venue.website) && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Contact</h3>
          <div className="flex flex-wrap gap-2">
            {venue.contactEmail && (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${venue.contactEmail}`}>
                  <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {venue.contactEmail}
                </a>
              </Button>
            )}
            {venue.contactPhone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${venue.contactPhone}`}>
                  <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {venue.contactPhone}
                </a>
              </Button>
            )}
            {venue.website && (
              <Button variant="outline" size="sm" asChild>
                <a href={venue.website} target="_blank" rel="noopener noreferrer">
                  <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  Website
                </a>
              </Button>
            )}
          </div>
        </div>
      )}

      <Separator />

      {/* User's personal rating & comment */}
      <Accordion type="single" collapsible>
        <AccordionItem value="user-review" className="rounded-lg border px-4">
          <AccordionTrigger className="text-sm font-medium hover:no-underline">
            <div className="flex items-center gap-3">
              <span>Your Rating & Notes</span>
              {venue.userRating ? (
                <span className="flex items-center gap-1 text-yellow-500 text-xs font-normal">
                  {'★'.repeat(venue.userRating)}{'☆'.repeat(5 - venue.userRating)}
                  <span className="text-muted-foreground">{venue.userRating}/5</span>
                </span>
              ) : venue.userComment ? (
                <span className="text-xs text-muted-foreground font-normal truncate max-w-[200px]">
                  "{venue.userComment}"
                </span>
              ) : (
                <span className="text-xs text-muted-foreground font-normal">No rating yet</span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
            <div className="flex items-center gap-2">
              <VenueStarRating venueUuid={venue.uuid} userRating={venue.userRating} size="md" />
              {venue.userRating && (
                <span className="text-sm text-muted-foreground">{venue.userRating} / 5</span>
              )}
            </div>
            <VenueCommentForm venueUuid={venue.uuid} userComment={venue.userComment} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export function VenueDetailView({ uuid }: VenueDetailViewProps) {
  return (
    <QueryProvider>
      <VenueDetailContent uuid={uuid} />
    </QueryProvider>
  );
}
