import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBudgetSummary } from '@/hooks/use-budget';
import type { BudgetCategory } from '@/hooks/use-budget';

interface BudgetCategoryBreakdownProps {
  eventUuid: string;
}

const categoryLabels: Record<BudgetCategory, string> = {
  venue: 'Venue',
  catering: 'Catering',
  entertainment: 'Entertainment',
  decorations: 'Decorations',
  photography: 'Photography',
  other: 'Other',
};

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function BudgetCategoryBreakdown({ eventUuid }: BudgetCategoryBreakdownProps) {
  const { data: summary } = useBudgetSummary(eventUuid);

  if (!summary || summary.byCategory.length === 0) return null;

  const maxEstimated = Math.max(...summary.byCategory.map((c) => c.estimated), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">By Category</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.byCategory.map((cat) => {
          const pct = maxEstimated > 0 ? (cat.estimated / maxEstimated) * 100 : 0;
          return (
            <div key={cat.category} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {categoryLabels[cat.category as BudgetCategory] ?? cat.category}
                </span>
                <span className="text-muted-foreground">
                  {formatCurrency(cat.actual, summary.currency)} / {formatCurrency(cat.estimated, summary.currency)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{cat.count} item{cat.count !== 1 ? 's' : ''}</span>
                <span>Paid: {formatCurrency(cat.paid, summary.currency)}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
