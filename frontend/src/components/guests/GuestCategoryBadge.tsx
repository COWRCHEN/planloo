/**
 * Guest Category Badge
 *
 * Displays a colored badge for guest categories.
 * When options are provided (from event guest settings), uses the label from options; otherwise falls back to built-in labels for known keys.
 */

import { Badge } from '@/components/ui/badge';

interface CategoryOption {
  key: string;
  label: string;
}

interface GuestCategoryBadgeProps {
  category: string | null;
  /** When provided (e.g. from event guest settings), label is resolved from these options */
  options?: CategoryOption[] | null | undefined;
}

const builtInLabels: Record<string, string> = {
  vip: 'VIP',
  family: 'Family',
  friend: 'Friend',
  colleague: 'Colleague',
  other: 'Other',
};

export function GuestCategoryBadge({ category, options }: GuestCategoryBadgeProps) {
  if (!category) return null;

  const label = options?.find((o) => o.key === category)?.label ?? builtInLabels[category] ?? category;

  return (
    <Badge variant="secondary" className="text-xs">
      {label}
    </Badge>
  );
}
