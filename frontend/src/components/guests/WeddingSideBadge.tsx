/**
 * Wedding Side Badge Component
 *
 * Displays a colored badge indicating which side of the wedding
 * the guest belongs to (bride, groom, or both).
 */

import { Badge } from '@/components/ui/badge';
import type { WeddingGuestSide } from '@/hooks/use-guests';
import { cn } from '@/lib/utils';

interface WeddingSideBadgeProps {
  side: WeddingGuestSide | null | undefined;
  className?: string;
}

const SIDE_CONFIG: Record<WeddingGuestSide, { label: string; className: string }> = {
  bride: {
    label: "Bride's",
    className: 'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200',
  },
  groom: {
    label: "Groom's",
    className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  },
  both: {
    label: 'Both',
    className: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
  },
};

export function WeddingSideBadge({ side, className }: WeddingSideBadgeProps) {
  if (!side) return null;

  const config = SIDE_CONFIG[side];

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}

export default WeddingSideBadge;
