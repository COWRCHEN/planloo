import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBudgetSummary } from '@/hooks/use-budget';

interface BudgetSummaryProps {
  eventUuid: string;
}

function formatCurrency(amount: number | null | undefined, currency: string = 'USD'): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={`h-2 w-full rounded-full bg-muted ${className ?? ''}`}>
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function BudgetSummary({ eventUuid }: BudgetSummaryProps) {
  const { data: summary, isLoading } = useBudgetSummary(eventUuid);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const currency = summary.currency;

  const cards = [
    { title: 'Total Budget', value: formatCurrency(summary.totalBudget, currency), subtitle: 'Set budget' },
    { title: 'Estimated', value: formatCurrency(summary.totalEstimated, currency), subtitle: `${summary.itemCount} items` },
    { title: 'Actual Cost', value: formatCurrency(summary.totalActual, currency), subtitle: 'Total actual' },
    { title: 'Paid', value: formatCurrency(summary.totalPaid, currency), subtitle: 'Total paid' },
  ];

  const spentPct = summary.totalBudget && summary.totalBudget > 0
    ? (summary.totalActual / summary.totalBudget) * 100
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {summary.totalBudget !== null && summary.totalBudget > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Budget Usage</span>
              <span className="font-medium">{spentPct.toFixed(0)}%</span>
            </div>
            <ProgressBar value={summary.totalActual} max={summary.totalBudget} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
