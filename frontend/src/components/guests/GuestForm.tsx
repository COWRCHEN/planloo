/**
 * Guest Form
 *
 * Form for adding/editing guests using react-hook-form + Zod.
 * Supports:
 * - Core guest fields
 * - Event-type-specific fields (wedding, corporate, conference, birthday)
 * - User-configurable optional fields (address, meal, accommodation, etc.)
 * - Custom user-defined fields (Phase 3)
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
// Simple collapsible section component
function CollapsibleSection({
  title,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between py-2 text-left"
        onClick={() => onOpenChange(!open)}
      >
        <h3 className="text-sm font-medium">{title}</h3>
        <svg
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="space-y-4 pt-2">{children}</div>}
    </div>
  );
}
import {
  GUEST_CATEGORIES,
  WEDDING_GUEST_SIDES,
  WEDDING_INVITED_TO,
  ATTENDEE_TYPES,
  BADGE_TYPES,
  AGE_GROUPS,
  useGuestSettings,
  type GuestResponse,
  type CreateGuestInput,
  type EventType,
  type EventGuestSettings,
} from '@/hooks/use-guests';
import { CustomFields } from './fields/CustomFields';

// ==================== SCHEMA ====================

const guestFormSchema = z.object({
  // Core fields
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().max(100).optional().nullable(),
  email: z.string().email('Invalid email').max(255).optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  category: z.enum(['vip', 'family', 'friend', 'colleague', 'other']).optional().nullable(),
  plusOnesAllowed: z.coerce.number().int().min(0).max(10).default(0),
  dietaryRestrictions: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),

  // Wedding-specific fields
  guestSide: z.enum(['bride', 'groom', 'both']).optional().nullable(),
  invitedTo: z.enum(['ceremony', 'reception', 'both']).optional().nullable(),
  weddingGiftDescription: z.string().max(500).optional().nullable(),
  weddingGiftThankYouSent: z.boolean().default(false),
  showerGiftDescription: z.string().max(500).optional().nullable(),
  showerGiftThankYouSent: z.boolean().default(false),

  // Corporate-specific fields
  companyName: z.string().max(200).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  attendeeType: z.enum(['employee', 'client', 'vendor', 'partner', 'other']).optional().nullable(),

  // Conference-specific fields
  organization: z.string().max(200).optional().nullable(),
  badgeType: z.enum(['speaker', 'vip', 'standard', 'press', 'exhibitor', 'staff']).optional().nullable(),
  sessionsRegistered: z.string().optional().nullable(),

  // Birthday-specific fields
  relationshipToBirthdayPerson: z.string().max(100).optional().nullable(),
  ageGroup: z.enum(['child', 'teen', 'adult']).optional().nullable(),
  giftPreferences: z.string().max(500).optional().nullable(),

  // Optional fields
  addressStreet: z.string().max(200).optional().nullable(),
  addressCity: z.string().max(100).optional().nullable(),
  addressState: z.string().max(100).optional().nullable(),
  addressZipCode: z.string().max(20).optional().nullable(),
  addressCountry: z.string().max(100).optional().nullable(),
  mealChoice: z.string().max(50).optional().nullable(),
  needsAccommodation: z.boolean().optional().nullable(),
  hotelName: z.string().max(200).optional().nullable(),
  checkInDate: z.string().optional().nullable(),
  checkOutDate: z.string().optional().nullable(),
  plusOneName: z.string().max(200).optional().nullable(),
  tableAssignment: z.string().max(50).optional().nullable(),
  transportationNeeded: z.boolean().optional().nullable(),
  accessibilityNeeds: z.string().max(500).optional().nullable(),
});

type GuestFormData = z.infer<typeof guestFormSchema>;

/** Build schema with optional guest-field required validation (reads settings from ref at validate time) */
function buildGuestFormSchemaWithRequired(
  baseSchema: typeof guestFormSchema,
  settingsRef: { current: EventGuestSettings | null | undefined }
) {
  return baseSchema.superRefine((data, ctx) => {
    const s = settingsRef.current;
    if (!s) return;
    const req = (s as { requiredAddress?: boolean })?.requiredAddress ?? false;
    const reqMeal = (s as { requiredMealChoice?: boolean })?.requiredMealChoice ?? false;
    const reqPlus = (s as { requiredPlusOneName?: boolean })?.requiredPlusOneName ?? false;
    const reqTable = (s as { requiredTableAssignment?: boolean })?.requiredTableAssignment ?? false;
    const reqAccess = (s as { requiredAccessibility?: boolean })?.requiredAccessibility ?? false;
    if (s.enableAddress && req && !(data.addressStreet?.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Street address is required', path: ['addressStreet'] });
    }
    if (s.enableMealChoice && reqMeal && !(data.mealChoice?.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Meal choice is required', path: ['mealChoice'] });
    }
    if (s.enablePlusOneName && reqPlus && !(data.plusOneName?.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Plus-one name is required', path: ['plusOneName'] });
    }
    if (s.enableTableAssignment && reqTable && !(data.tableAssignment?.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Table assignment is required', path: ['tableAssignment'] });
    }
    if (s.enableAccessibility && reqAccess && !(data.accessibilityNeeds?.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Accessibility needs is required', path: ['accessibilityNeeds'] });
    }
  });
}

interface GuestFormProps {
  /** When false (default), form is shown in a dialog. When true, form is shown as a full page (no dialog). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  guest?: GuestResponse | null;
  onSubmit: (data: CreateGuestInput) => Promise<void>;
  isSubmitting: boolean;
  eventType?: EventType | null;
  /** Event UUID – when provided, form fetches guest settings so optional/custom fields always match settings page */
  eventUuid?: string | null;
  /** Optional: pre-fetched guest settings (used when eventUuid not provided); otherwise form fetches via eventUuid */
  guestSettings?: EventGuestSettings | null;
  /** When true, render as a standalone page (no dialog). Requires onCancel and optionally onSuccess. */
  asPage?: boolean;
  /** Called when user clicks Cancel (required when asPage is true). */
  onCancel?: () => void;
  /** Called after successful submit (e.g. to navigate back). Used when asPage is true. */
  onSuccess?: () => void;
}

const categoryLabels: Record<string, string> = {
  vip: 'VIP',
  family: 'Family',
  friend: 'Friend',
  colleague: 'Colleague',
  other: 'Other',
};

export function GuestForm({
  open = false,
  onOpenChange,
  guest,
  onSubmit,
  isSubmitting,
  eventType,
  eventUuid,
  guestSettings: guestSettingsProp,
  asPage = false,
  onCancel,
  onSuccess,
}: GuestFormProps) {
  const isEditing = !!guest;
  const isOpen = open || asPage;
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});
  const [eventFieldsOpen, setEventFieldsOpen] = useState(true);
  const [optionalFieldsOpen, setOptionalFieldsOpen] = useState(false);

  // Fetch guest settings when form has eventUuid so optional/custom fields always reflect event settings
  const { data: guestSettingsFromHook, refetch: refetchGuestSettings } = useGuestSettings(eventUuid ?? '');
  const guestSettings = eventUuid ? (guestSettingsFromHook ?? guestSettingsProp) : guestSettingsProp;

  const guestSettingsRef = useRef(guestSettings);
  guestSettingsRef.current = guestSettings;

  const guestFormSchemaWithRequired = useMemo(
    () => buildGuestFormSchemaWithRequired(guestFormSchema, guestSettingsRef),
    []
  );

  // Refetch guest settings when opening the form (dialog or page) so fields added on the settings page are shown
  useEffect(() => {
    if (isOpen && eventUuid) {
      refetchGuestSettings();
    }
  }, [isOpen, eventUuid, refetchGuestSettings]);

  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestFormSchemaWithRequired),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      category: null,
      plusOnesAllowed: 0,
      dietaryRestrictions: '',
      notes: '',
    },
  });

  // Reset form when form opens (dialog or page) or guest changes
  useEffect(() => {
    if (isOpen) {
      // Parse custom field data if exists
      let parsedCustomData: Record<string, unknown> = {};
      if (guest?.customFieldData) {
        try {
          parsedCustomData = typeof guest.customFieldData === 'string'
            ? JSON.parse(guest.customFieldData)
            : guest.customFieldData;
        } catch {
          parsedCustomData = {};
        }
      }
      setCustomFieldValues(parsedCustomData);

      form.reset({
        // Core fields
        firstName: guest?.firstName ?? '',
        lastName: guest?.lastName ?? '',
        email: guest?.email ?? '',
        phone: guest?.phone ?? '',
        category: guest?.category ?? null,
        plusOnesAllowed: guest?.plusOnesAllowed ?? 0,
        dietaryRestrictions: guest?.dietaryRestrictions ?? '',
        notes: guest?.notes ?? '',

        // Wedding fields
        guestSide: guest?.weddingDetails?.guestSide ?? null,
        invitedTo: guest?.weddingDetails?.invitedTo ?? null,
        weddingGiftDescription: guest?.weddingDetails?.weddingGiftDescription ?? '',
        weddingGiftThankYouSent: guest?.weddingDetails?.weddingGiftThankYouSent ?? false,
        showerGiftDescription: guest?.weddingDetails?.showerGiftDescription ?? '',
        showerGiftThankYouSent: guest?.weddingDetails?.showerGiftThankYouSent ?? false,

        // Corporate fields
        companyName: guest?.corporateDetails?.companyName ?? '',
        jobTitle: guest?.corporateDetails?.jobTitle ?? '',
        attendeeType: guest?.corporateDetails?.attendeeType ?? null,

        // Conference fields
        organization: guest?.conferenceDetails?.organization ?? '',
        badgeType: guest?.conferenceDetails?.badgeType ?? null,
        sessionsRegistered: Array.isArray(guest?.conferenceDetails?.sessionsRegistered)
          ? guest.conferenceDetails.sessionsRegistered.join(', ')
          : '',

        // Birthday fields
        relationshipToBirthdayPerson: guest?.birthdayDetails?.relationshipToBirthdayPerson ?? '',
        ageGroup: guest?.birthdayDetails?.ageGroup ?? null,
        giftPreferences: guest?.birthdayDetails?.giftPreferences ?? '',

        // Optional fields
        addressStreet: guest?.addressStreet ?? '',
        addressCity: guest?.addressCity ?? '',
        addressState: guest?.addressState ?? '',
        addressZipCode: guest?.addressZipCode ?? '',
        addressCountry: guest?.addressCountry ?? '',
        mealChoice: guest?.mealChoice ?? '',
        needsAccommodation: guest?.needsAccommodation ?? false,
        hotelName: guest?.hotelName ?? '',
        checkInDate: guest?.checkInDate ? new Date(guest.checkInDate).toISOString().split('T')[0] : '',
        checkOutDate: guest?.checkOutDate ? new Date(guest.checkOutDate).toISOString().split('T')[0] : '',
        plusOneName: guest?.plusOneName ?? '',
        tableAssignment: guest?.tableAssignment ?? '',
        transportationNeeded: guest?.transportationNeeded ?? false,
        accessibilityNeeds: guest?.accessibilityNeeds ?? '',
      });
    }
  }, [isOpen, guest, form]);

  const handleSubmit = async (data: GuestFormData) => {
    // Build the cleaned data object
    const cleanedData: CreateGuestInput = {
      // Core fields
      firstName: data.firstName,
      lastName: data.lastName || null,
      email: data.email || null,
      phone: data.phone || null,
      category: data.category || null,
      plusOnesAllowed: data.plusOnesAllowed,
      dietaryRestrictions: data.dietaryRestrictions || null,
      notes: data.notes || null,
    };

    // Add event-type-specific fields based on event type
    if (eventType === 'wedding') {
      cleanedData.weddingDetails = {
        guestSide: data.guestSide || undefined,
        invitedTo: data.invitedTo || undefined,
        weddingGiftDescription: data.weddingGiftDescription || undefined,
        weddingGiftThankYouSent: data.weddingGiftThankYouSent,
        showerGiftDescription: data.showerGiftDescription || undefined,
        showerGiftThankYouSent: data.showerGiftThankYouSent,
      };
    }

    if (eventType === 'corporate') {
      cleanedData.corporateDetails = {
        companyName: data.companyName || undefined,
        jobTitle: data.jobTitle || undefined,
        attendeeType: data.attendeeType || undefined,
      };
    }

    if (eventType === 'conference') {
      cleanedData.conferenceDetails = {
        organization: data.organization || undefined,
        badgeType: data.badgeType || undefined,
        sessionsRegistered: data.sessionsRegistered
          ? data.sessionsRegistered.split(',').map(s => s.trim()).filter(Boolean)
          : undefined,
      };
    }

    if (eventType === 'birthday') {
      cleanedData.birthdayDetails = {
        relationshipToBirthdayPerson: data.relationshipToBirthdayPerson || undefined,
        ageGroup: data.ageGroup || undefined,
        giftPreferences: data.giftPreferences || undefined,
      };
    }

    // Add optional fields based on settings
    if (guestSettings?.enableAddress) {
      cleanedData.addressStreet = data.addressStreet || null;
      cleanedData.addressCity = data.addressCity || null;
      cleanedData.addressState = data.addressState || null;
      cleanedData.addressZipCode = data.addressZipCode || null;
      cleanedData.addressCountry = data.addressCountry || null;
    }

    if (guestSettings?.enableMealChoice) {
      cleanedData.mealChoice = data.mealChoice || null;
    }

    if (guestSettings?.enableAccommodation) {
      cleanedData.needsAccommodation = data.needsAccommodation ?? null;
      cleanedData.hotelName = data.hotelName || null;
      cleanedData.checkInDate = data.checkInDate || null;
      cleanedData.checkOutDate = data.checkOutDate || null;
    }

    if (guestSettings?.enablePlusOneName) {
      cleanedData.plusOneName = data.plusOneName || null;
    }

    if (guestSettings?.enableTableAssignment) {
      cleanedData.tableAssignment = data.tableAssignment || null;
    }

    if (guestSettings?.enableTransportation) {
      cleanedData.transportationNeeded = data.transportationNeeded ?? null;
    }

    if (guestSettings?.enableAccessibility) {
      cleanedData.accessibilityNeeds = data.accessibilityNeeds || null;
    }

    // Add custom field data
    if (guestSettings?.customFieldDefinitions && guestSettings.customFieldDefinitions.length > 0) {
      cleanedData.customFieldData = JSON.stringify(customFieldValues);
    }

    await onSubmit(cleanedData);
    form.reset();
    setCustomFieldValues({});
    onSuccess?.();
  };

  // Check if there are any event-type-specific fields to show
  const hasEventTypeFields = eventType === 'wedding' || eventType === 'corporate' || eventType === 'conference' || eventType === 'birthday';

  // Check if there are any optional fields enabled
  const hasOptionalFields = guestSettings?.enableAddress ||
    guestSettings?.enableMealChoice ||
    guestSettings?.enableAccommodation ||
    guestSettings?.enablePlusOneName ||
    guestSettings?.enableTableAssignment ||
    guestSettings?.enableTransportation ||
    guestSettings?.enableAccessibility;

  // Check if there are custom fields
  const hasCustomFields = (guestSettings?.customFieldDefinitions ?? []).length > 0;

  const formContent = (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* ==================== CORE FIELDS ==================== */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  {...form.register('firstName')}
                  placeholder="John"
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...form.register('lastName')}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="john@example.com"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...form.register('phone')}
                  placeholder="+1 555-123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={form.watch('category') ?? '_none'}
                  onValueChange={(value) =>
                    form.setValue('category', value === '_none' ? null : (value as typeof GUEST_CATEGORIES[number]))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {GUEST_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {categoryLabels[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plusOnesAllowed">Plus-Ones Allowed</Label>
                <Input
                  id="plusOnesAllowed"
                  type="number"
                  min={0}
                  max={10}
                  {...form.register('plusOnesAllowed')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
              <Input
                id="dietaryRestrictions"
                {...form.register('dietaryRestrictions')}
                placeholder="Vegetarian, nut allergy, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>

            {/* ==================== EVENT-TYPE-SPECIFIC FIELDS ==================== */}
            {hasEventTypeFields && (
              <>
                <Separator />
                <CollapsibleSection
                  title={
                    eventType === 'wedding' ? 'Wedding Details' :
                    eventType === 'corporate' ? 'Corporate Details' :
                    eventType === 'conference' ? 'Conference Details' :
                    eventType === 'birthday' ? 'Birthday Details' : 'Event Details'
                  }
                  open={eventFieldsOpen}
                  onOpenChange={setEventFieldsOpen}
                >
                    {/* Wedding Fields */}
                    {eventType === 'wedding' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Guest Side</Label>
                            <Select
                              value={form.watch('guestSide') ?? '_none'}
                              onValueChange={(value) =>
                                form.setValue('guestSide', value === '_none' ? null : value as typeof WEDDING_GUEST_SIDES[number])
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select side" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_none">None</SelectItem>
                                {WEDDING_GUEST_SIDES.map((side) => (
                                  <SelectItem key={side} value={side}>
                                    {side.charAt(0).toUpperCase() + side.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Invited To</Label>
                            <Select
                              value={form.watch('invitedTo') ?? '_none'}
                              onValueChange={(value) =>
                                form.setValue('invitedTo', value === '_none' ? null : value as typeof WEDDING_INVITED_TO[number])
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select event" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_none">None</SelectItem>
                                {WEDDING_INVITED_TO.map((inv) => (
                                  <SelectItem key={inv} value={inv}>
                                    {inv.charAt(0).toUpperCase() + inv.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Wedding Gift</Label>
                          <Input
                            {...form.register('weddingGiftDescription')}
                            placeholder="Gift description"
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <Switch
                              checked={form.watch('weddingGiftThankYouSent')}
                              onCheckedChange={(checked) => form.setValue('weddingGiftThankYouSent', checked)}
                            />
                            <Label className="font-normal">Thank you sent</Label>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Shower Gift</Label>
                          <Input
                            {...form.register('showerGiftDescription')}
                            placeholder="Shower gift description"
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <Switch
                              checked={form.watch('showerGiftThankYouSent')}
                              onCheckedChange={(checked) => form.setValue('showerGiftThankYouSent', checked)}
                            />
                            <Label className="font-normal">Thank you sent</Label>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Corporate Fields */}
                    {eventType === 'corporate' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Company Name</Label>
                            <Input
                              {...form.register('companyName')}
                              placeholder="Company name"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Job Title</Label>
                            <Input
                              {...form.register('jobTitle')}
                              placeholder="Job title"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Attendee Type</Label>
                          <Select
                            value={form.watch('attendeeType') ?? '_none'}
                            onValueChange={(value) =>
                              form.setValue('attendeeType', value === '_none' ? null : value as typeof ATTENDEE_TYPES[number])
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">None</SelectItem>
                              {ATTENDEE_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type.charAt(0).toUpperCase() + type.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {/* Conference Fields */}
                    {eventType === 'conference' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Organization</Label>
                            <Input
                              {...form.register('organization')}
                              placeholder="Organization name"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Badge Type</Label>
                            <Select
                              value={form.watch('badgeType') ?? '_none'}
                              onValueChange={(value) =>
                                form.setValue('badgeType', value === '_none' ? null : value as typeof BADGE_TYPES[number])
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select badge" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_none">None</SelectItem>
                                {BADGE_TYPES.map((badge) => (
                                  <SelectItem key={badge} value={badge}>
                                    {badge.charAt(0).toUpperCase() + badge.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Sessions (comma-separated)</Label>
                          <Input
                            {...form.register('sessionsRegistered')}
                            placeholder="Session A, Session B"
                          />
                        </div>
                      </>
                    )}

                    {/* Birthday Fields */}
                    {eventType === 'birthday' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Relationship</Label>
                            <Input
                              {...form.register('relationshipToBirthdayPerson')}
                              placeholder="Friend, cousin, etc."
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Age Group</Label>
                            <Select
                              value={form.watch('ageGroup') ?? '_none'}
                              onValueChange={(value) =>
                                form.setValue('ageGroup', value === '_none' ? null : value as typeof AGE_GROUPS[number])
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select age group" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_none">None</SelectItem>
                                {AGE_GROUPS.map((age) => (
                                  <SelectItem key={age} value={age}>
                                    {age.charAt(0).toUpperCase() + age.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Gift Preferences</Label>
                          <Textarea
                            {...form.register('giftPreferences')}
                            placeholder="Gift ideas or preferences"
                            rows={2}
                          />
                        </div>
                      </>
                    )}
                </CollapsibleSection>
              </>
            )}

            {/* ==================== OPTIONAL FIELDS ==================== */}
            {hasOptionalFields && (
              <>
                <Separator />
                <CollapsibleSection
                  title="Additional Information"
                  open={optionalFieldsOpen}
                  onOpenChange={setOptionalFieldsOpen}
                >
                    {/* Address */}
                    {guestSettings?.enableAddress && (
                      <div className="space-y-4">
                        <Label className="text-sm font-medium">
                          Address
                          {(guestSettings as { requiredAddress?: boolean })?.requiredAddress && (
                            <span className="ml-1 text-destructive">*</span>
                          )}
                        </Label>
                        <Input
                          {...form.register('addressStreet')}
                          placeholder="Street address"
                        />
                        {form.formState.errors.addressStreet && (
                          <p className="text-sm text-destructive">{form.formState.errors.addressStreet.message}</p>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            {...form.register('addressCity')}
                            placeholder="City"
                          />
                          <Input
                            {...form.register('addressState')}
                            placeholder="State"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            {...form.register('addressZipCode')}
                            placeholder="Zip code"
                          />
                          <Input
                            {...form.register('addressCountry')}
                            placeholder="Country"
                          />
                        </div>
                      </div>
                    )}

                    {/* Meal Choice */}
                    {guestSettings?.enableMealChoice && (
                      <div className="space-y-2">
                        <Label>
                          Meal Choice
                          {(guestSettings as { requiredMealChoice?: boolean })?.requiredMealChoice && (
                            <span className="ml-1 text-destructive">*</span>
                          )}
                        </Label>
                        <Select
                          value={form.watch('mealChoice') ?? '_none'}
                          onValueChange={(value) =>
                            form.setValue('mealChoice', value === '_none' ? null : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select meal" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">None</SelectItem>
                            {(guestSettings.mealChoiceOptions ?? []).map((option) => (
                              <SelectItem key={option.key} value={option.key}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.mealChoice && (
                          <p className="text-sm text-destructive">{form.formState.errors.mealChoice.message}</p>
                        )}
                      </div>
                    )}

                    {/* Accommodation */}
                    {guestSettings?.enableAccommodation && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={form.watch('needsAccommodation') ?? false}
                            onCheckedChange={(checked) => form.setValue('needsAccommodation', checked)}
                          />
                          <Label className="font-normal">Needs Accommodation</Label>
                        </div>
                        {form.watch('needsAccommodation') && (
                          <>
                            <Input
                              {...form.register('hotelName')}
                              placeholder="Hotel name"
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Check-in</Label>
                                <Input
                                  type="date"
                                  {...form.register('checkInDate')}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Check-out</Label>
                                <Input
                                  type="date"
                                  {...form.register('checkOutDate')}
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Plus-One Name */}
                    {guestSettings?.enablePlusOneName && (
                      <div className="space-y-2">
                        <Label>
                          Plus-One Name
                          {(guestSettings as { requiredPlusOneName?: boolean })?.requiredPlusOneName && (
                            <span className="ml-1 text-destructive">*</span>
                          )}
                        </Label>
                        <Input
                          {...form.register('plusOneName')}
                          placeholder="Name of plus-one"
                        />
                        {form.formState.errors.plusOneName && (
                          <p className="text-sm text-destructive">{form.formState.errors.plusOneName.message}</p>
                        )}
                      </div>
                    )}

                    {/* Table Assignment */}
                    {guestSettings?.enableTableAssignment && (
                      <div className="space-y-2">
                        <Label>
                          Table Assignment
                          {(guestSettings as { requiredTableAssignment?: boolean })?.requiredTableAssignment && (
                            <span className="ml-1 text-destructive">*</span>
                          )}
                        </Label>
                        <Input
                          {...form.register('tableAssignment')}
                          placeholder="Table number or name"
                        />
                        {form.formState.errors.tableAssignment && (
                          <p className="text-sm text-destructive">{form.formState.errors.tableAssignment.message}</p>
                        )}
                      </div>
                    )}

                    {/* Transportation */}
                    {guestSettings?.enableTransportation && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={form.watch('transportationNeeded') ?? false}
                          onCheckedChange={(checked) => form.setValue('transportationNeeded', checked)}
                        />
                        <Label className="font-normal">Needs Transportation</Label>
                      </div>
                    )}

                    {/* Accessibility */}
                    {guestSettings?.enableAccessibility && (
                      <div className="space-y-2">
                        <Label>
                          Accessibility Needs
                          {(guestSettings as { requiredAccessibility?: boolean })?.requiredAccessibility && (
                            <span className="ml-1 text-destructive">*</span>
                          )}
                        </Label>
                        <Textarea
                          {...form.register('accessibilityNeeds')}
                          placeholder="Describe accessibility requirements"
                          rows={2}
                        />
                        {form.formState.errors.accessibilityNeeds && (
                          <p className="text-sm text-destructive">{form.formState.errors.accessibilityNeeds.message}</p>
                        )}
                      </div>
                    )}
                </CollapsibleSection>
              </>
            )}

            {/* ==================== CUSTOM FIELDS ==================== */}
            {hasCustomFields && (
              <>
                <Separator />
                <CustomFields
                  definitions={guestSettings?.customFieldDefinitions ?? []}
                  values={customFieldValues}
                  onChange={setCustomFieldValues}
                />
              </>
            )}

            {asPage ? (
              <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Guest'}
                </Button>
              </div>
            ) : (
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange?.(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Guest'}
                </Button>
              </DialogFooter>
            )}
          </form>
        </FormProvider>
  );

  if (asPage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? 'Edit Guest' : 'Add Guest'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing
              ? 'Update guest information.'
              : 'Add a new guest to your event.'}
          </p>
        </div>
        <Card className="max-w-2xl">
          <CardContent className="pt-6">
            {formContent}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange ?? (() => {})}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Guest' : 'Add Guest'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update guest information.'
              : 'Add a new guest to your event.'}
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
