import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { BudgetCategoryBadge } from './BudgetCategoryBadge';
import { BudgetItemDialog } from './BudgetItemDialog';
import { DeleteBudgetItemDialog } from './DeleteBudgetItemDialog';
import {
  useBudgetItems,
  BUDGET_CATEGORIES,
  PAYMENT_STATUSES,
  type BudgetCategory,
  type PaymentStatus,
  type BudgetItemResponse,
  type ListBudgetItemsQuery,
} from '@/hooks/use-budget';

interface BudgetItemListProps {
  eventUuid: string;
  onSelectItem?: (item: BudgetItemResponse) => void;
}

function formatCurrency(amount: number | null | undefined, currency: string = 'USD'): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

const categoryLabels: Record<string, string> = {
  venue: 'Venue',
  catering: 'Catering',
  entertainment: 'Entertainment',
  decorations: 'Decorations',
  photography: 'Photography',
  other: 'Other',
};

const paymentStatusLabels: Record<string, string> = {
  pending: 'Pending',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
};

export function BudgetItemList({ eventUuid, onSelectItem }: BudgetItemListProps) {
  const [categoryFilter, setCategoryFilter] = useState<BudgetCategory | undefined>();
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | undefined>();

  const filters: Partial<ListBudgetItemsQuery> = {};
  if (categoryFilter) filters.category = categoryFilter;
  if (statusFilter) filters.paymentStatus = statusFilter;

  const { data, isLoading } = useBudgetItems(eventUuid, filters);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Budget Items</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={categoryFilter ?? 'all'}
              onValueChange={(v) => setCategoryFilter(v === 'all' ? undefined : v as BudgetCategory)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {BUDGET_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter ?? 'all'}
              onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v as PaymentStatus)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {PAYMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{paymentStatusLabels[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <BudgetItemDialog eventUuid={eventUuid} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No budget items yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first budget item to start tracking expenses.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Estimated</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.uuid}
                    className="cursor-pointer"
                    onClick={() => onSelectItem?.(item)}
                  >
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell>
                      <BudgetCategoryBadge category={item.category} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.estimatedCost, item.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.actualCost, item.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.totalPaid, item.currency)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={item.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelectItem?.(item); }}>
                            View Details
                          </DropdownMenuItem>
                          <BudgetItemDialog
                            eventUuid={eventUuid}
                            item={item}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                Edit
                              </DropdownMenuItem>
                            }
                          />
                          <DeleteBudgetItemDialog
                            eventUuid={eventUuid}
                            itemUuid={item.uuid}
                            itemName={item.itemName}
                            trigger={
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            }
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
