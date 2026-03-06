import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBudgetSummary } from '@/hooks/use-budget';
import type { BudgetCategory } from '@/hooks/use-budget';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

const CATEGORY_COLORS: Record<BudgetCategory, string> = {
  venue: '#6366f1',
  catering: '#f59e0b',
  entertainment: '#10b981',
  decorations: '#ec4899',
  photography: '#3b82f6',
  other: '#8b5cf6',
};

const FALLBACK_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6', '#8b5cf6'];

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

interface PieEntry {
  name: string;
  estimated: number;
  actual: number;
  paid: number;
  count: number;
}

interface TooltipProps {
  active?: boolean | undefined;
  payload?: ReadonlyArray<{ payload: PieEntry }> | undefined;
  currency: string;
}

function CustomTooltip({ active, payload, currency }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;
  const { name, estimated, actual, paid, count } = entry;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm space-y-1">
      <p className="font-semibold">{name}</p>
      <p className="text-muted-foreground">{count} item{count !== 1 ? 's' : ''}</p>
      <p>Estimated: <span className="font-medium">{formatCurrency(estimated, currency)}</span></p>
      <p>Actual: <span className="font-medium">{formatCurrency(actual, currency)}</span></p>
      <p>Paid: <span className="font-medium">{formatCurrency(paid, currency)}</span></p>
    </div>
  );
}

export function BudgetCategoryBreakdown({ eventUuid }: BudgetCategoryBreakdownProps) {
  const { data: summary } = useBudgetSummary(eventUuid);

  if (!summary || summary.byCategory.length === 0) return null;

  const pieData = summary.byCategory.map((cat, i) => ({
    name: categoryLabels[cat.category as BudgetCategory] ?? cat.category,
    value: cat.estimated,
    estimated: cat.estimated,
    actual: cat.actual,
    paid: cat.paid,
    count: cat.count,
    color: CATEGORY_COLORS[cat.category as BudgetCategory] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">By Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={index} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={(props) => (
              <CustomTooltip
                active={props.active}
                payload={props.payload as TooltipProps['payload']}
                currency={summary.currency}
              />
            )} />
            <Legend
              iconType="circle"
              iconSize={10}
              formatter={(value) => <span className="text-sm">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
