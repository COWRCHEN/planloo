import type { FloorPlanDetailResponse } from '@/hooks/use-floor-plans';

interface Props {
  plan: FloorPlanDetailResponse | undefined;
  unassignedCount: number;
}

export function SeatingChartStats({ plan, unassignedCount }: Props) {
  if (!plan) return null;

  const tables = plan.objects.filter((o) => o.objectType === 'table');
  const totalSeats = tables.reduce((sum, t) => sum + (t.seatCount ?? 0), 0);
  const assignedSeats = tables.reduce((sum, t) => sum + t.assignments.length, 0);

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground px-1">
      <span>
        <strong className="text-foreground">{tables.length}</strong> tables
      </span>
      <span className="text-border">|</span>
      <span>
        <strong className="text-foreground">{totalSeats}</strong> seats
      </span>
      <span className="text-border">|</span>
      <span>
        <strong className="text-foreground">{assignedSeats}</strong> assigned
      </span>
      <span className="text-border">|</span>
      <span>
        <strong className="text-foreground">{unassignedCount}</strong> unassigned
      </span>
    </div>
  );
}
