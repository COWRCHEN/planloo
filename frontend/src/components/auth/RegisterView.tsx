/**
 * Register View
 *
 * Wraps RegisterForm with QueryProvider so TanStack Query hooks work.
 * Must be a single island (client:load) so provider and form share one React tree.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { RegisterForm } from '@/components/auth/RegisterForm';

export function RegisterView() {
  return (
    <QueryProvider>
      <RegisterForm />
    </QueryProvider>
  );
}
