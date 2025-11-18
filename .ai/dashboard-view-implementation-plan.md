# View Implementation Plan: Dashboard

## 1. Overview
The Dashboard View is the main landing page for authenticated users. Its primary purpose is to display a summary of all active financial wallets a user owns. Each wallet is presented as a card containing key aggregate metrics and visual indicators for progress and performance. The view also serves as the main navigation hub, allowing users to access detailed views for each wallet or create new ones. It must handle states for loading, data presentation, empty-state (no wallets), and errors.

## 2. View Routing
- **Path**: The view will be accessible at the application root: `/`.
- **Authentication**: This route is protected. Unauthenticated users attempting to access it will be redirected to the `/signin` page.

## 3. Component Structure
The view will be composed of a main Astro page that embeds a client-rendered React component. The component hierarchy is as follows:

```
src/pages/index.astro
└── src/components/views/DashboardView.tsx (client:load)
    ├── LoadingState.tsx (displays a spinner)
    ├── ErrorState.tsx (displays an error message)
    ├── EmptyState.tsx (for users with no wallets)
    │   └── Button (Shadcn/ui - links to create wallet page)
    └── WalletList.tsx
        └── WalletCard.tsx (mapped for each wallet)
            ├── ProgressCircle.tsx
            └── PerformanceIndicator.tsx
```

## 4. Component Details

### `DashboardView.tsx`
- **Component Description**: The primary client-side React component that orchestrates the entire view. It is responsible for fetching wallet data, managing the view's state (loading, success, empty, error), and rendering the appropriate child components based on that state.
- **Main Elements**: A main container div that conditionally renders `LoadingState`, `ErrorState`, `EmptyState`, or `WalletList`. It will also include a header with the page title ("Dashboard") and an "Add Wallet" button.
- **Handled Events**: Manages the component mount event to trigger the initial data fetch.
- **Validation Conditions**: None directly. It interprets API responses to determine the view state.
- **Types**: `DashboardViewModel`, `WalletListItemDto`.
- **Props**: `{ accessToken: string }`.

### `WalletList.tsx`
- **Component Description**: A presentational component that lays out the wallet cards in a responsive grid.
- **Main Elements**: A `<div>` styled with Tailwind CSS Grid (`grid`, `gap`, `grid-cols-*`). It maps over the `wallets` array and renders a `WalletCard` for each item.
- **Handled Events**: None.
- **Validation Conditions**: None.
- **Types**: `WalletListItemDto[]`.
- **Props**: `{ wallets: WalletListItemDto[] }`.

### `WalletCard.tsx`
- **Component Description**: Displays a summary of a single wallet. The entire card is a clickable element that navigates the user to the detailed view for that wallet.
- **Main Elements**: An `<a>` tag wrapping a container `<div>`. Inside, it includes:
  - `<h2>` for the wallet name.
  - `<span>` elements for `current_value_pln` and `target_pln`.
  - A `<footer>` with the `updated_at` timestamp.
  - The `ProgressCircle` and `PerformanceIndicator` components.
- **Handled Events**: `onClick` (via the `<a>` tag href) to navigate to `/wallets/:id`.
- **Validation Conditions**: None.
- **Types**: `WalletListItemDto`.
- **Props**: `{ wallet: WalletListItemDto }`.

### `EmptyState.tsx`
- **Component Description**: A view shown when the API returns an empty list of wallets. It encourages the user to start using the application.
- **Main Elements**: A container with a message (e.g., "You don't have any wallets yet.") and a prominent "Create First Wallet" button (`<Button>`).
- **Handled Events**: The button's `onClick` navigates to the wallet creation page.
- **Validation Conditions**: None.
- **Types**: None.
- **Props**: None.

## 5. Types

### `WalletListItemDto` (from API)
This is the main DTO consumed by the view.
```typescript
export type WalletListItemDto = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  aggregates: WalletAggregatesDto;
};

export type WalletAggregatesDto = {
  target_grosze: number;
  target_pln: string;
  current_value_grosze: number;
  current_value_pln: string;
  invested_sum_grosze: number;
  invested_sum_pln: string;
  progress_percent: number;
  performance_percent: number;
};
```

### `DashboardViewModel` (Frontend-specific)
A custom type to represent the complete state of the `DashboardView` component.
```typescript
type DashboardStatus = "loading" | "success" | "error" | "empty";

interface DashboardViewModel {
  status: DashboardStatus;
  wallets: WalletListItemDto[];
  error: string | null;
}
```
- `status`: Manages the current state for conditional rendering.
- `wallets`: Stores the list of wallets fetched from the API.
- `error`: Holds the error message if the API call fails.

## 6. State Management
State will be managed locally within the `DashboardView.tsx` component using React's `useState` hook with the `DashboardViewModel` type.

```typescript
const [viewModel, setViewModel] = useState<DashboardViewModel>({
  status: 'loading',
  wallets: [],
  error: null,
});
```

A custom hook, `useWallets(accessToken: string)`, can be created to encapsulate the data fetching logic and state transitions. This hook will contain the `useEffect` for fetching and will return the `viewModel`. This approach isolates data-fetching logic from the view component, making both easier to test and maintain.

## 7. API Integration
- **Endpoint**: `GET /api/wallets`
- **Integration**: The `useWallets` hook will make a `fetch` request to this endpoint on component mount.
- **Request**:
  - **Method**: `GET`
  - **Headers**: `Authorization: 'Bearer ' + accessToken`
- **Response**:
  - **Success (200 OK)**: The hook will parse the JSON response, expecting `{ data: WalletListItemDto[] }`. If `data` is empty, the state transitions to `'empty'`. Otherwise, it transitions to `'success'` and populates the `wallets` array.
  - **Error (401 Unauthorized)**: The API client utility should globally handle this by redirecting the user to `/signin`.
  - **Error (Other)**: For any other error (e.g., 500, network failure), the state transitions to `'error'` and an error message is stored.

## 8. User Interactions
- **Page Load**: The user navigates to `/`. The `DashboardView` shows a loading spinner, fetches data, and then renders either the list of wallets, the empty state, or an error message.
- **View Wallet Details**: The user clicks anywhere on a `WalletCard`. They are navigated to the corresponding wallet detail page at `/wallets/{wallet.id}`.
- **Create New Wallet**: The user clicks the "Add Wallet" button (or the CTA in the empty state). They are navigated to the wallet creation page.

## 9. Conditions and Validation
- **Authentication**: The `src/pages/index.astro` page will validate the user's session on the server. If the session is invalid, it will perform a server-side redirect to `/signin` before any client-side code executes.
- **Data Presence**: The `DashboardView` component checks if the fetched `wallets` array is empty to decide between rendering the `WalletList` or the `EmptyState`.
- **Graph Edge Cases**: The API is responsible for handling division-by-zero errors in percentage calculations (`progress_percent`, `performance_percent`). The frontend components (`ProgressCircle`, `PerformanceIndicator`) will simply render the numeric values provided, ensuring `0` is displayed correctly and without error.

## 10. Error Handling
- **Loading Error**: If the API call fails for any reason other than a 401, the `DashboardView` will render an `ErrorState` component. This component will display a user-friendly message like "Failed to load wallets. Please check your connection and try again."
- **Unauthorized Access**: An API client utility will intercept `401 Unauthorized` responses from any `fetch` call and automatically trigger a redirect to the `/signin` page.
- **Client-Side Errors**: Standard React error boundaries can be used at a higher level in the component tree to catch any unexpected rendering errors within the dashboard components.

## 11. Implementation Steps
1.  **Astro Page Setup**: Create `src/pages/index.astro`. Add server-side logic to check for a Supabase session. If no session, redirect to `/signin`. If a session exists, render the `DashboardView` component, passing the `accessToken` as a prop.
2.  **`DashboardView` Component**: Create `src/components/views/DashboardView.tsx`. Set up the `useState` for the `DashboardViewModel`.
3.  **Data Fetching Hook**: Create a `useWallets` custom hook to handle the API call to `GET /api/wallets`, including loading, success, empty, and error state management.
4.  **Stateful Rendering**: In `DashboardView`, use the state from the hook to conditionally render `LoadingState`, `ErrorState`, `EmptyState`, or `WalletList`.
5.  **`WalletList` and `WalletCard`**: Create the `WalletList.tsx` and `WalletCard.tsx` presentational components. Style them using Tailwind CSS for a responsive grid layout. Ensure `WalletCard` is a navigational link.
6.  **Visual Components**: Implement `ProgressCircle.tsx` and `PerformanceIndicator.tsx`. Focus on making them reusable and accessible, with ARIA attributes.
7.  **Empty and Error States**: Create the `EmptyState.tsx` and `ErrorState.tsx` components with clear messaging and appropriate actions (e.g., a CTA button in `EmptyState`).
8.  **API Client Utility**: Ensure a global API client or utility function is available that automatically attaches the `Authorization` header and handles 401 redirects.
9.  **Styling and Final Touches**: Refine all Tailwind CSS styles for responsiveness, consistent spacing, and branding.
10. **Testing**: Write integration tests to verify that the view correctly handles all states: loading, displaying a list of wallets, displaying the empty state, and showing an error message.
