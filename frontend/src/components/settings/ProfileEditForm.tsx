/**
 * Profile Edit Form
 *
 * Form for editing user profile (name, phone, avatar).
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AvatarUpload } from './AvatarUpload';
import { useUpdateProfile } from '@/hooks/use-user';
import type { AuthUser } from '@/hooks/use-auth';

const profileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  phone: z
    .string()
    .max(20, 'Phone must be less than 20 characters')
    .optional()
    .or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileEditFormProps {
  user: AuthUser;
}

export function ProfileEditForm({ user }: ProfileEditFormProps) {
  const updateProfile = useUpdateProfile(user.id);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name || '',
      phone: '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    updateProfile.mutate({
      name: data.name,
      phone: data.phone || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          Update your personal information.
        </p>
      </div>

      <Separator />

      {updateProfile.isSuccess && (
        <Alert>
          <AlertDescription>Profile updated successfully.</AlertDescription>
        </Alert>
      )}

      {updateProfile.error && (
        <Alert variant="destructive">
          <AlertDescription>{updateProfile.error.message}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Avatar Section */}
        <div className="space-y-2">
          <Label>Profile picture</Label>
          <AvatarUpload currentImage={user.image} name={user.name} />
        </div>

        <Separator />

        {/* Profile Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Your name"
              disabled={updateProfile.isPending}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              disabled={updateProfile.isPending}
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={updateProfile.isPending || !isDirty}
          >
            {updateProfile.isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </form>
      </div>
    </div>
  );
}
