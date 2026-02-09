import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  useVenues,
  useLinkVenue,
  BOOKING_STATUSES,
  type VenueResponse,
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

const venueTypeLabels: Record<string, string> = {
  banquet_hall: 'Banquet Hall',
  outdoor: 'Outdoor',
  hotel: 'Hotel',
  restaurant: 'Restaurant',
  conference_center: 'Conference Center',
  other: 'Other',
};

interface LinkVenueDialogProps {
  eventUuid: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function LinkVenueDialog({ eventUuid, trigger, onSuccess }: LinkVenueDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<VenueResponse | null>(null);
  const [status, setStatus] = useState<BookingStatus>('inquiry');
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [notes, setNotes] = useState('');

  const venueFilters = search ? { search, limit: 10 } : { limit: 10 };
  const { data, isLoading } = useVenues(venueFilters);
  const linkMutation = useLinkVenue(eventUuid);

  const resetForm = () => {
    setSearch('');
    setSelectedVenue(null);
    setStatus('inquiry');
    setBookingDate(undefined);
    setQuoteAmount('');
    setNotes('');
  };

  const handleLink = async () => {
    if (!selectedVenue) return;

    await linkMutation.mutateAsync({
      venueUuid: selectedVenue.uuid,
      status,
      bookingDate: bookingDate ?? null,
      quoteAmount: quoteAmount ? parseFloat(quoteAmount) : null,
      notes: notes || null,
    });

    setOpen(false);
    resetForm();
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger ?? <Button>Link Venue</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Venue</DialogTitle>
        </DialogHeader>

        {!selectedVenue ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search Venues</Label>
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-20" />
                    </CardContent>
                  </Card>
                ))
              ) : data?.items.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No venues found.
                </p>
              ) : (
                data?.items.map((venue) => (
                  <Card
                    key={venue.uuid}
                    className="cursor-pointer transition-colors hover:bg-accent"
                    onClick={() => setSelectedVenue(venue)}
                  >
                    <CardContent className="flex items-center justify-between p-3">
                      <div>
                        <p className="text-sm font-medium">{venue.name}</p>
                        <p className="text-xs text-muted-foreground">{venue.city}, {venue.state}</p>
                      </div>
                      {venue.venueType && (
                        <Badge variant="outline">{venueTypeLabels[venue.venueType] ?? venue.venueType}</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">{selectedVenue.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedVenue.address}, {selectedVenue.city}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedVenue(null)}>
                  Change
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Booking Status</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as BookingStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Booking Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !bookingDate && 'text-muted-foreground'
                    )}
                    type="button"
                  >
                    {bookingDate
                      ? bookingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                      : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={bookingDate}
                    onSelect={(date) => {
                      setBookingDate(date);
                      setCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quoteAmount">Quote Amount</Label>
              <Input
                id="quoteAmount"
                type="number"
                step="0.01"
                min="0"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleLink} disabled={linkMutation.isPending}>
                {linkMutation.isPending ? 'Linking...' : 'Link Venue'}
              </Button>
            </div>

            {linkMutation.error && (
              <p className="text-sm text-destructive">{linkMutation.error.message}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
