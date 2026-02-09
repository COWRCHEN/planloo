import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  useCreatePayment,
  useUpdatePayment,
  PAYMENT_METHODS,
  type PaymentResponse,
  type CreatePaymentInput,
  type PaymentMethod,
} from '@/hooks/use-budget';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const PAYMENT_METHODS_ENUM = ['cash', 'check', 'credit_card', 'bank_transfer', 'other'] as const;

const createPaymentSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().length(3).default('USD'),
  paymentMethod: z.enum(PAYMENT_METHODS_ENUM).optional().nullable(),
  paymentDate: z.coerce.date(),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const updatePaymentSchema = createPaymentSchema.partial();

interface PaymentDialogProps {
  eventUuid: string;
  itemUuid: string;
  payment?: PaymentResponse;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const methodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  check: 'Check',
  credit_card: 'Credit Card',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
};

function formatDateDisplay(date: Date | undefined): string {
  if (!date) return 'Pick a date';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function PaymentDialog({ eventUuid, itemUuid, payment, trigger, onSuccess }: PaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isEditing = !!payment;

  const createMutation = useCreatePayment(eventUuid, itemUuid);
  const updateMutation = useUpdatePayment(eventUuid, itemUuid);

  function getDefaults() {
    return {
      amount: payment?.amount ?? (undefined as number | undefined),
      currency: payment?.currency ?? 'USD',
      paymentMethod: payment?.paymentMethod ?? null,
      paymentDate: payment?.paymentDate ? new Date(payment.paymentDate) : new Date(),
      referenceNumber: payment?.referenceNumber ?? null,
      notes: payment?.notes ?? null,
    };
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isEditing ? updatePaymentSchema : createPaymentSchema),
    defaultValues: getDefaults(),
  });

  const paymentDate = watch('paymentDate');
  const selectedMethod = watch('paymentMethod');

  useEffect(() => {
    if (open) {
      reset(getDefaults());
    }
  }, [open, payment, reset]);

  const onSubmit = handleSubmit(async (data) => {
    if (isEditing && payment) {
      await updateMutation.mutateAsync({ paymentUuid: payment.uuid, data: data as CreatePaymentInput });
    } else {
      await createMutation.mutateAsync(data as CreatePaymentInput);
    }
    setOpen(false);
    onSuccess?.();
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            {isEditing ? 'Edit' : 'Add Payment'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              {...register('amount', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Payment Date *</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !paymentDate && 'text-muted-foreground'
                  )}
                  type="button"
                >
                  {formatDateDisplay(paymentDate ? new Date(paymentDate) : undefined)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate ? new Date(paymentDate) : undefined}
                  onSelect={(date) => {
                    setValue('paymentDate', date ?? new Date());
                    setCalendarOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select
              value={selectedMethod ?? ''}
              onValueChange={(v) => setValue('paymentMethod', v as PaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {methodLabels[method]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input
              id="referenceNumber"
              {...register('referenceNumber')}
              placeholder="e.g. INV-001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentNotes">Notes</Label>
            <Textarea
              id="paymentNotes"
              {...register('notes')}
              placeholder="Payment notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
