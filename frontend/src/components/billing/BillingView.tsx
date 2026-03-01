/**
 * BillingView — the full billing management page component.
 * Rendered via client:load on /dashboard/billing.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { useBilling, useCreatePortalSession } from '@/hooks/use-billing';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { UsageMeter } from './UsageMeter';
import { CurrentPlanBadge } from './CurrentPlanBadge';
import { PricingTable } from './PricingTable';

// ==================== CURRENT PLAN CARD ====================

function CurrentPlanCard() {
  const { data, isLoading, error } = useBilling();
  const portal = useCreatePortalSession();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load billing information.</AlertDescription>
      </Alert>
    );
  }

  const { subscription, limits, usage } = data;
  const plan = subscription?.plan ?? 'free';
  const isPaid = plan !== 'free';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Current Plan
              <CurrentPlanBadge plan={plan} />
            </CardTitle>
            <CardDescription>
              {isPaid && subscription?.currentPeriodEnd
                ? `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}`
                : 'No active subscription'}
            </CardDescription>
          </div>
          {isPaid && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => portal.mutate()}
              disabled={portal.isPending}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {portal.isPending ? 'Loading…' : 'Manage subscription'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription?.cancelAtPeriodEnd && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your subscription will be canceled at the end of this billing period.
            </AlertDescription>
          </Alert>
        )}

        {/* Usage meters */}
        <div className="space-y-3">
          {usage.emailPoolPerMonth !== null && (
            <UsageMeter
              label="Emails sent this period"
              current={usage.emailsSentThisPeriod}
              limit={usage.emailPoolPerMonth}
            />
          )}
          {limits.maxGuests !== null && (
            <UsageMeter
              label="Guest capacity"
              current={0}
              limit={limits.maxGuests}
            />
          )}
          {limits.maxActiveEvents !== null && (
            <UsageMeter
              label="Active events"
              current={0}
              limit={limits.maxActiveEvents}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== MAIN VIEW ====================

function BillingContent() {
  const { data } = useBilling();
  const plan = data?.subscription?.plan ?? 'free';

  return (
    <div className="space-y-8">
      <CurrentPlanCard />

      <div>
        <h2 className="text-xl font-semibold mb-1">Plans</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Upgrade or change your plan at any time.
        </p>
        <PricingTable currentPlan={plan} />
      </div>
    </div>
  );
}

export function BillingView() {
  return (
    <QueryProvider>
      <BillingContent />
    </QueryProvider>
  );
}
