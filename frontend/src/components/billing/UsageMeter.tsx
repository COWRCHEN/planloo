/**
 * UsageMeter — shows a labeled progress bar for a quota metric.
 */

import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface UsageMeterProps {
  label: string;
  current: number;
  limit: number | null;
  unit?: string;
  className?: string;
}

export function UsageMeter({ label, current, limit, unit = '', className }: UsageMeterProps) {
  const unlimited = limit === null;
  const pct = unlimited ? 0 : Math.min(100, (current / limit) * 100);
  const nearLimit = !unlimited && pct >= 80;
  const atLimit = !unlimited && pct >= 100;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium tabular-nums', atLimit && 'text-destructive', nearLimit && !atLimit && 'text-yellow-600')}>
          {unlimited
            ? `${current.toLocaleString()}${unit} / ∞`
            : `${current.toLocaleString()}${unit} / ${limit.toLocaleString()}${unit}`}
        </span>
      </div>
      {!unlimited && (
        <Progress
          value={pct}
          className={cn(
            'h-2',
            atLimit && '[&>div]:bg-destructive',
            nearLimit && !atLimit && '[&>div]:bg-yellow-500',
          )}
        />
      )}
    </div>
  );
}
