# Test Cases: billing-checks (pure functions)

**Source:** `backend/src/lib/billing-checks.ts`
**Test file:** `backend/src/lib/billing-checks.test.ts`
**Total tests:** 28

Only the three pure (non-DB) functions are covered here.
DB-dependent functions are excluded — see [overview](./overview.md).

---

## `checkEmailQuota(emailsSentThisPeriod, limits)`

Checks whether the user's email quota allows sending more emails this billing period.

| # | Test | `emailsSent` | `limits.emailPoolPerMonth` | Expected |
|---|------|-------------|--------------------------|----------|
| 1 | returns ok when emails sent is below the pool limit | 500 | 1000 (personal) | `{ ok: true }` |
| 2 | returns ok when emails sent is zero and pool is available | 0 | 1000 | `{ ok: true }` |
| 3 | returns error when emailPoolPerMonth is null (no email on plan) | 0 | `null` (free) | `{ ok: false, error.code: 'EMAIL_NOT_INCLUDED' }` |
| 4 | returns error when emails sent equals the pool limit | 1000 | 1000 | `{ ok: false, error.code: 'EMAIL_QUOTA_EXCEEDED', limit: 1000, current: 1000 }` |
| 5 | returns error when emails sent exceeds the pool limit | 1001 | 1000 | `{ ok: false, error.code: 'EMAIL_QUOTA_EXCEEDED' }` |
| 6 | always includes upgradeUrl in the error | 1000 | 1000 | `error.upgradeUrl` is truthy |

---

## `checkFeatureAccess(feature, limits)`

Checks whether the user can access a specific feature flag.

**Features tested:** `csvImportExport`, `floorPlans`, `budgetTracking`, `taskTemplates`, `vendorManagement`

| # | Test | Feature | Plan | Expected |
|---|------|---------|------|----------|
| 7 | returns ok when csvImportExport is enabled | `csvImportExport` | agency | `{ ok: true }` |
| 8 | returns ok when floorPlans is enabled | `floorPlans` | agency | `{ ok: true }` |
| 9 | returns ok when budgetTracking is enabled | `budgetTracking` | agency | `{ ok: true }` |
| 10 | returns ok when taskTemplates is enabled | `taskTemplates` | agency | `{ ok: true }` |
| 11 | returns ok when vendorManagement is enabled | `vendorManagement` | agency | `{ ok: true }` |
| 12 | returns error when csvImportExport is disabled on free plan | `csvImportExport` | free | `{ ok: false, code: 'FEATURE_NOT_AVAILABLE' }`, message contains "CSV import/export" |
| 13 | returns error when floorPlans is disabled | `floorPlans` | free | message contains "floor plans" |
| 14 | returns error when budgetTracking is disabled | `budgetTracking` | free | message contains "budget tracking" |
| 15 | returns error when taskTemplates is disabled | `taskTemplates` | free | message contains "task templates" |
| 16 | returns error when vendorManagement is disabled | `vendorManagement` | free | message contains "vendor management" |
| 17 | always includes upgradeUrl in the error | `floorPlans` | free | `error.upgradeUrl` is truthy |

---

## `getEffectivePlan(plan, status)`

Returns the effective plan — downgrades to `'free'` for inactive paid subscriptions. Enterprise is never downgraded.

| # | Test | `plan` | `status` | Expected |
|---|------|--------|---------|----------|
| 18 | enterprise is never downgraded — canceled | `'enterprise'` | `'canceled'` | `'enterprise'` |
| 19 | enterprise is never downgraded — past_due | `'enterprise'` | `'past_due'` | `'enterprise'` |
| 20 | enterprise is never downgraded — incomplete | `'enterprise'` | `'incomplete'` | `'enterprise'` |
| 21 | enterprise is never downgraded — active | `'enterprise'` | `'active'` | `'enterprise'` |
| 22 | returns the plan when subscription is active | `'personal'/'planner'/'agency'` | `'active'` | same plan |
| 23 | returns the plan when subscription is trialing | `'personal'/'planner'` | `'trialing'` | same plan |
| 24 | downgrades to free when subscription is canceled | `'personal'/'planner'/'agency'` | `'canceled'` | `'free'` |
| 25 | downgrades to free when subscription is past_due | `'personal'/'agency'` | `'past_due'` | `'free'` |
| 26 | downgrades to free when subscription is incomplete | `'personal'` | `'incomplete'` | `'free'` |
| 27 | free plan with free status stays free | `'free'` | `'free'` | `'free'` |
