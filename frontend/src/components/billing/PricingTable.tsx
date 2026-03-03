/**
 * PricingTable — 5-tier plan comparison with monthly/annual toggle.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateCheckoutSession } from '@/hooks/use-billing';
import type { PlanId, BillingInterval } from '@/hooks/use-billing';

// ==================== PLAN DATA ====================

type AllPlanId = PlanId;

interface PlanFeature {
  label: string;
  free: string | boolean;
  personal: string | boolean;
  planner: string | boolean;
  agency: string | boolean;
  enterprise: string | boolean;
}

const FEATURES: PlanFeature[] = [
  {
    label: 'Active events',
    free: '1',
    personal: '3',
    planner: '25',
    agency: 'Unlimited',
    enterprise: 'Contact Sales',
  },
  {
    label: 'Guests',
    free: '50',
    personal: '200',
    planner: '800',
    agency: '3,000',
    enterprise: 'Contact Sales',
  },
  {
    label: 'Email pool / mo',
    free: false,
    personal: '1,000',
    planner: '4,000',
    agency: '30,000',
    enterprise: 'Contact Sales',
  },
  {
    label: 'Custom guest fields',
    free: false,
    personal: '3',
    planner: '10',
    agency: '10',
    enterprise: 'Contact Sales',
  },
  {
    label: 'Organizations',
    free: false,
    personal: false,
    planner: '1 (5 members)',
    agency: '3 (unlimited)',
    enterprise: 'Contact Sales',
  },
  {
    label: 'CSV import / export',
    free: false,
    personal: true,
    planner: true,
    agency: true,
    enterprise: true,
  },
  {
    label: 'Floor plans',
    free: false,
    personal: false,
    planner: true,
    agency: true,
    enterprise: true,
  },
  {
    label: 'Budget tracking',
    free: false,
    personal: true,
    planner: true,
    agency: true,
    enterprise: true,
  },
  {
    label: 'Task templates',
    free: false,
    personal: true,
    planner: true,
    agency: true,
    enterprise: true,
  },
  {
    label: 'Vendor management',
    free: false,
    personal: true,
    planner: true,
    agency: true,
    enterprise: true,
  },
  // {
  //   label: 'SSO',
  //   free: false,
  //   personal: false,
  //   planner: false,
  //   agency: false,
  //   enterprise: true,
  // },
  {
    label: 'Dedicated support',
    free: false,
    personal: false,
    planner: false,
    agency: false,
    enterprise: true,
  },
];

const PRICES = {
  monthly: { free: 0, personal: 19.99, planner: 39.99, agency: 199.99 },
  annual: { free: 0, personal: 16.99, planner: 35.99, agency: 169.99 },
};

const PLAN_NAMES: Record<AllPlanId, string> = {
  free: 'Free',
  personal: 'Personal',
  planner: 'Planner',
  agency: 'Agency',
  enterprise: 'Enterprise',
};

const PLAN_DESCRIPTIONS: Record<AllPlanId, string> = {
  free: 'Try it out',
  personal: 'For individuals',
  planner: 'For professionals',
  agency: 'For teams',
  enterprise: 'Custom contract',
};

// ==================== HELPERS ====================

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === false) {
    return <X className="mx-auto h-4 w-4 text-muted-foreground/50" />;
  }
  if (value === true) {
    return <Check className="text-primary mx-auto h-4 w-4" />;
  }
  return <span className="text-sm">{value}</span>;
}

// ==================== COMPONENT ====================

interface PricingTableProps {
  currentPlan?: AllPlanId;
}

export function PricingTable({ currentPlan = 'free' }: PricingTableProps) {
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const checkout = useCreateCheckoutSession();

  const standardPlans: PlanId[] = ['free', 'personal', 'planner', 'agency'];
  const allPlans: AllPlanId[] = [...standardPlans, 'enterprise'];

  function handleUpgrade(plan: Exclude<PlanId, 'free' | 'enterprise'>) {
    checkout.mutate({ plan, interval });
  }

  return (
    <div className="space-y-6">
      {/* Monthly / Annual toggle */}
      <div className="flex items-center justify-center gap-3">
        <Label htmlFor="billing-interval" className="text-sm font-medium">
          Monthly
        </Label>
        <Switch
          id="billing-interval"
          checked={interval === 'annual'}
          onCheckedChange={checked => setInterval(checked ? 'annual' : 'monthly')}
        />
        <Label htmlFor="billing-interval" className="flex items-center gap-1.5 text-sm font-medium">
          Annual
          <Badge variant="secondary" className="text-xs">
            Save about 15%
          </Badge>
        </Label>
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {allPlans.map(plan => {
          const isCurrent = plan === currentPlan;
          const isHighlighted = plan === 'planner';
          const isEnterprise = plan === 'enterprise';
          const isPaidStandard = plan !== 'free' && !isEnterprise;
          const price = isEnterprise ? null : PRICES[interval][plan as keyof typeof PRICES.monthly];

          return (
            <div
              key={plan}
              className={cn(
                'relative flex flex-col rounded-xl border p-6',
                isHighlighted && 'border-primary shadow-md',
                isCurrent && 'bg-muted/40'
              )}
            >
              {isHighlighted && (
                <Badge className="bg-primary text-primary-foreground absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs">
                  Most Popular
                </Badge>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold">{PLAN_NAMES[plan]}</h3>
                <p className="text-sm text-muted-foreground">{PLAN_DESCRIPTIONS[plan]}</p>
              </div>

              <div className="mb-6">
                {isEnterprise ? (
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold">Contact us</span>
                  </div>
                ) : (
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold tabular-nums">
                      ${(price as number).toFixed(2)}
                    </span>
                    <span className="mb-1 text-sm text-muted-foreground">/mo</span>
                  </div>
                )}
                {interval === 'annual' && isPaidStandard && (
                  <p className="text-xs text-muted-foreground">Billed annually</p>
                )}
              </div>

              {isCurrent ? (
                <Button variant="outline" disabled className="w-full">
                  Current plan
                </Button>
              ) : isEnterprise ? (
                <Button className="w-full" variant="outline" asChild>
                  <a href="mailto:sales@planloo.com">Contact sales</a>
                </Button>
              ) : plan === 'free' ? (
                <Button variant="outline" disabled className="w-full">
                  Free forever
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant={isHighlighted ? 'destructive' : 'outline'}
                  onClick={() => handleUpgrade(plan as Exclude<PlanId, 'free' | 'enterprise'>)}
                  disabled={checkout.isPending}
                >
                  {checkout.isPending && checkout.variables?.plan === plan
                    ? 'Redirecting…'
                    : 'Upgrade'}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="py-3 pl-4 pr-2 text-left font-medium text-muted-foreground">
                Feature
              </th>
              {allPlans.map(plan => (
                <th
                  key={plan}
                  className={cn(
                    'px-2 py-3 text-center font-medium',
                    plan === currentPlan && 'text-primary'
                  )}
                >
                  {PLAN_NAMES[plan]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {FEATURES.map(feat => (
              <tr key={feat.label} className="transition-colors hover:bg-muted/30">
                <td className="py-3 pl-4 pr-2 text-muted-foreground">{feat.label}</td>
                {allPlans.map(plan => (
                  <td key={plan} className="px-2 py-3 text-center">
                    <FeatureValue value={feat[plan]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
