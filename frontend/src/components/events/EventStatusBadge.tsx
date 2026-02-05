/**
 * Event Status Badge
 *
 * Displays the event status with appropriate styling.
 */

import { Badge } from '@/components/ui/badge';
import type { EventStatus } from '@/hooks/use-events';

const statusConfig: Record<EventStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  },
  planning: {
    label: 'Planning',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
  },
  completed: {
    label: 'Completed',
    className: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-700 hover:bg-red-100',
  },
};

interface EventStatusBadgeProps {
  status: EventStatus;
}

export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
