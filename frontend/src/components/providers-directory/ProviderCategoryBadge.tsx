import { Badge } from '@/components/ui/badge';
import type { ProviderCategory } from '@/hooks/use-providers';

const categoryLabels: Record<ProviderCategory, string> = {
  catering: 'Catering',
  photography: 'Photography',
  dj: 'DJ',
  florist: 'Florist',
  venue: 'Venue',
  decoration: 'Decoration',
  other: 'Other',
};

interface ProviderCategoryBadgeProps {
  category: ProviderCategory;
}

export function ProviderCategoryBadge({ category }: ProviderCategoryBadgeProps) {
  return <Badge variant="outline">{categoryLabels[category] ?? category}</Badge>;
}
