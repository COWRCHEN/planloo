/**
 * Email History
 *
 * Displays a paginated table of emails sent for a specific event.
 */

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useEmailLog,
  type EmailType,
} from '@/hooks/use-notification-settings';

const PAGE_SIZE = 10;

const emailTypeLabels: Record<EmailType, string> = {
  verification: 'Verification',
  password_reset: 'Password Reset',
  welcome: 'Welcome',
  rsvp_invitation: 'RSVP Invitation',
  rsvp_confirmation: 'RSVP Confirmation',
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface EmailHistoryProps {
  eventUuid: string;
}

export function EmailHistory({ eventUuid }: EmailHistoryProps) {
  const [page, setPage] = useState(0);
  const offset = page * PAGE_SIZE;

  const { data, isLoading, error } = useEmailLog(eventUuid, {
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = data ? Math.ceil(data.meta.total / PAGE_SIZE) : 0;

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Failed to load email history. Please try again.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium">Email History</h3>
        <p className="text-sm text-muted-foreground">
          Recent emails sent for this event.
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data && data.items.length > 0 ? (
              data.items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Badge variant="secondary" className="whitespace-nowrap text-xs font-normal">
                      {emailTypeLabels[entry.emailType] ?? entry.emailType}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {entry.subject}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                    {entry.recipientEmail}
                  </TableCell>
                  <TableCell>
                    {entry.status === 'sent' ? (
                      <Badge variant="default" className="bg-emerald-600 text-xs font-normal">
                        Sent
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs font-normal" title={entry.errorMessage ?? undefined}>
                        Failed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(entry.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No emails sent yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {offset + 1}-{Math.min(offset + PAGE_SIZE, data?.meta.total ?? 0)} of {data?.meta.total ?? 0}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
