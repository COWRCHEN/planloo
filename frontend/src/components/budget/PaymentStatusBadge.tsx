import { Badge } from '@/components/ui/badge';
import type { PaymentStatus } from '@/hooks/use-budget';

const statusConfig: Record<PaymentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  partial: { label: 'Partial', variant: 'secondary' },
  paid: { label: 'Paid', variant: 'default' },
  overdue: { label: 'Overdue', variant: 'destructive' },
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
