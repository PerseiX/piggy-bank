# Testing Guide

This project uses **Vitest** for unit/integration tests and **Playwright** for end-to-end (e2e) tests.

## Table of Contents

- [Setup](#setup)
- [Running Tests](#running-tests)
  - [Unit Tests (Vitest)](#unit-tests-vitest)
  - [E2E Tests (Playwright)](#e2e-tests-playwright)
- [Project Structure](#project-structure)
- [Writing Tests](#writing-tests)
  - [Unit Tests](#writing-unit-tests)
  - [E2E Tests](#writing-e2e-tests)
- [Coverage](#coverage)
- [CI/CD Integration](#cicd-integration)

## Setup

### Prerequisites

Make sure you have Node.js installed (version 18 or higher recommended).

### Installation

1. Install all dependencies:

```bash
npm install
```

2. Install Playwright browsers (Chromium):

```bash
npm run playwright:install
```

## Running Tests

### Unit Tests (Vitest)

#### Run all unit tests once

```bash
npm run test:unit
```

#### Run tests in watch mode (during development)

```bash
npm run test:watch
```

#### Run tests with UI mode

```bash
npm run test:ui
```

This opens a web interface where you can see all tests, filter them, and inspect results.

#### Run tests with coverage

```bash
npm run test:coverage
```

Coverage report will be generated in the `coverage/` directory.

### E2E Tests (Playwright)

#### Run all e2e tests (headless)

```bash
npm run test:e2e
```

#### Run tests with UI mode

```bash
npm run test:e2e:ui
```

#### Run tests in headed mode (see the browser)

```bash
npm run test:e2e:headed
```

#### Debug tests

```bash
npm run test:e2e:debug
```

#### View test report

```bash
npm run test:e2e:report
```

#### Generate tests using Codegen

```bash
npm run test:e2e:codegen
```

This opens a browser where you can interact with your app, and Playwright will generate test code for you.

## Project Structure

```
tests/
├── README.md                    # This file
├── setup.ts                     # Vitest setup file
├── unit/                        # Unit tests
│   ├── components/              # Component tests
│   │   └── ui/
│   │       └── button.test.tsx
│   └── lib/                     # Utility/service tests
│       ├── utils.test.ts
│       └── formatters/
│           └── currency.test.ts
└── e2e/                         # E2E tests
    ├── pages/                   # Page Object Models
    │   ├── BasePage.ts
    │   ├── LoginPage.ts
    │   └── DashboardPage.ts
    ├── fixtures/                # Test fixtures/data
    ├── auth/                    # Auth flow tests
    │   └── login.spec.ts
    └── dashboard/               # Dashboard tests
        └── wallets.spec.ts
```

## Writing Tests

### Writing Unit Tests

Unit tests are located in `tests/unit/` and mirror the structure of `src/`.

#### Example: Testing a utility function

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/utils';

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

#### Example: Testing a React component

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    
    await user.click(screen.getByRole('button'));
    
    expect(screen.getByText('Clicked!')).toBeInTheDocument();
  });
});
```

#### Mocking

```typescript
import { vi } from 'vitest';

// Mock a function
const mockFn = vi.fn();

// Mock a module
vi.mock('@/lib/api', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: 'mocked' })),
}));

// Spy on existing function
const spy = vi.spyOn(console, 'log');
```

### Writing E2E Tests

E2E tests use the **Page Object Model** pattern for maintainability.

#### Step 1: Create a Page Object

```typescript
// tests/e2e/pages/MyPage.ts
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class MyPage extends BasePage {
  readonly myButton: Locator;

  constructor(page: Page) {
    super(page);
    this.myButton = page.getByRole('button', { name: /click me/i });
  }

  async navigate() {
    await this.goto('/my-page');
  }

  async clickMyButton() {
    await this.myButton.click();
  }
}
```

#### Step 2: Write tests using the Page Object

```typescript
// tests/e2e/my-feature/my-test.spec.ts
import { test, expect } from '@playwright/test';
import { MyPage } from '../pages/MyPage';

test.describe('My Feature', () => {
  let myPage: MyPage;

  test.beforeEach(async ({ page }) => {
    myPage = new MyPage(page);
    await myPage.navigate();
  });

  test('should perform action', async () => {
    await myPage.clickMyButton();
    expect(await myPage.isVisible(myPage.myButton)).toBe(true);
  });
});
```

#### Best Practices for E2E Tests

1. **Use resilient selectors**: Prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors
2. **Implement Page Object Model**: Keep locators and actions in page objects
3. **Use test hooks**: `beforeEach`, `afterEach` for setup and cleanup
4. **Use browser contexts**: Isolate tests from each other
5. **Take screenshots on failure**: Already configured automatically
6. **Use trace viewer**: Run `npm run test:e2e:report` to debug failures

## Coverage

### View coverage report

After running `npm run test:coverage`, open `coverage/index.html` in your browser.

### Coverage thresholds

Current thresholds are set in `vitest.config.ts`:

- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

Adjust these as needed for your project.

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:coverage
      
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      
      - name: Run e2e tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Troubleshooting

### Vitest

- **Tests not found**: Make sure test files match the pattern `*.{test,spec}.{ts,tsx}` in `tests/unit/`
- **Import errors**: Check your path aliases in `vitest.config.ts` and `tsconfig.json`
- **DOM not available**: Verify `environment: 'jsdom'` is set in `vitest.config.ts`

### Playwright

- **Browser not installed**: Run `npm run playwright:install`
- **Tests timing out**: Increase timeout in `playwright.config.ts` or specific tests
- **Flaky tests**: Use `test.retry()` or better waits (`waitFor`, `waitForLoadState`)
- **Can't see what's happening**: Use headed mode (`npm run test:e2e:headed`) or debug mode

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)

