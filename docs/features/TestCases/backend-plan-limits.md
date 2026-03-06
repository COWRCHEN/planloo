# Test Cases: plan-limits

**Source:** `backend/src/lib/plan-limits.ts`
**Test file:** `backend/src/lib/plan-limits.test.ts`
**Total tests:** 20

---

## `getPlanLimits(plan)`

Returns the hardcoded `PlanLimits` object for a given `PlanId`.

| # | Test | Input | Expected |
|---|------|-------|----------|
| 1 | returns correct limits for free plan | `'free'` | equals `PLAN_LIMITS.free` |
| 2 | returns correct limits for personal plan | `'personal'` | equals `PLAN_LIMITS.personal` |
| 3 | returns correct limits for planner plan | `'planner'` | equals `PLAN_LIMITS.planner` |
| 4 | returns correct limits for agency plan | `'agency'` | equals `PLAN_LIMITS.agency` |
| 5 | returns correct limits for enterprise plan | `'enterprise'` | equals `PLAN_LIMITS.enterprise` |

---

## `isSubscriptionActive(status, plan)`

Returns `true` if the subscription should be treated as active (access granted).

| # | Test | Input | Expected |
|---|------|-------|----------|
| 6 | free plan is always active regardless of status | `('active'/'canceled'/'past_due'/'free', 'free')` | `true` |
| 7 | paid plan with active status is active | `('active', 'personal'/'planner'/'agency'/'enterprise')` | `true` |
| 8 | paid plan with trialing status is active | `('trialing', 'personal'/'planner')` | `true` |
| 9 | paid plan with past_due status is not active | `('past_due', 'personal'/'planner')` | `false` |
| 10 | paid plan with canceled status is not active | `('canceled', 'personal'/'agency')` | `false` |
| 11 | paid plan with incomplete status is not active | `('incomplete', 'personal')` | `false` |

---

## `getUpgradeTier(plan)`

Returns the next suggested upgrade tier for a given plan.

| # | Test | Input | Expected |
|---|------|-------|----------|
| 12 | free upgrades to personal | `'free'` | `'personal'` |
| 13 | personal upgrades to planner | `'personal'` | `'planner'` |
| 14 | planner upgrades to agency | `'planner'` | `'agency'` |
| 15 | agency upgrades to enterprise | `'agency'` | `'enterprise'` |
| 16 | enterprise has no upgrade tier | `'enterprise'` | `null` |

---

## `resolveEnterpriseLimits(customLimits)`

Merges enterprise defaults with DB-stored custom overrides. Derives email/SMS pools from guest cap when not explicitly set.

| # | Test | Input | Expected |
|---|------|-------|----------|
| 17 | returns enterprise defaults when customLimits is null | `null` | equals `PLAN_LIMITS.enterprise` |
| 18 | applies partial custom overrides on top of enterprise defaults | `{ maxGuests: 500 }` | `maxGuests=500`, other fields = enterprise defaults |
| 19 | derives email pool from maxGuests when emailPoolPerMonth is null | `{ maxGuests: 1000 }` | `emailPoolPerMonth = ceil(1000 × EMAIL_PER_GUEST)` |
| 20 | derives sms pool from maxGuests when smsPoolPerMonth is null | `{ maxGuests: 1000 }` | `smsPoolPerMonth = ceil(1000 × SMS_PER_GUEST)` |
| 21 | does not override explicitly set emailPoolPerMonth | `{ maxGuests: 1000, emailPoolPerMonth: 5000 }` | `emailPoolPerMonth=5000` |
| 22 | does not override explicitly set smsPoolPerMonth | `{ maxGuests: 1000, smsPoolPerMonth: 200 }` | `smsPoolPerMonth=200` |
| 23 | leaves pools null when maxGuests is null (truly unlimited) | `{ maxGuests: null }` | `emailPoolPerMonth=null`, `smsPoolPerMonth=null` |
| 24 | rounds up fractional pool values | `{ maxGuests: 3 }` | `emailPoolPerMonth=30`, `smsPoolPerMonth=3` |
| 25 | can disable a feature flag via custom limits | `{ sso: false }` | `sso=false` |
