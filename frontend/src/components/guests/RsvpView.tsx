/**
 * RSVP View
 *
 * Public RSVP form for guests to respond to event invitations.
 */

import { useState, useEffect } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRsvpData, useSubmitRsvp, type RsvpSubmitInput } from '@/hooks/use-guests';

interface RsvpViewProps {
  token: string;
}

function formatDate(dateString: string, timezone?: string | null): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone || undefined,
  });
}

function formatLocation(data: {
  locationName?: string | null;
  locationAddress?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
}): string | null {
  const parts = [
    data.locationName,
    data.locationAddress,
    [data.locationCity, data.locationState].filter(Boolean).join(', '),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' | ') : null;
}

function RsvpContent({ token }: RsvpViewProps) {
  const { data, isLoading, error } = useRsvpData(token);
  const submitRsvp = useSubmitRsvp(token);
  const [selectedStatus, setSelectedStatus] = useState<'confirmed' | 'declined' | 'maybe' | null>(null);
  const [plusOnesCount, setPlusOnesCount] = useState(0);
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [needsAccommodation, setNeedsAccommodation] = useState(false);
  const [hotelName, setHotelName] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-destructive">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium">Invalid RSVP Link</h3>
          <p className="text-muted-foreground mt-2">
            This RSVP link is invalid or has expired. Please contact the event
            organizer for a new invitation.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { event, guest, guestSettings } = data;
  const location = formatLocation(event);
  const hasResponded = !!guest.rsvpRespondedAt;
  const guestName = guest.lastName
    ? `${guest.firstName} ${guest.lastName}`
    : guest.firstName;

  // Sync accommodation state from guest when data first loads; default dates from event when empty
  useEffect(() => {
    if (!data?.guest) return;
    setNeedsAccommodation(!!data.guest.needsAccommodation);
    setHotelName(data.guest.hotelName ?? '');
    const cin = data.guest.checkInDate;
    const cout = data.guest.checkOutDate;
    const guestCheckIn = cin ? (typeof cin === 'string' ? cin.slice(0, 10) : new Date(cin).toISOString().slice(0, 10)) : '';
    const guestCheckOut = cout ? (typeof cout === 'string' ? cout.slice(0, 10) : new Date(cout).toISOString().slice(0, 10)) : '';
    setCheckInDate(guestCheckIn || (data.guestSettings?.accommodationCheckInDate ?? ''));
    setCheckOutDate(guestCheckOut || (data.guestSettings?.accommodationCheckOutDate ?? ''));
  }, [data?.guest, data?.guestSettings?.accommodationCheckInDate, data?.guestSettings?.accommodationCheckOutDate]);

  const accommodationHotels = guestSettings?.enableAccommodation ? (guestSettings.accommodationHotels ?? []) : [];

  const handleSubmit = async () => {
    if (!selectedStatus) return;

    const submitData: RsvpSubmitInput = {
      rsvpStatus: selectedStatus,
      plusOnesCount: selectedStatus === 'confirmed' ? plusOnesCount : 0,
      dietaryRestrictions: dietaryRestrictions || null,
    };
    if (data.guestSettings?.enableAccommodation) {
      submitData.needsAccommodation = needsAccommodation;
      submitData.hotelName = needsAccommodation ? (hotelName || null) : null;
      submitData.checkInDate = needsAccommodation && checkInDate ? checkInDate : null;
      submitData.checkOutDate = needsAccommodation && checkOutDate ? checkOutDate : null;
    }

    await submitRsvp.mutateAsync(submitData);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-green-600">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium">Thank You!</h3>
          <p className="text-muted-foreground mt-2">
            Your response has been recorded. We look forward to{' '}
            {selectedStatus === 'confirmed' ? 'seeing you at' : 'hearing from you about'}{' '}
            {event.title}!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      {event.coverImageUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-t-lg">
          <img
            src={event.coverImageUrl}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <CardHeader>
        <CardTitle className="text-2xl">{event.title}</CardTitle>
        {event.description && (
          <CardDescription className="text-base">{event.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Event Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{formatDate(event.startDate, event.timezone)}</span>
          </div>

          {location && (
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>{location}</span>
            </div>
          )}
        </div>

        {/* Guest Greeting */}
        <div className="rounded-lg bg-muted p-4">
          <p className="font-medium">Hello {guestName}!</p>
          <p className="text-sm text-muted-foreground mt-1">
            {hasResponded
              ? `You previously responded "${guest.rsvpStatus}". You can update your response below.`
              : 'Please let us know if you can make it.'}
          </p>
        </div>

        {/* RSVP Options */}
        <div className="space-y-4">
          <Label>Will you be attending?</Label>
          <div className="flex flex-wrap gap-3">
            {(['confirmed', 'maybe', 'declined'] as const).map((status) => (
              <Button
                key={status}
                variant={selectedStatus === status ? 'default' : 'outline'}
                onClick={() => setSelectedStatus(status)}
                className="flex-1 min-w-[100px]"
              >
                {status === 'confirmed'
                  ? "Yes, I'll be there"
                  : status === 'maybe'
                    ? 'Maybe'
                    : "Sorry, can't make it"}
              </Button>
            ))}
          </div>
        </div>

        {/* Plus Ones (only show if confirmed and allowed) */}
        {selectedStatus === 'confirmed' && guest.plusOnesAllowed > 0 && (
          <div className="space-y-2">
            <Label htmlFor="plusOnes">
              Number of additional guests (max {guest.plusOnesAllowed})
            </Label>
            <Input
              id="plusOnes"
              type="number"
              min={0}
              max={guest.plusOnesAllowed}
              value={plusOnesCount}
              onChange={(e) =>
                setPlusOnesCount(
                  Math.min(guest.plusOnesAllowed, Math.max(0, parseInt(e.target.value) || 0))
                )
              }
              className="w-24"
            />
          </div>
        )}

        {/* Dietary Restrictions (only for confirmed/maybe) */}
        {(selectedStatus === 'confirmed' || selectedStatus === 'maybe') && (
          <div className="space-y-2">
            <Label htmlFor="dietary">Dietary Restrictions (optional)</Label>
            <Textarea
              id="dietary"
              placeholder="Any food allergies or dietary requirements..."
              value={dietaryRestrictions}
              onChange={(e) => setDietaryRestrictions(e.target.value)}
              rows={2}
            />
          </div>
        )}

        {/* Accommodation (only when enabled and confirmed/maybe) */}
        {guestSettings?.enableAccommodation &&
          accommodationHotels.length > 0 &&
          (selectedStatus === 'confirmed' || selectedStatus === 'maybe') && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="needsAccommodation"
                  checked={needsAccommodation}
                  onCheckedChange={setNeedsAccommodation}
                />
                <Label htmlFor="needsAccommodation" className="font-normal">
                  I need hotel accommodation
                </Label>
              </div>
              {needsAccommodation && (
                <>
                  <div className="space-y-2">
                    <Label>Hotel</Label>
                    <Select
                      value={hotelName}
                      onValueChange={(value) => {
                        setHotelName(value);
                        if (data.guestSettings?.accommodationCheckInDate) setCheckInDate(data.guestSettings.accommodationCheckInDate);
                        if (data.guestSettings?.accommodationCheckOutDate) setCheckOutDate(data.guestSettings.accommodationCheckOutDate);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select hotel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">
                          <span className="text-muted-foreground">Select hotel</span>
                        </SelectItem>
                        {accommodationHotels.map((h) => (
                          <SelectItem key={h.id} value={h.name}>
                            {h.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Check-in date</Label>
                      <Input
                        type="date"
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Check-out date</Label>
                      <Input
                        type="date"
                        value={checkOutDate}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        {/* Submit */}
        {submitRsvp.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to submit your response. Please try again.
            </AlertDescription>
          </Alert>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={!selectedStatus || submitRsvp.isPending}
        >
          {submitRsvp.isPending ? 'Submitting...' : 'Submit Response'}
        </Button>
      </CardContent>
    </Card>
  );
}

export function RsvpView({ token }: RsvpViewProps) {
  return (
    <QueryProvider>
      <RsvpContent token={token} />
    </QueryProvider>
  );
}
