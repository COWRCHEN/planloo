/**
 * Admin Audit Log View
 *
 * Audit log page content with QueryProvider wrapper.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { AdminAuditLogList } from './AdminAuditLogList';

function AdminAuditLogContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground">Review administrative actions and changes</p>
      </div>

      <AdminAuditLogList />
    </div>
  );
}

export function AdminAuditLogView() {
  return (
    <QueryProvider>
      <AdminAuditLogContent />
    </QueryProvider>
  );
}
