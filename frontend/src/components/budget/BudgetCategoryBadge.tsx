import { Badge } from '@/components/ui/badge';
import type { BudgetCategory } from '@/hooks/use-budget';

const categoryLabels: Record<BudgetCategory, string> = {
  venue: 'Venue',
  catering: 'Catering',
  entertainment: 'Entertainment',
  decorations: 'Decorations',
  photography: 'Photography',
  other: 'Other',
};

interface BudgetCategoryBadgeProps {
  category: BudgetCategory;
}

export function BudgetCategoryBadge({ category }: BudgetCategoryBadgeProps) {
  return <Badge variant="outline">{categoryLabels[category] ?? category}</Badge>;
}
