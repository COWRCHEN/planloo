# Test Cases: api-error

**Source:** `frontend/src/lib/api-error.ts`
**Test file:** `frontend/src/lib/api-error.test.ts`
**Total tests:** 14

---

## `PlanLimitError`

A typed `Error` subclass thrown when the backend responds with HTTP 402. Carries billing context (code, limit, current usage, upgrade tier, upgrade URL).

| # | Test | Scenario | Expected |
|---|------|----------|----------|
| 1 | sets `message` from details | `{ message: 'Too many events' }` | `err.message === 'Too many events'` |
| 2 | sets `code` from details | `{ code: 'GUEST_LIMIT_EXCEEDED' }` | `err.code === 'GUEST_LIMIT_EXCEEDED'` |
| 3 | sets `name` to `'PlanLimitError'` | any | `err.name === 'PlanLimitError'` |
| 4 | sets `isPlanLimitError` flag | any | `err.isPlanLimitError === true` |
| 5 | sets optional `limit` and `current` | `{ limit: 3, current: 3 }` | `err.limit === 3`, `err.current === 3` |
| 6 | sets optional `upgradeTo` | `{ upgradeTo: 'planner' }` | `err.upgradeTo === 'planner'` |
| 7 | sets `upgradeUrl` | `{ upgradeUrl: '/dashboard/billing' }` | `err.upgradeUrl === '/dashboard/billing'` |
| 8 | is an instance of `Error` | any | `err instanceof Error === true` |

---

## `handleApiResponse<T>(response)`

Parses an API `Response`. Returns parsed JSON on success, throws `PlanLimitError` on 402, throws generic `Error` on other non-ok responses.

| # | Test | HTTP status | Response body | Expected |
|---|------|-------------|---------------|----------|
| 9 | returns data for successful response | 200 | `{ success: true, data: { id: 1 } }` | returns `{ success: true, data: { id: 1 } }` |
| 10 | throws `PlanLimitError` for 402 | 402 | `{ error: { code, message, ... } }` | throws `PlanLimitError` |
| 11 | `PlanLimitError` properties set correctly | 402 | `{ error: { code: 'GUEST_LIMIT_EXCEEDED', limit: 50, current: 50, upgradeTo: 'personal' } }` | `err.code`, `err.limit`, `err.current`, `err.upgradeTo` match |
| 12 | uses fallback code `'PLAN_LIMIT'` when `error.code` missing | 402 | `{ error: {} }` | `err.code === 'PLAN_LIMIT'` |
| 13 | throws generic `Error` for non-402 errors | 400 | `{ error: { message: 'Bad request' } }` | throws `Error('Bad request')`, not `PlanLimitError` |
| 14 | throws `Error('Request failed')` when `error.message` missing | 500 | `{}` | throws `Error('Request failed')` |
