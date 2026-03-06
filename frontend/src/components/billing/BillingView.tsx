/**
 * BillingView — the full billing management page component.
 * Rendered via client:load on /dashboard/billing.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CreditCard, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useBilling, useCreatePortalSession } from '@/hooks/use-billing';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { UsageMeter } from './UsageMeter';
import { CurrentPlanBadge } from './CurrentPlanBadge';
import { PricingTable } from './PricingTable';

// ==================== HELPER COMPONENTS ====================

function NotIncludedRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-xs text-muted-foreground/60">Not included</span>
    </div>
  );
}

function LimitRow({
  label,
  value,
  unavailable = false,
}: {
  label: string;
  value: string;
  unavailable?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={unavailable ? 'text-sm text-muted-foreground/60' : 'text-sm font-medium'}>
        {value}
      </span>
    </div>
  );
}

function FeatureRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {enabled ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
      )}
      <span className={enabled ? '' : 'text-muted-foreground/60'}>{label}</span>
    </div>
  );
}

// ==================== CURRENT PLAN CARD ====================

function CurrentPlanCard() {
  const { data, isLoading, error } = useBilling();
  const portal = useCreatePortalSession();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-1 h-4 w-48" />
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
            <div className="flex flex-col items-end gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => portal.mutate()}
                disabled={portal.isPending}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {portal.isPending ? 'Loading…' : 'Manage subscription'}
              </Button>
              {portal.isError && (
                <p className="text-xs text-destructive">
                  {portal.error?.message ?? 'Failed to open billing portal.'}
                </p>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {subscription?.cancelAtPeriodEnd && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your subscription will be canceled at the end of this billing period.
            </AlertDescription>
          </Alert>
        )}

        {/* ── Usage ── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Usage
          </p>
          <UsageMeter
            label="Active events"
            current={usage.totalEvents}
            limit={limits.maxActiveEvents}
          />
          <UsageMeter label="Guests" current={usage.totalGuests} limit={limits.maxGuests} />
          {limits.maxOrganizations > 0 && (
            <UsageMeter
              label="Organizations"
              current={usage.totalOrganizations}
              limit={limits.maxOrganizations}
            />
          )}
          {/* email: null means not included on this plan */}
          {usage.emailPoolPerMonth !== null ? (
            <UsageMeter
              label="Emails this period"
              current={usage.emailsSentThisPeriod}
              limit={usage.emailPoolPerMonth}
            />
          ) : (
            <NotIncludedRow label="Email sending" />
          )}
          {/* sms: 0 means not included */}
          {(usage.smsPoolPerMonth ?? 0) > 0 ? (
            <UsageMeter
              label="SMS this period"
              current={usage.smsSentThisPeriod}
              limit={usage.smsPoolPerMonth}
            />
          ) : (
            <NotIncludedRow label="SMS sending" />
          )}
        </div>

        <Separator />

        {/* ── Per-entity limits ── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Per-event limits
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {/*<LimitRow
              label="Collaborators per event"
              value={limits.maxCollaboratorsPerEvent === null ? 'Unlimited' : limits.maxCollaboratorsPerEvent === 0 ? 'Not available' : `Up to ${limits.maxCollaboratorsPerEvent}`}
              unavailable={limits.maxCollaboratorsPerEvent === 0}
            />*/}
            <LimitRow
              label="Custom fields per event"
              value={
                limits.maxCustomFieldsPerEvent === 0
                  ? 'Not available'
                  : `Up to ${limits.maxCustomFieldsPerEvent}`
              }
              unavailable={limits.maxCustomFieldsPerEvent === 0}
            />

            {limits.maxOrgMembers !== null && limits.maxOrganizations > 0 && (
              <LimitRow label="Members per organization" value={`Up to ${limits.maxOrgMembers}`} />
            )}
          </div>
        </div>

        <Separator />

        {/* ── Features ── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Features
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <FeatureRow label="CSV Import / Export" enabled={limits.csvImportExport} />
            <FeatureRow label="Floor Plans" enabled={limits.floorPlans} />
            <FeatureRow label="Budget Tracking" enabled={limits.budgetTracking} />
            <FeatureRow label="Task Templates" enabled={limits.taskTemplates} />
            {/*<FeatureRow label="Vendor Management" enabled={limits.vendorManagement} />
            <FeatureRow label="Single Sign-On (SSO)" enabled={limits.sso} />*/}
          </div>
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
        <h2 className="mb-1 text-xl font-semibold">Plans</h2>
        <p className="mb-6 text-sm text-muted-foreground">
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
