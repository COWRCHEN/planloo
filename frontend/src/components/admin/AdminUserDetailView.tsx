/**
 * Admin User Detail View
 *
 * User detail page content with QueryProvider wrapper.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { AdminUserDetail } from './AdminUserDetail';

interface AdminUserDetailViewProps {
  userId: string;
}

export function AdminUserDetailView({ userId }: AdminUserDetailViewProps) {
  return (
    <QueryProvider>
      <AdminUserDetail userId={userId} />
    </QueryProvider>
  );
}
