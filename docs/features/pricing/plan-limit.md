# Plan Limit Enforcement — Frontend

**Status:** Implemented
**Last Updated:** 2026-03-05

Documents the frontend-side limit enforcement layer: the `PlanLimitError` class, `FeatureGate` component, and all UI gates applied to restricted features.

---

## Overview

Every feature gate on the frontend follows one of two patterns:

| Pattern | When to use | Component |
|---|---|---|
| **Full screen lock** | Feature is entirely unavailable on the plan | `FeatureGate` |
| **Button-level intercept** | User can see the UI but cannot initiate an action | Dialog + `UpgradePrompt` |

Gates are driven by `useBilling()` which returns `{ limits, usage }`. If billing fails to load (`billingData === undefined`), no gate is applied — the feature renders normally. This prevents billing outages from blocking all users.

---

## Core Utilities

### `PlanLimitError`

**File:** `frontend/src/lib/api-error.ts`

A typed error subclass thrown by API hooks when the backend returns HTTP 402.

```typescript
export class PlanLimitError extends Error {
  readonly isPlanLimitError = true;
  readonly code: string;       // e.g. 'GUEST_LIMIT_EXCEEDED'
  readonly limit?: number;
  readonly current?: number;
  readonly upgradeTo?: string; // e.g. 'planner'
  readonly upgradeUrl: string; // e.g. '/dashboard/billing'
}
```

Also exports `handleApiResponse<T>(response)` — a generic fetch helper that throws `PlanLimitError` on 402 and a plain `Error` on other non-OK statuses.

**Hooks that throw `PlanLimitError` on 402:**

| Hook file | Trigger |
|---|---|
| `use-events.ts` | Create/import event |
| `use-guests.ts` | Add guest, import CSV |
| `use-collaborators.ts` | Invite collaborator |
| `use-organizations.ts` | Create organization |

---

### `FeatureGate`

**File:** `frontend/src/components/billing/FeatureGate.tsx`

Full-page lock screen shown when an entire feature is unavailable on the user's plan. Replaces the normal page content.

```typescript
interface FeatureGateProps {
  featureName: string;    // e.g. "Budget Tracking"
  description: string;    // One-line description of what the feature does
  requiredPlan?: string;  // e.g. "Planner" — shown in the lock copy
  isLoading?: boolean;    // Shows skeleton instead of lock screen
}
```

**Renders:** padded card with a lock icon, plan requirement copy, and an "Upgrade Plan" button linking to `/dashboard/billing`.

---

### `UpgradePrompt`

**File:** `frontend/src/components/billing/UpgradePrompt.tsx`

Inline alert shown inside a Dialog when a user tries to take a gated action (e.g. clicking "Import CSV"). Does not replace page content.

```typescript
interface UpgradePromptProps {
  error: {
    code: string;
    message: string;
    limit?: number;
    current?: number;
    upgradeTo?: string;
    upgradeUrl: string;
  };
  title?: string;           // Default: "Plan limit reached"
  variant?: 'default' | 'destructive'; // Default: 'destructive'
}
```

**Pattern for button-level intercept:**
```tsx
const [showDialog, setShowDialog] = useState(false);
const { data: billingData } = useBilling();

// intercept click
onClick={() => {
  if (billingData?.limits.someFeature === false) {
    setShowDialog(true);
    return;
  }
  // ... proceed
}}

// dialog at bottom of return
<Dialog open={showDialog} onOpenChange={setShowDialog}>
  <DialogContent>
    <DialogHeader><DialogTitle>Plan limit reached</DialogTitle></DialogHeader>
    <UpgradePrompt error={{ code: 'FEATURE_BLOCKED', message: '...', upgradeUrl: '/dashboard/billing' }} />
  </DialogContent>
</Dialog>
```

---

## Gate Map — Feature by Feature

### Organizations

**File:** `frontend/src/components/organizations/OrganizationsView.tsx`
**Hook:** `useBilling()`, `useOrganizations()`

| Condition | `limits.maxOrganizations` | Behavior |
|---|---|---|
| Feature blocked | `=== 0` | "Create Organization" button → upgrade dialog |
| At cap | `> 0` and `usage.totalOrganizations >= maxOrgs` | "Create Organization" button → upgrade dialog |
| Under cap | otherwise | Normal navigation to `/dashboard/organizations/new` |

The gate applies to both the empty-state CTA and the list-header button.

---

### Collaborators

**File:** `frontend/src/components/events/CollaboratorsList.tsx`
**Hook:** `useBilling()`, `useCollaborators(eventUuid)`

| Condition | `limits.maxCollaboratorsPerEvent` | Behavior |
|---|---|---|
| Feature blocked | `=== 0` | "Invite" button → upgrade dialog |
| At cap | `> 0` and `collaborators.length >= max` | "Invite" button → upgrade dialog |
| Under cap | otherwise | Opens `InviteCollaboratorDialog` normally |

---

### CSV Import

**File:** `frontend/src/components/guests/GuestList.tsx`
**Condition:** `billingData?.limits.csvImportExport === false`

"Import" button `onClick` checks `csvImportExport`. If `false`, shows `showImportLimitDialog` dialog with `UpgradePrompt` instead of opening `GuestImportDialog`.

---

### CSV Export

**File:** `frontend/src/components/guests/GuestExportButton.tsx`
**Condition:** `billingData?.limits.csvImportExport === false`

`handleExport` checks `csvImportExport` before calling `exportGuests()`. If `false`, opens `showCsvLimitDialog` dialog with `UpgradePrompt` and returns early (no file download).

---

### Budget Tracking

**File:** `frontend/src/components/budget/BudgetView.tsx` (`BudgetViewContent`)
**Condition:** `billingData && !billingData.limits.budgetTracking`

After the session auth check, renders `<FeatureGate featureName="Budget Tracking" requiredPlan="Planner" />` in place of the entire budget UI.

---

### Task Templates

**File:** `frontend/src/components/tasks/TasksView.tsx` (`TasksViewContent`)
**Condition:** `billingData?.limits.taskTemplates === false`

The "Apply Template" button is conditionally rendered:

```tsx
{hasTemplates && billingData?.limits.taskTemplates !== false && (
  <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
    Apply Template
  </Button>
)}
```

The template data is still fetched (no DB waste — `useTaskTemplates` is called regardless), but the button is hidden.

---

### Vendor Management

**File:** `frontend/src/components/providers-directory/EventProvidersView.tsx` (`EventProvidersContent`)
**Condition:** `billingData && !billingData.limits.vendorManagement`

After the session auth check, renders `<FeatureGate featureName="Vendor Management" requiredPlan="Planner" />` in place of the providers/venues UI.

---

## Hook Ordering Rule

Per `CLAUDE.md`: **all hooks must be called before any early returns.**

For components with an `if (isLoading)` or `if (!session)` early return, `useBilling()` and any related `useState` calls are placed at the top of the function body, before those returns. This applies to:

- `OrganizationsContent` — `useBilling()` + `useState(showOrgLimitDialog)` before `if (isLoading)`
- `CollaboratorsList` — `useBilling()` + `useState(showCollabLimitDialog)` before `if (isLoading)`
- `BudgetViewContent` — `useBilling()` before `if (sessionLoading || billingLoading)`
- `EventProvidersContent` — `useBilling()` before `if (sessionLoading || billingLoading)`

---

## Gate Logic Reference

```typescript
// Boolean feature flags: false = blocked, true = allowed
billingData?.limits.csvImportExport !== false  // allowed (undefined = allow)
billingData?.limits.budgetTracking             // truthy check
billingData?.limits.taskTemplates !== false    // allowed (undefined = allow)
billingData?.limits.vendorManagement           // truthy check

// Numeric limits: 0 = feature not available, null = unlimited, N = capped
const blocked = limits.maxOrganizations === 0;
const atCap   = limits.maxOrganizations !== null
             && limits.maxOrganizations > 0
             && usage.totalOrganizations >= limits.maxOrganizations;
```

`maxOrganizations === 0` and `maxCollaboratorsPerEvent === 0` mean the feature is unavailable, not that zero items are allowed. This matches the semantics in `plan-limits.ts`.

---

## File Summary

| File | Change |
|---|---|
| `frontend/src/lib/api-error.ts` | `PlanLimitError` class + `handleApiResponse` helper |
| `frontend/src/hooks/use-collaborators.ts` | Throws `PlanLimitError` on HTTP 402 |
| `frontend/src/hooks/use-organizations.ts` | Throws `PlanLimitError` on HTTP 402 |
| `frontend/src/components/billing/FeatureGate.tsx` | Full-page lock screen component |
| `frontend/src/components/billing/UpgradePrompt.tsx` | Inline 402 upgrade CTA |
| `frontend/src/components/organizations/OrganizationsView.tsx` | Gates "Create Organization" buttons |
| `frontend/src/components/events/CollaboratorsList.tsx` | Gates `InviteCollaboratorDialog` |
| `frontend/src/components/guests/GuestExportButton.tsx` | Gates CSV export |
| `frontend/src/components/guests/GuestList.tsx` | Gates CSV import button |
| `frontend/src/components/budget/BudgetView.tsx` | `FeatureGate` on `budgetTracking` |
| `frontend/src/components/tasks/TasksView.tsx` | Hides "Apply Template" on `taskTemplates` |
| `frontend/src/components/providers-directory/EventProvidersView.tsx` | `FeatureGate` on `vendorManagement` |
