/**
 * Unit Price Builder — Basic plan + à la carte add-ons.
 *
 * Customers start with the Basic plan ($12/mo) or stay free, then add
 * individual units on top. For new subscribers: creates a Stripe Checkout
 * session. For existing subscribers: links to the billing portal.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Check, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useBilling,
  useCreateCheckoutSession,
  useCreatePortalSession,
} from '@/hooks/use-billing';
import type { BillingInterval, ItemType } from '@/hooks/use-billing';

// ==================== PRICING DATA ====================

const BASIC_PLAN_PRICE = 9.99;

const BASIC_PLAN_INCLUDES = [
  '100 guests',
  '300 emails / mo',
  '100 SMS / mo',
  'CSV, budget, tasks & vendors',
];

const MONTHLY_PRICES: Record<string, number> = {
  events: 3,
  guests: 2,
  emails: 2,
  sms: 5,
  collaborators: 1,
  custom_fields: 3,
  org_members: 5,
  floor_plans: 10,
  organizations: 10,
  audit_history: 8,
};

const UNIT_LABELS: Record<string, { label: string; unitDesc: string }> = {
  events: { label: 'Events', unitDesc: '+1 event per unit' },
  guests: { label: 'Extra guests', unitDesc: '+100 guests per unit' },
  emails: { label: 'Extra emails', unitDesc: '+1,000 emails/mo per unit' },
  sms: { label: 'Extra SMS', unitDesc: '+100 SMS/mo per unit' },
  collaborators: { label: 'Collaborators', unitDesc: '+1 slot per event' },
  custom_fields: { label: 'Custom guest fields', unitDesc: '+1 field' },
  org_members: { label: 'Extra org members', unitDesc: '+1 member (beyond 2 included)' },
  floor_plans: { label: 'Floor Plans', unitDesc: 'Seating charts & floor plan builder' },
  organizations: { label: 'Organizations', unitDesc: '1 org with 2 members included' },
  audit_history: { label: 'Guest Audit History', unitDesc: 'Full change log for guest records' },
};

const QUANTITY_ITEMS: ItemType[] = [
  'events', 'guests', 'emails', 'sms', 'collaborators', 'custom_fields', 'org_members',
];

const TOGGLE_ITEMS: ItemType[] = ['floor_plans', 'organizations', 'audit_history'];

// ==================== HELPERS ====================

type UnitConfig = Partial<Record<ItemType, number>>;

function computeTotal(includeBasic: boolean, config: UnitConfig, interval: BillingInterval): number {
  const baseCost = includeBasic ? BASIC_PLAN_PRICE : 0;
  const addonCost = (Object.entries(config) as [ItemType, number][]).reduce((sum, [itemType, qty]) => {
    return sum + (MONTHLY_PRICES[itemType] ?? 0) * qty;
  }, 0);
  const total = baseCost + addonCost;
  return interval === 'annual' ? Math.round(total * 0.85 * 100) / 100 : total;
}

function toLineItems(
  includeBasic: boolean,
  config: UnitConfig,
): { itemType: ItemType; quantity: number }[] {
  const items: { itemType: ItemType; quantity: number }[] = [];
  if (includeBasic) items.push({ itemType: 'basic_plan', quantity: 1 });
  for (const [itemType, qty] of Object.entries(config) as [ItemType, number][]) {
    if (qty > 0) items.push({ itemType, quantity: qty });
  }
  return items;
}

// ==================== SUB-COMPONENTS ====================

function QuantityRow({
  itemType,
  qty,
  interval,
  onChange,
}: {
  itemType: ItemType;
  qty: number;
  interval: BillingInterval;
  onChange: (v: number) => void;
}) {
  const { label, unitDesc } = UNIT_LABELS[itemType]!;
  const monthly = MONTHLY_PRICES[itemType]!;
  const displayPrice = interval === 'annual'
    ? `$${(monthly * 0.85).toFixed(2)}`
    : `$${monthly}`;
  const lineTotal = qty * monthly * (interval === 'annual' ? 0.85 : 1);

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{unitDesc}</p>
      </div>
      <div className="text-right text-xs text-muted-foreground w-24 hidden sm:block">
        {displayPrice}/unit
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onChange(Math.max(0, qty - 1))}
          disabled={qty === 0}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-6 text-center text-sm tabular-nums">{qty}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onChange(qty + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <div className="text-right text-sm font-medium tabular-nums w-14">
        {qty > 0 ? `$${lineTotal % 1 === 0 ? lineTotal : lineTotal.toFixed(2)}` : '—'}
      </div>
    </div>
  );
}

function ToggleRow({
  itemType,
  enabled,
  interval,
  onChange,
}: {
  itemType: ItemType;
  enabled: boolean;
  interval: BillingInterval;
  onChange: (v: boolean) => void;
}) {
  const { label, unitDesc } = UNIT_LABELS[itemType]!;
  const monthly = MONTHLY_PRICES[itemType]!;
  const displayPrice = interval === 'annual'
    ? `$${(monthly * 0.85).toFixed(2)}`
    : `$${monthly}`;

  return (
    <div className="flex items-center gap-3 py-2">
      <Switch checked={enabled} onCheckedChange={onChange} id={`toggle-${itemType}`} />
      <Label htmlFor={`toggle-${itemType}`} className="flex-1 min-w-0 cursor-pointer">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{unitDesc}</p>
      </Label>
      <div className="text-right text-sm font-medium tabular-nums w-14">
        {enabled ? displayPrice : '—'}
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export function PricingTable() {
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [includeBasic, setIncludeBasic] = useState(true);
  const [config, setConfig] = useState<UnitConfig>({});
  const { data: billing } = useBilling();
  const checkout = useCreateCheckoutSession();
  const portal = useCreatePortalSession();

  const hasSubscription = !!(
    billing?.subscription?.stripeSubscriptionId &&
    (billing.subscription.status === 'active' || billing.subscription.status === 'trialing')
  );
  const hasUnitItems = (billing?.items?.length ?? 0) > 0;

  const total = computeTotal(includeBasic, config, interval);
  const lineItems = toLineItems(includeBasic, config);

  function setQty(itemType: ItemType, qty: number) {
    setConfig(prev => ({ ...prev, [itemType]: qty }));
  }

  function setEnabled(itemType: ItemType, enabled: boolean) {
    setConfig(prev => ({ ...prev, [itemType]: enabled ? 1 : 0 }));
  }

  function handleSubscribe() {
    if (lineItems.length === 0) return;
    checkout.mutate({ items: lineItems, interval });
  }

  const basicMonthlyDisplay = interval === 'annual'
    ? `$${(BASIC_PLAN_PRICE * 0.85).toFixed(2)}`
    : `$${BASIC_PLAN_PRICE}`;

  return (
    <div className="space-y-8">
      {/* Monthly / Annual toggle */}
      <div className="flex items-center justify-center gap-3">
        <Label className="text-sm font-medium">Monthly</Label>
        <Switch
          checked={interval === 'annual'}
          onCheckedChange={checked => setInterval(checked ? 'annual' : 'monthly')}
        />
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          Annual
          <Badge variant="secondary" className="text-xs">Save 15%</Badge>
        </Label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* ── Left: builder ── */}
        <div className="space-y-4">
          {/* Basic plan toggle */}
          <div className={cn(
            'rounded-lg border-2 p-4 transition-colors',
            includeBasic ? 'border-primary bg-primary/5' : 'border-border bg-muted/30',
          )}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Basic plan</p>
                  <Badge variant="secondary" className="text-xs">Starter bundle</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Includes a set of events, guests, and email — everything you need to get started.
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1">
                  {BASIC_PLAN_INCLUDES.map(f => (
                    <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-primary shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <p className="text-lg font-bold tabular-nums">
                  {basicMonthlyDisplay}
                  <span className="text-xs font-normal text-muted-foreground">/mo</span>
                </p>
                <Switch
                  checked={includeBasic}
                  onCheckedChange={setIncludeBasic}
                  id="toggle-basic"
                />
              </div>
            </div>
          </div>

          {/* Free base note */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Always included — free
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 text-xs">
                <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />1 active event
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />50 guests
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />CSV import / export
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />Budget tracking
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />Task templates
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />Vendor management
              </div>
            </div>
          </div>

          {/* Resource add-ons */}
          <div className="rounded-lg border p-4 space-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {includeBasic ? 'Add-ons — extra resources on top of Basic' : 'Resource units'}
            </p>
            {QUANTITY_ITEMS.map(itemType => (
              <QuantityRow
                key={itemType}
                itemType={itemType}
                qty={config[itemType] ?? 0}
                interval={interval}
                onChange={qty => setQty(itemType, qty)}
              />
            ))}
          </div>

          {/* Feature unlocks */}
          <div className="rounded-lg border p-4 space-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Feature unlocks
            </p>
            {TOGGLE_ITEMS.map(itemType => (
              <ToggleRow
                key={itemType}
                itemType={itemType}
                enabled={(config[itemType] ?? 0) > 0}
                interval={interval}
                onChange={v => setEnabled(itemType, v)}
              />
            ))}
          </div>

          {/* Enterprise */}
          <div className="rounded-lg border border-dashed p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enterprise</p>
              <p className="text-xs text-muted-foreground">
                SSO / SAML, dedicated support, custom contract &amp; SLA
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="mailto:sales@planloo.com">Contact sales</a>
            </Button>
          </div>
        </div>

        {/* ── Right: summary ── */}
        <div className="space-y-4">
          <div className="rounded-lg border p-5 space-y-4 sticky top-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your plan
            </p>

            {lineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Enable the Basic plan or add units above.
              </p>
            ) : (
              <div className="space-y-1.5">
                {lineItems.map(({ itemType, quantity }) => {
                  if (itemType === 'basic_plan') {
                    const price = BASIC_PLAN_PRICE * (interval === 'annual' ? 0.85 : 1);
                    return (
                      <div key="basic_plan" className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Basic plan</span>
                        <span className="tabular-nums">
                          ${price % 1 === 0 ? price : price.toFixed(2)}
                        </span>
                      </div>
                    );
                  }
                  const monthly = MONTHLY_PRICES[itemType]!;
                  const price = monthly * quantity * (interval === 'annual' ? 0.85 : 1);
                  return (
                    <div key={itemType} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {UNIT_LABELS[itemType]!.label}
                        {quantity > 1 ? ` ×${quantity}` : ''}
                      </span>
                      <span className="tabular-nums">
                        ${price % 1 === 0 ? price : price.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <Separator />

            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">Total</span>
              <div className="text-right">
                <span className="text-2xl font-bold tabular-nums">
                  ${total % 1 === 0 ? total : total.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
            </div>
            {interval === 'annual' && total > 0 && (
              <p className="text-xs text-muted-foreground text-right">
                Billed ${(total * 12).toFixed(2)}/year
              </p>
            )}

            {hasSubscription ? (
              <div className="space-y-2">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => portal.mutate()}
                  disabled={portal.isPending}
                >
                  {portal.isPending ? 'Loading…' : 'Manage subscription'}
                </Button>
                {hasUnitItems && (
                  <p className="text-xs text-center text-muted-foreground">
                    Modify your plan via the billing portal or contact support.
                  </p>
                )}
              </div>
            ) : (
              <Button
                className={cn('w-full', lineItems.length === 0 && 'opacity-50')}
                onClick={handleSubscribe}
                disabled={lineItems.length === 0 || checkout.isPending}
              >
                {checkout.isPending
                  ? 'Redirecting…'
                  : lineItems.length === 0
                  ? 'Select a plan to continue'
                  : `Subscribe for $${total % 1 === 0 ? total : total.toFixed(2)}/mo`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
