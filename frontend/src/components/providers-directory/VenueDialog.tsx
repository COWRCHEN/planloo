import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  useCreateVenue,
  useUpdateVenue,
  VENUE_TYPES,
  type VenueResponse,
  type CreateVenueInput,
} from '@/hooks/use-providers';
import {
  SUPPORTED_COUNTRIES,
  US_STATES,
  CA_PROVINCES,
  STATE_LABELS,
  validateVenueAddress,
  type SupportedCountry,
} from '../../../../shared/schemas/provider';

const VENUE_TYPES_ENUM = ['banquet_hall', 'outdoor', 'hotel', 'restaurant', 'conference_center', 'other'] as const;

const formSchema = z.object({
  name: z.string().min(1, 'Venue name is required').max(200),
  venueType: z.enum(VENUE_TYPES_ENUM).optional().nullable(),
  address: z.string().min(1, 'Address is required').max(500),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State/Province is required').max(10),
  country: z.enum(SUPPORTED_COUNTRIES, { required_error: 'Country is required' }),
  postalCode: z.string().min(1, 'Postal code is required').max(20),
  capacityMin: z.coerce.number().int().min(0).optional().nullable(),
  capacityMax: z.coerce.number().int().min(0).optional().nullable(),
  pricePerHour: z.coerce.number().min(0).optional().nullable(),
  pricePerDay: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('USD'),
  amenities: z.string().optional().nullable(),
  contactEmail: z.string().email('Must be a valid email').optional().nullable().or(z.literal('')),
  contactPhone: z.string().max(50).optional().nullable(),
  website: z.string().url('Must be a valid URL').max(500).optional().nullable().or(z.literal('')),
  description: z.string().max(2000).optional().nullable(),
}).superRefine((data, ctx) => validateVenueAddress(data, ctx));

type FormData = z.infer<typeof formSchema>;

const venueTypeLabels: Record<string, string> = {
  banquet_hall: 'Banquet Hall',
  outdoor: 'Outdoor',
  hotel: 'Hotel',
  restaurant: 'Restaurant',
  conference_center: 'Conference Center',
  other: 'Other',
};

const countryLabels: Record<string, string> = {
  US: 'United States',
  CA: 'Canada',
};

interface VenueDialogProps {
  venue?: VenueResponse;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function VenueDialog({ venue, trigger, onSuccess }: VenueDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditing = !!venue;

  const createMutation = useCreateVenue();
  const updateMutation = useUpdateVenue(venue?.uuid ?? '');

  function getDefaults(): FormData {
    return {
      name: venue?.name ?? '',
      venueType: venue?.venueType ?? null,
      address: venue?.address ?? '',
      city: venue?.city ?? '',
      state: venue?.state ?? '',
      country: (venue?.country as SupportedCountry) ?? 'US',
      postalCode: venue?.postalCode ?? '',
      capacityMin: venue?.capacityMin ?? null,
      capacityMax: venue?.capacityMax ?? null,
      pricePerHour: venue?.pricePerHour ?? null,
      pricePerDay: venue?.pricePerDay ?? null,
      currency: venue?.currency ?? 'USD',
      amenities: venue?.amenities?.join(', ') ?? null,
      contactEmail: venue?.contactEmail ?? null,
      contactPhone: venue?.contactPhone ?? null,
      website: venue?.website ?? null,
      description: venue?.description ?? null,
    };
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaults(),
  });

  const selectedVenueType = watch('venueType');
  const selectedCountry = watch('country');
  const selectedState = watch('state');

  const stateOptions = selectedCountry === 'CA' ? CA_PROVINCES : US_STATES;

  useEffect(() => {
    if (open) reset(getDefaults());
  }, [open, venue, reset]);

  // Reset state when country changes
  useEffect(() => {
    if (!open) return;
    const currentState = watch('state');
    if (currentState) {
      const validStates = selectedCountry === 'CA' ? CA_PROVINCES : US_STATES;
      if (!(validStates as readonly string[]).includes(currentState)) {
        setValue('state', '');
      }
    }
  }, [selectedCountry]);

  const onSubmit = handleSubmit(async (data) => {
    const payload: CreateVenueInput = {
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      postalCode: data.postalCode,
      currency: data.currency,
      venueType: data.venueType ?? null,
      capacityMin: data.capacityMin ?? null,
      capacityMax: data.capacityMax ?? null,
      pricePerHour: data.pricePerHour ?? null,
      pricePerDay: data.pricePerDay ?? null,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone ?? null,
      website: data.website || null,
      description: data.description ?? null,
      amenities: data.amenities
        ? data.amenities.split(',').map((s) => s.trim()).filter(Boolean)
        : null,
    };

    if (isEditing) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
    setOpen(false);
    onSuccess?.();
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>{isEditing ? 'Edit' : 'Add Venue'}</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Venue' : 'Add Venue'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Venue Name <span className="text-destructive">*</span></Label>
              <Input id="name" {...register('name')} placeholder="e.g. Grand Ballroom" />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Venue Type</Label>
              <Select
                value={selectedVenueType ?? 'none'}
                onValueChange={(val) => setValue('venueType', val === 'none' ? null : val as FormData['venueType'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {VENUE_TYPES.map((vt) => (
                    <SelectItem key={vt} value={vt}>{venueTypeLabels[vt] ?? vt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
            <Input id="address" {...register('address')} placeholder="123 Main St" />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
              <Input id="city" {...register('city')} />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>State/Province <span className="text-destructive">*</span></Label>
              <Select
                value={selectedState || 'none'}
                onValueChange={(val) => setValue('state', val === 'none' ? '' : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select...</SelectItem>
                  {stateOptions.map((st) => (
                    <SelectItem key={st} value={st}>
                      {STATE_LABELS[st] ?? st} ({st})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="text-sm text-destructive">{errors.state.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Country <span className="text-destructive">*</span></Label>
              <Select
                value={selectedCountry}
                onValueChange={(val) => setValue('country', val as SupportedCountry)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {countryLabels[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code <span className="text-destructive">*</span></Label>
              <Input
                id="postalCode"
                {...register('postalCode')}
                placeholder={selectedCountry === 'CA' ? 'A1A 1A1' : '90210'}
              />
              {errors.postalCode && (
                <p className="text-sm text-destructive">{errors.postalCode.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="capacityMin">Capacity Min</Label>
              <Input id="capacityMin" type="number" min={0} {...register('capacityMin', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacityMax">Capacity Max</Label>
              <Input id="capacityMax" type="number" min={0} {...register('capacityMax', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pricePerHour">Price/Hour</Label>
              <Input id="pricePerHour" type="number" step="0.01" min={0} {...register('pricePerHour', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricePerDay">Price/Day</Label>
              <Input id="pricePerDay" type="number" step="0.01" min={0} {...register('pricePerDay', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amenities">Amenities (comma-separated)</Label>
            <Input id="amenities" {...register('amenities')} placeholder="e.g. Parking, WiFi, Catering" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input id="contactEmail" type="email" {...register('contactEmail')} />
              {errors.contactEmail && (
                <p className="text-sm text-destructive">{errors.contactEmail.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input id="contactPhone" {...register('contactPhone')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" {...register('website')} placeholder="https://example.com" />
            {errors.website && (
              <p className="text-sm text-destructive">{errors.website.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} placeholder="Describe the venue..." rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Venue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
