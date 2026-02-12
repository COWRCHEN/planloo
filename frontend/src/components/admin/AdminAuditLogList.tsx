/**
 * Admin Audit Log List
 *
 * Displays a paginated table of audit log entries.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuditLog, type ListAuditLogQuery } from '@/hooks/use-admin';

const PAGE_SIZE = 20;

const ACTION_LABELS: Record<string, string> = {
  'user.role_change': 'Role Changed',
  'user.suspend': 'User Suspended',
  'user.unsuspend': 'User Unsuspended',
};

function formatAction(action: string): string {
  return ACTION_LABELS[action] || action;
}

function formatDetails(details: string | null): string {
  if (!details) return '';
  try {
    const parsed = JSON.parse(details);
    return Object.entries(parsed)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  } catch {
    return details;
  }
}

export function AdminAuditLogList() {
  const [offset, setOffset] = useState(0);

  const filters: Partial<ListAuditLogQuery> = {
    limit: PAGE_SIZE,
    offset,
  };

  const { data, isLoading, error } = useAuditLog(filters);

  const total = data?.meta?.total ?? 0;
  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-sm text-destructive">Failed to load audit log</p>
            </div>
          ) : data?.entries.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No audit log entries</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.actorEmail || entry.actorId}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatAction(entry.action)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.targetName || entry.targetId || '—'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {formatDetails(entry.details)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
