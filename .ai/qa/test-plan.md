### Piggy Bank – Comprehensive Test Plan

### 1) Introduction and Testing Goals
- Ensure the Piggy Bank app (Astro 5, React 19, Tailwind 4, Supabase) functions correctly end-to-end: auth, wallets, instruments, history, SSR/CSR boundaries.
- Validate API contracts, server-side business rules, data integrity, and UI accessibility/performance.
- Prevent regressions via automated test suites across units, integrations, and E2E.

### 2) Scope of Testing
- In scope:
  - Client UI: `src/components/**`, `src/pages/**`, `src/layouts/**`
  - Server/API: `src/pages/api/**`, `src/middleware/index.ts`, `src/lib/**` services, formatters, schemas, errors
  - Data: Supabase schemas/migrations (`supabase/migrations/**`)
  - Auth flows: login, signup, logout, forgot/update password, redirects
- Out of scope:
  - Third-party library internals (Recharts, Radix, Shadcn/ui)
  - Non-functional areas not used by the app (e.g., unused features in Supabase)

### 3) Test Types
- Unit tests (Vitest):
  - Formatters/utilities: `src/lib/formatters/currency.ts`, `src/lib/currency.ts`, `src/lib/utils.ts`
  - Validation schemas: `src/lib/schemas/**`, `src/lib/validation/**`
  - Service-level logic (mock Supabase client): `src/lib/services/**`
  - API helpers: `src/lib/api/**`
- Component tests (React Testing Library):
  - UI components and view containers in `src/components/**` (states: loading, empty, error, success)
- Integration/API tests:
  - API routes under `src/pages/api/**` using real/mocked Supabase and full validation/error mapping
  - Middleware redirect/auth guard behavior for representative routes
- E2E tests (Playwright):
  - Core user journeys across SSR/CSR pages, auth cookies, redirects, modals, and data updates
- Accessibility tests:
  - Axe checks on key pages/components and critical dialogs/forms
- Performance checks:
  - Lighthouse on dashboard, wallet detail, instrument detail/history
- Visual regression (optional but recommended):
  - Playwright snapshot tests for critical pages/states
- Database/migration tests:
  - Migration application, soft-delete cascade behavior, constraints/uniqueness
- Security/negative tests:
  - Authorization boundaries (401/403), input validation failures, SSR cookie security flags

### 4) Test Scenarios for Key Functionalities
- Authentication and Middleware
  - Login:
    - Valid credentials → 200, cookie set, redirect to `/`
    - Invalid credentials → 401 JSON error, inline UI error
    - Client retry/backoff not necessary; UI remains responsive
  - Signup:
    - New email → 200 and redirect to `/`
    - Duplicate email → 409 from `/api/auth/signup`, UI displays error
  - Logout:
    - POST `/api/auth/logout` → 200 and redirect to `/auth/login`; header updates accordingly
  - Forgot Password:
    - POST `/api/auth/forgot-password` returns 200 for any email; UI shows generic success
  - Update Password:
    - With recovery token in hash (`type=recovery`, `access_token` present) → form allows update, success toast, redirect
    - Invalid/expired token → “Invalid or Expired Link” screen; link to request new
  - Middleware redirects:
    - Unauthenticated access to protected routes (e.g., `/`, `/wallets/detail/:id`, `/instruments/:id`) → redirect to `/auth/login`
    - Authenticated access to `/auth/*` → redirect to `/`
- Dashboard (`/`, `DashboardView`)
  - Loading → spinner with accessible labels
  - Empty → `EmptyState` presented with CTA to “Create First Wallet”
  - Error → `ErrorState` with retry
  - Success → list of wallets with correct aggregates; “Add Wallet” link
- Wallets
  - Create Wallet (form page under `src/components/WalletForm.tsx`):
    - Valid input → POST `/api/wallets` 201/200; toast success; redirect to `/`
    - Duplicate name → 409 handled, field-level error on name
    - Validation: name required, description optional length ≤ 500
  - Update Wallet (`WalletFormModal`):
    - Partial updates: name and/or description; correct PATCH behavior; aggregates unaffected
    - No changes → no-op response (service returns original)
    - Forbidden/Not found → error toast; no modal close
  - Soft Delete Wallet:
    - Confirmation dialog; DELETE `/api/wallets/:id` → redirect to `/`
    - Verify soft-deleted wallet becomes invisible; cascade soft-delete for instruments (db behavior)
- Instruments
  - Create Instrument (`InstrumentFormModal`):
    - Valid fields: type ∈ {bonds, etf, stocks}; monetary fields format; optional goal
    - Duplicate name within same wallet → conflict handled with UI error
    - Validation errors from Zod display correctly
  - Update Instrument:
    - Partial updates including name/type/values/goal; duplicate name check is case-insensitive on update; no change → no-op
    - Soft-deleted parent wallet case → rejected (ParentWalletSoftDeleted)
  - Soft Delete Instrument:
    - DELETE `/api/instruments/:id` → success and refreshed wallet data
    - Already soft-deleted → correct error mapping
  - Instrument Details (`/instruments/:id`, `InstrumentDetailsView`):
    - Loading/error states; forbidden/not found; SSR header present
    - Metrics computed: delta value/direction
    - Delete flows; “View History” navigates to `/instruments/:id/history`
  - Instrument History (`/instruments/:id/history`, `InstrumentHistoryView`, `ValueChangeHistory`):
    - Lazy loading in accordion; loading/error/empty
    - `/api/instruments/:id/value-changes` contract: order by `created_at` desc; delta sign/color; chart renders when data exists; no data message
    - Redirect 401 to signin page; consistent with middleware (`/auth/login` via `/signin` fallback)
- Aggregates/Performance/Progress
  - `getWalletsForOwner` and `getWalletDetail`:
    - Aggregates computed correctly for mixed instruments; 0-handling; percent rounding
  - Visualization components:
    - `ProgressCircle`: clamped 0–100%; color transitions at thresholds
    - `PerformanceIndicator`: negative/zero/positive display with correct icon/aria
- Formatters/Validation/Utils
  - Currency:
    - `parsePlnToGrosze` accepts “0”, “0.5”, “10.00”; rejects negatives; enforces two decimals; large boundaries
    - `formatGroszeToPln` and dual converters round to 2 decimals
  - Zod schemas in `src/lib/validation/**`:
    - Create/Update Instrument and Wallet payload transforms (empty string to null/undefined as specified)
    - Sorting enums defaults for instruments listing
- Error Mapping/Contracts
  - Consistent JSON shape in `jsonResponse`/`errorResponse` and content-type headers
  - All API endpoints map domain errors to HTTP status codes (400, 401, 403, 404, 409, 500) with stable codes/messages
  - Correlation ID (if applied later) preserved in responses when present

### 5) Test Environment
- Node: 22.14.0 (`.nvmrc`)
- Browsers: Chromium (Playwright CI), plus WebKit/Firefox (nightly or pre-release gates)
- Supabase:
  - Local Supabase via CLI; apply migrations in `supabase/migrations/**`
  - Test database reset between suites; seed minimal fixtures (test user, 1–2 wallets, 3–5 instruments)
- Environment variables:
  - PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_KEY (browser/server clients)
  - SUPABASE_URL/SUPABASE_KEY (legacy fallback if referenced)
  - Use `.env` with non-production keys
- App server:
  - Unit/integration: run API in-process or `astro preview` on ephemeral port
  - E2E: `astro build && astro preview` with `webServer` in Playwright
- Accessibility:
  - Axe-core runner in Playwright and selected RTL tests
- Performance:
  - Lighthouse CI on built preview server

### 6) Testing Tools
- Unit/Integration:
  - Vitest + tsconfig paths; c8/V8 coverage
  - MSW for network mocking of `/api/**` where needed
  - Supertest or fetch-based integration calls against running preview server
- Component:
  - React Testing Library + @testing-library/user-event
- E2E:
  - Playwright (headed in dev, headless on CI), trace/screenshot/video on failure
- Accessibility:
  - axe-core (jest-axe for RTL, Playwright axe for pages)
- Performance:
  - Lighthouse CI (CLI)
- DB:
  - Supabase CLI; migration verification
- CI:
  - GitHub Actions: matrix for unit+component, API integration (with Supabase service), E2E (Playwright)

### 7) Test Schedule
- Week 1:
  - Unit tests for utils/formatters/validation/services (core happy/edge/failure paths)
  - Component tests for Empty/Loading/Error/Success states of core views
- Week 2:
  - Integration tests for auth APIs, wallets and instruments APIs (including negative paths)
  - Middleware redirect tests
  - DB migration/cascade soft-delete validation
- Week 3:
  - E2E flows: Auth (signup/login/logout/forgot/update), Dashboard, Wallet CRUD, Instrument CRUD, History/chart
  - Accessibility (axe) and basic Lighthouse baseline
- Ongoing:
  - Visual regression on critical pages
  - Flaky test stabilization; coverage tuning

### 8) Test Acceptance Criteria
- Functional:
  - 100% pass on all critical path E2E scenarios
  - API contract tests pass with correct status codes and error bodies
- Quality:
  - Unit coverage ≥ 85% lines, ≥ 80% branches for `src/lib/**`
  - No open Severity 1/2 defects; ≤ 3 minor (Severity 3) with agreed workarounds
- Accessibility:
  - No axe violations of WCAG A/AA on critical pages/dialogs
- Security:
  - Unauthenticated requests to protected endpoints/pages are blocked/redirected
  - Cookies flags set appropriately in SSR (httpOnly, sameSite, secure in prod)

### 9) Roles and Responsibilities
- QA Engineer:
  - Own test plan, scenarios, data, and E2E suite
  - Define/maintain CI test jobs; triage failures
- Developers:
  - Write/maintain unit and component tests with each feature/change
  - Pair on integration tests for new endpoints
- Code Reviewer:
  - Enforce tests accompanying changes; validate coverage targets
- DevOps/Maintainer:
  - Maintain CI pipelines, Supabase services in CI, environment secrets
  - Gate releases on acceptance criteria

### 10) Bug Reporting Procedures
- Tracking: GitHub Issues with labels (bug/area/severity)
- Required fields:
  - Title, severity (S1 critical outage, S2 major path broken, S3 minor defect), environment (commit SHA, browser, OS), steps to reproduce, expected vs actual, screenshots/traces, logs, API response snippets, correlation ID (if present)
- Triage:
  - S1: fix/rollback immediately, hotfix branch; S2: prioritized within sprint; S3: scheduled
- Verification:
  - Link PR to issue; include automated test that reproduces pre-fix failure; QA validates in CI and preview before closing

### 11) Risk-Based Prioritization (applied across suites)
- High priority:
  - Auth/middleware redirects and cookie handling (SSR/CSR boundary)
  - Wallet/Instrument CRUD with validation and unique constraints
  - Soft-delete and cascade effects; data visibility after deletion
  - Monetary parsing/formatting correctness and rounding
  - API status/error mapping and unauthorized/forbidden handling
- Medium priority:
  - History/Chart rendering and empty/error states
  - Sorting defaults and stability
- Lower priority:
  - Non-critical UI cosmetics, secondary navigations

### 12) Test Data and Seeding
- Seed scripts:
  - Create test user; login to capture session cookie for E2E
  - Create 1–2 wallets; add instruments covering all `InstrumentType`s; varied monetary values and goal presence
  - Data reset strategy per run (Supabase `db reset` or schema truncation)
- Edge seeds:
  - Large monetary values near safe integer limits
  - Duplicate names (case variants) to exercise conflict checks

### 13) Continuous Integration Gates
- Jobs:
  - Lint + Typecheck
  - Unit + Component (Vitest) with coverage upload
  - E2E (Playwright) with traces
- Required to merge:
  - All jobs green; coverage thresholds met; no S1/S2 regressions
