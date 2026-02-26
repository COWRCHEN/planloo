import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useSession } from '@/hooks/use-auth';
import { useEvent } from '@/hooks/use-events';
import { ProviderCategoryBadge } from './ProviderCategoryBadge';
import { LinkProviderDialog } from './LinkProviderDialog';
import { LinkVenueDialog } from './LinkVenueDialog';
import {
  useEventProviders,
  useEventVenues,
  useUpdateEventProvider,
  useUnlinkProvider,
  useUpdateEventVenue,
  useUnlinkVenue,
  useVenueAvailability,
  BOOKING_STATUSES,
  type BookingStatus,
  type EventServiceProviderResponse,
  type EventVenueResponse,
} from '@/hooks/use-providers';

// ==================== CONSTANTS ====================

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  inquiry: { label: 'Inquiry', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  quoted: { label: 'Quoted', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  booked: { label: 'Booked', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-700 border-green-200' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200' },
};

// ==================== HELPERS ====================

function formatCurrency(amount: number | null | undefined, currency: string): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

function getPaymentDueDateInfo(dueDateStr: string | null, depositPaid: boolean): {
  badge: string | null;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  if (depositPaid) return { badge: null, variant: 'default' };
  if (!dueDateStr) return { badge: null, variant: 'default' };
  const now = new Date();
  const due = new Date(dueDateStr);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { badge: 'Overdue', variant: 'destructive' };
  if (diffDays <= 7) return { badge: 'Due soon', variant: 'secondary' };
  return { badge: null, variant: 'default' };
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ==================== EDIT FORM SCHEMAS ====================

const editProviderFormSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
  quoteAmount: z.string().optional(),
  finalAmount: z.string().optional(),
  depositAmount: z.string().optional(),
  depositPaid: z.boolean().default(false),
  paymentDueDate: z.date().optional().nullable(),
  priceIncludes: z.string().max(1000).optional(),
  contractUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
});

const editVenueFormSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
  bookingDate: z.date().optional().nullable(),
  quoteAmount: z.string().optional(),
  finalAmount: z.string().optional(),
  depositAmount: z.string().optional(),
  depositPaid: z.boolean().default(false),
  paymentDueDate: z.date().optional().nullable(),
  priceIncludes: z.string().max(1000).optional(),
  contractUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
});

type EditProviderForm = z.infer<typeof editProviderFormSchema>;
type EditVenueForm = z.infer<typeof editVenueFormSchema>;

// ==================== DATE PICKER FIELD ====================

function DatePickerField({
  value,
  onChange,
  placeholder = 'Pick a date',
}: {
  value: Date | null | undefined;
  onChange: (date: Date | undefined | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground')}
        >
          {value
            ? value.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(date) => { onChange(date ?? null); setOpen(false); }}
          initialFocus
        />
        {value && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { onChange(null); setOpen(false); }}>
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ==================== PROVIDER EDIT SHEET ====================

function ProviderEditSheet({
  link,
  eventUuid,
  open,
  onOpenChange,
}: {
  link: EventServiceProviderResponse;
  eventUuid: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateMutation = useUpdateEventProvider(eventUuid);

  const form = useForm<EditProviderForm>({
    resolver: zodResolver(editProviderFormSchema),
    defaultValues: {
      status: link.status,
      quoteAmount: link.quoteAmount?.toString() ?? '',
      finalAmount: link.finalAmount?.toString() ?? '',
      depositAmount: link.depositAmount?.toString() ?? '',
      depositPaid: link.depositPaid,
      paymentDueDate: link.paymentDueDate ? new Date(link.paymentDueDate) : null,
      priceIncludes: link.priceIncludes ?? '',
      contractUrl: link.contractUrl ?? '',
      notes: link.notes ?? '',
    },
  });

  const onSubmit = async (values: EditProviderForm) => {
    await updateMutation.mutateAsync({
      linkId: link.id,
      data: {
        status: values.status,
        quoteAmount: values.quoteAmount ? parseFloat(values.quoteAmount) : null,
        finalAmount: values.finalAmount ? parseFloat(values.finalAmount) : null,
        depositAmount: values.depositAmount ? parseFloat(values.depositAmount) : null,
        depositPaid: values.depositPaid,
        paymentDueDate: values.paymentDueDate ?? null,
        priceIncludes: values.priceIncludes || null,
        contractUrl: values.contractUrl || null,
        notes: values.notes || null,
      },
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="mb-6">
          <SheetTitle>Edit — {link.provider.businessName}</SheetTitle>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) => form.setValue('status', v as BookingStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOOKING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="p-quoteAmount">Quote Amount</Label>
              <Input id="p-quoteAmount" type="number" step="0.01" min="0" placeholder="0.00" {...form.register('quoteAmount')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-finalAmount">Final Amount</Label>
              <Input id="p-finalAmount" type="number" step="0.01" min="0" placeholder="0.00" {...form.register('finalAmount')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="p-depositAmount">Deposit Amount</Label>
              <Input id="p-depositAmount" type="number" step="0.01" min="0" placeholder="0.00" {...form.register('depositAmount')} />
            </div>
            <div className="flex flex-col justify-end space-y-2">
              <Label htmlFor="p-depositPaid">Deposit Paid</Label>
              <div className="flex items-center gap-2 pt-1">
                <Switch
                  id="p-depositPaid"
                  checked={form.watch('depositPaid')}
                  onCheckedChange={(v) => form.setValue('depositPaid', v)}
                />
                <span className="text-sm text-muted-foreground">{form.watch('depositPaid') ? 'Paid' : 'Unpaid'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Due Date</Label>
            <DatePickerField
              value={form.watch('paymentDueDate')}
              onChange={(d) => form.setValue('paymentDueDate', d)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-priceIncludes">Price Includes</Label>
            <Input
              id="p-priceIncludes"
              placeholder="e.g. Setup, teardown, 6-hour service..."
              {...form.register('priceIncludes')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-contractUrl">Contract URL</Label>
            <Input id="p-contractUrl" type="url" placeholder="https://" {...form.register('contractUrl')} />
            {form.formState.errors.contractUrl && (
              <p className="text-xs text-destructive">{form.formState.errors.contractUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-notes">Notes</Label>
            <Textarea id="p-notes" rows={3} placeholder="Additional notes..." {...form.register('notes')} />
          </div>

          {updateMutation.error && (
            <p className="text-sm text-destructive">{updateMutation.error.message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ==================== VENUE EDIT SHEET ====================

function VenueEditSheet({
  link,
  eventUuid,
  open,
  onOpenChange,
}: {
  link: EventVenueResponse;
  eventUuid: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateMutation = useUpdateEventVenue(eventUuid);

  const form = useForm<EditVenueForm>({
    resolver: zodResolver(editVenueFormSchema),
    defaultValues: {
      status: link.status,
      bookingDate: link.bookingDate ? new Date(link.bookingDate) : null,
      quoteAmount: link.quoteAmount?.toString() ?? '',
      finalAmount: link.finalAmount?.toString() ?? '',
      depositAmount: link.depositAmount?.toString() ?? '',
      depositPaid: link.depositPaid,
      paymentDueDate: link.paymentDueDate ? new Date(link.paymentDueDate) : null,
      priceIncludes: link.priceIncludes ?? '',
      contractUrl: link.contractUrl ?? '',
      notes: link.notes ?? '',
    },
  });

  const onSubmit = async (values: EditVenueForm) => {
    await updateMutation.mutateAsync({
      linkId: link.id,
      data: {
        status: values.status,
        bookingDate: values.bookingDate ?? null,
        quoteAmount: values.quoteAmount ? parseFloat(values.quoteAmount) : null,
        finalAmount: values.finalAmount ? parseFloat(values.finalAmount) : null,
        depositAmount: values.depositAmount ? parseFloat(values.depositAmount) : null,
        depositPaid: values.depositPaid,
        paymentDueDate: values.paymentDueDate ?? null,
        priceIncludes: values.priceIncludes || null,
        contractUrl: values.contractUrl || null,
        notes: values.notes || null,
      },
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="mb-6">
          <SheetTitle>Edit — {link.venue.name}</SheetTitle>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) => form.setValue('status', v as BookingStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOOKING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Booking Date</Label>
            <DatePickerField
              value={form.watch('bookingDate')}
              onChange={(d) => form.setValue('bookingDate', d)}
              placeholder="Pick booking date"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="v-quoteAmount">Quote Amount</Label>
              <Input id="v-quoteAmount" type="number" step="0.01" min="0" placeholder="0.00" {...form.register('quoteAmount')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-finalAmount">Final Amount</Label>
              <Input id="v-finalAmount" type="number" step="0.01" min="0" placeholder="0.00" {...form.register('finalAmount')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="v-depositAmount">Deposit Amount</Label>
              <Input id="v-depositAmount" type="number" step="0.01" min="0" placeholder="0.00" {...form.register('depositAmount')} />
            </div>
            <div className="flex flex-col justify-end space-y-2">
              <Label htmlFor="v-depositPaid">Deposit Paid</Label>
              <div className="flex items-center gap-2 pt-1">
                <Switch
                  id="v-depositPaid"
                  checked={form.watch('depositPaid')}
                  onCheckedChange={(v) => form.setValue('depositPaid', v)}
                />
                <span className="text-sm text-muted-foreground">{form.watch('depositPaid') ? 'Paid' : 'Unpaid'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Due Date</Label>
            <DatePickerField
              value={form.watch('paymentDueDate')}
              onChange={(d) => form.setValue('paymentDueDate', d)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="v-priceIncludes">Price Includes</Label>
            <Input
              id="v-priceIncludes"
              placeholder="e.g. Tables, chairs, AV equipment..."
              {...form.register('priceIncludes')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="v-contractUrl">Contract URL</Label>
            <Input id="v-contractUrl" type="url" placeholder="https://" {...form.register('contractUrl')} />
            {form.formState.errors.contractUrl && (
              <p className="text-xs text-destructive">{form.formState.errors.contractUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="v-notes">Notes</Label>
            <Textarea id="v-notes" rows={3} placeholder="Additional notes..." {...form.register('notes')} />
          </div>

          {updateMutation.error && (
            <p className="text-sm text-destructive">{updateMutation.error.message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ==================== PAYMENT GRID ====================

function PaymentGrid({
  quoteAmount,
  finalAmount,
  depositAmount,
  depositPaid,
  paymentDueDate,
  currency,
}: {
  quoteAmount: number | null;
  finalAmount: number | null;
  depositAmount: number | null;
  depositPaid: boolean;
  paymentDueDate: string | null;
  currency: string;
}) {
  const displayCost = finalAmount ?? quoteAmount;
  const balance = displayCost !== null && depositAmount !== null ? displayCost - depositAmount : null;
  const dueDateInfo = getPaymentDueDateInfo(paymentDueDate, depositPaid);

  if (displayCost === null && depositAmount === null && !paymentDueDate) return null;

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
      <div>
        <p className="text-xs text-muted-foreground">Cost</p>
        <p className="text-sm font-medium">{formatCurrency(displayCost, currency)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Deposit</p>
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium">{formatCurrency(depositAmount, currency)}</p>
          {depositPaid && depositAmount !== null && (
            <Badge variant="outline" className="h-4 border-green-200 bg-green-50 px-1 text-[10px] text-green-700">Paid</Badge>
          )}
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Balance Due</p>
        <div className="flex items-center gap-1">
          <p className={cn('text-sm font-medium', balance !== null && depositPaid && 'text-red-600')}>
            {balance !== null && depositPaid ? formatCurrency(balance, currency) : '—'}
          </p>
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Due Date</p>
        <div className="flex items-center gap-1 flex-wrap">
          <p className="text-sm font-medium">{paymentDueDate ? formatDate(paymentDueDate) : '—'}</p>
          {dueDateInfo.badge && (
            <Badge
              variant={dueDateInfo.variant === 'destructive' ? 'destructive' : 'secondary'}
              className={cn('h-4 px-1 text-[10px]', dueDateInfo.variant === 'secondary' && 'text-red-600')}
            >
              {dueDateInfo.badge}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== VENUE AVAILABILITY CHECK ====================

function VenueAvailabilityCheck({ venueUuid, eventDate }: { venueUuid: string; eventDate: string | null }) {
  const defaultDate = eventDate ? new Date(eventDate) : undefined;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(defaultDate);
  const [checkDate, setCheckDate] = useState<string | undefined>(
    defaultDate ? toDateString(defaultDate) : undefined
  );
  const [calOpen, setCalOpen] = useState(false);

  const { data: availability, isLoading } = useVenueAvailability(venueUuid, checkDate);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Check availability:</span>
      <Popover open={calOpen} onOpenChange={setCalOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            {selectedDate ? toDateString(selectedDate) : 'Pick a date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => { setSelectedDate(date); if (date) { setCheckDate(toDateString(date)); setCalOpen(false); } }}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </PopoverContent>
      </Popover>
      {isLoading && <span className="text-xs text-muted-foreground">Checking...</span>}
      {!isLoading && availability && (
        <span className={cn('text-xs font-medium', availability.available ? 'text-green-600' : 'text-destructive')}>
          {availability.available
            ? 'Available'
            : `Not available (${availability.conflictCount} booking${availability.conflictCount !== 1 ? 's' : ''})`}
        </span>
      )}
    </div>
  );
}

// ==================== PROVIDER CARD ====================

function ProviderCard({
  link,
  eventUuid,
}: {
  link: EventServiceProviderResponse;
  eventUuid: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const unlinkMutation = useUnlinkProvider(eventUuid);
  const { provider } = link;
  const isCancelled = link.status === 'cancelled';

  const address = [provider.locationAddress, provider.locationCity, provider.locationState]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <Card className={cn(isCancelled && 'opacity-60')}>
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Badge
                variant="outline"
                className={cn('shrink-0 text-xs', statusConfig[link.status].className)}
              >
                {statusConfig[link.status].label}
              </Badge>
              <p className={cn('font-semibold truncate', isCancelled && 'line-through')}>{provider.businessName}</p>
              <ProviderCategoryBadge category={provider.category} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                  <span className="sr-only">Options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit details</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    if (confirm('Remove this provider from the event?')) {
                      unlinkMutation.mutate(link.id);
                    }
                  }}
                >
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Contact info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {address && (
              <span className="flex items-center gap-1">
                <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {address}
              </span>
            )}
            {provider.phone && (
              <a href={`tel:${provider.phone}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {provider.phone}
              </a>
            )}
            {provider.email && (
              <a href={`mailto:${provider.email}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {provider.email}
              </a>
            )}
          </div>

          {/* Payment grid */}
          {(link.quoteAmount !== null || link.finalAmount !== null || link.depositAmount !== null || link.paymentDueDate) && (
            <>
              <Separator />
              <PaymentGrid
                quoteAmount={link.quoteAmount}
                finalAmount={link.finalAmount}
                depositAmount={link.depositAmount}
                depositPaid={link.depositPaid}
                paymentDueDate={link.paymentDueDate}
                currency={link.currency}
              />
            </>
          )}

          {/* Price includes */}
          {link.priceIncludes && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Includes:</span> {link.priceIncludes}
            </p>
          )}

          {/* Notes */}
          {link.notes && (
            <p className="text-sm text-muted-foreground italic">{link.notes}</p>
          )}
        </CardContent>
      </Card>

      <ProviderEditSheet
        link={link}
        eventUuid={eventUuid}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

// ==================== VENUE CARD ====================

function VenueCard({
  link,
  eventUuid,
  eventDate,
}: {
  link: EventVenueResponse;
  eventUuid: string;
  eventDate: string | null;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const unlinkMutation = useUnlinkVenue(eventUuid);
  const { venue } = link;
  const isCancelled = link.status === 'cancelled';

  const address = [venue.address, venue.city, venue.state].filter(Boolean).join(', ');

  return (
    <>
      <Card className={cn(isCancelled && 'opacity-60')}>
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Badge
                variant="outline"
                className={cn('shrink-0 text-xs', statusConfig[link.status].className)}
              >
                {statusConfig[link.status].label}
              </Badge>
              <p className={cn('font-semibold truncate', isCancelled && 'line-through')}>{venue.name}</p>
              {venue.venueType && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {venue.venueType.replace('_', ' ')}
                </Badge>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                  <span className="sr-only">Options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit details</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    if (confirm('Remove this venue from the event?')) {
                      unlinkMutation.mutate(link.id);
                    }
                  }}
                >
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Contact info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {address && (
              <span className="flex items-center gap-1">
                <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {address}
              </span>
            )}
            {venue.contactPhone && (
              <a href={`tel:${venue.contactPhone}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {venue.contactPhone}
              </a>
            )}
            {venue.contactEmail && (
              <a href={`mailto:${venue.contactEmail}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {venue.contactEmail}
              </a>
            )}
          </div>

          {/* Booking date */}
          {link.bookingDate && (
            <p className="text-sm">
              <span className="text-muted-foreground">Booking date: </span>
              <span className="font-medium">{formatDate(link.bookingDate)}</span>
            </p>
          )}

          {/* Payment grid */}
          {(link.quoteAmount !== null || link.finalAmount !== null || link.depositAmount !== null || link.paymentDueDate) && (
            <>
              <Separator />
              <PaymentGrid
                quoteAmount={link.quoteAmount}
                finalAmount={link.finalAmount}
                depositAmount={link.depositAmount}
                depositPaid={link.depositPaid}
                paymentDueDate={link.paymentDueDate}
                currency={link.currency}
              />
            </>
          )}

          {/* Price includes */}
          {link.priceIncludes && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Includes:</span> {link.priceIncludes}
            </p>
          )}

          {/* Notes */}
          {link.notes && (
            <p className="text-sm text-muted-foreground italic">{link.notes}</p>
          )}

          {/* Availability check */}
          <VenueAvailabilityCheck venueUuid={venue.uuid} eventDate={eventDate} />
        </CardContent>
      </Card>

      <VenueEditSheet
        link={link}
        eventUuid={eventUuid}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

// ==================== LOADING SKELETON ====================

function VendorCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== MAIN CONTENT ====================

interface EventProvidersViewProps {
  eventUuid: string;
}

function EventProvidersContent({ eventUuid }: EventProvidersViewProps) {
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: event } = useEvent(eventUuid);
  const { data: providers, isLoading: providersLoading } = useEventProviders(eventUuid);
  const { data: venues, isLoading: venuesLoading } = useEventVenues(eventUuid);
  const eventDate = event?.startDate ?? null;

  if (sessionLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please sign in to manage providers.</p>
          <Button asChild className="mt-4">
            <a href="/login">Sign in</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-10">
      {/* Service Providers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Service Providers</h2>
          <LinkProviderDialog eventUuid={eventUuid} />
        </div>

        {providersLoading ? (
          <div className="space-y-3">
            <VendorCardSkeleton />
            <VendorCardSkeleton />
          </div>
        ) : !providers || providers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No providers linked yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Link service providers from the directory to manage bookings.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {providers.map((link) => (
              <ProviderCard key={link.id} link={link} eventUuid={eventUuid} />
            ))}
          </div>
        )}
      </div>

      {/* Venues */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Venues</h2>
          <LinkVenueDialog eventUuid={eventUuid} />
        </div>

        {venuesLoading ? (
          <div className="space-y-3">
            <VendorCardSkeleton />
            <VendorCardSkeleton />
          </div>
        ) : !venues || venues.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No venues linked yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Link venues from the directory to manage bookings.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {venues.map((link) => (
              <VenueCard key={link.id} link={link} eventUuid={eventUuid} eventDate={eventDate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function EventProvidersView({ eventUuid }: EventProvidersViewProps) {
  return (
    <QueryProvider>
      <EventProvidersContent eventUuid={eventUuid} />
    </QueryProvider>
  );
}
