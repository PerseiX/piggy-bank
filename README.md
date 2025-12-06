![Version](https://img.shields.io/badge/version-0.0.1-blue)
![Node](https://img.shields.io/badge/node-22.14.0-339933?logo=node.js&logoColor=white)
![Astro](https://img.shields.io/badge/Astro-5-FF5D01?logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Platform-3ECF8E?logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/License-TBD-lightgrey)

## Project name

Piggy Bank

## Table of Contents

- [Project description](#project-description)
- [Tech stack](#tech-stack)
- [Getting started locally](#getting-started-locally)
- [Available scripts](#available-scripts)
- [Testing](#testing)
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

## Project description

Piggy Bank is a goal‑oriented savings tracker that helps users build and sustain long‑term savings habits. Users create manual, virtual wallets and add simple instruments (Bonds, ETF, Stocks). Each wallet shows two circle graphs: progress toward a target and performance relative to invested capital. All monetary amounts are stored safely as integer grosze (PLN minor units) to avoid floating‑point errors. Authentication and data storage are powered by Supabase.

- PRD: [./.ai/prd.md](./.ai/prd.md)
- Tech Stack: [./.ai/tech-stack.md](./.ai/tech-stack.md)

## Tech stack

- Backend
  - Supabase (authentication, database)
  - Astro API Routes (server logic in Astro)
- Frontend
  - Astro 5
  - TypeScript 5
  - React 19
  - Tailwind CSS 4
  - Shadcn/ui (Radix-based UI components)
- Database
  - Supabase (PostgreSQL)
- Testing
  - Vitest (unit & integration tests)
  - React Testing Library (component tests)
  - Playwright (E2E tests)
  - Codecov (coverage)
- CI/CD
  - GitHub Actions

## Getting started locally

### Prerequisites

- Node 22.14.0 (see `.nvmrc`); using [nvm](https://github.com/nvm-sh/nvm) is recommended
- An existing Supabase project (URL + anon key)

### Setup

```bash
# 1) Clone
git clone <your-repo-url> piggy-bank
cd piggy-bank

# 2) Use the required Node version
nvm install 22.14.0
nvm use 22.14.0

# 3) Install dependencies
npm install
```

### Environment variables

Create a `.env.local` file in the project root and provide your Supabase credentials.

```env
# Public (safe to expose to the browser)
PUBLIC_SUPABASE_URL="https://<your-project>.supabase.co"
PUBLIC_SUPABASE_KEY="<your-anon-key>"

# Server-only (for background jobs, database admin operations)
SUPABASE_URL="https://<your-project>.supabase.co"
SUPABASE_KEY="<your-service-role-key-or-anon-key>"
```

### Run the app

```bash
# Start dev server (default http://localhost:4321)
npm run dev

# Build for production
npm run build

# Preview the production build locally
npm run preview
```

## Available scripts

- **dev**: Start Astro dev server
- **build**: Build the site for production
- **preview**: Preview the production build
- **astro**: Run Astro CLI directly
- **lint**: Run ESLint
- **lint:fix**: Run ESLint with auto-fix
- **format**: Run Prettier on the repository
- **test**: Run unit and component tests with Vitest
- **test:watch**: Run tests in watch mode
- **test:coverage**: Run tests with coverage report
- **test:e2e**: Run end-to-end tests with Playwright
- **test:e2e:ui**: Run E2E tests with Playwright UI
- **test:a11y**: Run accessibility tests with Axe

```bash
npm run dev
npm run build
npm run preview
npm run astro -- <args>
npm run lint
npm run lint:fix
npm run format
npm run test
npm run test:watch
npm run test:coverage
npm run test:e2e
npm run test:e2e:ui
npm run test:a11y
```

## Testing

The project includes comprehensive test coverage across multiple layers:

### Unit & Integration Tests (Vitest)

- Formatters and utilities (`src/lib/formatters/`, `src/lib/utils.ts`)
- Validation schemas (`src/lib/schemas/`, `src/lib/validation/`)
- Service-level logic (`src/lib/services/`)
- API helpers (`src/lib/api/`)
- Coverage target: ≥85% lines, ≥80% branches for `src/lib/**`

### Component Tests (React Testing Library)

- UI components and view containers (`src/components/**`)
- Tests for loading, empty, error, and success states
- User interaction flows and accessibility

### E2E Tests (Playwright)

- Complete user journeys across SSR/CSR pages
- Authentication flows (login, signup, logout, password reset)
- Wallet and instrument CRUD operations
- Data visualization and history views
- Runs on Chromium, Firefox, and WebKit

### Accessibility Tests (Axe-core)

- Automated WCAG A/AA compliance checks
- Coverage of key pages, dialogs, and forms
- No critical violations allowed in CI

### Performance Tests (Lighthouse CI)

- Dashboard, wallet detail, and instrument detail pages
- Target: Performance score ≥80 on desktop
- Monitored in CI for regressions

### Database Tests (Supabase CLI)

- Migration application and rollback
- Soft-delete cascade behavior
- Constraint and uniqueness validation

### Test Environment

- Node 22.14.0 (see `.nvmrc`)
- Local Supabase instance via Supabase CLI
- Test database reset between suites
- Seed fixtures for wallets, instruments, and users

See the complete test plan at [./.ai/qa/test-plan.md](./.ai/qa/test-plan.md) for detailed scenarios and acceptance criteria.

## Project scope

- **In Scope (MVP)**
  - Email/password auth via Supabase
  - Wallet and instrument CRUD with soft-delete
  - Dashboard with two circle graphs per wallet
  - Basic validation, PLN‑only currency, store amounts as grosze
  - Instrument types locked to Bonds, ETF, Stocks

- **Out of Scope (MVP)**
  - Automatic market price updates
  - Multi‑currency support
  - Complex transaction history
  - Reminders/notifications, scheduled transfers
  - Advanced RLS beyond defaults
  - Export/import flows (future)
  - Audit history/change log

- **Assumptions**
  - Users manually update instrument `currentValue`
  - Inputs are PLN with two decimals; stored as integer grosze
  - Soft‑deleted items may be restorable in a future UX

- **Calculations**
  - Progress (Graph A): `sum(currentValue) / wallet target`; when target == 0 → 0%
  - Performance (Graph B): `(sum(currentValue) − sum(investedMoney)) / sum(investedMoney)`; when investedSum == 0 → 0% or placeholder per UI policy

## Project status

MVP in progress. Current version: `0.0.1`.

See the PRD for user stories, acceptance criteria, and success metrics: [./.ai/prd.md](./.ai/prd.md)

## License

TBD. No license file has been specified yet. To make the project open-source, add a `LICENSE` file (e.g., MIT) and update the badge above.
