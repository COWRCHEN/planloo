/**
 * Budget Landing View
 *
 * Shows aggregate budget summary across all user events
 * with per-event breakdown cards.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllEventsBudgetSummary } from '@/hooks/use-budget';
import { useSession } from '@/hooks/use-auth';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-20" />
      </CardContent>
    </Card>
  );
}

function EventCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3 mb-4" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

function BudgetLandingContent() {
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data, isLoading, error } = useAllEventsBudgetSummary();

  if (sessionLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SummaryCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please sign in to view your budget.</p>
          <Button asChild className="mt-4">
            <a href="/login">Sign in</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Failed to load budget data.</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const events = data?.events ?? [];

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-muted-foreground">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="font-medium">No budget data yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an event and add budget items to get started.
          </p>
          <Button asChild className="mt-4">
            <a href="/dashboard/events/new">Create Event</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Aggregate Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Estimated</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data!.totalEstimated)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Actual</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data!.totalActual)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Paid</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(data!.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Items</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data!.totalItems}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Event Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Card key={event.uuid} className="flex flex-col">
            <CardHeader className="flex-1">
              <CardTitle className="truncate text-lg">{event.title}</CardTitle>
              <CardDescription>{formatDate(event.startDate)}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mb-3 space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Estimated</span>
                  <span className="font-medium text-foreground">{formatCurrency(event.totalEstimated)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Actual</span>
                  <span className="font-medium text-foreground">{formatCurrency(event.totalActual)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid</span>
                  <span className="font-medium text-green-600">{formatCurrency(event.totalPaid)}</span>
                </div>
                {event.budgetTotal != null && (
                  <div className="flex justify-between border-t pt-1">
                    <span>Budget</span>
                    <span className="font-medium text-foreground">{formatCurrency(event.budgetTotal)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{event.itemCount} item{event.itemCount !== 1 ? 's' : ''}</span>
                <Button variant="outline" asChild size="sm">
                  <a href={`/dashboard/events/${event.uuid}/budget`}>View Budget</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function BudgetLandingView() {
  return (
    <QueryProvider>
      <BudgetLandingContent />
    </QueryProvider>
  );
}
