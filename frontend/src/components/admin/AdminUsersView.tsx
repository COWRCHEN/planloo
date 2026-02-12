/**
 * Admin Users View
 *
 * User management page content with QueryProvider wrapper.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { AdminUserList } from './AdminUserList';

function AdminUsersContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Search, filter, and manage platform users</p>
      </div>

      <AdminUserList />
    </div>
  );
}

export function AdminUsersView() {
  return (
    <QueryProvider>
      <AdminUsersContent />
    </QueryProvider>
  );
}
