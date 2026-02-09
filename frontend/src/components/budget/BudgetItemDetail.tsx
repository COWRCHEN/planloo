import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { BudgetCategoryBadge } from './BudgetCategoryBadge';
import { BudgetItemDialog } from './BudgetItemDialog';
import { PaymentDialog } from './PaymentDialog';
import { PaymentList } from './PaymentList';
import { DeleteBudgetItemDialog } from './DeleteBudgetItemDialog';
import { useBudgetItem } from '@/hooks/use-budget';

interface BudgetItemDetailProps {
  eventUuid: string;
  itemUuid: string;
  onBack: () => void;
}

function formatCurrency(amount: number | null | undefined, currency: string = 'USD'): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function BudgetItemDetail({ eventUuid, itemUuid, onBack }: BudgetItemDetailProps) {
  const { data: item, isLoading } = useBudgetItem(eventUuid, itemUuid);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!item) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Budget item not found.</p>
          <Button variant="outline" className="mt-4" onClick={onBack}>
            Back to list
          </Button>
        </CardContent>
      </Card>
    );
  }

  const remaining = (item.actualCost ?? 0) - item.totalPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
          <div>
            <h2 className="text-xl font-bold">{item.itemName}</h2>
            <div className="mt-1 flex items-center gap-2">
              <BudgetCategoryBadge category={item.category} />
              <PaymentStatusBadge status={item.paymentStatus} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <BudgetItemDialog
            eventUuid={eventUuid}
            item={item}
            trigger={<Button variant="outline" size="sm">Edit</Button>}
          />
          <DeleteBudgetItemDialog
            eventUuid={eventUuid}
            itemUuid={item.uuid}
            itemName={item.itemName}
            onDeleted={onBack}
          />
        </div>
      </div>

      {/* Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Estimated Cost</dt>
                <dd className="font-medium">{formatCurrency(item.estimatedCost, item.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Actual Cost</dt>
                <dd className="font-medium">{formatCurrency(item.actualCost, item.currency)}</dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total Paid</dt>
                <dd className="font-medium text-green-600">{formatCurrency(item.totalPaid, item.currency)}</dd>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Remaining</dt>
                  <dd className="font-medium text-orange-600">{formatCurrency(remaining, item.currency)}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Info</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Payment Due Date</dt>
                <dd className="font-medium">{formatDate(item.paymentDueDate)}</dd>
              </div>
              {item.description && (
                <div>
                  <dt className="text-muted-foreground">Description</dt>
                  <dd className="whitespace-pre-wrap">{item.description}</dd>
                </div>
              )}
              {item.notes && (
                <div>
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="whitespace-pre-wrap">{item.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Payments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Payments</CardTitle>
            <PaymentDialog eventUuid={eventUuid} itemUuid={item.uuid} />
          </div>
        </CardHeader>
        <CardContent>
          <PaymentList
            eventUuid={eventUuid}
            itemUuid={item.uuid}
            payments={item.payments ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
