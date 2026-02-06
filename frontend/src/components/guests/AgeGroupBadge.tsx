/**
 * Age Group Badge Component
 *
 * Displays a colored badge indicating the age group
 * of a birthday party guest (child, teen, adult).
 */

import { Badge } from '@/components/ui/badge';
import type { AgeGroup } from '@/hooks/use-guests';
import { cn } from '@/lib/utils';

interface AgeGroupBadgeProps {
  ageGroup: AgeGroup | null | undefined;
  className?: string;
}

const AGE_GROUP_CONFIG: Record<AgeGroup, { label: string; className: string }> = {
  child: {
    label: 'Child',
    className: 'bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200',
  },
  teen: {
    label: 'Teen',
    className: 'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200',
  },
  adult: {
    label: 'Adult',
    className: 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200',
  },
};

export function AgeGroupBadge({ ageGroup, className }: AgeGroupBadgeProps) {
  if (!ageGroup) return null;

  const config = AGE_GROUP_CONFIG[ageGroup];

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}

export default AgeGroupBadge;
