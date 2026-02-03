/**
 * Reset Password Form
 *
 * Set new password using reset token from URL.
 * Uses TanStack Query for mutations.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useResetPassword } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setTokenError('Invalid or missing reset token. Please request a new password reset.');
    }
  }, []);

  const onSubmit = (data: ResetPasswordFormData) => {
    if (!token) {
      setTokenError('Invalid or missing reset token');
      return;
    }
    resetPassword.mutate({ token, newPassword: data.password });
  };

  if (resetPassword.isSuccess) {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Password reset successful!</p>
              <p>
                Your password has been updated. You can now sign in with your new
                password.
              </p>
            </div>
          </AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <a href="/login">Sign in</a>
        </Button>
      </div>
    );
  }

  if (!token && tokenError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{tokenError}</AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <a href="/forgot-password">Request new reset link</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {resetPassword.error && (
        <Alert variant="destructive">
          <AlertDescription>{resetPassword.error.message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Create a strong password"
            autoComplete="new-password"
            disabled={resetPassword.isPending}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            autoComplete="new-password"
            disabled={resetPassword.isPending}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
          {resetPassword.isPending ? 'Resetting password...' : 'Reset password'}
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
