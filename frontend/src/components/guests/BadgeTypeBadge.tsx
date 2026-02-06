/**
 * Badge Type Badge Component
 *
 * Displays a colored badge indicating the attendee's badge type
 * at a conference (speaker, VIP, standard, press, exhibitor, staff).
 */

import { Badge } from '@/components/ui/badge';
import type { BadgeType } from '@/hooks/use-guests';
import { cn } from '@/lib/utils';

interface BadgeTypeBadgeProps {
  badgeType: BadgeType | null | undefined;
  className?: string;
}

const BADGE_TYPE_CONFIG: Record<BadgeType, { label: string; className: string }> = {
  speaker: {
    label: 'Speaker',
    className: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
  },
  vip: {
    label: 'VIP',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
  },
  standard: {
    label: 'Standard',
    className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
  },
  press: {
    label: 'Press',
    className: 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200',
  },
  exhibitor: {
    label: 'Exhibitor',
    className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
  },
  staff: {
    label: 'Staff',
    className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
  },
};

export function BadgeTypeBadge({ badgeType, className }: BadgeTypeBadgeProps) {
  if (!badgeType) return null;

  const config = BADGE_TYPE_CONFIG[badgeType];

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}

export default BadgeTypeBadge;
