/**
 * Verify Email View
 *
 * Wraps VerifyEmailHandler with QueryProvider so TanStack Query hooks work.
 * Must be a single island (client:load) so provider and handler share one React tree.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { VerifyEmailHandler } from '@/components/auth/VerifyEmailHandler';

export function VerifyEmailView() {
  return (
    <QueryProvider>
      <VerifyEmailHandler />
    </QueryProvider>
  );
}
