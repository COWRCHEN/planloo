# Test Cases Overview

Unit tests covering all pure/utility functions across the backend and frontend.
All 132 tests pass as of initial creation.

## Test Files

| File | Location | Tests | Functions Covered |
|------|----------|-------|-------------------|
| [plan-limits](./backend-plan-limits.md) | `backend/src/lib/plan-limits.test.ts` | 20 | `getPlanLimits`, `isSubscriptionActive`, `getUpgradeTier`, `resolveEnterpriseLimits` |
| [billing-checks](./backend-billing-checks.md) | `backend/src/lib/billing-checks.test.ts` | 28 | `checkEmailQuota`, `checkFeatureAccess`, `getEffectivePlan` |
| [csv](./backend-csv.md) | `backend/src/lib/csv.test.ts` | 30 | `parseGuestsCsv`, `generateGuestsCsv` |
| [page-password](./backend-page-password.md) | `backend/src/lib/page-password.test.ts` | 12 | `hashPagePassword`, `verifyPagePassword` |
| [utils](./frontend-utils.md) | `frontend/src/lib/utils.test.ts` | 11 | `cn()` |
| [api-error](./frontend-api-error.md) | `frontend/src/lib/api-error.test.ts` | 14 | `PlanLimitError`, `handleApiResponse` |
| [ics](./frontend-ics.md) | `frontend/src/lib/ics.test.ts` | 18 | `generateICSContent` |

**Total: 133 tests across 7 test files**

## Running Tests

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

## What Is NOT Covered (by design)

DB-dependent functions require a live Cloudflare D1 binding and are not unit-testable in isolation:

- `checkEventCreationLimit` — queries `events` table
- `checkGuestLimit` — joins `guests` + `events` tables
- `checkCollaboratorLimit` — queries `eventCollaborators` table
- `checkOrganizationLimit` — queries `organizationMember` table
- `checkOrgMemberLimit` — queries `organizationMember` table
- `incrementEmailCount` — updates `subscriptions` table
- `resolveEventAccess` — multi-step DB resolution

These are covered indirectly by integration/E2E tests against the actual Worker runtime.
