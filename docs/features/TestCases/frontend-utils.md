# Test Cases: utils

**Source:** `frontend/src/lib/utils.ts`
**Test file:** `frontend/src/lib/utils.test.ts`
**Total tests:** 11

---

## `cn(...inputs)`

Merges Tailwind CSS class strings using `clsx` (conditional logic) and `tailwind-merge` (conflict resolution). Conflicting Tailwind utilities are resolved with last-write-wins semantics.

| # | Test | Input | Expected |
|---|------|-------|----------|
| 1 | single class unchanged | `cn('text-red-500')` | `'text-red-500'` |
| 2 | multiple classes joined | `cn('text-red-500', 'font-bold')` | `'text-red-500 font-bold'` |
| 3 | falsy values ignored | `cn('text-red-500', false, null, undefined, '')` | `'text-red-500'` |
| 4 | conditional class via boolean | `cn('base', true && 'active', false && 'disabled')` | `'base active'` |
| 5 | conflicting padding classes — last wins | `cn('p-2', 'p-4')` | `'p-4'` |
| 6 | conflicting text color — last wins | `cn('text-red-500', 'text-blue-500')` | `'text-blue-500'` |
| 7 | no arguments returns empty string | `cn()` | `''` |
| 8 | array-style clsx input | `cn(['text-sm', 'font-medium'])` | `'text-sm font-medium'` |
| 9 | object-style clsx input | `cn({ 'text-red-500': true, 'text-blue-500': false })` | `'text-red-500'` |
| 10 | non-conflicting utilities preserved | `cn('flex', 'items-center', 'text-sm', 'text-lg')` | contains `flex`, `items-center`, `text-lg`; does not contain `text-sm` |
| 11 | (covered by 10) conflicting text size resolved | — | `text-lg` wins over `text-sm` |
