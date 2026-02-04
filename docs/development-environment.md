# Development Environment Configuration

This document covers the development tooling setup for the Planloo project, including linting, formatting, type checking, and testing frameworks.

---

## Overview

| Tool | Backend | Frontend | Purpose |
|------|---------|----------|---------|
| **ESLint** | `.eslintrc.cjs` | `.eslintrc.cjs` | Code linting |
| **Prettier** | `.prettierrc` | `.prettierrc` | Code formatting |
| **TypeScript** | `tsconfig.json` | `tsconfig.json` | Type checking |
| **Vitest** | `vitest.config.ts` | `vitest.config.ts` | Unit testing |
| **Playwright** | N/A | `playwright.config.ts` | E2E testing |

---

## ESLint

ESLint enforces code quality and consistency across the codebase.

### Backend Configuration

**File:** `backend/.eslintrc.cjs`

```javascript
// Key settings
extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended']
parser: '@typescript-eslint/parser'
env: { es2022: true, node: true }
```

**Rules:**
- `@typescript-eslint/no-unused-vars`: Error (ignores `_` prefixed args)
- `@typescript-eslint/no-explicit-any`: Warning
- `no-console`: Off (console allowed in backend)
- `prefer-const`, `no-var`: Enforced

**Ignored:** `dist/`, `.wrangler/`, `node_modules/`, `*.config.*`, `drizzle/`

### Frontend Configuration

**File:** `frontend/.eslintrc.cjs`

```javascript
// Key settings
extends: [
  'eslint:recommended',
  'plugin:@typescript-eslint/recommended',
  'plugin:react/recommended',
  'plugin:react-hooks/recommended',
  'plugin:jsx-a11y/recommended',
  'plugin:astro/recommended'
]
```

**Additional plugins:**
- `react` - React-specific rules
- `react-hooks` - Hooks rules (rules-of-hooks, exhaustive-deps)
- `jsx-a11y` - Accessibility rules
- `astro` - Astro file support

**React 19 settings:**
- `react/react-in-jsx-scope`: Off (not needed in React 19)
- `react/prop-types`: Off (using TypeScript)

**Astro support:**
- Uses `astro-eslint-parser` for `.astro` files
- TypeScript parser for script sections

**Ignored:** `dist/`, `.astro/`, `node_modules/`, `*.config.*`

### Commands

```bash
# Backend
cd backend
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues

# Frontend
cd frontend
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

---

## Prettier

Prettier handles code formatting for consistent style.

### Shared Configuration

Both backend and frontend use the same base settings:

| Setting | Value | Description |
|---------|-------|-------------|
| `semi` | `true` | Semicolons at end of statements |
| `singleQuote` | `true` | Use single quotes |
| `tabWidth` | `2` | 2 spaces for indentation |
| `useTabs` | `false` | Spaces, not tabs |
| `trailingComma` | `es5` | Trailing commas where valid in ES5 |
| `printWidth` | `100` | Line width limit |
| `arrowParens` | `avoid` | Omit parens for single arrow function args |
| `endOfLine` | `lf` | Unix line endings |

### Frontend-Specific Settings

**File:** `frontend/.prettierrc`

Additional plugins for Astro and Tailwind:

```json
{
  "plugins": ["prettier-plugin-astro", "prettier-plugin-tailwindcss"],
  "overrides": [
    {
      "files": "*.astro",
      "options": { "parser": "astro" }
    }
  ]
}
```

**Plugin benefits:**
- `prettier-plugin-astro`: Formats `.astro` files correctly
- `prettier-plugin-tailwindcss`: Sorts Tailwind classes automatically

### Commands

```bash
# Backend
cd backend
npm run format        # Format all files

# Frontend
cd frontend
npm run format        # Format all files
```

---

## TypeScript

Strict TypeScript configuration for type safety.

### Backend Configuration

**File:** `backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

**Path aliases:**
- `@/*` → `./src/*`
- `@/routes/*`, `@/middleware/*`, `@/services/*`, `@/db/*`, `@/lib/*`, `@/types/*`, `@/constants/*`

**Types included:**
- `@cloudflare/workers-types`
- `@types/node`
- `vitest/globals`

### Frontend Configuration

**File:** `frontend/tsconfig.json`

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "target": "ES2022",
    "jsx": "react-jsx",
    "strict": true
  }
}
```

**Path aliases:**
- `@/*` → `./src/*`
- `@/components/*`, `@/layouts/*`, `@/lib/*`, `@/stores/*`, `@/types/*`, `@/styles/*`

**Types included:**
- `astro/client`
- `@types/node`
- `vitest/globals`

### Commands

```bash
# Backend
cd backend
npm run type-check    # tsc --noEmit

# Frontend
cd frontend
npm run type-check    # tsc --noEmit
```

---

## Vitest (Unit Testing)

Vitest provides fast, Vite-native unit testing.

### Backend Configuration

**File:** `backend/vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    globals: true,           // No need to import describe, it, expect
    environment: 'node',     // Node.js environment
    include: ['src/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') }
  }
});
```

**Test file locations:**
- `src/**/*.test.ts` - Co-located with source
- `tests/**/*.test.ts` - Separate test directory

### Frontend Configuration

**File:** `frontend/vitest.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],        // React support
  test: {
    globals: true,
    environment: 'jsdom',    // Browser-like environment
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') }
  }
});
```

**Key differences from backend:**
- Uses `jsdom` environment for DOM testing
- Includes React plugin for component testing
- Setup file for test utilities (e.g., testing-library setup)
- Supports `.tsx` test files

### Writing Tests

```typescript
// Example: backend/src/services/event.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createEvent } from './event';

describe('createEvent', () => {
  it('should create an event with valid data', async () => {
    const result = await createEvent({ title: 'Test Event' });
    expect(result.title).toBe('Test Event');
  });
});
```

```tsx
// Example: frontend/src/components/Button.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Commands

```bash
# Backend
cd backend
npm run test          # Run tests
npm run test:ui       # Run with browser UI

# Frontend
cd frontend
npm run test          # Run tests
npm run test:ui       # Run with browser UI
```

---

## Playwright (E2E Testing)

Playwright handles end-to-end browser testing for the frontend.

### Configuration

**File:** `frontend/playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } }
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI
  }
});
```

### Browser Coverage

| Project | Device | Use Case |
|---------|--------|----------|
| chromium | Desktop Chrome | Primary browser |
| firefox | Desktop Firefox | Cross-browser |
| webkit | Desktop Safari | macOS/iOS |
| Mobile Chrome | Pixel 5 | Android mobile |
| Mobile Safari | iPhone 12 | iOS mobile |

### Writing E2E Tests

```typescript
// Example: frontend/tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can log in', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
  });
});
```

### Commands

```bash
cd frontend

# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run specific browser
npx playwright test --project=chromium

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Generate tests interactively
npx playwright codegen http://localhost:4321
```

### CI Configuration

In CI environments, Playwright:
- Retries failed tests 2 times
- Runs tests serially (1 worker)
- Captures traces on first retry
- Takes screenshots on failure

---

## VS Code Integration

### Recommended Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "astro-build.astro-vscode",
    "bradlc.vscode-tailwindcss",
    "vitest.explorer"
  ]
}
```

### Workspace Settings

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "[astro]": {
    "editor.defaultFormatter": "astro-build.astro-vscode"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## Quick Reference

### All Commands Summary

| Task | Backend | Frontend |
|------|---------|----------|
| **Type Check** | `npm run type-check` | `npm run type-check` |
| **Lint** | `npm run lint` | `npm run lint` |
| **Lint + Fix** | `npm run lint:fix` | `npm run lint:fix` |
| **Format** | `npm run format` | `npm run format` |
| **Unit Tests** | `npm run test` | `npm run test` |
| **Unit Tests UI** | `npm run test:ui` | `npm run test:ui` |
| **E2E Tests** | N/A | `npm run test:e2e` |
| **E2E Tests UI** | N/A | `npm run test:e2e:ui` |

### Pre-commit Checklist

Before committing code, run:

```bash
# Backend
cd backend
npm run type-check && npm run lint && npm run test

# Frontend
cd frontend
npm run type-check && npm run lint && npm run test
```

---

## Troubleshooting

### ESLint not finding config

Ensure you're running commands from the correct directory (`backend/` or `frontend/`), not the project root.

### Prettier conflicts with ESLint

The configurations are designed to work together. If conflicts occur, Prettier rules take precedence for formatting.

### Vitest globals not recognized

Ensure `vitest/globals` is included in `tsconfig.json` types array and `globals: true` is set in `vitest.config.ts`.

### Playwright browsers not installed

Run `npx playwright install` to download browser binaries.

### Path aliases not resolving

Ensure both `tsconfig.json` and `vitest.config.ts` have matching alias configurations.

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Developer | Initial documentation |
