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
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

## Project description

Piggy Bank is a goal‑oriented savings tracker that helps users build and sustain long‑term savings habits. Users create manual, virtual wallets and add simple instruments (Bonds, ETF, Stocks). Each wallet shows two circle graphs: progress toward a target and performance relative to invested capital. All monetary amounts are stored safely as integer grosze (PLN minor units) to avoid floating‑point errors. Authentication and data storage are powered by Supabase.

- PRD: [./.ai/new/prd.md](./.ai/new/prd.md)
- Tech Stack: [./.ai/new/tech-stack.md](./.ai/new/tech-stack.md)

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
PUBLIC_SUPABASE_ANON_KEY="<your-anon-key>"

# Optional: server-only key if certain API routes require it.
# Do NOT expose this in client code.
# SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
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

```bash
npm run dev
npm run build
npm run preview
npm run astro -- <args>
npm run lint
npm run lint:fix
npm run format
```

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

See the PRD for user stories, acceptance criteria, and success metrics: [./.ai/new/prd.md](./.ai/new/prd.md)

## License

TBD. No license file has been specified yet. To make the project open-source, add a `LICENSE` file (e.g., MIT) and update the badge above.


