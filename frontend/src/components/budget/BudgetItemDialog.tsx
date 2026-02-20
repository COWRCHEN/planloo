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
  useCreateBudgetItem,
  useUpdateBudgetItem,
  BUDGET_CATEGORIES,
  type BudgetItemResponse,
  type CreateBudgetItemInput,
} from '@/hooks/use-budget';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const BUDGET_CATEGORIES_ENUM = ['venue', 'catering', 'entertainment', 'decorations', 'photography', 'other'] as const;

const createBudgetItemSchema = z.object({
  category: z.enum(BUDGET_CATEGORIES_ENUM),
  itemName: z.string().min(1, 'Item name is required').max(200),
  description: z.string().max(1000).optional().nullable(),
  estimatedCost: z.coerce.number().min(0).optional().nullable(),
  actualCost: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('USD'),
  paymentDueDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

const updateBudgetItemSchema = createBudgetItemSchema.partial();

interface BudgetItemDialogProps {
  eventUuid: string;
  item?: BudgetItemResponse;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const categoryLabels: Record<string, string> = {
  venue: 'Venue',
  catering: 'Catering',
  entertainment: 'Entertainment',
  decorations: 'Decorations',
  photography: 'Photography',
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

export function BudgetItemDialog({ eventUuid, item, trigger, onSuccess }: BudgetItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isEditing = !!item;

  const createMutation = useCreateBudgetItem(eventUuid);
  const updateMutation = useUpdateBudgetItem(eventUuid, item?.uuid ?? '');

  function getDefaults() {
    return {
      category: item?.category ?? ('other' as const),
      itemName: item?.itemName ?? '',
      description: item?.description ?? null,
      estimatedCost: item?.estimatedCost ?? null,
      actualCost: item?.actualCost ?? null,
      currency: item?.currency ?? 'USD',
      paymentDueDate: item?.paymentDueDate ? new Date(item.paymentDueDate) : null,
      notes: item?.notes ?? null,
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
    resolver: zodResolver(isEditing ? updateBudgetItemSchema : createBudgetItemSchema),
    defaultValues: getDefaults(),
  });

  const selectedCategory = watch('category');
  const paymentDueDate = watch('paymentDueDate');

  useEffect(() => {
    if (open) {
      reset(getDefaults());
    }
  }, [open, item, reset]);

  const onSubmit = handleSubmit(async (data) => {
    if (isEditing) {
      await updateMutation.mutateAsync(data as CreateBudgetItemInput);
    } else {
      await createMutation.mutateAsync(data as CreateBudgetItemInput);
    }
    setOpen(false);
    onSuccess?.();
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>{isEditing ? 'Edit' : 'Add Budget Item'}</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Budget Item' : 'Add Budget Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="itemName">Item Name *</Label>
            <Input id="itemName" {...register('itemName')} placeholder="e.g. Wedding Cake" />
            {errors.itemName && (
              <p className="text-sm text-destructive">{errors.itemName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category *</Label>
            <Select
              value={selectedCategory}
              onValueChange={(val) => setValue('category', val as CreateBudgetItemInput['category'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabels[cat] ?? cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="estimatedCost">Estimated Cost</Label>
              <Input
                id="estimatedCost"
                type="number"
                step="0.01"
                min="0"
                {...register('estimatedCost', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualCost">Actual Cost</Label>
              <Input
                id="actualCost"
                type="number"
                step="0.01"
                min="0"
                {...register('actualCost', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Due Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !paymentDueDate && 'text-muted-foreground'
                  )}
                  type="button"
                >
                  {formatDateDisplay(paymentDueDate ? new Date(paymentDueDate) : undefined)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDueDate ? new Date(paymentDueDate) : undefined}
                  onSelect={(date) => {
                    setValue('paymentDueDate', date ?? null);
                    setCalendarOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Additional details..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Internal notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
