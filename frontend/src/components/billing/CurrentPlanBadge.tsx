/**
 * CurrentPlanBadge — small badge showing the user's current plan.
 * Suitable for the sidebar or nav header.
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlanId } from '@/hooks/use-billing';

const PLAN_STYLES: Record<PlanId, string> = {
  free: 'bg-muted text-muted-foreground',
  personal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  planner: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  agency: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  enterprise: 'bg-slate-800 text-slate-100 dark:bg-slate-700 dark:text-slate-100',
};

const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Free',
  personal: 'Personal',
  planner: 'Planner',
  agency: 'Agency',
  enterprise: 'Enterprise',
};

interface CurrentPlanBadgeProps {
  plan: PlanId;
  className?: string;
}

export function CurrentPlanBadge({ plan, className }: CurrentPlanBadgeProps) {
  return (
    <Badge className={cn('text-xs font-semibold', PLAN_STYLES[plan], className)}>
      {PLAN_LABELS[plan]}
    </Badge>
  );
}
