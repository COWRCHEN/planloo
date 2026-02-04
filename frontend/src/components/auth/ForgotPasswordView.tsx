/**
 * Forgot Password View
 *
 * Wraps ForgotPasswordForm with QueryProvider so TanStack Query hooks work.
 * Must be a single island (client:load) so provider and form share one React tree.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export function ForgotPasswordView() {
  return (
    <QueryProvider>
      <ForgotPasswordForm />
    </QueryProvider>
  );
}
