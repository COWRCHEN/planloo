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
  useCreateProvider,
  useUpdateProvider,
  PROVIDER_CATEGORIES,
  PRICE_RANGES,
  type ServiceProviderResponse,
  type CreateProviderInput,
} from '@/hooks/use-providers';
import {
  SUPPORTED_COUNTRIES,
  US_STATES,
  CA_PROVINCES,
  STATE_LABELS,
  validateProviderAddress,
  type SupportedCountry,
} from '../../../../shared/schemas/provider';

const PROVIDER_CATEGORIES_ENUM = ['catering', 'photography', 'videography', 'dj', 'entertainment', 'florist', 'decoration', 'transportation', 'av_technology', 'hair_makeup', 'other'] as const;
const PRICE_RANGES_ENUM = ['$$', '$$$', '$$$$'] as const;

const formSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(200),
  category: z.enum(PROVIDER_CATEGORIES_ENUM),
  email: z.string().email('Valid email is required'),
  phone: z.string().max(50).optional().nullable(),
  contactName: z.string().max(200).optional().nullable(),
  website: z.string().url('Must be a valid URL').max(500).optional().nullable().or(z.literal('')),
  description: z.string().max(2000).optional().nullable(),
  priceRange: z.enum(PRICE_RANGES_ENUM).optional().nullable(),
  servicesOffered: z.string().optional().nullable(),
  locationAddress: z.string().min(1, 'Address is required').max(500),
  locationCity: z.string().min(1, 'City is required').max(100),
  locationState: z.string().max(10),
  locationCountry: z.enum(SUPPORTED_COUNTRIES, { required_error: 'Country is required' }),
  locationPostalCode: z.string().min(1, 'Postal code is required').max(20),
}).superRefine((data, ctx) => validateProviderAddress(data, ctx));

type FormData = z.infer<typeof formSchema>;

const categoryLabels: Record<string, string> = {
  catering: 'Catering',
  photography: 'Photography',
  videography: 'Videography',
  dj: 'DJ',
  entertainment: 'Entertainment',
  florist: 'Florist',
  decoration: 'Decoration',
  transportation: 'Transportation',
  av_technology: 'AV & Technology',
  hair_makeup: 'Hair & Makeup',
  other: 'Other',
};

const countryLabels: Record<string, string> = {
  US: 'United States',
  CA: 'Canada',
};

interface ProviderDialogProps {
  provider?: ServiceProviderResponse;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ProviderDialog({ provider, trigger, onSuccess }: ProviderDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditing = !!provider;

  const createMutation = useCreateProvider();
  const updateMutation = useUpdateProvider(provider?.uuid ?? '');

  function getDefaults(): FormData {
    return {
      businessName: provider?.businessName ?? '',
      category: provider?.category ?? 'other',
      email: provider?.email ?? '',
      phone: provider?.phone ?? null,
      contactName: provider?.contactName ?? null,
      website: provider?.website ?? null,
      description: provider?.description ?? null,
      priceRange: provider?.priceRange ?? null,
      servicesOffered: provider?.servicesOffered?.join(', ') ?? null,
      locationAddress: provider?.locationAddress ?? '',
      locationCity: provider?.locationCity ?? '',
      locationState: provider?.locationState ?? '',
      locationCountry: (provider?.locationCountry as SupportedCountry) ?? 'US',
      locationPostalCode: provider?.locationPostalCode ?? '',
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

  const selectedCategory = watch('category');
  const selectedPriceRange = watch('priceRange');
  const selectedCountry = watch('locationCountry');
  const selectedState = watch('locationState');

  const stateOptions = selectedCountry === 'CA' ? CA_PROVINCES : US_STATES;

  useEffect(() => {
    if (open) reset(getDefaults());
  }, [open, provider, reset]);

  // Reset state when country changes
  useEffect(() => {
    if (!open) return;
    const currentState = watch('locationState');
    if (currentState) {
      const validStates = selectedCountry === 'CA' ? CA_PROVINCES : US_STATES;
      if (!(validStates as readonly string[]).includes(currentState)) {
        setValue('locationState', '');
      }
    }
  }, [selectedCountry]);

  const onSubmit = handleSubmit(async (data) => {
    const payload: CreateProviderInput = {
      businessName: data.businessName,
      category: data.category,
      email: data.email,
      phone: data.phone ?? null,
      contactName: data.contactName ?? null,
      website: data.website || null,
      description: data.description ?? null,
      priceRange: data.priceRange ?? null,
      locationAddress: data.locationAddress,
      locationCity: data.locationCity,
      locationState: data.locationState,
      locationCountry: data.locationCountry,
      locationPostalCode: data.locationPostalCode,
      servicesOffered: data.servicesOffered
        ? data.servicesOffered.split(',').map((s) => s.trim()).filter(Boolean)
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
        {trigger ?? <Button>{isEditing ? 'Edit' : 'Add Provider'}</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Provider' : 'Add Service Provider'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name <span className="text-destructive">*</span></Label>
            <Input id="businessName" {...register('businessName')} placeholder="e.g. Elite Catering Co." />
            {errors.businessName && (
              <p className="text-sm text-destructive">{errors.businessName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category <span className="text-destructive">*</span></Label>
            <Select
              value={selectedCategory}
              onValueChange={(val) => setValue('category', val as FormData['category'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabels[cat] ?? cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" {...register('email')} placeholder="contact@example.com" />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} placeholder="+1 555-0123" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input id="contactName" {...register('contactName')} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Price Range</Label>
              <Select
                value={selectedPriceRange ?? 'none'}
                onValueChange={(val) => setValue('priceRange', val === 'none' ? null : val as FormData['priceRange'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {PRICE_RANGES.map((pr) => (
                    <SelectItem key={pr} value={pr}>{pr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Textarea id="description" {...register('description')} placeholder="Describe services offered..." rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="servicesOffered">Services Offered (comma-separated)</Label>
            <Input id="servicesOffered" {...register('servicesOffered')} placeholder="e.g. Wedding catering, Corporate events" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationAddress">Address <span className="text-destructive">*</span></Label>
            <Input id="locationAddress" {...register('locationAddress')} placeholder="123 Main St" />
            {errors.locationAddress && (
              <p className="text-sm text-destructive">{errors.locationAddress.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="locationCity">City <span className="text-destructive">*</span></Label>
              <Input id="locationCity" {...register('locationCity')} />
              {errors.locationCity && (
                <p className="text-sm text-destructive">{errors.locationCity.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>State/Province <span className="text-destructive">*</span></Label>
              <Select
                value={selectedState || 'none'}
                onValueChange={(val) => setValue('locationState', val === 'none' ? '' : val)}
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
              {errors.locationState && (
                <p className="text-sm text-destructive">{errors.locationState.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Country <span className="text-destructive">*</span></Label>
              <Select
                value={selectedCountry}
                onValueChange={(val) => setValue('locationCountry', val as SupportedCountry)}
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
              <Label htmlFor="locationPostalCode">Postal Code <span className="text-destructive">*</span></Label>
              <Input
                id="locationPostalCode"
                {...register('locationPostalCode')}
                placeholder={selectedCountry === 'CA' ? 'A1A 1A1' : '90210'}
              />
              {errors.locationPostalCode && (
                <p className="text-sm text-destructive">{errors.locationPostalCode.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Provider'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
