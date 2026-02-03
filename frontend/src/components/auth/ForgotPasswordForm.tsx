/**
 * Forgot Password Form
 *
 * Request password reset email.
 * Uses TanStack Query for mutations.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForgotPassword } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotPassword.mutate({
      email: data.email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
  };

  if (forgotPassword.isSuccess) {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Check your email!</p>
              <p>
                If an account exists with that email address, we&apos;ve sent password
                reset instructions. Please check your inbox and spam folder.
              </p>
            </div>
          </AlertDescription>
        </Alert>
        <p className="text-center text-sm text-muted-foreground">
          <a href="/login" className="text-primary hover:text-primary/80 font-medium">
            Back to sign in
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {forgotPassword.error && (
        <Alert variant="destructive">
          <AlertDescription>{forgotPassword.error.message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={forgotPassword.isPending}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
          {forgotPassword.isPending ? 'Sending...' : 'Send reset instructions'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <a href="/login" className="text-primary hover:text-primary/80 font-medium">
          Sign in
        </a>
      </p>
    </div>
  );
}
