/**
 * RSVP Status Badge
 *
 * Displays a colored badge for RSVP status.
 */

import { Badge } from '@/components/ui/badge';
import type { RsvpStatus } from '@/hooks/use-guests';

interface RsvpStatusBadgeProps {
  status: RsvpStatus;
}

const statusConfig: Record<
  RsvpStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  declined: {
    label: 'Declined',
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
  maybe: {
    label: 'Maybe',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
};

export function RsvpStatusBadge({ status }: RsvpStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
