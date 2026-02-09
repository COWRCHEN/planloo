import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PaymentDialog } from './PaymentDialog';
import { useDeletePayment, type PaymentResponse, type PaymentMethod } from '@/hooks/use-budget';

interface PaymentListProps {
  eventUuid: string;
  itemUuid: string;
  payments: PaymentResponse[];
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const methodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  check: 'Check',
  credit_card: 'Credit Card',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
};

export function PaymentList({ eventUuid, itemUuid, payments }: PaymentListProps) {
  const deleteMutation = useDeletePayment(eventUuid, itemUuid);

  if (payments.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No payments recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.uuid}>
              <TableCell>{formatDate(payment.paymentDate)}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(payment.amount, payment.currency)}
              </TableCell>
              <TableCell>
                {payment.paymentMethod ? methodLabels[payment.paymentMethod] : '-'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {payment.referenceNumber || '-'}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground">
                {payment.notes || '-'}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <PaymentDialog
                    eventUuid={eventUuid}
                    itemUuid={itemUuid}
                    payment={payment}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        Edit
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(payment.uuid)}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
