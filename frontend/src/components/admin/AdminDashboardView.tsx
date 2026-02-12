/**
 * Admin Dashboard View
 *
 * Main admin dashboard page content with QueryProvider wrapper.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { Card, CardContent } from '@/components/ui/card';
import { AdminDashboardStats } from './AdminDashboardStats';

function AdminDashboardContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and statistics</p>
      </div>

      <AdminDashboardStats />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-2 font-semibold">User Management</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              View, search, and manage platform users. Change roles and suspend accounts.
            </p>
            <a
              href="/admin/users"
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              Manage Users
              <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-2 font-semibold">Audit Log</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Review administrative actions and changes made by operators and admins.
            </p>
            <a
              href="/admin/audit-log"
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              View Audit Log
              <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AdminDashboardView() {
  return (
    <QueryProvider>
      <AdminDashboardContent />
    </QueryProvider>
  );
}
