# Frontend — Billing Components & Hooks

---

## Hooks

**File:** `frontend/src/hooks/use-billing.ts`

All hooks follow project conventions: TanStack Query, `credentials: 'include'`, `staleTime: 5min` for the query.

---

### `useBilling()`

Fetches the current subscription, plan limits, and usage.

```typescript
useQuery<BillingData>({
  queryKey: ['billing', 'detail'],
  queryFn: () => GET /api/v1/billing (with credentials),
  staleTime: 5 minutes,
})
```

**Returns:** `{ subscription, limits, usage }` — see [API Endpoints](./api.md) for shape.

---

### `useCreateCheckoutSession()`

Mutation that POSTs to `/billing/checkout` and redirects the browser to the Stripe Checkout URL on success.

```typescript
useMutation({
  mutationFn: (input: { plan: 'personal'|'planner'|'agency'; interval: 'monthly'|'annual' }) =>
    POST /api/v1/billing/checkout,
  onSuccess: (data) => window.location.href = data.url,
})
```

**Usage:**
```tsx
const checkout = useCreateCheckoutSession();
checkout.mutate({ plan: 'planner', interval: 'monthly' });
```

---

### `useCreatePortalSession()`

Mutation that POSTs to `/billing/portal` and redirects to the Stripe Customer Portal on success.

```typescript
useMutation({
  mutationFn: () => POST /api/v1/billing/portal,
  onSuccess: (data) => window.location.href = data.url,
})
```

---

## Components

All components are in `frontend/src/components/billing/`.

---

### `BillingView`

**File:** `BillingView.tsx`

Full billing management page. Composed of `CurrentPlanCard` (internal) + `PricingTable`.

- `CurrentPlanCard` shows plan badge, renewal date, cancel warning, and usage meters.
- "Manage subscription" button triggers `useCreatePortalSession`.

**Usage (in billing.astro):**
```astro
<BillingView client:load />
```

---

### `PricingTable`

**File:** `PricingTable.tsx`

4-tier plan comparison with monthly/annual billing toggle.

**Props:**
```typescript
interface PricingTableProps {
  currentPlan?: PlanId; // Disables the current plan's upgrade button
}
```

- Monthly/annual toggle using shadcn `Switch`
- Highlights Planner tier as "Most Popular"
- Calls `useCreateCheckoutSession` on Upgrade click
- Shows feature comparison table below the plan cards

---

### `UsageMeter`

**File:** `UsageMeter.tsx`

Progress bar showing quota usage for a single resource.

**Props:**
```typescript
interface UsageMeterProps {
  label: string;
  current: number;
  limit: number | null; // null = unlimited (no bar shown)
  unit?: string;
}
```

**Color states:**
- `< 80%` used → primary color
- `≥ 80%` used → yellow (`text-yellow-600`, `bg-yellow-500`)
- `100%` used → destructive red

---

### `CurrentPlanBadge`

**File:** `CurrentPlanBadge.tsx`

Compact colored badge for display in the sidebar, nav header, or plan cards.

**Props:**
```typescript
interface CurrentPlanBadgeProps {
  plan: PlanId;
}
```

| Plan | Color |
|---|---|
| `free` | Muted gray |
| `personal` | Blue |
| `planner` | Purple |
| `agency` | Amber |

---

### `UpgradePrompt`

**File:** `UpgradePrompt.tsx`

Inline error CTA shown when the API returns a 402 billing error. Reads `error.code`, `error.message`, and `error.upgradeTo`.

**Props:**
```typescript
interface UpgradePromptProps {
  error: BillingError; // { code, message, upgradeTo?, upgradeUrl }
}
```

**Usage:**
```tsx
if (isError && error.status === 402) {
  const billingError = error.body?.error;
  return <UpgradePrompt error={billingError} />;
}
```

Links to `/dashboard/billing` via `upgradeUrl`.

---

## Page

**File:** `frontend/src/pages/dashboard/billing.astro`
**Route:** `/dashboard/billing`
**Rendering:** SSR (`export const prerender = false`)

```astro
<DashboardLayout title="Billing" description="Manage your Planloo subscription">
  <BillingView client:load />
</DashboardLayout>
```

The settings page (`/dashboard/settings`) contains a link to this page in its footer section.

---

## Types (from `use-billing.ts`)

```typescript
type PlanId = 'free' | 'personal' | 'planner' | 'agency';
type BillingInterval = 'monthly' | 'annual';
type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'free';

interface BillingData {
  subscription: SubscriptionInfo | null;
  limits: PlanLimits;
  usage: {
    emailsSentThisPeriod: number;
    emailPoolPerMonth: number | null;
  };
}
```
