/**
 * Guest Category Badge
 *
 * Displays a colored badge for guest categories.
 */

import { Badge } from '@/components/ui/badge';
import type { GuestCategory } from '@/hooks/use-guests';

interface GuestCategoryBadgeProps {
  category: GuestCategory | null;
}

const categoryConfig: Record<
  GuestCategory,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  vip: { label: 'VIP', variant: 'default' },
  family: { label: 'Family', variant: 'secondary' },
  friend: { label: 'Friend', variant: 'secondary' },
  colleague: { label: 'Colleague', variant: 'outline' },
  other: { label: 'Other', variant: 'outline' },
};

export function GuestCategoryBadge({ category }: GuestCategoryBadgeProps) {
  if (!category) return null;

  const config = categoryConfig[category];

  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}
