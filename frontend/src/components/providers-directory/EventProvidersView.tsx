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
import { useSession } from '@/hooks/use-auth';
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

interface EventProvidersViewProps {
  eventUuid: string;
}

function EventProvidersContent({ eventUuid }: EventProvidersViewProps) {
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: providers, isLoading: providersLoading } = useEventProviders(eventUuid);
  const { data: venues, isLoading: venuesLoading } = useEventVenues(eventUuid);
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
