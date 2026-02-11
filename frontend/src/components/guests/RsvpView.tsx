/**
 * RSVP View
 *
 * Public RSVP form for guests to respond to event invitations.
 * Enforces RSVP settings: deadline, enable/disable, maybe toggle, update policy.
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
import { CustomFields } from '@/components/guests/fields/CustomFields';

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
  const [plusOnesCountAdults, setPlusOnesCountAdults] = useState(0);
  const [plusOnesCountChildren, setPlusOnesCountChildren] = useState(0);
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [needsAccommodation, setNeedsAccommodation] = useState(false);
  const [hotelName, setHotelName] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [mealChoice, setMealChoice] = useState('');
  const [notes, setNotes] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressZipCode, setAddressZipCode] = useState('');
  const [addressCountry, setAddressCountry] = useState('');
  const [transportationNeeded, setTransportationNeeded] = useState(false);
  const [accessibilityNeeds, setAccessibilityNeeds] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);

  // Sync state from guest data when first loaded
  // IMPORTANT: must be before any early returns to satisfy Rules of Hooks
  useEffect(() => {
    if (!data?.guest) return;
    setDietaryRestrictions(data.guest.dietaryRestrictions ?? '');
    setNeedsAccommodation(!!data.guest.needsAccommodation);
    setHotelName(data.guest.hotelName ?? '');
    setPlusOnesCountAdults(data.guest.plusOnesCountAdults ?? 0);
    setPlusOnesCountChildren(data.guest.plusOnesCountChildren ?? 0);
    const cin = data.guest.checkInDate;
    const cout = data.guest.checkOutDate;
    const guestCheckIn = cin ? (typeof cin === 'string' ? cin.slice(0, 10) : new Date(cin).toISOString().slice(0, 10)) : '';
    const guestCheckOut = cout ? (typeof cout === 'string' ? cout.slice(0, 10) : new Date(cout).toISOString().slice(0, 10)) : '';
    setCheckInDate(guestCheckIn || (data.guestSettings?.accommodationCheckInDate ?? ''));
    setCheckOutDate(guestCheckOut || (data.guestSettings?.accommodationCheckOutDate ?? ''));
    // Configurable fields
    setMealChoice(data.guest.mealChoice ?? '');
    setNotes(data.guest.notes ?? '');
    setAddressStreet(data.guest.addressStreet ?? '');
    setAddressCity(data.guest.addressCity ?? '');
    setAddressState(data.guest.addressState ?? '');
    setAddressZipCode(data.guest.addressZipCode ?? '');
    setAddressCountry(data.guest.addressCountry ?? '');
    setTransportationNeeded(!!data.guest.transportationNeeded);
    setAccessibilityNeeds(data.guest.accessibilityNeeds ?? '');
    setCustomFieldValues(data.guest.customFieldData ?? {});
  }, [data?.guest, data?.guestSettings?.accommodationCheckInDate, data?.guestSettings?.accommodationCheckOutDate]);

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

  const { event, guest, guestSettings, rsvpSettings } = data;
  const location = formatLocation(event);
  const hasResponded = !!guest.rsvpRespondedAt;
  const guestName = guest.lastName
    ? `${guest.firstName} ${guest.lastName}`
    : guest.firstName;

  const accommodationHotels = guestSettings?.enableAccommodation ? (guestSettings.accommodationHotels ?? []) : [];
  const canRespond = rsvpSettings?.canRespond !== false;
  const allowMaybe = rsvpSettings?.allowMaybeResponse !== false;

  // Compute which configurable fields to show (from effective rsvpFormFields)
  const ff = rsvpSettings?.rsvpFormFields;
  const showDietary = ff?.dietaryRestrictions !== false; // default true for backward compat
  const showMealChoice = ff?.mealChoice === true;
  const showNotes = ff?.notes === true;
  const showAddress = ff?.address === true;
  const showTransportation = ff?.transportation === true;
  const showAccessibility = ff?.accessibility === true;
  const showCustomFields = ff?.customFields === true;

  const mealChoiceOptions = guestSettings?.mealChoiceOptions ?? [];
  const customFieldDefinitions = guestSettings?.customFieldDefinitions ?? [];

  const handleSubmit = async () => {
    if (!selectedStatus) return;

    const submitData: RsvpSubmitInput = {
      rsvpStatus: selectedStatus,
    };
    if (showDietary) {
      submitData.dietaryRestrictions = dietaryRestrictions || null;
    }
    if (selectedStatus === 'confirmed') {
      submitData.plusOnesCountAdults = plusOnesCountAdults;
      submitData.plusOnesCountChildren = plusOnesCountChildren;
    }
    if (data.guestSettings?.enableAccommodation) {
      submitData.needsAccommodation = needsAccommodation;
      submitData.hotelName = needsAccommodation ? (hotelName || null) : null;
      submitData.checkInDate = needsAccommodation && checkInDate ? checkInDate : null;
      submitData.checkOutDate = needsAccommodation && checkOutDate ? checkOutDate : null;
    }
    // Configurable fields
    if (showMealChoice) submitData.mealChoice = mealChoice || null;
    if (showNotes) submitData.notes = notes || null;
    if (showAddress) {
      submitData.addressStreet = addressStreet || null;
      submitData.addressCity = addressCity || null;
      submitData.addressState = addressState || null;
      submitData.addressZipCode = addressZipCode || null;
      submitData.addressCountry = addressCountry || null;
    }
    if (showTransportation) submitData.transportationNeeded = transportationNeeded;
    if (showAccessibility) submitData.accessibilityNeeds = accessibilityNeeds || null;
    if (showCustomFields && Object.keys(customFieldValues).length > 0) {
      submitData.customFieldData = customFieldValues;
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
          {rsvpSettings?.confirmationMessage && (
            <p className="text-muted-foreground mt-4 italic">
              {rsvpSettings.confirmationMessage}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // RSVP Disabled
  if (rsvpSettings && !rsvpSettings.enabled) {
    return (
      <Card className="max-w-2xl mx-auto">
        {event.coverImageUrl && (
          <div className="aspect-video w-full overflow-hidden rounded-t-lg">
            <img src={event.coverImageUrl} alt={event.title} className="h-full w-full object-cover" />
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-2xl">{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-muted-foreground">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h3 className="text-lg font-medium">RSVP Not Available</h3>
          <p className="text-muted-foreground mt-2">
            RSVP is not currently available for this event. Please contact the event organizer.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Deadline Passed
  if (rsvpSettings?.deadlinePassed) {
    return (
      <Card className="max-w-2xl mx-auto">
        {event.coverImageUrl && (
          <div className="aspect-video w-full overflow-hidden rounded-t-lg">
            <img src={event.coverImageUrl} alt={event.title} className="h-full w-full object-cover" />
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-2xl">{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-amber-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium">RSVP Deadline Passed</h3>
          <p className="text-muted-foreground mt-2">
            The RSVP deadline for this event was{' '}
            {rsvpSettings.rsvpDeadline
              ? new Date(rsvpSettings.rsvpDeadline).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })
              : 'earlier'}.
            Please contact the event organizer if you still need to respond.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Already responded and updates not allowed
  if (hasResponded && !canRespond) {
    const statusLabels: Record<string, string> = {
      confirmed: 'Attending',
      declined: 'Not Attending',
      maybe: 'Maybe',
    };
    const statusColors: Record<string, string> = {
      confirmed: 'text-green-600',
      declined: 'text-red-600',
      maybe: 'text-amber-600',
    };
    return (
      <Card className="max-w-2xl mx-auto">
        {event.coverImageUrl && (
          <div className="aspect-video w-full overflow-hidden rounded-t-lg">
            <img src={event.coverImageUrl} alt={event.title} className="h-full w-full object-cover" />
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-2xl">{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-blue-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium">Already Responded</h3>
          <p className="text-muted-foreground mt-2">
            Hi {guestName}, you have already responded to this invitation.
          </p>
          <p className={`mt-2 font-semibold ${statusColors[guest.rsvpStatus] ?? ''}`}>
            Your response: {statusLabels[guest.rsvpStatus] ?? guest.rsvpStatus}
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            The organizer does not allow response updates. Please contact them directly if you need to change your response.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Build available status options
  const statusOptions: Array<{ value: 'confirmed' | 'maybe' | 'declined'; label: string }> = [
    { value: 'confirmed', label: "Yes, I'll be there" },
  ];
  if (allowMaybe) {
    statusOptions.push({ value: 'maybe', label: 'Maybe' });
  }
  statusOptions.push({ value: 'declined', label: "Sorry, can't make it" });

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

        {/* RSVP Deadline Banner */}
        {rsvpSettings?.rsvpDeadline && !rsvpSettings.deadlinePassed && (
          <Alert>
            <AlertDescription>
              Please respond by{' '}
              <span className="font-medium">
                {new Date(rsvpSettings.rsvpDeadline).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
            </AlertDescription>
          </Alert>
        )}

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
            {statusOptions.map((opt) => (
              <Button
                key={opt.value}
                variant={selectedStatus === opt.value ? 'default' : 'outline'}
                onClick={() => setSelectedStatus(opt.value)}
                className="flex-1 min-w-[100px]"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Plus Ones – adults and children (only show if confirmed and allowed) */}
        {selectedStatus === 'confirmed' && guest.plusOnesAllowed > 0 && (
          <div className="space-y-2">
            <Label>How many additional guests? (max {guest.plusOnesAllowed} total)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="plusOnesAdults" className="text-sm font-normal text-muted-foreground">
                  Adults
                </Label>
                <Input
                  id="plusOnesAdults"
                  type="number"
                  min={0}
                  max={guest.plusOnesAllowed}
                  value={plusOnesCountAdults}
                  onChange={(e) => {
                    const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                    setPlusOnesCountAdults(Math.min(guest.plusOnesAllowed, v));
                    if (v + plusOnesCountChildren > guest.plusOnesAllowed) {
                      setPlusOnesCountChildren(Math.max(0, guest.plusOnesAllowed - v));
                    }
                  }}
                  className="w-24"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="plusOnesChildren" className="text-sm font-normal text-muted-foreground">
                  Children
                </Label>
                <Input
                  id="plusOnesChildren"
                  type="number"
                  min={0}
                  max={guest.plusOnesAllowed}
                  value={plusOnesCountChildren}
                  onChange={(e) => {
                    const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                    setPlusOnesCountChildren(Math.min(guest.plusOnesAllowed, v));
                    if (plusOnesCountAdults + v > guest.plusOnesAllowed) {
                      setPlusOnesCountAdults(Math.max(0, guest.plusOnesAllowed - v));
                    }
                  }}
                  className="w-24"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {plusOnesCountAdults + plusOnesCountChildren} of {guest.plusOnesAllowed}
            </p>
          </div>
        )}

        {/* Dietary Restrictions (only for confirmed/maybe and when enabled) */}
        {showDietary && (selectedStatus === 'confirmed' || selectedStatus === 'maybe') && (
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

        {/* Meal Choice (only when enabled and confirmed/maybe) */}
        {showMealChoice && mealChoiceOptions.length > 0 && (selectedStatus === 'confirmed' || selectedStatus === 'maybe') && (
          <div className="space-y-2">
            <Label>Meal Choice{guestSettings?.requiredMealChoice ? '' : ' (optional)'}</Label>
            <Select value={mealChoice} onValueChange={setMealChoice}>
              <SelectTrigger>
                <SelectValue placeholder="Select a meal option" />
              </SelectTrigger>
              <SelectContent>
                {mealChoiceOptions.map((opt) => (
                  <SelectItem key={opt.key} value={opt.key}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Notes (only when enabled and confirmed/maybe) */}
        {showNotes && (selectedStatus === 'confirmed' || selectedStatus === 'maybe') && (
          <div className="space-y-2">
            <Label htmlFor="rsvpNotes">Notes (optional)</Label>
            <Textarea
              id="rsvpNotes"
              placeholder="Any message or notes for the organizer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={1000}
            />
          </div>
        )}

        {/* Address (only when enabled and confirmed/maybe) */}
        {showAddress && (selectedStatus === 'confirmed' || selectedStatus === 'maybe') && (
          <div className="space-y-3 rounded-lg border p-4">
            <Label className="font-medium">Mailing Address{guestSettings?.requiredAddress ? '' : ' (optional)'}</Label>
            <div className="space-y-2">
              <Input
                placeholder="Street address"
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="City"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                />
                <Input
                  placeholder="State / Province"
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="ZIP / Postal code"
                  value={addressZipCode}
                  onChange={(e) => setAddressZipCode(e.target.value)}
                />
                <Input
                  placeholder="Country"
                  value={addressCountry}
                  onChange={(e) => setAddressCountry(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Transportation (only when enabled and confirmed/maybe) */}
        {showTransportation && (selectedStatus === 'confirmed' || selectedStatus === 'maybe') && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Switch
              id="transportationNeeded"
              checked={transportationNeeded}
              onCheckedChange={setTransportationNeeded}
            />
            <Label htmlFor="transportationNeeded" className="font-normal">
              I need transportation assistance
            </Label>
          </div>
        )}

        {/* Accessibility (only when enabled and confirmed/maybe) */}
        {showAccessibility && (selectedStatus === 'confirmed' || selectedStatus === 'maybe') && (
          <div className="space-y-2">
            <Label htmlFor="accessibility">Accessibility Needs{guestSettings?.requiredAccessibility ? '' : ' (optional)'}</Label>
            <Textarea
              id="accessibility"
              placeholder="Any accessibility requirements..."
              value={accessibilityNeeds}
              onChange={(e) => setAccessibilityNeeds(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>
        )}

        {/* Custom Fields (only when enabled and confirmed/maybe) */}
        {showCustomFields && customFieldDefinitions.length > 0 && (selectedStatus === 'confirmed' || selectedStatus === 'maybe') && (
          <div className="space-y-2 rounded-lg border p-4">
            <Label className="font-medium">Additional Information</Label>
            <CustomFields
              definitions={customFieldDefinitions}
              values={customFieldValues}
              onChange={setCustomFieldValues}
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
                    {(() => {
                      const selectedHotel = accommodationHotels.find((h) => h.name === hotelName);
                      if (!selectedHotel) return null;
                      const parts = [
                        [selectedHotel.streetNo, selectedHotel.street].filter(Boolean).join(' '),
                        selectedHotel.city,
                        [selectedHotel.state, selectedHotel.zip].filter(Boolean).join(' '),
                        selectedHotel.country,
                      ].filter(Boolean);
                      return parts.length > 0 ? (
                        <p className="text-xs text-muted-foreground">{parts.join(', ')}</p>
                      ) : null;
                    })()}
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
              {(submitRsvp.error as Error)?.message || 'Failed to submit your response. Please try again.'}
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
