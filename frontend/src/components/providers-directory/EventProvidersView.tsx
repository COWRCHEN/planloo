import { useState } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useSession } from '@/hooks/use-auth';
import { useEvent } from '@/hooks/use-events';
import { ProviderCategoryBadge } from './ProviderCategoryBadge';
import { LinkProviderDialog } from './LinkProviderDialog';
import { LinkVenueDialog } from './LinkVenueDialog';
import {
  useEventProviders,
  useEventVenues,
  useUpdateEventProvider,
  useUnlinkProvider,
  useUpdateEventVenue,
  useUnlinkVenue,
  useVenueAvailability,
  BOOKING_STATUSES,
  type BookingStatus,
} from '@/hooks/use-providers';

const statusLabels: Record<BookingStatus, string> = {
  inquiry: 'Inquiry',
  quoted: 'Quoted',
  booked: 'Booked',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function formatCurrency(amount: number | null, currency: string): string {
  if (amount === null) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

function VenueAvailabilityCheck({ venueUuid, eventDate }: { venueUuid: string; eventDate: string | null }) {
  const defaultDate = eventDate ? new Date(eventDate) : undefined;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(defaultDate);
  const [checkDate, setCheckDate] = useState<string | undefined>(
    defaultDate ? toDateString(defaultDate) : undefined
  );

  const { data: availability, isLoading } = useVenueAvailability(venueUuid, checkDate);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Availability:</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {selectedDate ? toDateString(selectedDate) : 'Pick a date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              if (date) setCheckDate(toDateString(date));
            }}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </PopoverContent>
      </Popover>
      {isLoading && <span className="text-xs text-muted-foreground">Checking...</span>}
      {!isLoading && availability && (
        <span className={`text-xs font-medium ${availability.available ? 'text-green-600' : 'text-destructive'}`}>
          {availability.available
            ? 'Available'
            : `Not available (${availability.conflictCount} booking${availability.conflictCount !== 1 ? 's' : ''})`}
        </span>
      )}
    </div>
  );
}

interface EventProvidersViewProps {
  eventUuid: string;
}

function EventProvidersContent({ eventUuid }: EventProvidersViewProps) {
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: event } = useEvent(eventUuid);
  const { data: providers, isLoading: providersLoading } = useEventProviders(eventUuid);
  const { data: venues, isLoading: venuesLoading } = useEventVenues(eventUuid);
  const eventDate = event?.startDate ?? null;
  const updateProviderMutation = useUpdateEventProvider(eventUuid);
  const unlinkProviderMutation = useUnlinkProvider(eventUuid);
  const updateVenueMutation = useUpdateEventVenue(eventUuid);
  const unlinkVenueMutation = useUnlinkVenue(eventUuid);

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
          <p className="text-muted-foreground">Please sign in to manage providers.</p>
          <Button asChild className="mt-4">
            <a href="/login">Sign in</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Linked Providers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Service Providers</h2>
          <LinkProviderDialog eventUuid={eventUuid} />
        </div>

        {providersLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !providers || providers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No providers linked yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Link service providers from the directory to manage bookings.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {providers.map((link) => (
              <Card key={link.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{link.provider.businessName}</p>
                          <ProviderCategoryBadge category={link.provider.category} />
                        </div>
                        <p className="text-sm text-muted-foreground">{link.provider.email}</p>
                        {link.quoteAmount !== null && (
                          <p className="mt-1 text-sm">
                            Quote: {formatCurrency(link.quoteAmount, link.currency)}
                            {link.finalAmount !== null && (
                              <span className="ml-2">Final: {formatCurrency(link.finalAmount, link.currency)}</span>
                            )}
                          </p>
                        )}
                        {link.notes && (
                          <p className="mt-1 text-sm text-muted-foreground">{link.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={link.status}
                        onValueChange={(val) =>
                          updateProviderMutation.mutate({
                            linkId: link.id,
                            data: { status: val as BookingStatus },
                          })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BOOKING_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm('Remove this provider from the event?')) {
                            unlinkProviderMutation.mutate(link.id);
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Linked Venues */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Venues</h2>
          <LinkVenueDialog eventUuid={eventUuid} />
        </div>

        {venuesLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !venues || venues.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No venues linked yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Link venues from the directory to manage bookings.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {venues.map((link) => (
              <Card key={link.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{link.venue.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {link.venue.address}, {link.venue.city}
                      </p>
                      {link.bookingDate && (
                        <p className="mt-1 text-sm">
                          Booking: {new Date(link.bookingDate).toLocaleDateString()}
                        </p>
                      )}
                      {link.quoteAmount !== null && (
                        <p className="mt-1 text-sm">
                          Quote: {formatCurrency(link.quoteAmount, link.currency)}
                          {link.finalAmount !== null && (
                            <span className="ml-2">Final: {formatCurrency(link.finalAmount, link.currency)}</span>
                          )}
                        </p>
                      )}
                      {link.notes && (
                        <p className="mt-1 text-sm text-muted-foreground">{link.notes}</p>
                      )}
                      <VenueAvailabilityCheck venueUuid={link.venue.uuid} eventDate={eventDate} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={link.status}
                        onValueChange={(val) =>
                          updateVenueMutation.mutate({
                            linkId: link.id,
                            data: { status: val as BookingStatus },
                          })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BOOKING_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm('Remove this venue from the event?')) {
                            unlinkVenueMutation.mutate(link.id);
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function EventProvidersView({ eventUuid }: EventProvidersViewProps) {
  return (
    <QueryProvider>
      <EventProvidersContent eventUuid={eventUuid} />
    </QueryProvider>
  );
}
