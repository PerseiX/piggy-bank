# Product Requirements Document (PRD) - Financial Wallets
## 1. Product Overview
The Financial Wallets application helps users build and track long-term savings toward financial freedom by creating manual, goal-oriented virtual wallets. Each wallet aggregates predefined financial instruments (Bonds, ETF, Stocks) whose monetary values are entered manually by users. The application emphasizes clear visual feedback through a dashboard and two circle graphs per wallet to promote daily verification and sustained motivation.

Key principles:
- Manual-entry, goal-oriented wallets focused on long-term savings behavior.
- Simple instrument model limited to three predefined types for MVP: Bonds, ETF, Stocks.
- Monetary values are stored in integer grosze (PLN minor units) to avoid floating-point rounding issues.

## 2. User Problem
Many people struggle to maintain consistent, long-term savings habits because they lack clear, approachable tools that:

- Aggregate diverse savings goals into focused wallets.
- Give immediate visual feedback on progress toward concrete targets.
- Keep tracking low-effort (manual updates) while avoiding complex financial data entry or real-time market integrations.

Problems to solve:
- Users need a way to set and monitor target-driven savings without complex investment tooling.
- Users need clear, motivating visuals that show both progress toward a goal and overall performance vs invested capital.
- Users require reliable numeric handling (no rounding errors) and straightforward validation to avoid confusing calculations.

## 3. Functional Requirements
1. Account and Authentication
   - Email/password sign-up and sign-in using Supabase auth.
   - Session management and secure access to a user's wallets and instruments.
2. Wallet Management
   - Create, read, update, soft-delete wallets.
   - Each wallet has: id, name, optional description, soft-delete flag, createdAt, updatedAt, ownerId.
   - Wallet aggregates: target (sum of instrument goals), currentValue (sum of instrument currentValues), investedSum (sum of instrument investedMoney).
3. Instrument Management
   - Add, edit, view, soft-delete instruments within a wallet.
   - Instrument model (MVP): id, walletId, type (enum: Bonds | ETF | Stocks), name, shortDescription, investedMoney (required, grosze), currentValue (required, grosze), createdAt, updatedAt, soft-delete flag.
   - Validation: investedMoney >= 0, currentValue >= 0, name non-empty, type restricted to the three allowed values.
4. Aggregation and Calculations
   - Wallet goal = sum(instrument goals) — in MVP instruments may include an implicit goal field or the wallet target is provided independently; by default wallet target is sum of instruments' goals when goals are specified. (MVP decision: wallet goal = sum(instrument goals)).
   - Progress (Graph A) = sum(currentValue) / wallet target (handle division-by-zero as 0% when target is 0).
   - Performance (Graph B) = (sum(currentValue) - sum(investedMoney)) / sum(investedMoney) displayed as percentage; when investedSum is 0 show 0% or "—" per UI policy.
5. Dashboard and Visuals
   - Dashboard lists wallets with two circle graphs each:
     - Graph A: progress toward wallet target (0–100% with overflow indicated if >100%).
     - Graph B: performance vs invested (percent change, positive/negative coloring).
   - Wallet detail view shows instrument list, aggregated numbers, and ability to add/edit instruments.
6. Persistence and Data Model
   - Use Supabase for storage and auth; store monetary values in integer grosze.
   - Soft-delete implementation: mark records as deleted but retain in DB; provide constraints and visibility rules in API.
7. UX and Validation
   - Input validation client- and server-side for numeric fields and required fields.
   - Clear empty-state and onboarding flow prompting wallet creation for new users.
8. Security and Privacy
   - Use Supabase default security and authentication; require authenticated access for wallet and instrument operations.
   - No RLS in MVP beyond Supabase defaults unless later specified.
9. Non-functional
   - PLN-only formatting, two-decimal display.
   - Online-only (no offline edits), responsive UI, accessible colors and labels for graphs.

## 4. Product Boundaries
- In Scope (MVP):
  - Email/password auth via Supabase, wallet & instrument CRUD with soft-delete, dashboard with two circle graphs per wallet, basic validation, PLN-only currency, store amounts as grosze.
  - Lock instrument types to Bonds, ETF, Stocks.
  - No real-time market data, no per-entry historical ledger, no reminders/notifications, no offline mode, no advanced privacy controls beyond Supabase defaults.

- Out of Scope (MVP):
  - Automatic price updates from markets, multi-currency support, complex transaction history, reminders/notifications, scheduled transfers, RLS policies beyond defaults, export/import flows (optional future feature), change history/audit log.

- Assumptions:
  - Users will manually update currentValue for instruments.
  - All monetary inputs are PLN-only and provided with two-decimal precision (stored in grosze).
  - Soft-deleted items can be restored through a future admin/archive UX (not required in MVP unless specified).

## 5. User Stories
- US-001
  - Title: Sign up with email and password
  - Description: A new user can create an account using their email and a password to access persistent wallets across devices.
  - Acceptance Criteria:
    - User can submit email and password and receive an account created response.
    - Password must meet minimum complexity (at least 8 characters).
    - Created account is persisted and can sign in immediately (email verification optional per MVP setting).
    - Error shown for duplicate email or invalid input.

- US-002
  - Title: Sign in with email and password
  - Description: An existing user can sign in to access their wallets and instruments.
  - Acceptance Criteria:
    - User can authenticate with correct credentials and receive a valid session.
    - Invalid credentials show an appropriate error message.
    - After sign-in, user is redirected to the dashboard listing wallets.

- US-003
  - Title: Sign out
  - Description: An authenticated user can sign out and invalidate their session.
  - Acceptance Criteria:
    - User can sign out and subsequent requests require re-authentication.

- US-004
  - Title: Create a wallet
  - Description: An authenticated user can create a new wallet with a name and optional description.
  - Acceptance Criteria:
    - Wallet create form accepts name (required) and description (optional).
    - On successful creation, the wallet appears on the dashboard with zero instruments and graphs showing empty/zero state.
    - Invalid input shows inline validation errors.

- US-005
  - Title: View dashboard with wallets list
  - Description: Authenticated users can see a list of their wallets, each showing two circle graphs (progress and performance) and key aggregates.
  - Acceptance Criteria:
    - Dashboard lists all non-soft-deleted wallets owned by the user.
    - Each wallet card shows wallet name, currentValue, target, Graph A (progress), Graph B (performance) and last updated timestamp.
    - Graph calculations match aggregation rules and display correct percentages.

- US-006
  - Title: Add an instrument to a wallet
  - Description: A user can add an instrument (type, name, short description, investedMoney, currentValue, goal) to a wallet.
  - Acceptance Criteria:
    - Instrument form enforces required fields and numeric validation.
    - investedMoney and currentValue are accepted as decimal PLN values and saved as integer grosze.
    - On success, instrument appears in the wallet detail and wallet aggregates update accordingly.

- US-007
  - Title: Edit an instrument
  - Description: A user can edit instrument fields and save updates.
  - Acceptance Criteria:
    - User can update name, description, investedMoney, currentValue, type (type limited to allowed enum).
    - Server validates inputs before saving; updated aggregates reflect changes.

- US-008
  - Title: Soft-delete an instrument
  - Description: A user can remove an instrument from active tracking without permanent deletion.
  - Acceptance Criteria:
    - Delete action prompts confirmation.
    - Soft-deleted instruments are excluded from aggregates and UI lists.
    - Soft-delete flag is persisted in the DB.

- US-009
  - Title: Restore a soft-deleted instrument (optional/edge)
  - Description: A user can restore a recently soft-deleted instrument.
  - Acceptance Criteria:
    - Restore is available where applicable (admin/archive view) and returns the instrument to active lists and aggregates.
    - REST API supports updating soft-delete flag.

- US-010
  - Title: Create wallet goal from instruments (aggregation)
  - Description: Wallet goal equals the sum of instrument goals (if instruments include goal fields) or an explicit wallet target; wallet aggregates must reflect sums.
  - Acceptance Criteria:
    - Wallet aggregate calculations use current instrument values and invested amounts according to formulas.
    - Division-by-zero handled gracefully (show 0% progress or an empty indicator).

- US-011
  - Title: View wallet detail and instrument list
  - Description: User can open a wallet to see detailed instrument breakdown, edit instruments, and see graph visualizations for that wallet.
  - Acceptance Criteria:
    - Wallet detail shows instrument list with investedMoney and currentValue displayed as PLN decimals.
    - Aggregates (sum currentValue, sum investedMoney, progress, performance) display and match backend calculations.

- US-012
  - Title: Update instrument currentValue periodically
  - Description: Users can update currentValue for instruments over time to reflect portfolio changes.
  - Acceptance Criteria:
    - User can update currentValue; wallet aggregates and graphs update immediately.
    - Input validation prevents negative values.

- US-013
  - Title: Handle zero investedMoney edge cases
  - Description: When investedMoney sum is zero, performance should be presented safely without causing calculation errors.
  - Acceptance Criteria:
    - If investedSum == 0, Graph B displays 0% or an empty/placeholder indicator instead of NaN or Infinity.
    - No runtime errors occur when computing performance with investedSum == 0.

- US-014
  - Title: See current value investment history
  - Description: We can see investemnt current value changes like current value changed on plus 10zł and in some cases for example 100zł on minus
  - Accestance Criteria:
    - Investemnt details show all operations related to current value calculated as + or -

- US-015
  - Title: Validation and client/server error handling
  - Description: All forms validate inputs client- and server-side and surface clear error messages.
  - Acceptance Criteria:
    - Forms show inline validation for required fields and numeric constraints.
    - Server returns descriptive errors for invalid inputs and these are surfaced in the UI.

- US-016
  - Title: Authorization enforcement for wallet access
  - Description: Users cannot access or modify wallets belonging to other users.
  - Acceptance Criteria:
    - API returns 401/403 for unauthorized requests.
    - UI hides wallets not belonging to the logged-in user.

- US-017
  - Title: Soft-delete a wallet
  - Description: A user can soft-delete a wallet with confirmation; soft-deleted wallets are hidden from the main dashboard.
  - Acceptance Criteria:
    - Soft-delete requires explicit confirmation.
    - Soft-deleted wallets are excluded from dashboard and aggregates.

- US-018
  - Title: Data persistence in grosze and PLN display
  - Description: Monetary amounts are stored as integer grosze and displayed as PLN with two decimals.
  - Acceptance Criteria:
    - Inputs accept decimal PLN and server stores integer grosze.
    - UI displays stored grosze converted back to PLN with two decimal places.

- US-019
  - Title: Accessibility for graphs and color usage
  - Description: Graphs should be accessible (labels, ARIA, color contrast, non-color indicators for positive/negative performance).
  - Acceptance Criteria:
    - Graphs include accessible text alternatives and ARIA attributes.
    - Color choices meet contrast guidelines and alternative indicators (icons/text) clarify performance signs.

## 6. Success Metrics
- Functional correctness
  - Wallet aggregates accurately reflect instrument sums (target, currentValue, investedMoney) with 0 critical aggregation bugs in the first 1000 wallets.
- Adoption
  - Conversion: % of signed-up users who create first wallet within 7 days (target: >= 60% for MVP onboarding).
- Engagement
  - Daily/Weekly active users who update instrument values at least once per week (target: 20% of active users weekly updates).
- Retention
  - 30-day retention after sign-up (target: 35% for MVP).
- Reliability
  - Error rate for wallet/instrument operations < 1% in production.
- Data integrity
  - No floating-point currency rounding issues (verified by storage in grosze) across the first 10,000 monetary writes.

Notes and open questions:
- Soft-delete retention policy and recovery UX (how long items remain restorable) needs definition.
- Decision on requiring email verification before wallet creation should be clarified.
- Export/import and audit history omitted for MVP but may be required by some users.
- Accessibility color palette and exact graph labels to be finalized in UI design.

End of PRD
