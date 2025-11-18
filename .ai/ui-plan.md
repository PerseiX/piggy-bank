# UI Architecture for Piggy Bank

## 1. UI Structure Overview

This document describes the user interface architecture for Piggy Bank (MVP) and maps UI decisions to the PRD, API plan, and session notes. The UI mirrors the API resources and supports the primary user flows: Dashboard → Wallet Detail → Instrument Detail/Edit. Route-aware, deep-linkable modals are used for create/edit flows. JWT is stored in `localStorage` for MVP and included on all API requests via `Authorization: Bearer <jwt>`.

- **Key requirements (from PRD)**:
  - Wallet and instrument CRUD with soft-delete and validation.
  - Monetary values stored as integer grosze; UI accepts PLN decimals and converts to grosze.
  - Two circle graphs per wallet: progress (toward target) and performance (vs invested).
  - Soft-deleted items hidden in primary lists; no archive in MVP.
  - Accessible graphs and clear error/validation UX.

- **Main API endpoints (summary)**:
  - `GET /api/wallets` — list active wallets (aggregates).
  - `POST /api/wallets` — create wallet.
  - `GET /api/wallets/:id` — wallet detail with instruments and aggregates.
  - `DELETE /api/wallets/:id` — soft-delete wallet.
  - `GET /api/wallets/:walletId/instruments` — list instruments in wallet.
  - `POST /api/wallets/:walletId/instruments` — create instrument.
  - `PATCH /api/instruments/:id` — update instrument.
  - `DELETE /api/instruments/:id` — soft-delete instrument.
  - `GET /api/instruments/:id/value-changes` — instrument value change history.

## 2. View List

Below are the required views. Each entry lists path, purpose, key information, components, and UX/accessibility/security considerations.

- **Sign In / Sign Up**
  - Path: `/signin`, `/signup`
  - Purpose: Authenticate users via Supabase; obtain JWT stored in `localStorage`.
  - Key information: Email/password fields, password rules, submit errors, link to sign-up/sign-in.
  - Key components: Auth form, inline validation messages, global toast for server errors.
  - Considerations: Enforce password minimum (≥8), show clear validation messages, use ARIA for form fields, sanitize user input before display.

- **Dashboard (Wallets list)**
  - Path: `/`
  - Purpose: Primary landing showing all active wallets, aggregates and quick actions.
  - Key information: Wallet card for each wallet with name, currentValue, target, lastUpdated, Add Wallet CTA.
  - Key components: `WalletCard`,, global `Toast`, `TopNav`/`UserMenu`.
  - Considerations: Mobile-first layout; on small screens show single prominent graph and condensed numbers; include textual alternative for both graphs (e.g., "Progress: 65%"); handle 0-target and 0-invested cases gracefully (show 0% or "—"). Protect API calls with Authorization header and redirect to `/signin` on 401.

- **Wallet Detail**
  - Path: `/wallets/:id` (nested layout preserving left list or top nav)
  - Purpose: Show wallet aggregates, instrument list, and instrument create/edit flows (route-aware modal).
  - Key information: Wallet name, description, aggregated numbers (target, currentValue, investedSum), Graph A (progress) and B (performance), instrument list (name, type, investedMoney, currentValue, goal), Add Instrument button, Edit Wallet action, Soft-delete wallet action.
  - Key components:  `RadialProgress` (progress), `PerformanceIndicator` (percent with icon), `WalletHeader`, `AggregatesSummary`, `InstrumentList`, `InstrumentRow`, route-aware `InstrumentModal` (create/edit), `ConfirmDialog` for soft-delete.
  - Considerations: After any instrument or wallet mutation re-fetch `GET /api/wallets/:id` to sync aggregates; show inline field errors mapped from `VALIDATION_ERROR`; use toasts for non-field global errors. Soft-deleted parent wallet should surface a not-found/404 page if attempted access.

- **Instrument Create / Edit Page fallback**
  - Path:  `/wallets/:id/instruments/:instrumentId/edit` OR nested path `/wallets/:id/instruments/new` (
  - Purpose: Create or edit an instrument with field validation and PLN↔grosze conversion.
  - Key information: Type (enum), name, short_description, invested_money_pln, current_value_pln, optional goal_pln, Save/Cancel buttons.
  - Key components: `InstrumentForm` (Zod validation), `CurrencyInput` (PLN display + grosze conversion), inline field error renderer, `Toast` for server-level issues.
  - Considerations: Ensure uniqueness validation maps to field error; prevent changing `wallet_id`; convert decimal PLN to integer grosze before sending; sanitize name/description.

- **Instrument Detail**
  - Path: `/instruments/:id`
  - Purpose: Show instrument full details and value-change history.
  - Key information: Instrument header (name, type), currentValue, investedMoney, goal, computed delta from invested, small collapsible `ValueChangeHistory` grid showing `GET /api/instruments/:id/value-changes`.
  - Key components: `InstrumentHeader`, `ValueChangeHistory` (collapsible, fetch on expand), `EditInstrument` action (opens modal), `SoftDelete` action.
  - Considerations: Lazy-load value-change history on expand; show delta with non-color indicators; accessible table markup for history; handle soft-deleted instrument 404.

- **Create/edit Wallet Page**
  - Path: `/wallets/new` or `/wallets/:id/edit`
  - Purpose: Create or edit new wallet.
  - Key information: Name (required), description (optional), validation messages.
  - Key components: `WalletForm`, inline errors, toast for server errors.
  - Considerations: Unique per-user name validation (map `DUPLICATE_NAME` to inline error); show aggregated default zeros on success.

- **Not Found / Unauthorized**
  - Path: `/404`, `/401`
  - Purpose: Friendly error pages when resources are soft-deleted, missing, or unauthorized.
  - Key information: Explain why user cannot access and CTA to navigate home or sign in.
  - Key components: Simple content with link/button CTA, optional `SignOut` on 401.
  - Considerations: 401 should clear local JWT and redirect to `/signin`.

## 3. User Journey Map

Primary scenario: "Create instrument and see updated wallet aggregates"

Step-by-step flow:
1. User signs in at `/signin`; JWT saved in `localStorage`.
2. User lands on `/` (Dashboard) which fetches `GET /api/wallets` and displays wallet cards.
3. User clicks a wallet card → navigates to `/wallets/:id`, which fetches `GET /api/wallets/:id` (includes instruments and aggregates).
4. User clicks "Add Instrument". URL updates (e.g., `/wallets/:id/new` or `/wallets/:id/instruments/new`).
5. User fills `InstrumentForm`. Client-side Zod validation runs; amounts entered in PLN are converted to grosze.
6. User submits → UI calls `POST /api/wallets/:walletId/instruments` with Authorization header.
   - On success: close modal, show success toast, then re-fetch `GET /api/wallets/:id` to sync aggregates and instruments.
   - On `VALIDATION_ERROR`: display inline field errors, map details to fields and show toast if needed.
   - On other errors (401/403/500): show toast; on 401 clear JWT and redirect to `/signin`.
7. Dashboard and Wallet Detail now reflect updated aggregates and instrument list.

Secondary flows:
- Edit instrument: go to page  via `/wallets/:id/instruments/:instrumentId/edit` → call `PATCH /api/instruments/:id` → re-fetch wallet.
- Soft-delete instrument: confirm → call `DELETE /api/instruments/:id` → re-fetch wallet and remove from lists.
- View instrument history: open `/instruments/:id` → expand `ValueChangeHistory` (fetch `GET /api/instruments/:id/value-changes`).

## 4. Layout and Navigation Structure

- **Global layout**:
  - `TopNav`: brand, global search (future), user menu (profile/sign out).
  - `Main`: two-area responsive layout for `md` and up: optional left persistent wallet list (secondary) + primary content; single-column on mobile.
  - A central `ToastProvider` for global toasts and `AuthProvider` (React Context) to expose JWT and sign-in/out methods.

- **Route structure (mirror API)**:
  - `/` → Dashboard (GET `/api/wallets`)
  - `/wallets/new` → Create Wallet
  - `/wallets/:id` → Wallet Detail (GET `/api/wallets/:id`)
  - `/wallets/:id?modal=instrument-new` or `/wallets/:id/instruments/new` → Instrument Create (modal)
  - `/wallets/:id/instruments/:instrumentId/edit` → Instrument Edit (modal)
  - `/instruments/:id` → Instrument Detail (GET `/api/instruments/:id` + history)
  - `/signin`, `/signup`, `/404`, `/401`

- **Modal behavior**:
  - Route-aware modals push history so back button closes them. Deep-linking supported (opening URL directly shows modal).
  - Modal traps focus and returns focus to the triggering element when closed.

- **Navigation patterns**:
  - Primary nav uses `TopNav` and context-aware back/close buttons.
  - Intra-wallet navigation keeps wallet context in nested layout so aggregates remain visible while editing instruments.

## 5. Key Components

- `RadialProgress` (accessible SVG): Displays progress percent with ARIA label and textual backup. Handles overflow >100% and zero-target case.

- `PerformanceIndicator`: Shows percent change vs invested with icon (up/down/neutral), color + non-color indicator (arrow/± text).

- `WalletCard`: Compact wallet summary for Dashboard with quick link to wallet detail and contextual actions.

- `InstrumentRow` / `InstrumentList`: List of instruments with inline actions (edit, soft-delete) and accessible labels.

- `InstrumentForm` (shared create/edit): Zod-based validation, `CurrencyInput` converting PLN ↔ grosze, inline field error renderer that maps API `VALIDATION_ERROR` details to fields.

- `ValueChangeHistory`: Collapsible list/grid showing before/after/delta/direction. Fetches on expand.

- `ToastProvider` / `useToast`: Global toasts for errors/success; map API error codes to friendly messages.

- `AuthProvider` (React Context): Exposes `jwt`, `signIn`, `signOut`, and central fetch wrapper that attaches Authorization header and handles 401 globally (clear JWT + redirect).

- `ConfirmDialog`: Generic accessible confirmation for soft-deletes.

## 6. Error states, edge cases, and accessibility notes

- **Soft-delete**: Soft-deleted items return 404; UI treats them as not found and hides them. Attempting to access a soft-deleted wallet/instrument shows a friendly 404 and CTA.

- **Validation**: Server `VALIDATION_ERROR` payloads map to inline errors; `DUPLICATE_NAME` maps to field-specific message; other errors use toast.

- **Zero/Division-edge cases**: If wallet target == 0 → `RadialProgress` shows 0% and explanatory text. If investedSum == 0 → `PerformanceIndicator` shows "—" or 0% per PRD and uses textual hint.

- **JWT expiry / 401**: Clear local JWT and redirect to `/signin`. Consider UX improvement in future: warning modal before expiry.

- **Large data**: MVP loads all active items into memory; plan for virtualization/pagination when data grows over threshold (document threshold and migration plan).

- **Accessibility**:
  - All graphs include ARIA labels and textual summary lines.
  - Keyboard focus is managed for modals and dialogs; forms expose error messages via ARIA `aria-invalid` and `aria-describedby`.
  - Color is not the only indicator for performance; use icons/text as well.

## 7. Mapping user stories to UI (high-level)

- US-001 / US-002 / US-003 (Auth): `Sign In`/`Sign Up` pages; `AuthProvider`; redirect behavior on 401.
- US-004 (Create wallet): `Create Wallet` page/modal → `POST /api/wallets` → show wallet on Dashboard.
- US-005 (Dashboard): `Dashboard` with `WalletCard` and two radial graphs; uses `GET /api/wallets`.
- US-006 / US-007 / US-012 (Add / Edit instrument / update currentValue): `InstrumentForm` modal + `InstrumentDetail` → `POST /api/wallets/:id/instruments` / `PATCH /api/instruments/:id` → re-fetch `GET /api/wallets/:id`.
- US-008 / US-017 (Soft-delete): `ConfirmDialog` + API `DELETE` endpoints; re-fetch wallet and remove item from lists.
- US-010 / US-011 (Aggregations & wallet detail): `Wallet Detail` shows aggregates from `GET /api/wallets/:id` and instrument list.
- US-013 (Zero investedMoney): `PerformanceIndicator` handles investedSum == 0 with "—" or 0% and tooltip.
- US-014 (Value change history): `ValueChangeHistory` fetched from `GET /api/instruments/:id/value-changes`.
- US-015 (Validation & error handling): Zod on client, mapping server errors to inline fields, global `Toast` for other errors.
- US-016 (Authorization): API calls include JWT; UI verifies ownership via 403/401 handling and shows 403/404 pages.
- US-018 (Grosze storage): `CurrencyInput` converts PLN to grosze before sending; UI displays PLN decimals.

## 8. Requirement → UI element mapping (explicit)

- Store values as grosze → `CurrencyInput` + conversion layer in `InstrumentForm` & wallet create/update flows.
- Re-fetch wallet after mutations → `WalletDetail` triggers `GET /api/wallets/:id` after successful POST/PATCH/DELETE.
- Route-aware modals → `InstrumentForm` mounted in modal that updates URL and handles back navigation.
- Inline & toast error UX → `InstrumentForm` maps `VALIDATION_ERROR` to fields; `ToastProvider` surfaces non-field errors.
- Accessibility for graphs → `RadialProgress` includes ARIA and textual backup.
- Soft-delete hidden from lists → All list queries use only active items; UI filters out deleted items.

## 9. Potential user pain points & mitigations

- Pain: losing work when JWT expires mid-form → Mitigation: autosave draft locally (future work) and show warning on submit 401 to re-authenticate.
- Pain: confusion when aggregates don't update immediately → Mitigation: re-fetch authoritative wallet aggregates after mutation and show a loading state; consider optimistic UI with rollback later.
- Pain: inconsistent validation messages between client and server → Mitigation: share Zod schemas between client & server and map server error details to fields.
- Pain: deep-link choices (query param vs nested route) ambiguous → Mitigation: standardize on nested route (`/wallets/:id/instruments/new` and `/wallets/:id/instruments/:instrumentId/edit`) for clarity and SEO.

---

This UI plan maps directly to the API plan and PRD, supports accessibility, and enumerates the primary views, navigation, components, and error flows the frontend team should implement for the MVP.


