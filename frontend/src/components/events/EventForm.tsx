/**
 * Event Form
 *
 * Multi-step form for creating and editing events.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreateEvent, useUpdateEvent, type EventResponse } from '@/hooks/use-events';

// Form schema
const eventFormSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
    description: z.string().max(5000).optional(),
    eventType: z.enum(['wedding', 'birthday', 'corporate', 'conference', 'other']).optional(),
    startDate: z.string().min(1, 'Start date is required'),
    startTime: z.string().optional(),
    endDate: z.string().optional(),
    endTime: z.string().optional(),
    timezone: z.string().default('UTC'),
    locationName: z.string().max(200).optional(),
    locationAddress: z.string().max(500).optional(),
    locationCity: z.string().max(100).optional(),
    locationState: z.string().max(100).optional(),
    locationCountry: z.string().max(100).optional(),
    locationPostalCode: z.string().max(20).optional(),
    guestCountExpected: z.coerce.number().int().min(0).optional(),
    budgetTotal: z.coerce.number().min(0).optional(),
    budgetCurrency: z.string().length(3).default('USD'),
    isPublic: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.endDate && data.startDate) {
      const start = new Date(`${data.startDate}T${data.startTime || '00:00'}`);
      const end = new Date(`${data.endDate}T${data.endTime || '00:00'}`);
      if (end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date & time must be after start date & time',
          path: ['endDate'],
        });
      }
    }
  });

type EventFormData = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  event?: EventResponse | undefined;
  onSuccess?: ((event: EventResponse | undefined) => void) | undefined;
}

const STEPS = [
  { id: 'basic', title: 'Basic Info', description: 'Event name and type' },
  { id: 'datetime', title: 'Date & Time', description: 'When is your event?' },
  { id: 'location', title: 'Location', description: 'Where will it be held?' },
  { id: 'planning', title: 'Planning', description: 'Guests and budget' },
  { id: 'review', title: 'Review', description: 'Confirm your event' },
];

const EVENT_TYPES = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'corporate', label: 'Corporate Event' },
  { value: 'conference', label: 'Conference' },
  { value: 'other', label: 'Other' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (\u20AC)' },
  { value: 'GBP', label: 'GBP (\u00A3)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
];

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

function getTimezoneOffset(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    return offsetPart?.value ?? '';
  } catch {
    return '';
  }
}

const TIMEZONE_GROUPS = [
  {
    label: 'Americas',
    zones: [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Phoenix',
      'America/Los_Angeles',
      'America/Anchorage',
      'Pacific/Honolulu',
      'America/Toronto',
      'America/Vancouver',
      'America/Winnipeg',
      'America/Halifax',
      'America/St_Johns',
      'America/Mexico_City',
      'America/Monterrey',
      'America/Cancun',
      'America/Bogota',
      'America/Lima',
      'America/Caracas',
      'America/Santiago',
      'America/Buenos_Aires',
      'America/Sao_Paulo',
      'America/Manaus',
      'America/Fortaleza',
    ],
  },
  {
    label: 'Europe',
    zones: [
      'Europe/London',
      'Europe/Dublin',
      'Europe/Lisbon',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Amsterdam',
      'Europe/Brussels',
      'Europe/Madrid',
      'Europe/Rome',
      'Europe/Zurich',
      'Europe/Vienna',
      'Europe/Prague',
      'Europe/Warsaw',
      'Europe/Stockholm',
      'Europe/Copenhagen',
      'Europe/Oslo',
      'Europe/Helsinki',
      'Europe/Athens',
      'Europe/Bucharest',
      'Europe/Budapest',
      'Europe/Kiev',
      'Europe/Moscow',
      'Europe/Istanbul',
    ],
  },
  {
    label: 'Africa',
    zones: [
      'Africa/Cairo',
      'Africa/Casablanca',
      'Africa/Lagos',
      'Africa/Nairobi',
      'Africa/Johannesburg',
      'Africa/Tunis',
      'Africa/Accra',
    ],
  },
  {
    label: 'Asia',
    zones: [
      'Asia/Dubai',
      'Asia/Riyadh',
      'Asia/Baghdad',
      'Asia/Tehran',
      'Asia/Karachi',
      'Asia/Kolkata',
      'Asia/Colombo',
      'Asia/Kathmandu',
      'Asia/Dhaka',
      'Asia/Rangoon',
      'Asia/Bangkok',
      'Asia/Ho_Chi_Minh',
      'Asia/Jakarta',
      'Asia/Kuala_Lumpur',
      'Asia/Singapore',
      'Asia/Shanghai',
      'Asia/Hong_Kong',
      'Asia/Taipei',
      'Asia/Manila',
      'Asia/Seoul',
      'Asia/Tokyo',
      'Asia/Calcutta',
      'Asia/Tashkent',
      'Asia/Almaty',
      'Asia/Yekaterinburg',
    ],
  },
  {
    label: 'Pacific',
    zones: [
      'Australia/Perth',
      'Australia/Darwin',
      'Australia/Adelaide',
      'Australia/Brisbane',
      'Australia/Sydney',
      'Australia/Melbourne',
      'Australia/Hobart',
      'Pacific/Auckland',
      'Pacific/Fiji',
      'Pacific/Guam',
      'Pacific/Port_Moresby',
    ],
  },
  {
    label: 'Other',
    zones: ['UTC'],
  },
];

function formatDateTimeForInput(date: string | null | undefined): { date: string; time: string } {
  if (!date) return { date: '', time: '' };
  const d = new Date(date);
  const datePart = d.toISOString().split('T')[0];
  return {
    date: datePart ?? '',
    time: d.toTimeString().slice(0, 5),
  };
}

function combineDateAndTime(date: string, time?: string): Date | null {
  if (!date) return null;
  const timeStr = time || '00:00';
  return new Date(`${date}T${timeStr}`);
}

export function EventForm({ event, onSuccess }: EventFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const isEditing = !!event;

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent(event?.uuid ?? '');

  const startDateTime = formatDateTimeForInput(event?.startDate);
  const endDateTime = formatDateTimeForInput(event?.endDate);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event?.title ?? '',
      description: event?.description ?? '',
      eventType: event?.eventType ?? undefined,
      startDate: startDateTime.date,
      startTime: startDateTime.time,
      endDate: endDateTime.date,
      endTime: endDateTime.time,
      timezone: event?.timezone ?? getBrowserTimezone(),
      locationName: event?.locationName ?? '',
      locationAddress: event?.locationAddress ?? '',
      locationCity: event?.locationCity ?? '',
      locationState: event?.locationState ?? '',
      locationCountry: event?.locationCountry ?? '',
      locationPostalCode: event?.locationPostalCode ?? '',
      guestCountExpected: event?.guestCountExpected ?? undefined,
      budgetTotal: event?.budgetTotal ?? undefined,
      budgetCurrency: event?.budgetCurrency ?? 'USD',
      isPublic: event?.isPublic ?? false,
    },
  });

  const formData = watch();
  const isPending = createEvent.isPending || updateEvent.isPending;
  const error = createEvent.error || updateEvent.error;

  const onSubmit = async (data: EventFormData) => {
    const startDate = combineDateAndTime(data.startDate, data.startTime);
    const endDate = data.endDate ? combineDateAndTime(data.endDate, data.endTime) : null;

    const payload = {
      title: data.title,
      description: data.description || null,
      eventType: data.eventType || null,
      startDate: startDate!,
      endDate,
      timezone: data.timezone,
      locationName: data.locationName || null,
      locationAddress: data.locationAddress || null,
      locationCity: data.locationCity || null,
      locationState: data.locationState || null,
      locationCountry: data.locationCountry || null,
      locationPostalCode: data.locationPostalCode || null,
      guestCountExpected: data.guestCountExpected ?? null,
      budgetTotal: data.budgetTotal ?? null,
      budgetCurrency: data.budgetCurrency,
      isPublic: data.isPublic,
    };

    if (isEditing) {
      updateEvent.mutate(payload, {
        onSuccess: (result) => {
          onSuccess?.(result);
        },
      });
    } else {
      createEvent.mutate(payload, {
        onSuccess: (result) => {
          onSuccess?.(result);
        },
      });
    }
  };

  const nextStep = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prevStep = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const isEndDateValid = () => {
    if (!formData.endDate || !formData.startDate) return true;
    const start = new Date(`${formData.startDate}T${formData.startTime || '00:00'}`);
    const end = new Date(`${formData.endDate}T${formData.endTime || '00:00'}`);
    return end > start;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!formData.title;
      case 1:
        return !!formData.startDate && isEndDateValid();
      default:
        return true;
    }
  };

  const canGoToStep = (index: number) => {
    if (index <= currentStep) return true;
    if (isEditing) return true;
    // For new events, only allow jumping forward if all required steps before it pass
    if (index >= 1 && !formData.title) return false;
    if (index >= 2 && !formData.startDate) return false;
    return true;
  };

  const goToStep = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    e.preventDefault();
    if (canGoToStep(index)) {
      setCurrentStep(index);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className="flex flex-1 items-center"
            >
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={(e) => goToStep(e, index)}
                  disabled={!canGoToStep(index)}
                  title={step.description}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    index < currentStep
                      ? 'bg-primary text-primary-foreground hover:bg-primary/80 cursor-pointer'
                      : index === currentStep
                        ? 'border-2 border-primary bg-background text-primary cursor-default'
                        : canGoToStep(index)
                          ? 'border-2 border-muted bg-background text-muted-foreground hover:border-primary hover:text-primary cursor-pointer'
                          : 'border-2 border-muted bg-background text-muted-foreground cursor-not-allowed opacity-50'
                  }`}
                >
                  {index < currentStep ? (
                    <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => goToStep(e, index)}
                  disabled={!canGoToStep(index)}
                  className={`mt-2 text-xs font-medium transition-colors ${
                    index === currentStep
                      ? 'text-foreground cursor-default'
                      : canGoToStep(index)
                        ? 'text-muted-foreground hover:text-foreground cursor-pointer'
                        : 'text-muted-foreground cursor-not-allowed opacity-50'
                  }`}
                >
                  {step.title}
                </button>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep]?.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{STEPS[currentStep]?.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Basic Info */}
          {currentStep === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Sarah's Wedding Reception"
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type</Label>
                <Select
                  value={formData.eventType ?? ''}
                  onValueChange={(value) =>
                    setValue('eventType', value as EventFormData['eventType'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Add details about your event..."
                  rows={4}
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>
            </>
          )}

          {/* Step 2: Date & Time */}
          {currentStep === 1 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input id="startDate" type="date" {...register('startDate')} />
                  {errors.startDate && (
                    <p className="text-sm text-destructive">{errors.startDate.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input id="startTime" type="time" {...register('startTime')} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    min={formData.startDate || undefined}
                    {...register('endDate')}
                  />
                  {errors.endDate && (
                    <p className="text-sm text-destructive">{errors.endDate.message}</p>
                  )}
                  {!errors.endDate && !isEndDateValid() && (
                    <p className="text-sm text-destructive">
                      End date &amp; time must be after start date &amp; time
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input id="endTime" type="time" {...register('endTime')} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="timezone">Timezone</Label>
                  {formData.timezone !== getBrowserTimezone() && (
                    <button
                      type="button"
                      onClick={() => setValue('timezone', getBrowserTimezone())}
                      className="text-xs text-primary hover:underline"
                    >
                      Use my timezone ({getBrowserTimezone()})
                    </button>
                  )}
                </div>
                <Select value={formData.timezone} onValueChange={(value) => setValue('timezone', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {(() => {
                      const detected = getBrowserTimezone();
                      const allZones = TIMEZONE_GROUPS.flatMap((g) => g.zones);
                      const detectedInList = allZones.includes(detected);
                      return (
                        <>
                          <SelectGroup>
                            <SelectLabel>Detected</SelectLabel>
                            <SelectItem value={detected}>
                              <span className="flex items-center gap-2">
                                {detected.replace(/_/g, ' ')}
                                <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1 h-4">
                                  You
                                </Badge>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {getTimezoneOffset(detected)}
                                </span>
                              </span>
                            </SelectItem>
                          </SelectGroup>
                          {TIMEZONE_GROUPS.map((group) => (
                            <SelectGroup key={group.label}>
                              <SelectLabel>{group.label}</SelectLabel>
                              {group.zones
                                .filter((tz) => !(detectedInList && tz === detected))
                                .map((tz) => (
                                  <SelectItem key={tz} value={tz}>
                                    <span className="flex items-center gap-2">
                                      {tz.replace(/_/g, ' ')}
                                      <span className="ml-auto text-xs text-muted-foreground">
                                        {getTimezoneOffset(tz)}
                                      </span>
                                    </span>
                                  </SelectItem>
                                ))}
                            </SelectGroup>
                          ))}
                        </>
                      );
                    })()}
                  </SelectContent>
                </Select>
                {formData.timezone === getBrowserTimezone() && (
                  <p className="text-xs text-muted-foreground">
                    Automatically detected from your browser
                  </p>
                )}
              </div>
            </>
          )}

          {/* Step 3: Location */}
          {currentStep === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="locationName">Venue Name</Label>
                <Input
                  id="locationName"
                  placeholder="e.g., Grand Ballroom"
                  {...register('locationName')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationAddress">Address</Label>
                <Input
                  id="locationAddress"
                  placeholder="Street address"
                  {...register('locationAddress')}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="locationCity">City</Label>
                  <Input id="locationCity" placeholder="City" {...register('locationCity')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locationState">State/Province</Label>
                  <Input
                    id="locationState"
                    placeholder="State or Province"
                    {...register('locationState')}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="locationCountry">Country</Label>
                  <Input id="locationCountry" placeholder="Country" {...register('locationCountry')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locationPostalCode">Postal Code</Label>
                  <Input
                    id="locationPostalCode"
                    placeholder="Postal code"
                    {...register('locationPostalCode')}
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 4: Planning */}
          {currentStep === 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="guestCountExpected">Expected Guests</Label>
                <Input
                  id="guestCountExpected"
                  type="number"
                  min="0"
                  placeholder="Number of guests"
                  {...register('guestCountExpected')}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="budgetTotal">Total Budget</Label>
                  <Input
                    id="budgetTotal"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Budget amount"
                    {...register('budgetTotal')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgetCurrency">Currency</Label>
                  <Select
                    value={formData.budgetCurrency}
                    onValueChange={(value) => setValue('budgetCurrency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  className="h-4 w-4 rounded border-gray-300"
                  {...register('isPublic')}
                />
                <Label htmlFor="isPublic" className="text-sm font-normal">
                  Make this event public (visible to anyone with the link)
                </Label>
              </div>
            </>
          )}

          {/* Step 5: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h4 className="mb-2 font-medium">Event Details</h4>
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Title</dt>
                    <dd className="font-medium">{formData.title}</dd>
                  </div>
                  {formData.eventType && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Type</dt>
                      <dd className="capitalize">{formData.eventType}</dd>
                    </div>
                  )}
                  {formData.description && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Description</dt>
                      <dd className="max-w-xs truncate">{formData.description}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h4 className="mb-2 font-medium">Date & Time</h4>
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Start</dt>
                    <dd>
                      {formData.startDate} {formData.startTime}
                    </dd>
                  </div>
                  {formData.endDate && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">End</dt>
                      <dd>
                        {formData.endDate} {formData.endTime}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Timezone</dt>
                    <dd>{formData.timezone}</dd>
                  </div>
                </dl>
              </div>

              {(formData.locationName || formData.locationCity) && (
                <div>
                  <h4 className="mb-2 font-medium">Location</h4>
                  <dl className="grid gap-2 text-sm">
                    {formData.locationName && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Venue</dt>
                        <dd>{formData.locationName}</dd>
                      </div>
                    )}
                    {formData.locationCity && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">City</dt>
                        <dd>
                          {[formData.locationCity, formData.locationState, formData.locationCountry]
                            .filter(Boolean)
                            .join(', ')}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {(formData.guestCountExpected || formData.budgetTotal) && (
                <div>
                  <h4 className="mb-2 font-medium">Planning</h4>
                  <dl className="grid gap-2 text-sm">
                    {formData.guestCountExpected && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Expected Guests</dt>
                        <dd>{formData.guestCountExpected}</dd>
                      </div>
                    )}
                    {formData.budgetTotal && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Budget</dt>
                        <dd>
                          {formData.budgetCurrency} {formData.budgetTotal.toLocaleString()}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Visibility</dt>
                      <dd>{formData.isPublic ? 'Public' : 'Private'}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 0}>
            Back
          </Button>
          <div className="flex gap-2">
            {currentStep < STEPS.length - 1 ? (
              <Button type="button" onClick={nextStep} disabled={!canProceed()}>
                Continue
              </Button>
            ) : (
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
