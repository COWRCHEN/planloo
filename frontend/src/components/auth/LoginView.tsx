/**
 * Login View
 *
 * Wraps LoginForm with QueryProvider so TanStack Query hooks work.
 * Must be a single island (client:load) so provider and form share one React tree.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { LoginForm } from '@/components/auth/LoginForm';

interface LoginViewProps {
  returnUrl?: string;
}

export function LoginView({ returnUrl = '/dashboard' }: LoginViewProps) {
  return (
    <QueryProvider>
      <LoginForm returnUrl={returnUrl} />
    </QueryProvider>
  );
}
