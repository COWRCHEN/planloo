/**
 * Attendee Type Badge Component
 *
 * Displays a colored badge indicating the attendee type
 * at a corporate event (employee, client, vendor, partner, other).
 */

import { Badge } from '@/components/ui/badge';
import type { AttendeeType } from '@/hooks/use-guests';
import { cn } from '@/lib/utils';

interface AttendeeTypeBadgeProps {
  attendeeType: AttendeeType | null | undefined;
  className?: string;
}

const ATTENDEE_TYPE_CONFIG: Record<AttendeeType, { label: string; className: string }> = {
  employee: {
    label: 'Employee',
    className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  },
  client: {
    label: 'Client',
    className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
  },
  vendor: {
    label: 'Vendor',
    className: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
  },
  partner: {
    label: 'Partner',
    className: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
  },
  other: {
    label: 'Other',
    className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
  },
};

export function AttendeeTypeBadge({ attendeeType, className }: AttendeeTypeBadgeProps) {
  if (!attendeeType) return null;

  const config = ATTENDEE_TYPE_CONFIG[attendeeType];

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}

export default AttendeeTypeBadge;
