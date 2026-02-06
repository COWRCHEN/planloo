/**
 * Guest Form
 *
 * Form for adding/editing guests using react-hook-form + Zod.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GUEST_CATEGORIES, type GuestResponse, type CreateGuestInput } from '@/hooks/use-guests';

const guestFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().max(100).optional().nullable(),
  email: z.string().email('Invalid email').max(255).optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  category: z.enum(['vip', 'family', 'friend', 'colleague', 'other']).optional().nullable(),
  plusOnesAllowed: z.coerce.number().int().min(0).max(10).default(0),
  dietaryRestrictions: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

type GuestFormData = z.infer<typeof guestFormSchema>;

interface GuestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest?: GuestResponse | null;
  onSubmit: (data: CreateGuestInput) => Promise<void>;
  isSubmitting: boolean;
}

const categoryLabels: Record<string, string> = {
  vip: 'VIP',
  family: 'Family',
  friend: 'Friend',
  colleague: 'Colleague',
  other: 'Other',
};

export function GuestForm({
  open,
  onOpenChange,
  guest,
  onSubmit,
  isSubmitting,
}: GuestFormProps) {
  const isEditing = !!guest;

  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestFormSchema),
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

  // Reset form when dialog opens or guest changes
  useEffect(() => {
    if (open) {
      form.reset({
        firstName: guest?.firstName ?? '',
        lastName: guest?.lastName ?? '',
        email: guest?.email ?? '',
        phone: guest?.phone ?? '',
        category: guest?.category ?? null,
        plusOnesAllowed: guest?.plusOnesAllowed ?? 0,
        dietaryRestrictions: guest?.dietaryRestrictions ?? '',
        notes: guest?.notes ?? '',
      });
    }
  }, [open, guest, form]);

  const handleSubmit = async (data: GuestFormData) => {
    // Clean up empty strings to null
    const cleanedData: CreateGuestInput = {
      firstName: data.firstName,
      lastName: data.lastName || null,
      email: data.email || null,
      phone: data.phone || null,
      category: data.category || null,
      plusOnesAllowed: data.plusOnesAllowed,
      dietaryRestrictions: data.dietaryRestrictions || null,
      notes: data.notes || null,
    };

    await onSubmit(cleanedData);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Guest' : 'Add Guest'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update guest information.'
              : 'Add a new guest to your event.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                value={form.watch('category') ?? 'none'}
                onValueChange={(value) =>
                  form.setValue('category', value === 'none' ? null : (value as typeof GUEST_CATEGORIES[number]))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
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
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Guest'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
