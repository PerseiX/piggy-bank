# View Implementation Plan: Instrument Details

## 1. Overview
This document outlines the implementation plan for the Instrument Details view. This view serves as the primary interface for users to inspect a single financial instrument, view its key metrics, and browse its historical value changes. The view will be accessible via a unique URL for each instrument and will provide entry points for editing or deleting the instrument.

## 2. View Routing
The Instrument Details view will be accessible at the following dynamic path:
- **Path**: `/instruments/[id]`
- The `[id]` parameter represents the UUID of the instrument.

## 3. Component Structure
The view will be composed of a main Astro page that renders a primary React component, which in turn orchestrates several smaller, focused components.

```
/src/pages/instruments/[id].astro
└── /src/components/features/instruments/InstrumentDetailsView.tsx (Client-side Component)
    ├── /src/components/ui/Breadcrumb.tsx (hierarchical navigation)
    ├── /src/components/features/instruments/InstrumentHeader.tsx
    │   ├── /src/components/ui/Button.tsx (for View History action)
    │   └── /src/components/ui/Button.tsx (for Delete action)
    ├── /src/components/features/instruments/InstrumentMetrics.tsx
    │   └── /src/components/ui/Card.tsx (for each metric)
    └── /src/components/features/instruments/ValueChangeHistory.tsx
        └── /src/components/ui/Accordion.tsx
            └── /src/components/ui/Table.tsx
```

### Breadcrumb Navigation
The view includes a breadcrumb component at the top showing the navigation hierarchy:
- **Path**: `Wallets › Wallet › {Instrument Name}`
- Uses shadcn/ui `Breadcrumb` components for consistent styling
- Each item is clickable to navigate back to that level
- Current page (instrument name) is displayed as non-clickable text

## 4. Component Details

### `InstrumentDetailsView.tsx`
- **Component description**: This is the main client-side React component ("island") that fetches all necessary data, manages the view's state (loading, error, data), and renders the overall layout and child components.
- **Main elements**: A root `div` containing `InstrumentHeader`, `InstrumentMetrics`, and `ValueChangeHistory`. It will also render loading spinners or error messages based on the current state.
- **Handled interactions**: Manages the trigger for lazy-loading the value change history when the corresponding accordion is expanded for the first time.
- **Handled validation**: Not applicable directly, but it interprets API responses (e.g., 404, 403) to render appropriate UI states.
- **Types**: `InstrumentDto`, `ValueChangeDto`
- **Props**:
  ```typescript
  interface InstrumentDetailsViewProps {
    instrumentId: string;
  }
  ```

### `InstrumentHeader.tsx`
- **Component description**: A presentational component that displays the instrument's name, type, and provides action buttons for editing and deleting.
- **Main elements**: `h1` for the name, a `Badge` component for the type, and two `Button` components for the actions.
- **Handled interactions**:
  - `onClick` on the "Edit" button, which will navigate to the edit page or open a modal.
  - `onClick` on the "Delete" button, which will trigger a confirmation flow.
- **Handled validation**: None.
- **Types**: `InstrumentHeaderViewModel`
- **Props**:
  ```typescript
  interface InstrumentHeaderProps {
    instrument: InstrumentHeaderViewModel;
    onEdit: () => void;
    onDelete: () => void;
  }
  ```

### `InstrumentMetrics.tsx`
- **Component description**: Displays the key financial figures for the instrument, including current value, invested money, goal, and the calculated delta.
- **Main elements**: A grid of `Card` components, each containing a `CardHeader` with the metric title and `CardContent` with the formatted value.
- **Handled interactions**: None.
- **Handled validation**: None.
- **Types**: `InstrumentMetricsViewModel`
- **Props**:
  ```typescript
  interface InstrumentMetricsProps {
    metrics: InstrumentMetricsViewModel;
  }
  ```

### `ValueChangeHistory.tsx`
- **Component description**: A collapsible section that lazy-loads and displays the instrument's value change history in a table.
- **Main elements**: Uses the Shadcn/ui `Accordion` component as the container. When expanded, it displays a loading state or a `Table` component with the history data.
- **Handled interactions**: The component internally handles the expand/collapse state via the `Accordion` logic.
- **Handled validation**: None.
- **Types**: `ValueChangeDto[]`
- **Props**:
  ```typescript
  interface ValueChangeHistoryProps {
    instrumentId: string;
  }
  ```

## 5. Types

### DTOs (Data Transfer Objects from API)
- **`InstrumentDto`**: Represents the full instrument object received from `GET /api/instruments/:id`.
- **`ValueChangeDto`**: Represents a single value change record from `GET /api/instruments/:id/value-changes`.

### ViewModels (Custom types for components)
- **`InstrumentHeaderViewModel`**: A subset of `InstrumentDto` for the header.
  ```typescript
  // src/components/features/instruments/InstrumentHeader.tsx
  interface InstrumentHeaderViewModel {
    name: string;
    type: InstrumentType; // from src/types.ts
  }
  ```
- **`InstrumentMetricsViewModel`**: A processed type for displaying financial metrics, including a calculated delta.
  ```typescript
  // src/components/features/instruments/InstrumentMetrics.tsx
  interface InstrumentMetricsViewModel {
    currentValuePln: string;
    investedPln: string;
    goalPln: string | null;
    deltaPln: string;
    deltaDirection: 'increase' | 'decrease' | 'unchanged';
  }
  ```

## 6. State Management
A custom hook, `useInstrumentDetails`, will be created to encapsulate all state management and data fetching logic for the view. This hook will be used within the `InstrumentDetailsView` component.

- **Hook**: `useInstrumentDetails(instrumentId: string)`
- **State**:
  - `instrument: InstrumentDto | null`
  - `isLoading: boolean`
  - `error: { status: number; message: string } | null`
- **Purpose**:
  - Fetches instrument details on mount.
  - Manages loading and error states for the main instrument data.
  - Exposes the fetched data and state to the component.
- The `ValueChangeHistory` component will manage its own internal state for fetching and displaying history data to keep concerns separated and facilitate lazy-loading.

## 7. API Integration
- **Primary Endpoint**: `GET /api/instruments/:id`
  - **Request**: Sent on component mount to fetch the main instrument details.
  - **Response Type**: `Promise<{ data: InstrumentDto }>`
- **Secondary Endpoint**: `GET /api/instruments/:id/value-changes`
  - **Request**: Sent when the history accordion is expanded for the first time.
  - **Response Type**: `Promise<{ data: ValueChangeDto[] }>`

Both API calls will be made from client-side code using a shared API client utility that handles authentication headers.

## 8. User Interactions
- **Page Load**: User navigates to `/instruments/[id]`. The `InstrumentDetailsView` shows a loading state, then displays the header and metrics. The history section is collapsed.
- **Expand History**: User clicks the "Value Change History" accordion trigger. A loading spinner is shown inside the accordion panel, the history is fetched, and then the table of changes is rendered. Subsequent expansions will show cached data.
- **Click Edit**: User clicks the "Edit" button. The application will navigate to `/instruments/[id]/edit`.
- **Click Delete**: User clicks the "Delete" button. A confirmation modal will appear. If confirmed, an API call to delete the instrument is made, and on success, the user is redirected to their dashboard.

## 9. Conditions and Validation
- **URL Parameter**: The `id` from the URL is assumed to be a valid UUID. The API call will fail if it's not, which will be handled as a "Not Found" error.
- **Authorization**: The view relies entirely on the API's authorization. If the API returns a `403 Forbidden` or `404 Not Found`, the UI will display a user-friendly message indicating the instrument cannot be accessed or found.
- **Data Display**: The delta between `currentValue` and `investedMoney` will be displayed with an icon (e.g., up/down arrow) and color to indicate positive or negative change, satisfying accessibility requirements for non-color indicators.

## 10. Error Handling
- **Not Found (404) / Forbidden (403)**: If the main instrument fetch fails with one of these statuses, the view will render a dedicated "Instrument Not Found" component with a link back to the dashboard.
- **Server Error (500)**: A generic error message, "Something went wrong, please try again later," will be displayed.
- **History Fetch Failure**: If the instrument details load but the history fetch fails, an error message will be displayed only within the `ValueChangeHistory` accordion panel, allowing the rest of the view to remain interactive.

## 11. Related View: Instrument History Page

A dedicated history page is available at `/instruments/[id]/history` for users who want to see the full value change history with charts and detailed analysis.

### Component Structure
```
/src/pages/instruments/[id]/history.astro
└── /src/components/features/instruments/InstrumentHistoryView.tsx (Client-side Component)
    ├── /src/components/ui/Breadcrumb.tsx (hierarchical navigation)
    ├── /src/components/features/instruments/ValueChangeChart.tsx (line chart visualization)
    └── /src/components/ui/Table.tsx (detailed history table)
```

### Breadcrumb Navigation
- **Path**: `Wallets › Wallet › {Instrument Name} › History`
- Uses shadcn/ui `Breadcrumb` components for consistent styling
- Each item is clickable to navigate back to that level
- Current page ("History") is displayed as non-clickable text

### Key Features
- Summary stats cards (Current Value, Invested Money, Total Changes)
- Line chart visualization of value changes over time
- Detailed table with date/time, before/after values, and change amount
- Color-coded delta values (green for increase, red for decrease)

## 12. Implementation Steps
1.  **Create Page File**: Create the Astro page file at `src/pages/instruments/[id].astro`. Set up the main layout and pass the `id` param to the main React component.
2.  **Develop Components**: Create the React components: `InstrumentDetailsView`, `InstrumentHeader`, `InstrumentMetrics`, and `ValueChangeHistory` in `src/components/features/instruments/`.
3.  **Implement `useInstrumentDetails` Hook**: Create the custom hook to handle fetching the main instrument data and manage its state.
4.  **Build `InstrumentDetailsView`**: Implement the main view component, use the hook, and compose the child components. Add logic to handle loading and error states. Include breadcrumb navigation.
5.  **Build `InstrumentHeader` and `InstrumentMetrics`**: Implement these presentational components, ensuring they correctly display the data passed via props.
6.  **Build `ValueChangeHistory`**: Implement the accordion and table, including the lazy-loading logic to fetch data only on first expansion. Handle its independent loading and error states.
7.  **Add API Functions**: Add the necessary client-side functions for making the `GET` requests to the two API endpoints.
8.  **Styling**: Apply Tailwind CSS classes to all components to match the application's design system, leveraging Shadcn/ui components where appropriate.
9.  **Connect Actions**: Wire up the `onEdit` and `onDelete` handlers in `InstrumentHeader` to their respective logic (navigation and confirmation modal).
10. **Build History Page**: Create `/instruments/[id]/history.astro` and `InstrumentHistoryView.tsx` with breadcrumb navigation, chart visualization, and detailed history table.
11. **Testing**: Write component tests for the new components, especially for the logic within `useInstrumentDetails` and the conditional rendering in `InstrumentDetailsView` and `ValueChangeHistory`.
