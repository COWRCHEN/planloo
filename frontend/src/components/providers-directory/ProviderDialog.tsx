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

const PROVIDER_CATEGORIES_ENUM = ['catering', 'photography', 'dj', 'florist', 'venue', 'decoration', 'other'] as const;
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
  locationCity: z.string().max(100).optional().nullable(),
  locationState: z.string().max(100).optional().nullable(),
  locationCountry: z.string().max(100).optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

const categoryLabels: Record<string, string> = {
  catering: 'Catering',
  photography: 'Photography',
  dj: 'DJ',
  florist: 'Florist',
  venue: 'Venue',
  decoration: 'Decoration',
  other: 'Other',
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
      locationCity: provider?.locationCity ?? null,
      locationState: provider?.locationState ?? null,
      locationCountry: provider?.locationCountry ?? null,
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

  useEffect(() => {
    if (open) reset(getDefaults());
  }, [open, provider, reset]);

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
      locationCity: data.locationCity ?? null,
      locationState: data.locationState ?? null,
      locationCountry: data.locationCountry ?? null,
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
            <Label htmlFor="businessName">Business Name *</Label>
            <Input id="businessName" {...register('businessName')} placeholder="e.g. Elite Catering Co." />
            {errors.businessName && (
              <p className="text-sm text-destructive">{errors.businessName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category *</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="locationCity">City</Label>
              <Input id="locationCity" {...register('locationCity')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationState">State</Label>
              <Input id="locationState" {...register('locationState')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationCountry">Country</Label>
              <Input id="locationCountry" {...register('locationCountry')} />
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
