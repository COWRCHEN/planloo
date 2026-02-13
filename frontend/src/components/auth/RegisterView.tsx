/**
 * Register View
 *
 * Wraps RegisterForm with QueryProvider so TanStack Query hooks work.
 * Must be a single island (client:load) so provider and form share one React tree.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { RegisterForm } from '@/components/auth/RegisterForm';

interface RegisterViewProps {
  returnUrl?: string;
}

export function RegisterView({ returnUrl = '/dashboard' }: RegisterViewProps) {
  return (
    <QueryProvider>
      <RegisterForm returnUrl={returnUrl} />
    </QueryProvider>
  );
}
