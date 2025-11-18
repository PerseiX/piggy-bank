# View Implementation Plan: Wallet Detail

## 1. Overview

The Wallet Detail view serves as the primary interface for a user to inspect and manage a single financial wallet. It displays the wallet's name and description, key performance aggregates, and two visualizations: one for progress towards the financial target and another for investment performance. The view also lists all the financial instruments contained within the wallet and provides the user with actions to add, edit, or delete instruments, as well as edit or delete the wallet itself. All interactions involving data mutation (e.g., creating an instrument) are handled through modal dialogs to provide a seamless user experience.

## 2. View Routing

The view will be accessible at the following dynamic path:

-   **Path**: `/wallets/[id]`
-   `[id]` will be the UUID of the wallet being viewed.

## 3. Component Structure

The view will be implemented as an Astro page that hydrates a single top-level React component. The component hierarchy is as follows:

```
/wallets/[id].astro
└── WalletDetailView (React Client Component)
    ├── WalletHeader
    │   ├── Button (Edit Wallet)
    │   └── Button (Delete Wallet)
    ├── AggregatesSummary
    │   ├── RadialProgress (for Progress Graph)
    │   └── PerformanceIndicator (for Performance Graph)
    ├── InstrumentList
    │   ├── Button (Add Instrument)
    │   └── InstrumentRow[]
    │       ├── Button (Edit Instrument)
    │       └── Button (Delete Instrument)
    ├── WalletFormModal (conditionally rendered)
    ├── InstrumentFormModal (conditionally rendered)
    └── ConfirmDeleteDialog (conditionally rendered)
```

## 4. Component Details

### `WalletDetailView`

-   **Component description**: The main stateful container for the view. It is responsible for fetching wallet data, managing the view's state (loading, error, success), handling all user interactions by controlling modal visibility, and passing data and actions down to child components.
-   **Main elements**: Contains `WalletHeader`, `AggregatesSummary`, and `InstrumentList`. Conditionally renders modals based on its internal state.
-   **Handled interactions**:
    -   Fetches wallet data on initial render.
    -   Opens the `WalletFormModal` when an edit wallet event is received.
    -   Opens the `InstrumentFormModal` for creating or editing an instrument.
    -   Opens the `ConfirmDeleteDialog` for deleting a wallet or instrument.
    -   Handles form submissions from modals and triggers API calls.
    -   Refreshes wallet data after any successful data mutation.
-   **Handled validation**: None directly; it orchestrates validation by passing API error details to form components.
-   **Types**: `WalletDetailDto`, `WalletDetailViewModel`, `ModalState`.
-   **Props**: `walletId: string`.

### `WalletHeader`

-   **Component description**: A presentational component that displays the wallet's name and description, along with top-level action buttons.
-   **Main elements**: `h1` for the wallet name, `p` for the description, and two `Button` components (from Shadcn/ui).
-   **Handled interactions**:
    -   `onClick` on "Edit Wallet" button.
    -   `onClick` on "Delete Wallet" button.
-   **Handled validation**: None.
-   **Types**: `Pick<Wallet, 'id' | 'name' | 'description'>`.
-   **Props**:
    -   `wallet: Pick<Wallet, 'id' | 'name' | 'description'>`
    -   `onEdit: () => void`
    -   `onDelete: () => void`

### `AggregatesSummary`

-   **Component description**: Displays the key financial aggregates and the two circle graphs for progress and performance.
-   **Main elements**: Grid layout containing display boxes for each aggregate value (`current_value_pln`, `invested_sum_pln`, etc.) and two chart components (`RadialProgress`, `PerformanceIndicator`).
-   **Handled interactions**: None.
-   **Handled validation**: None.
-   **Types**: `WalletAggregatesDto`.
-   **Props**: `aggregates: WalletAggregatesDto`.

### `InstrumentList`

-   **Component description**: Renders the list of instruments and a button to add a new one.
-   **Main elements**: A `Button` for "Add Instrument" and a list/table structure that maps over the instruments array to render `InstrumentRow` components.
-   **Handled interactions**: `onClick` on the "Add Instrument" button.
-   **Handled validation**: None.
-   **Types**: `InstrumentDto[]`.
-   **Props**:
    -   `instruments: InstrumentDto[]`
    -   `onAddInstrument: () => void`
    -   `onEditInstrument: (instrument: InstrumentDto) => void`
    -   `onDeleteInstrument: (instrumentId: string) => void`

### `InstrumentRow`

-   **Component description**: Displays the data for a single instrument within a list or table row. It includes action buttons for that specific instrument.
-   **Main elements**: Table cells or divs displaying the instrument's name, type, and monetary values. Two `Button` components for "Edit" and "Delete".
-   **Handled interactions**: `onClick` on "Edit" and "Delete" buttons.
-   **Handled validation**: None.
-   **Types**: `InstrumentDto`.
-   **Props**:
    -   `instrument: InstrumentDto`
    -   `onEdit: (instrument: InstrumentDto) => void`
    -   `onDelete: (instrumentId: string) => void`

### `InstrumentFormModal`

-   **Component description**: A modal dialog containing a form to create or edit an instrument.
-   **Main elements**: `Dialog` (Shadcn/ui), `Form` with `Input`, `Select`, and `Textarea` fields for instrument properties.
-   **Handled interactions**: Form field changes, form submission.
-   **Handled validation**:
    -   `type`: Required. Must be one of `Bonds`, `ETF`, `Stocks`.
    -   `name`: Required. String, 1-100 characters.
    -   `invested_money_pln`: Required. Numeric, non-negative.
    -   `current_value_pln`: Required. Numeric, non-negative.
    -   `goal_pln`: Optional. Numeric, non-negative if provided.
-   **Types**: `InstrumentDto`, `CreateInstrumentCommand`, `UpdateInstrumentCommand`.
-   **Props**:
    -   `isOpen: boolean`
    -   `onClose: () => void`
    -   `onSubmit: (command: CreateInstrumentCommand | UpdateInstrumentCommand) => Promise<void>`
    -   `initialData?: InstrumentDto` (for editing)
    -   `apiErrors?: Record<string, string>` (for displaying server-side validation errors)

### `ConfirmDeleteDialog`

-   **Component description**: A simple, reusable modal dialog to confirm a destructive action.
-   **Main elements**: `AlertDialog` (Shadcn/ui) with title, description, and "Confirm"/"Cancel" buttons.
-   **Handled interactions**: `onClick` on "Confirm" and "Cancel" buttons.
-   **Handled validation**: None.
-   **Types**: None.
-   **Props**:
    -   `isOpen: boolean`
    -   `onClose: () => void`
    -   `onConfirm: () => void`
    -   `title: string`
    -   `description: string`

## 5. Types

The view will primarily use DTOs defined in `src/types.ts`. Additionally, two new ViewModel types will be created to manage the view's internal state.

-   **`WalletDetailDto`**: The main data contract fetched from `GET /api/wallets/:id`.
-   **`InstrumentDto`**: Represents a single instrument within `WalletDetailDto`.
-   **`CreateInstrumentCommand` / `UpdateInstrumentCommand`**: Payloads for creating/updating instruments.
-   **`UpdateWalletCommand`**: Payload for updating a wallet.

### New ViewModel Types

```typescript
// Describes the data-fetching status of the view
type ViewStatus = 'loading' | 'success' | 'error' | 'idle';

// The main state object for the WalletDetailView component
export type WalletDetailViewModel = {
  status: ViewStatus;
  walletData: WalletDetailDto | null;
  error: string | null; // Stores user-facing error messages
};

// Represents the currently active modal and its required data
export type ModalState =
  | { type: 'idle' }
  | { type: 'create-instrument' }
  | { type: 'edit-instrument'; instrument: InstrumentDto }
  | { type: 'edit-wallet'; wallet: Pick<Wallet, 'id' | 'name' | 'description'> }
  | { type: 'delete-instrument'; instrumentId: string; instrumentName: string }
  | { type: 'delete-wallet'; walletId: string; walletName: string };
```

## 6. State Management

State will be managed within the `WalletDetailView` component using React hooks. A custom hook, `useWalletDetail`, will be created to encapsulate all business logic, including data fetching, state updates, and API mutation calls.

### `useWalletDetail(walletId: string)`

-   **Responsibility**:
    1.  Fetch wallet details from `/api/wallets/:id`.
    2.  Manage the `WalletDetailViewModel` state (`status`, `walletData`, `error`).
    3.  Expose stable functions for all mutation operations (add, update, delete for both wallets and instruments).
    4.  Handle API errors and update the `error` state accordingly.
    5.  Trigger a data re-fetch upon successful mutation to ensure UI consistency.
-   **Returns**: An object containing the current `viewModel` and an `actions` object with all mutation functions.

## 7. API Integration

The view will interact with the REST API as follows:

-   **Initial Data Load**:
    -   **Endpoint**: `GET /api/wallets/:id`
    -   **Request**: Requires `Authorization: Bearer <token>`.
    -   **Response**: `Promise<{ data: WalletDetailDto }>`
-   **Mutations**: All mutation functions will be called from the `useWalletDetail` hook. They require the auth token and a JSON body. On success, they will trigger a re-fetch of the `GET /api/wallets/:id` endpoint.
    -   **Create Instrument**: `POST /api/wallets/:walletId/instruments` with `CreateInstrumentCommand`.
    -   **Update Instrument**: `PATCH /api/instruments/:id` with `UpdateInstrumentCommand`.
    -   **Delete Instrument**: `DELETE /api/instruments/:id`.
    -   **Update Wallet**: `PATCH /api/wallets/:id` with `UpdateWalletCommand`.
    -   **Delete Wallet**: `DELETE /api/wallets/:id`.

## 8. User Interactions

-   **View Load**: User navigates to `/wallets/[id]`. A loading state is displayed. On success, the wallet details are rendered. On error (e.g., 404), an error message is shown.
-   **Add Instrument**: User clicks "Add Instrument". The `InstrumentFormModal` opens with empty fields. On submission, the API is called, and on success, the instrument list is updated.
-   **Edit Instrument/Wallet**: User clicks an "Edit" button. The appropriate form modal opens, pre-populated with existing data. On submission, the API is called, and the view is updated on success.
-   **Delete Instrument/Wallet**: User clicks a "Delete" button. A `ConfirmDeleteDialog` appears. If confirmed, the API is called. On success, the item is removed from the view (or the user is redirected if the wallet was deleted).
-   **Form Submission Failure**: If the API returns a validation error (400) or conflict (409), the error message is displayed within the form modal next to the relevant field. For other errors (500), a generic error toast is shown.

## 9. Conditions and Validation

-   **Client-Side**: All forms (`InstrumentFormModal`, `WalletFormModal`) will perform client-side validation for required fields, data formats (numeric), and constraints (e.g., string length, non-negative numbers) to provide immediate user feedback.
-   **Server-Side**: The frontend will be prepared to handle and display validation errors returned from the API. The `useWalletDetail` hook will parse `400 Bad Request` responses with a `details` array and pass the field-specific errors down to the form components.

## 10. Error Handling

-   **Not Found (404) / Forbidden (403)**: The view will display a full-page error component with a message like "Wallet not found" or "You do not have permission to view this wallet."
-   **Unauthorized (401)**: A global mechanism should redirect the user to the login page.
-   **Validation Errors (400)**: Errors will be displayed inline within the relevant form, next to the input fields.
-   **Server Errors (500+) / Network Errors**: A generic error message will be displayed in a toast notification, and the main view might show a simple error state prompting the user to try refreshing.

## 11. Implementation Steps

1.  **Create Astro Page**: Set up the file at `src/pages/wallets/[id].astro`. Add `export const prerender = false;` and render the main React component, passing the `id` param as a prop.
2.  **Develop `useWalletDetail` Hook**: Create `src/lib/hooks/useWalletDetail.ts`. Implement the data fetching logic for `GET /api/wallets/:id` and manage the `WalletDetailViewModel` state.
3.  **Build Static Components**: Create the presentational components: `WalletHeader`, `AggregatesSummary`, `InstrumentList`, and `InstrumentRow`. Build them to consume props based on the `WalletDetailDto` and `InstrumentDto` types.
4.  **Implement `WalletDetailView` Component**: Create the main container component. Integrate the `useWalletDetail` hook. Lay out the static components and pass the required data down as props.
5.  **Build Modal Components**: Create the `WalletFormModal`, `InstrumentFormModal`, and `ConfirmDeleteDialog` using Shadcn/ui components.
6.  **Wire Up State and Interactions**: In `WalletDetailView`, implement the logic to manage `ModalState`. Connect the buttons in `WalletHeader` and `InstrumentList` to update this state, causing the correct modals to appear.
7.  **Implement Mutations**: Flesh out the mutation functions (`addInstrument`, `updateWallet`, etc.) in the `useWalletDetail` hook. These functions should call the API, handle success by re-fetching data, and handle errors by updating the state.
8.  **Connect Modals to Actions**: Pass the mutation functions from the `useWalletDetail` hook as props to the modal components' `onSubmit` or `onConfirm` handlers.
9.  **Implement Error Handling**: Ensure that API errors are caught and correctly mapped to either the view's main error state or to inline errors within the forms. Add toast notifications for generic errors.
10. **Refine Styling and UX**: Apply Tailwind CSS classes for styling. Ensure loading states, empty states (e.g., no instruments), and transitions are smooth.
11. **Testing**: Write unit tests for the `useWalletDetail` hook's logic and component tests for the forms and user interactions.
