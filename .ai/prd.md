# Product Requirements Document (PRD) - Financial Wallets
## 1. Product Overview
The Financial Wallets application helps young people build and track long-term savings toward financial freedom by creating manual, goal-oriented virtual wallets. Each wallet holds predefined financial instruments (Bonds, ETF, Stocks) whose monetary values and growth percentages are manually entered by users. The app focuses on clear visual feedback through a dashboard with two circle graphs per wallet to drive daily verification and motivation.

Key points:
- Target users: young adults seeking structured, motivated long-term saving tools (aiming for financial freedom by age ~45-50).
- Primary value: motivation and clarity via daily progress updates and simple visualizations.
- Currency: PLN only. No taxes or external data integrations in MVP.

## 2. User Problem
Many young people struggle with consistent saving and maintaining motivation toward long-term financial goals. Existing tools either require complex integrations, offer overwhelming choices, or lack daily motivation cues. Users need a lightweight, manual tool that:
- Lets them define a clear monetary goal and target date.
- Lets them represent their current investments in a small set of familiar instrument types.
- Provides immediate visual feedback on progress and gaps toward the goal.
- Accepts manual inputs (values and growth percentages) to reflect reality without automatic external integrations.

## 3. Functional Requirements
FR-001: User Authentication
- Users must register and log in to access their dashboard and wallets.
- Basic email/password authentication is sufficient for MVP.

FR-002: Wallet Management
- Users can create, view, edit, and delete virtual wallets.
- Each wallet has: a name, overall monetary goal (PLN), target date, optional description.
- Each wallet stores the list of financial instruments assigned to it and the proportional goal allocation per instrument.

FR-003: Financial Instruments
- The system provides a predefined list of instrument types: Bonds, ETF, Stocks.
- Users can add multiple instruments (instances of a type) to a wallet.
- For each instrument instance, users manually enter: current monetary value (PLN) and current percentage growth (e.g., 4%).
- Users can edit and delete instrument entries.

FR-004: Dashboard and Visualizations
- After login, users land on a dashboard that lists their wallets and key metrics.
- For each wallet, show two circle (donut/pie) charts:
  - Chart A (Current Distribution): shows current amount in each instrument as a proportion of the wallet's current total.
  - Chart B (Goal Allocation): shows the planned/proportional allocation of the overall wallet goal across instruments (e.g., 10,000 ETF / 3,000 Bonds).
- Display numeric summaries: wallet goal, current total, remaining amount to reach goal, days left until target date.

FR-005: Manual Updates and Calculations
- When a user updates an instrument's value or growth %, the wallet's current total updates immediately using these inputs.
- Growth % is applied to the instrument's monetary value as a simple multiplicative factor: newValue = baseValue * (1 + growthPercent/100).
- All calculations are in PLN and do not consider taxes or fees.

FR-006: Data Validation
- Inputs must be validated: monetary values >= 0, growth percentages can be negative or positive but within a reasonable bound (e.g., -100% < growth < 1000%).
- Dates must be valid future dates for new wallets; past target dates are allowed for retrospective wallets but should warn users.

FR-007: UX and Notifications
- Provide a clear call-to-action to "Update instrument values" from the dashboard.
- Provide in-app messages for important states (goal reached, approaching deadline) but no push/email notifications in MVP.

FR-008: Security and Privacy
- Store passwords securely (hashed and salted) and follow basic security best practices.
- Allow users to delete their account and associated data.

## 4. Product Boundaries
- Excluded from MVP:
  - Any automatic data fetching from external financial APIs or bank integrations.
  - Multiple currencies, exchange rates, or tax calculations.
  - Detailed financial advice or investment suggestions.
  - Short-term or sub-goal tracking within a wallet (only one overall wallet goal).
  - Push notifications, scheduled reminders, or SMS messaging.

- Simplifications:
  - Single currency (PLN) only.
  - Manual user-entered values and growth percentages drive all calculations.

## 5. User Stories
List of all user stories (basic, alternative, and edge cases). Each story is testable and includes acceptance criteria.

US-001
Title: User registration and login
Description: As a user, I want to register with an email and password and log in so I can access my personal dashboard and wallets.
Acceptance Criteria:
- The system allows creating an account with an email and password.
- Passwords are stored securely (hashed).
- The user can log in with valid credentials and is redirected to the dashboard.
- Invalid credentials show an error message.
- Logged-in sessions persist for a reasonable duration (configurable by backend session settings).

US-002
Title: Create a new wallet
Description: As a user, I want to create a virtual wallet with a name, goal amount (PLN), and target date so I can track a specific savings objective.
Acceptance Criteria:
- The user can open a "Create wallet" form from the dashboard.
- The form requires a wallet name, goal amount (> 0), and target date.
- On successful creation, the wallet appears in the dashboard list with goal, target date, and an initial total of 0.
- Attempting to create a wallet with invalid data shows validation errors.

US-003
Title: Add a financial instrument to a wallet
Description: As a user, I want to add an instrument (Bonds/ETF/Stocks) with current monetary value and growth % to my wallet to reflect my holdings.
Acceptance Criteria:
- The user can add an instrument from the wallet view.
- The add form requires instrument type (from predefined list), monetary value (>=0), and growth percentage (float).
- After adding, the instrument is listed under the wallet and included in chart A and the wallet's current total.

US-004
Title: Edit an instrument's monetary value and growth percentage
Description: As a user, I want to update an instrument's value and growth % so the wallet reflects recent gains/losses.
Acceptance Criteria:
- The user can edit any instrument's value or growth %.
- After saving edits, the wallet total and charts update immediately.
- Validation prevents invalid inputs (e.g., negative monetary values). Errors are shown inline.

US-005
Title: Remove an instrument from a wallet
Description: As a user, I want to delete an instrument from a wallet in case it is no longer relevant.
Acceptance Criteria:
- The user can delete an instrument with a confirmation prompt.
- After deletion, the instrument is removed and charts/totals update.

US-006
Title: View wallet dashboard
Description: As a user, I want to see my wallets and quick metrics on the dashboard to check my progress at a glance.
Acceptance Criteria:
- The dashboard lists all user wallets with goal amount, current total, remaining amount, and days to target.
- Each wallet card has links to view/edit the wallet and open the instrument list.

US-007
Title: View circle graphs per wallet
Description: As a user, I want two circle graphs per wallet that show current instrument distribution and goal allocation so I can compare reality vs plan.
Acceptance Criteria:
- Chart A shows the current distribution using current monetary values for each instrument.
- Chart B shows the goal allocation proportions for the wallet across instruments.
- Hover or tap reveals numeric values for segments.
- Charts must reflect updates immediately after instrument changes.

US-008
Title: Define proportional goal allocation per instrument
Description: As a user, I want to set how my overall goal is allocated across instrument types (e.g., 10,000 ETF, 3,000 Bonds) when creating or editing the wallet.
Acceptance Criteria:
- Wallet creation/edit offers a way to specify goal allocation amounts or percentages per instrument type.
- The sum of allocations equals the wallet goal; the UI shows an error if not equal.
- Chart B uses these allocations to render the planned distribution.

US-009
Title: Goal progress calculation
Description: As a user, I want the app to calculate current progress toward the overall goal based on instrument values and show remaining amount.
Acceptance Criteria:
- The wallet current total equals the sum of all instrument computed values (value * (1 + growth%/100)).
- Remaining amount = goal - current total (min 0).
- When current total >= goal, display a "Goal reached" state with the achieved amount and date.

US-010
Title: Validation of user input
Description: As a user, I want the app to validate inputs for instruments and wallets so I don't enter incorrect data.
Acceptance Criteria:
- Monetary values must be numbers >= 0.
- Growth percentages must be numbers in a reasonable range (e.g., -100% < p < 1000%).
- Goal amount must be > 0.
- Invalid inputs are rejected and shown with clear messages.

US-011
Title: Handling empty or no-instrument wallets
Description: As a user, I want the app to handle wallets with zero instruments gracefully.
Acceptance Criteria:
- Wallet with no instruments shows an empty state prompting the user to add instruments.
- Charts render a placeholder state explaining how to add instruments.

US-012
Title: Duplicate instrument types and multiple instances
Description: As a user, I want to be able to add multiple instances of the same instrument type (e.g., two different bond entries) to reflect separate positions.
Acceptance Criteria:
- The system permits multiple instrument entries of the same type with distinct names or notes.
- Charts aggregate same-type instruments into the same color/segment category but list each instance in the instrument list.

US-013
Title: Edit wallet metadata
Description: As a user, I want to rename the wallet, change target date, or update the overall goal amount.
Acceptance Criteria:
- The user can edit the wallet's name, goal amount, target date, and allocations.
- If allocations are changed, the UI validates the sum equals the new goal.

## 6. Success Metrics
Metrics to evaluate product success in MVP stage (measurable and actionable):
- Daily Active Users (DAU): target early adoption baseline (e.g., 500 DAU) depending on distribution.
- Frequency of manual updates: percentage of active users who update at least one instrument value per week (target: 40% in month 1).
- Wallet creation rate: percentage of registered users who create at least one wallet (target: 60% within first 2 weeks).
- Goal progress rate: percentage of wallets where users reach >= 80% of their goal within 12 months (long-term KPI).
- Retention: 1-week and 1-month retention rates (targets to be defined during discovery; track baseline and iterate).
- User comprehension: qualitative feedback via quick in-app survey asking if the charts and dashboard are "clear" (Yes/No) and a brief comment box.
- Data accuracy incidents: number of times users report incorrect calculations due to manual input errors (track to refine validation and UX).

Measurement and instrumentation:
- Track events: account_created, wallet_created, instrument_added, instrument_updated, dashboard_viewed, goal_reached.
- Instrument these events with timestamps and wallet identifiers to calculate DAU, update frequency, and funnel conversion.

Risks and mitigations (short):
- Risk: Users may enter inaccurate values, undermining trust. Mitigation: Clear input validation, inline help text, and a visible note that values are user-supplied.
- Risk: Low engagement. Mitigation: Emphasize clarity of dashboard; consider lightweight gamification and onboarding in future iterations.
- Risk: Over-scoped features. Mitigation: Strictly adhere to MVP exclusions and prioritize core flows.

Open questions (to resolve during discovery):
- What are the exact retention targets and acquisition channels for the initial user cohort?
- Should we allow users to save drafts of wallets before finalizing allocations?
- Will we offer locale-specific formatting for PLN and dates in different regions?
