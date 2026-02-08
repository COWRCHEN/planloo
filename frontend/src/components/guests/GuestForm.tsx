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
        className="flex w-full items-center justify-between rounded-md bg-muted/60 px-3 py-2.5 text-left transition-colors hover:bg-muted"
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
  type CustomFieldDefinition,
} from '@/hooks/use-guests';
import { CustomFields } from './fields/CustomFields';

/** Return definitions for required custom fields that are currently empty. */
function getMissingRequiredCustomFields(
  values: Record<string, unknown>,
  definitions: CustomFieldDefinition[]
): CustomFieldDefinition[] {
  return definitions.filter((def) => {
    if (!def.required) return false;
    const raw = values[def.id];
    const isEmpty = raw === undefined || raw === null || raw === '';
    return isEmpty;
  });
}

/** Normalize custom field values for API: only defined keys, coerced types. Returns null if required field is missing. */
function normalizeCustomFieldData(
  values: Record<string, unknown>,
  definitions: CustomFieldDefinition[] | null
): Record<string, unknown> | null {
  if (!definitions || definitions.length === 0) return null;
  const out: Record<string, unknown> = {};
  for (const def of definitions) {
    const raw = values[def.id];
    const isEmpty = raw === undefined || raw === null || raw === '';
    if (def.required && isEmpty) return null; // would fail validation; caller can omit payload
    if (isEmpty) {
      out[def.id] = null;
      continue;
    }
    switch (def.type) {
      case 'number':
        out[def.id] = typeof raw === 'number' && !Number.isNaN(raw) ? raw : Number(raw);
        if (Number.isNaN(out[def.id] as number)) out[def.id] = null;
        break;
      case 'checkbox':
        out[def.id] = raw === true || raw === 'true' || raw === 1;
        break;
      case 'select':
        out[def.id] = def.options?.includes(String(raw)) ? String(raw) : null;
        break;
      case 'multiselect':
        out[def.id] = Array.isArray(raw)
          ? (raw as unknown[]).filter((v) => def.options?.includes(String(v)))
          : [];
        break;
      case 'date':
        out[def.id] = typeof raw === 'string' && !Number.isNaN(Date.parse(raw)) ? raw : null;
        break;
      default:
        out[def.id] = raw != null ? String(raw) : null;
    }
  }
  return out;
}

// ==================== SCHEMA ====================

const guestFormSchema = z.object({
  // Core fields (required-ness driven by event settings in superRefine)
  firstName: z.string().max(100),
  lastName: z.string().max(100).optional().nullable(),
  email: z.string().email('Invalid email').max(255).optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  plusOnesAllowed: z.coerce.number().int().min(0).max(10).default(0),
  plusOnesCountAdults: z.coerce.number().int().min(0).max(10).default(0),
  plusOnesCountChildren: z.coerce.number().int().min(0).max(10).default(0),
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
  roomNumber: z.string().max(20).optional().nullable(),
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
    // Common field required (backward compat: requiredFirstName default true, others false)
    const reqFirst = (s as { requiredFirstName?: boolean })?.requiredFirstName ?? true;
    const reqLast = (s as { requiredLastName?: boolean })?.requiredLastName ?? false;
    const reqEmail = (s as { requiredEmail?: boolean })?.requiredEmail ?? false;
    const reqPhone = (s as { requiredPhone?: boolean })?.requiredPhone ?? false;
    if (reqFirst && !(data.firstName?.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'First name is required', path: ['firstName'] });
    }
    if (reqLast && !(data.lastName?.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Last name is required', path: ['lastName'] });
    }
    if (reqEmail && !(data.email?.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Email is required', path: ['email'] });
    }
    if (reqPhone && !(data.phone?.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phone is required', path: ['phone'] });
    }
    // Optional feature fields
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
    if (s.enablePlusOnes && s.enablePlusOneName && reqPlus && !(data.plusOneName?.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Plus-one name is required', path: ['plusOneName'] });
    }
    if (s.enableTableAssignment && reqTable && !(data.tableAssignment?.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Table assignment is required', path: ['tableAssignment'] });
    }
    if (s.enableAccessibility && reqAccess && !(data.accessibilityNeeds?.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Accessibility needs is required', path: ['accessibilityNeeds'] });
    }
    const reqCategory = (s as { requiredCategory?: boolean })?.requiredCategory ?? false;
    if ((s as { enableCategory?: boolean })?.enableCategory && reqCategory && !(data.category?.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Category is required', path: ['category'] });
    }
    if (s.enablePlusOnes) {
      const adults = data.plusOnesCountAdults ?? 0;
      const children = data.plusOnesCountChildren ?? 0;
      const allowed = data.plusOnesAllowed ?? 0;
      if (adults + children > allowed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Adults + children must not exceed plus-ones allowed',
          path: ['plusOnesCountAdults'],
        });
      }
    }
    // Accommodation: check-out >= check-in when both set
    if (data.checkInDate && data.checkOutDate && data.checkOutDate < data.checkInDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Check-out date must be on or after check-in date',
        path: ['checkOutDate'],
      });
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
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);

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
      plusOnesCountAdults: 0,
      plusOnesCountChildren: 0,
      dietaryRestrictions: '',
      notes: '',
      // Optional fields so they are always in form state and included on submit
      addressStreet: '',
      addressCity: '',
      addressState: '',
      addressZipCode: '',
      addressCountry: '',
      mealChoice: '',
      needsAccommodation: false,
      hotelName: '',
      checkInDate: '',
      checkOutDate: '',
      roomNumber: '',
      plusOneName: '',
      tableAssignment: '',
      transportationNeeded: false,
      accessibilityNeeds: '',
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
        plusOnesAllowed: guest ? (guest.plusOnesAllowed ?? 0) : (guestSettings?.defaultPlusOnesAllowed ?? 0),
        plusOnesCountAdults: guest?.plusOnesCountAdults ?? 0,
        plusOnesCountChildren: guest?.plusOnesCountChildren ?? 0,
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
        roomNumber: guest?.roomNumber ?? '',
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
      plusOnesAllowed: guestSettings?.enablePlusOnes
        ? (guest ? (guest.plusOnesAllowed ?? 0) : (guestSettings?.defaultPlusOnesAllowed ?? 0))
        : 0,
      dietaryRestrictions: data.dietaryRestrictions || null,
      notes: data.notes || null,
    };
    if (guestSettings?.enablePlusOnes) {
      cleanedData.plusOnesCountAdults = data.plusOnesCountAdults ?? 0;
      cleanedData.plusOnesCountChildren = data.plusOnesCountChildren ?? 0;
    }
    if (guest && 'plusOnesAllowed' in cleanedData) {
      delete (cleanedData as { plusOnesAllowed?: number }).plusOnesAllowed;
    }

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

    // Use ref so we always have current settings at submit time (avoids stale closure)
    const settings = guestSettingsRef.current;

    // Validate required custom fields before submit (they live in state, not in the Zod schema)
    const defs = settings?.customFieldDefinitions ?? null;
    if (defs && defs.length > 0) {
      const missing = getMissingRequiredCustomFields(customFieldValues, defs);
      if (missing.length > 0) {
        setCustomFieldsOpen(true);
        missing.forEach((def) => {
          form.setError(`customField_${def.id}` as keyof GuestFormData, {
            type: 'required',
            message: `${def.label} is required`,
          });
        });
        return;
      }
    }

    // Add optional fields based on settings
    if (settings?.enableAddress) {
      cleanedData.addressStreet = data.addressStreet || null;
      cleanedData.addressCity = data.addressCity || null;
      cleanedData.addressState = data.addressState || null;
      cleanedData.addressZipCode = data.addressZipCode || null;
      cleanedData.addressCountry = data.addressCountry || null;
    }

    if (settings?.enableMealChoice) {
      cleanedData.mealChoice = data.mealChoice || null;
    }

    if (settings?.enableAccommodation) {
      cleanedData.needsAccommodation = data.needsAccommodation === true;
      const hotel = data.hotelName && data.hotelName !== '__none__' ? data.hotelName : null;
      cleanedData.hotelName = hotel ?? null;
      cleanedData.checkInDate = (data.checkInDate && data.checkInDate.trim()) || null;
      cleanedData.checkOutDate = (data.checkOutDate && data.checkOutDate.trim()) || null;
      cleanedData.roomNumber = (data.roomNumber && data.roomNumber.trim()) || null;
    }

    if (settings?.enablePlusOnes && settings?.enablePlusOneName) {
      cleanedData.plusOneName = data.plusOneName || null;
    }
    if (!settings?.enablePlusOnes) {
      cleanedData.plusOneName = null;
    }

    if (settings?.enableTableAssignment) {
      cleanedData.tableAssignment = data.tableAssignment || null;
    }

    if (settings?.enableTransportation) {
      cleanedData.transportationNeeded = data.transportationNeeded ?? null;
    }

    if (settings?.enableAccessibility) {
      cleanedData.accessibilityNeeds = data.accessibilityNeeds || null;
    }

    // Add custom field data only when normalized and valid (required fields present)
    if (defs && defs.length > 0) {
      const normalized = normalizeCustomFieldData(customFieldValues, defs);
      if (normalized !== null) {
        cleanedData.customFieldData = normalized;
      }
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
    guestSettings?.enablePlusOnes ||
    guestSettings?.enablePlusOneName ||
    guestSettings?.enableTableAssignment ||
    guestSettings?.enableTransportation ||
    guestSettings?.enableAccessibility ||
    guestSettings?.enableCategory;

  // Check if there are custom fields
  const hasCustomFields = (guestSettings?.customFieldDefinitions ?? []).length > 0;

  const formContent = (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* ==================== CORE FIELDS ==================== */}
            {(() => {
              const s = guestSettings as { requiredFirstName?: boolean; requiredLastName?: boolean; requiredEmail?: boolean; requiredPhone?: boolean } | null | undefined;
              const reqFirst = s?.requiredFirstName ?? true;
              const reqLast = s?.requiredLastName ?? false;
              const reqEmail = s?.requiredEmail ?? false;
              const reqPhone = s?.requiredPhone ?? false;
              return (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name{reqFirst ? <span className="ml-1 text-destructive">*</span> : null}</Label>
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
                      <Label htmlFor="lastName">Last Name{reqLast ? <span className="ml-1 text-destructive">*</span> : null}</Label>
                      <Input
                        id="lastName"
                        {...form.register('lastName')}
                        placeholder="Doe"
                      />
                      {form.formState.errors.lastName && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email{reqEmail ? <span className="ml-1 text-destructive">*</span> : null}</Label>
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
                      <Label htmlFor="phone">Phone{reqPhone ? <span className="ml-1 text-destructive">*</span> : null}</Label>
                      <Input
                        id="phone"
                        {...form.register('phone')}
                        placeholder="+1 555-123-4567"
                      />
                      {form.formState.errors.phone && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.phone.message}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}

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
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">
                          Address
                          {(guestSettings as { requiredAddress?: boolean })?.requiredAddress && (
                            <span className="ml-1 text-destructive">*</span>
                          )}
                        </h3>
                        <Card>
                          <CardContent className="space-y-4 pt-6">
                            <div className="space-y-2">
                              <Label htmlFor="addressStreet">Street address</Label>
                              <Input
                                id="addressStreet"
                                {...form.register('addressStreet')}
                                placeholder="Street address"
                              />
                              {form.formState.errors.addressStreet && (
                                <p className="text-sm text-destructive">{form.formState.errors.addressStreet.message}</p>
                              )}
                            </div>
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
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Plus-ones: adults and children (limit comes from event default) */}
                    {guestSettings?.enablePlusOnes && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Plus-Ones</h3>
                        <Card>
                        <CardContent className="space-y-4 pt-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="plusOnesCountAdults">How many adults?</Label>
                              <Input
                                id="plusOnesCountAdults"
                                type="number"
                                min={0}
                                max={10}
                                {...form.register('plusOnesCountAdults')}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="plusOnesCountChildren">How many children?</Label>
                              <Input
                                id="plusOnesCountChildren"
                                type="number"
                                min={0}
                                max={10}
                                {...form.register('plusOnesCountChildren')}
                              />
                            </div>
                          </div>
                          {(form.formState.errors.plusOnesCountAdults ?? form.formState.errors.plusOnesCountChildren) && (
                            <p className="text-sm text-destructive">
                              {(form.formState.errors.plusOnesCountAdults ?? form.formState.errors.plusOnesCountChildren)?.message}
                            </p>
                          )}
                          {/* Plus-One Name (only when enabled in settings) */}
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
                        </CardContent>
                        </Card>
                      </div>
                    )}


                    {/* Category */}
                    {guestSettings?.enableCategory && (
                      <div className="space-y-2">
                        <Label>
                          Category
                          {(guestSettings as { requiredCategory?: boolean })?.requiredCategory && (
                            <span className="ml-1 text-destructive">*</span>
                          )}
                        </Label>
                        <Select
                          value={form.watch('category') ?? '_none'}
                          onValueChange={(value) =>
                            form.setValue('category', value === '_none' ? null : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">None</SelectItem>
                            {(guestSettings.categoryOptions ?? []).map((option) => (
                              <SelectItem key={option.key} value={option.key}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.category && (
                          <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
                        )}
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
                            {(guestSettings as { accommodationHotels?: Array<{ id: string; name: string }> })?.accommodationHotels &&
                            (guestSettings as { accommodationHotels?: Array<{ id: string; name: string }> }).accommodationHotels!.length > 0 ? (
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Hotel</Label>
                                <Select
                                  value={(form.watch('hotelName') ?? '') || '__none__'}
                                  onValueChange={(value) => {
                                    const hotel = value === '__none__' ? '' : value;
                                    form.setValue('hotelName', hotel);
                                    const s = guestSettings as { accommodationCheckInDate?: string | null; accommodationCheckOutDate?: string | null };
                                    if (s?.accommodationCheckInDate) form.setValue('checkInDate', s.accommodationCheckInDate);
                                    if (s?.accommodationCheckOutDate) form.setValue('checkOutDate', s.accommodationCheckOutDate);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select hotel" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">
                                      <span className="text-muted-foreground">Select hotel</span>
                                    </SelectItem>
                                    {(guestSettings as { accommodationHotels?: Array<{ id: string; name: string }> }).accommodationHotels?.map((h) => (
                                      <SelectItem key={h.id} value={h.name}>
                                        {h.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Add hotels in Event Settings → Guest Fields → Accommodation.
                              </p>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Check-in date</Label>
                                <Input
                                  type="date"
                                  {...form.register('checkInDate')}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Check-out date</Label>
                                <Input
                                  type="date"
                                  {...form.register('checkOutDate')}
                                />
                              </div>
                            </div>
                            {form.formState.errors.checkOutDate && (
                              <p className="text-sm text-destructive">{form.formState.errors.checkOutDate.message}</p>
                            )}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Room number</Label>
                              <Input
                                {...form.register('roomNumber')}
                                placeholder="e.g. 204"
                              />
                            </div>
                          </>
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

                <CollapsibleSection
                  title="Custom Fields"
                  open={customFieldsOpen}
                  onOpenChange={setCustomFieldsOpen}
                >
                  <CustomFields
                    definitions={guestSettings?.customFieldDefinitions ?? []}
                    values={customFieldValues}
                    onChange={(values) => {
                      setCustomFieldValues(values);
                      (guestSettings?.customFieldDefinitions ?? []).forEach((def) =>
                        form.clearErrors(`customField_${def.id}` as keyof GuestFormData)
                      );
                    }}
                    errors={Object.fromEntries(
                      (guestSettings?.customFieldDefinitions ?? []).map((def) => [
                        def.id,
                        (form.formState.errors as Record<string, { message?: string }>)[`customField_${def.id}`],
                      ]).filter(([, e]) => e)
                    )}
                  />
                </CollapsibleSection>
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
