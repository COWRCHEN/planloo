import { Badge } from '@/components/ui/badge';
import type { BookingStatus } from '@/hooks/use-providers';

const statusConfig: Record<BookingStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  inquiry: { label: 'Inquiry', variant: 'outline' },
  quoted: { label: 'Quoted', variant: 'secondary' },
  booked: { label: 'Booked', variant: 'default' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  completed: { label: 'Completed', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.inquiry;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
