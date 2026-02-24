import { Badge } from '@/components/ui/badge';
import type { ProviderCategory } from '@/hooks/use-providers';

const categoryLabels: Record<ProviderCategory, string> = {
  catering: 'Catering',
  photography: 'Photography',
  videography: 'Videography',
  dj: 'DJ',
  entertainment: 'Entertainment',
  florist: 'Florist',
  decoration: 'Decoration',
  transportation: 'Transportation',
  av_technology: 'AV & Technology',
  hair_makeup: 'Hair & Makeup',
  other: 'Other',
};

interface ProviderCategoryBadgeProps {
  category: ProviderCategory;
}

export function ProviderCategoryBadge({ category }: ProviderCategoryBadgeProps) {
  return <Badge variant="outline">{categoryLabels[category] ?? category}</Badge>;
}
