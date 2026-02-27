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
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { useSession } from '@/hooks/use-auth';
import { useEvent } from '@/hooks/use-events';
import { useTasks } from '@/hooks/use-tasks';
import type { TaskResponse } from '@/hooks/use-tasks';
import { ProviderCategoryBadge } from './ProviderCategoryBadge';
import { ProviderStarRating } from './ProviderStarRating';
import { ProviderCommentForm } from './ProviderCommentForm';
import { ProviderReviewsDialog, ProviderRatingBreakdownBars } from './ProviderReviewsDialog';
import { VenueStarRating } from './VenueStarRating';
import { VenueCommentForm } from './VenueCommentForm';
import { VenueReviewsDialog, RatingBreakdownBars as VenueRatingBreakdownBars } from './VenueReviewsDialog';
import { LinkProviderDialog } from './LinkProviderDialog';
import { LinkVenueDialog } from './LinkVenueDialog';
import { ProviderDialog } from './ProviderDialog';
import { VenueDialog } from './VenueDialog';
import {
  useEventProviders,
  useEventVenues,
  useLinkProvider,
  useLinkVenue,
  useUnlinkProvider,
  useUnlinkVenue,
  useProviderLogs,
  useVenueLogs,
  useCreateProviderLog,
  useCreateVenueLog,
  BOOKING_STATUSES,
  type BookingStatus,
  type EventServiceProviderResponse,
  type EventVenueResponse,
  type CreateLogInput,
  type ServiceProviderResponse,
  type VenueResponse,
} from '@/hooks/use-providers';

// ==================== CONSTANTS ====================

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  inquiry: { label: 'Inquiry', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  quoted: { label: 'Quoted', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  booked: { label: 'Booked', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-700 border-green-200' },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
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

function getPaymentDueDateInfo(dueDateStr: string | null): {
  badge: string | null;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
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
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'JPY', 'CNY', 'INR', 'MXN', 'BRL'] as const;

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
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
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
          onSelect={date => {
            onChange(date ?? null);
            setOpen(false);
          }}
          initialFocus
        />
        {value && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
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
  bookingStartTime,
  bookingEndTime,
}: {
  quoteAmount: number | null;
  finalAmount: number | null;
  depositAmount: number | null;
  depositPaid: boolean;
  paymentDueDate: string | null;
  currency: string;
  bookingStartTime?: string | null;
  bookingEndTime?: string | null;
}) {
  const balance =
    finalAmount !== null && depositAmount !== null
      ? finalAmount - depositAmount
      : quoteAmount !== null && depositAmount !== null
        ? quoteAmount - depositAmount
        : null;
  const dueDateInfo = getPaymentDueDateInfo(paymentDueDate);

  const bookedDisplay = bookingStartTime
    ? bookingEndTime
      ? `${formatDateTime(bookingStartTime)} – ${formatDateTime(bookingEndTime)}`
      : formatDateTime(bookingStartTime)
    : null;

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
      <div>
        <p className="text-xs text-muted-foreground">Quote Cost</p>
        <p className="text-sm font-medium">
          {quoteAmount !== null ? formatCurrency(quoteAmount, currency) : '—'}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Actual Cost</p>
        <p className="text-sm font-medium">
          {finalAmount !== null ? formatCurrency(finalAmount, currency) : '—'}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Booked Date</p>
        <p className="text-sm font-medium">{bookedDisplay ?? '—'}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Balance Due</p>
        <p
          className={cn(
            'text-sm font-medium',
            balance !== null && balance > 0 && !depositPaid && 'text-amber-600'
          )}
        >
          {balance !== null ? formatCurrency(balance, currency) : '—'}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Due Date</p>
        <div className="flex flex-wrap items-center gap-1">
          <p className="text-sm font-medium">{paymentDueDate ? formatDate(paymentDueDate) : '—'}</p>
          {dueDateInfo.badge && (
            <Badge
              variant={dueDateInfo.variant === 'destructive' ? 'destructive' : 'secondary'}
              className={cn(
                'h-4 px-1 text-[10px]',
                dueDateInfo.variant === 'secondary' && 'text-red-600'
              )}
            >
              {dueDateInfo.badge}
            </Badge>
          )}
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Deposit</p>
        <div className="flex flex-wrap items-center gap-1">
          <p className="text-sm font-medium">
            {depositAmount !== null ? formatCurrency(depositAmount, currency) : '—'}
          </p>
          {depositPaid && depositAmount !== null && (
            <Badge
              variant="outline"
              className="h-4 border-green-200 bg-green-50 px-1 text-[10px] text-green-700"
            >
              Paid
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== PROVIDER CARD ====================

function ProviderCard({
  link,
  eventUuid,
  tasks,
}: {
  link: EventServiceProviderResponse;
  eventUuid: string;
  tasks: TaskResponse[];
}) {
  const unlinkMutation = useUnlinkProvider(eventUuid);
  const { provider } = link;
  const isCancelled = link.status === 'cancelled';
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);

  const address = [provider.locationAddress, provider.locationCity, provider.locationState]
    .filter(Boolean)
    .join(', ');

  return (
    <AccordionItem
      value={`provider-${link.id}`}
      className={cn(
        'group overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm',
        isCancelled && 'opacity-60'
      )}
    >
      <AccordionPrimitive.Header className="relative flex items-center gap-2 px-4 py-3">
        <AccordionPrimitive.Trigger className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset" />
        <div className="pointer-events-none flex flex-1 items-center gap-2">
          <Badge
            variant="outline"
            className={cn('shrink-0 text-xs', statusConfig[link.status].className)}
          >
            {statusConfig[link.status].label}
          </Badge>
          <span className={cn('truncate font-semibold', isCancelled && 'line-through')}>
            {provider.businessName}
          </span>
          <ProviderCategoryBadge category={provider.category} />
          {provider.ratingCount > 0 && (
            <div className="pointer-events-auto relative z-10 flex items-center">
              <Popover open={hoverOpen} onOpenChange={setHoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    onMouseEnter={() => setHoverOpen(true)}
                    onMouseLeave={() => setHoverOpen(false)}
                    onClick={() => { setHoverOpen(false); setReviewsOpen(true); }}
                  >
                    <span className="flex items-center gap-0.5 text-yellow-500">
                      {'★'.repeat(Math.round(provider.ratingAverage))}{'☆'.repeat(5 - Math.round(provider.ratingAverage))}
                    </span>
                    <span>{provider.ratingAverage.toFixed(1)}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-56 p-3"
                  onMouseEnter={() => setHoverOpen(true)}
                  onMouseLeave={() => setHoverOpen(false)}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  side="bottom"
                  align="start"
                >
                  <ProviderRatingBreakdownBars breakdown={provider.ratingBreakdown ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }} total={provider.ratingCount} />
                  <button
                    type="button"
                    className="mt-2 w-full text-left text-xs text-primary hover:underline"
                    onClick={() => { setHoverOpen(false); setReviewsOpen(true); }}
                  >
                    See all reviews
                  </button>
                </PopoverContent>
              </Popover>
              <ProviderReviewsDialog
                providerUuid={provider.uuid}
                providerName={provider.businessName}
                ratingAverage={provider.ratingAverage}
                ratingCount={provider.ratingCount}
                open={reviewsOpen}
                onOpenChange={setReviewsOpen}
              />
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="relative z-10 h-7 w-7 shrink-0 p-0 text-destructive hover:text-destructive/80"
          onClick={() => {
            if (confirm('Remove this provider from the event?')) {
              unlinkMutation.mutate(link.id);
            }
          }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <span className="sr-only">Remove provider</span>
        </Button>
        <svg
          className="pointer-events-none relative z-10 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </AccordionPrimitive.Header>
      <AccordionContent className="border-t px-4 pt-3">
        <div className="space-y-3">

          {/* Linked Task */}
          {(() => {
            const linked = tasks.filter((t) => t.linkedProvider?.linkId === link.id);
            if (linked.length === 0) return null;
            return (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Linked Task</p>
                {linked.map((t) => (
                  <a
                    key={t.uuid}
                    href={`/dashboard/events/${eventUuid}/tasks`}
                    className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className={cn('flex-1 truncate', t.status === 'completed' && 'text-muted-foreground line-through')}>
                      {t.title}
                    </span>
                    {t.status === 'completed' && (
                      <span className="shrink-0 text-xs text-emerald-600">Completed</span>
                    )}
                    {t.status === 'in_progress' && (
                      <span className="shrink-0 text-xs text-blue-600">In Progress</span>
                    )}
                    {t.status === 'pending' && (
                      <span className="shrink-0 text-xs text-muted-foreground">Pending</span>
                    )}
                  </a>
                ))}
                <Separator />
              </div>
            );
          })()}

          {/* Contact info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {address && (
              <span className="flex items-center gap-1">
                <svg
                  className="h-3 w-3 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {address}
              </span>
            )}
            {provider.phone && (
              <a
                href={`tel:${provider.phone}`}
                className="flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <svg
                  className="h-3 w-3 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                {provider.phone}
              </a>
            )}
            {provider.email && (
              <a
                href={`mailto:${provider.email}`}
                className="flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <svg
                  className="h-3 w-3 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {provider.email}
              </a>
            )}
          </div>

          {/* Payment grid */}
          <Separator />
          <PaymentGrid
            quoteAmount={link.quoteAmount}
            finalAmount={link.finalAmount}
            depositAmount={link.depositAmount}
            depositPaid={link.depositPaid}
            paymentDueDate={link.paymentDueDate}
            currency={link.currency}
          />

          <Separator />
          <ContactLogsAccordion
            eventUuid={eventUuid}
            linkId={link.id}
            type="provider"
            currency={link.currency}
          />
          <Accordion type="single" collapsible>
            <AccordionItem value="rating" className="border-0">
              <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:text-foreground hover:no-underline">
                <div className="flex items-center gap-2">
                  My Rating & Review
                  {provider.userRating ? (
                    <span className="text-[11px] text-yellow-500">
                      {'★'.repeat(provider.userRating)}{'☆'.repeat(5 - provider.userRating)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No rating yet</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-0 pt-2">
                <ProviderStarRating providerUuid={provider.uuid} userRating={provider.userRating} size="sm" />
                <ProviderCommentForm providerUuid={provider.uuid} userComment={provider.userComment} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ==================== VENUE CARD ====================

function VenueCard({
  link,
  eventUuid,
  eventDate,
  tasks,
}: {
  link: EventVenueResponse;
  eventUuid: string;
  eventDate: string | null;
  tasks: TaskResponse[];
}) {
  const unlinkMutation = useUnlinkVenue(eventUuid);
  const { venue } = link;
  const isCancelled = link.status === 'cancelled';
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);

  const address = [venue.address, venue.city, venue.state].filter(Boolean).join(', ');

  return (
    <AccordionItem
      value={`venue-${link.id}`}
      className={cn(
        'group overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm',
        isCancelled && 'opacity-60'
      )}
    >
      <AccordionPrimitive.Header className="relative flex items-center gap-2 px-4 py-3">
        <AccordionPrimitive.Trigger className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset" />
        <div className="pointer-events-none flex flex-1 items-center gap-2">
          <Badge
            variant="outline"
            className={cn('shrink-0 text-xs', statusConfig[link.status].className)}
          >
            {statusConfig[link.status].label}
          </Badge>
          <span className={cn('truncate font-semibold', isCancelled && 'line-through')}>
            {venue.name}
          </span>
          {venue.venueType && (
            <Badge variant="secondary" className="text-xs capitalize">
              {venue.venueType.replace('_', ' ')}
            </Badge>
          )}
          {venue.ratingCount > 0 && (
            <div className="pointer-events-auto relative z-10 flex items-center">
              <Popover open={hoverOpen} onOpenChange={setHoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    onMouseEnter={() => setHoverOpen(true)}
                    onMouseLeave={() => setHoverOpen(false)}
                    onClick={() => { setHoverOpen(false); setReviewsOpen(true); }}
                  >
                    <span className="flex items-center gap-0.5 text-yellow-500">
                      {'★'.repeat(Math.round(venue.ratingAverage))}{'☆'.repeat(5 - Math.round(venue.ratingAverage))}
                    </span>
                    <span>{venue.ratingAverage.toFixed(1)}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-56 p-3"
                  onMouseEnter={() => setHoverOpen(true)}
                  onMouseLeave={() => setHoverOpen(false)}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  side="bottom"
                  align="start"
                >
                  <VenueRatingBreakdownBars breakdown={venue.ratingBreakdown ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }} total={venue.ratingCount} />
                  <button
                    type="button"
                    className="mt-2 w-full text-left text-xs text-primary hover:underline"
                    onClick={() => { setHoverOpen(false); setReviewsOpen(true); }}
                  >
                    See all reviews
                  </button>
                </PopoverContent>
              </Popover>
              <VenueReviewsDialog
                venueUuid={venue.uuid}
                venueName={venue.name}
                ratingAverage={venue.ratingAverage}
                ratingCount={venue.ratingCount}
                open={reviewsOpen}
                onOpenChange={setReviewsOpen}
              />
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="relative z-10 h-7 w-7 shrink-0 p-0 text-destructive hover:text-destructive/80"
          onClick={() => {
            if (confirm('Remove this venue from the event?')) {
              unlinkMutation.mutate(link.id);
            }
          }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <span className="sr-only">Remove venue</span>
        </Button>
        <svg
          className="pointer-events-none relative z-10 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </AccordionPrimitive.Header>
      <AccordionContent className="border-t px-4 pt-3">
        <div className="space-y-3">

          {/* Linked Task */}
          {(() => {
            const linked = tasks.filter((t) => t.linkedVenue?.linkId === link.id);
            if (linked.length === 0) return null;
            return (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Linked Task</p>
                {linked.map((t) => (
                  <a
                    key={t.uuid}
                    href={`/dashboard/events/${eventUuid}/tasks`}
                    className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className={cn('flex-1 truncate', t.status === 'completed' && 'text-muted-foreground line-through')}>
                      {t.title}
                    </span>
                    {t.status === 'completed' && (
                      <span className="shrink-0 text-xs text-emerald-600">Completed</span>
                    )}
                    {t.status === 'in_progress' && (
                      <span className="shrink-0 text-xs text-blue-600">In Progress</span>
                    )}
                    {t.status === 'pending' && (
                      <span className="shrink-0 text-xs text-muted-foreground">Pending</span>
                    )}
                  </a>
                ))}
                <Separator />
              </div>
            );
          })()}

          {/* Contact info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {address && (
              <span className="flex items-center gap-1">
                <svg
                  className="h-3 w-3 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {address}
              </span>
            )}
            {venue.contactPhone && (
              <a
                href={`tel:${venue.contactPhone}`}
                className="flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <svg
                  className="h-3 w-3 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                {venue.contactPhone}
              </a>
            )}
            {venue.contactEmail && (
              <a
                href={`mailto:${venue.contactEmail}`}
                className="flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <svg
                  className="h-3 w-3 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {venue.contactEmail}
              </a>
            )}
          </div>

          {/* Payment grid */}
          <Separator />
          <PaymentGrid
            quoteAmount={link.quoteAmount}
            finalAmount={link.finalAmount}
            depositAmount={link.depositAmount}
            depositPaid={link.depositPaid}
            paymentDueDate={link.paymentDueDate}
            currency={link.currency}
            bookingStartTime={link.bookingStartTime}
            bookingEndTime={link.bookingEndTime}
          />

          <Separator />
          <ContactLogsAccordion
            eventUuid={eventUuid}
            linkId={link.id}
            type="venue"
            currency={link.currency}
          />
          <Accordion type="single" collapsible>
            <AccordionItem value="rating" className="border-0">
              <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:text-foreground hover:no-underline">
                <div className="flex items-center gap-2">
                  My Rating & Review
                  {venue.userRating ? (
                    <span className="text-[11px] text-yellow-500">
                      {'★'.repeat(venue.userRating)}{'☆'.repeat(5 - venue.userRating)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No rating yet</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-0 pt-2">
                <VenueStarRating venueUuid={venue.uuid} userRating={venue.userRating} size="sm" />
                <VenueCommentForm venueUuid={venue.uuid} userComment={venue.userComment} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ==================== CONTACT LOGS ====================

const logFormSchema = z.object({
  contactPerson: z.string().max(200).optional(),
  result: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  statusChange: z.string().optional(),
  currency: z.string().default('USD'),
  quoteAmount: z.string().optional(),
  finalAmount: z.string().optional(),
  depositAmount: z.string().optional(),
  depositPaid: z.boolean().default(false),
  paymentDueDate: z.date().optional().nullable(),
  bookingStartTime: z.string().optional(),
  bookingEndTime: z.string().optional(),
});
type LogForm = z.infer<typeof logFormSchema>;

const LOG_DEFAULT_VALUES: LogForm = {
  contactPerson: '',
  result: '',
  notes: '',
  statusChange: '',
  currency: 'USD',
  quoteAmount: '',
  finalAmount: '',
  depositAmount: '',
  depositPaid: false,
  paymentDueDate: null,
  bookingStartTime: '',
  bookingEndTime: '',
};

function ContactLogsAccordion({
  eventUuid,
  linkId,
  type,
  currency,
}: {
  eventUuid: string;
  linkId: number;
  type: 'provider' | 'venue';
  currency: string;
}) {
  const providerLogsQuery = useProviderLogs(eventUuid, linkId);
  const venueLogsQuery = useVenueLogs(eventUuid, linkId);
  const { data: logs = [], isLoading } = type === 'provider' ? providerLogsQuery : venueLogsQuery;

  const createProviderMutation = useCreateProviderLog(eventUuid, linkId);
  const createVenueMutation = useCreateVenueLog(eventUuid, linkId);
  const createMutation = type === 'provider' ? createProviderMutation : createVenueMutation;

  const [showForm, setShowForm] = useState(false);
  const form = useForm<LogForm>({
    resolver: zodResolver(logFormSchema),
    defaultValues: LOG_DEFAULT_VALUES,
  });

  const watchedStatus = form.watch('statusChange');
  const lastStatusChange = logs.find(l => l.statusChange)?.statusChange ?? null;

  const onSubmit = async (values: LogForm) => {
    const status =
      values.statusChange && BOOKING_STATUSES.includes(values.statusChange as BookingStatus)
        ? (values.statusChange as BookingStatus)
        : null;
    const hasFinancial = status === 'quoted' || status === 'booked';
    const input: CreateLogInput = {
      contactPerson: values.contactPerson || null,
      result: values.result || null,
      notes: values.notes || null,
      statusChange: status,
      currency: hasFinancial ? values.currency : undefined,
      quoteAmount:
        status === 'quoted' && values.quoteAmount ? parseFloat(values.quoteAmount) : null,
      finalAmount:
        status === 'booked' && values.finalAmount ? parseFloat(values.finalAmount) : null,
      depositAmount:
        status === 'booked' && values.depositAmount ? parseFloat(values.depositAmount) : null,
      depositPaid: status === 'booked' ? values.depositPaid : null,
      paymentDueDate: status === 'booked' ? (values.paymentDueDate ?? null) : null,
      bookingStartTime:
        status === 'booked' && values.bookingStartTime ? new Date(values.bookingStartTime) : null,
      bookingEndTime:
        status === 'booked' && values.bookingEndTime ? new Date(values.bookingEndTime) : null,
    };
    await createMutation.mutateAsync(input);
    form.reset(LOG_DEFAULT_VALUES);
    setShowForm(false);
  };

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="logs" className="border-0">
        <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:text-foreground hover:no-underline">
          Activity{logs.length > 0 ? ` (${logs.length})` : ''}
          {lastStatusChange ? ` · Last: ${statusConfig[lastStatusChange].label}` : ''}
        </AccordionTrigger>
        <AccordionContent className="pb-0 pt-2">
          <div className="space-y-3">
            {/* Log list */}
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : logs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="space-y-2">
                {logs.map(log => (
                  <div
                    key={log.id}
                    className="space-y-1 rounded-md border bg-muted/30 p-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{formatDate(log.logDate)}</span>
                      {log.statusChange && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'h-4 px-1 text-[10px]',
                            statusConfig[log.statusChange].className
                          )}
                        >
                          {statusConfig[log.statusChange].label}
                        </Badge>
                      )}
                      {log.createdByName && (
                        <span className="text-muted-foreground">by {log.createdByName}</span>
                      )}
                    </div>
                    {(log.bookingStartTime || log.bookingEndTime) && (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Booking:</span>{' '}
                        {formatDateTime(log.bookingStartTime)}
                        {log.bookingEndTime && <> – {formatDateTime(log.bookingEndTime)}</>}
                      </p>
                    )}
                    {log.quoteAmount != null && (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Quote:</span>{' '}
                        {formatCurrency(log.quoteAmount, currency)}{' '}
                        <span className="text-[10px] font-medium uppercase">{currency}</span>
                      </p>
                    )}
                    {log.finalAmount != null && (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Actual Cost:</span>{' '}
                        {formatCurrency(log.finalAmount, currency)}{' '}
                        <span className="text-[10px] font-medium uppercase">{currency}</span>
                      </p>
                    )}
                    {log.depositAmount != null && (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Deposit:</span>{' '}
                        {formatCurrency(log.depositAmount, currency)}{' '}
                        <span className="text-[10px] font-medium uppercase">{currency}</span>
                        {log.depositPaid && <span className="ml-1 text-green-600">(Paid)</span>}
                        {log.paymentDueDate && (
                          <span className="ml-1">· due {formatDate(log.paymentDueDate)}</span>
                        )}
                      </p>
                    )}
                    {log.contactPerson && (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Contact:</span>{' '}
                        {log.contactPerson}
                      </p>
                    )}
                    {log.result && (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Result:</span> {log.result}
                      </p>
                    )}
                    {log.notes && <p className="italic text-muted-foreground">{log.notes}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Add log form */}
            {showForm ? (
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-2 rounded-md border p-2.5"
              >
                <div className="space-y-1">
                  <Label className="text-xs">Status Change</Label>
                  <Select
                    value={form.watch('statusChange') || 'none'}
                    onValueChange={v => form.setValue('statusChange', v === 'none' ? '' : v)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="No status change" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No status change</SelectItem>
                      {BOOKING_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>
                          {statusConfig[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Currency — shown for quoted or booked */}
                {(watchedStatus === 'quoted' || watchedStatus === 'booked') && (
                  <div className="space-y-1">
                    <Label className="text-xs">Currency</Label>
                    <Select
                      value={form.watch('currency')}
                      onValueChange={v => form.setValue('currency', v)}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(c => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Quote amount — shown for quoted status */}
                {watchedStatus === 'quoted' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Quote Amount</Label>
                    <Input
                      className="h-7 text-xs"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...form.register('quoteAmount')}
                    />
                  </div>
                )}

                {/* Deposit + booking time fields — shown for booked status */}
                {watchedStatus === 'booked' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Booking Start</Label>
                        <Input
                          className="h-7 text-xs"
                          type="datetime-local"
                          {...form.register('bookingStartTime')}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Booking End</Label>
                        <Input
                          className="h-7 text-xs"
                          type="datetime-local"
                          {...form.register('bookingEndTime')}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Actual Cost</Label>
                      <Input
                        className="h-7 text-xs"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...form.register('finalAmount')}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Deposit Amount</Label>
                      <Input
                        className="h-7 text-xs"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...form.register('depositAmount')}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form.watch('depositPaid')}
                        onCheckedChange={v => form.setValue('depositPaid', v)}
                      />
                      <Label className="text-xs">Deposit Paid</Label>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Payment Due Date</Label>
                      <DatePickerField
                        value={form.watch('paymentDueDate')}
                        onChange={d => form.setValue('paymentDueDate', d)}
                        placeholder="Pick due date"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Contact Person</Label>
                  <Input
                    className="h-7 text-xs"
                    placeholder="Name or role..."
                    {...form.register('contactPerson')}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Result</Label>
                  <Input
                    className="h-7 text-xs"
                    placeholder="e.g. Confirmed pricing, sent quote..."
                    {...form.register('result')}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    className="min-h-[60px] text-xs"
                    placeholder="Additional notes..."
                    {...form.register('notes')}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Saving...' : 'Add Log'}
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-full text-xs"
                onClick={() => setShowForm(true)}
              >
                + Add Log
              </Button>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

// ==================== LOADING SKELETON ====================

function VendorCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
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
  const { data: tasksData } = useTasks(eventUuid, { limit: 200 });
  const tasks = tasksData?.items ?? [];
  const eventDate = event?.startDate ?? null;
  const linkProviderMutation = useLinkProvider(eventUuid);
  const linkVenueMutation = useLinkVenue(eventUuid);

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
          <div className="flex items-center gap-2">
            <ProviderDialog
              onSuccess={(provider?: ServiceProviderResponse) => {
                if (provider?.uuid) linkProviderMutation.mutate({ providerUuid: provider.uuid });
              }}
            />
            <LinkProviderDialog eventUuid={eventUuid} />
          </div>
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
          <Accordion type="single" collapsible className="space-y-3">
            {providers.map(link => (
              <ProviderCard key={link.id} link={link} eventUuid={eventUuid} tasks={tasks} />
            ))}
          </Accordion>
        )}
      </div>

      {/* Venues */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Venues</h2>
          <div className="flex items-center gap-2">
            <VenueDialog
              onSuccess={(venue?: VenueResponse) => {
                if (venue?.uuid) linkVenueMutation.mutate({ venueUuid: venue.uuid });
              }}
            />
            <LinkVenueDialog eventUuid={eventUuid} />
          </div>
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
          <Accordion type="single" collapsible className="space-y-3">
            {venues.map(link => (
              <VenueCard key={link.id} link={link} eventUuid={eventUuid} eventDate={eventDate} tasks={tasks} />
            ))}
          </Accordion>
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
