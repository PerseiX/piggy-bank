# View Implementation Plan: Instrument Create/Edit

## 1. Overview

This document outlines the implementation plan for the Instrument Create/Edit view. This view provides a form for users to add a new financial instrument to a specific wallet or edit an existing one. It will handle user input, client-side validation, currency formatting, and communication with the backend API for persistence. The view will function as a full page, accessible via direct routing.

## 2. View Routing

The view will be accessible via the following URL paths:

-   **Create Mode**: `/wallets/:walletId/instruments/new`
-   **Edit Mode**: `/wallets/:walletId/instruments/:instrumentId/edit`

The page will determine its mode (create or edit) based on the presence of the `:instrumentId` parameter.

## 3. Component Structure

The view will be composed of a primary Astro page that fetches data and a client-side React component that handles the form logic.

```
/src/pages/wallets/[walletId]/instruments/new.astro
/src/pages/wallets/[walletId]/instruments/[instrumentId]/edit.astro
  └── /src/layouts/Layout.astro
      └── /src/components/features/instruments/InstrumentForm.tsx (client:load)
          ├── Shadcn UI Form Fields (Input, Select, Textarea)
          │   └── /src/components/ui/CurrencyInput.tsx
          ├── Shadcn UI Button (for submission)
          └── Shadcn UI Toaster (for global notifications)
```

## 4. Component Details

### `InstrumentFormPage` (Astro Page)

This will be implemented as two files pointing to the same core logic: `new.astro` and `edit.astro`.

-   **Component Description**: A server-side rendered Astro page that acts as the entry point. In "edit" mode, it is responsible for fetching the instrument's data from the API and passing it as props to the React form component. In "create" mode, it renders the form with empty initial data.
-   **Main Elements**: It will use the main `Layout.astro` and render the `<InstrumentForm />` component.
-   **Handled Interactions**: None directly. It delegates all user interactions to the `InstrumentForm` component.
-   **Props**: Passes `walletId` and optional `instrument` data to `InstrumentForm`.

### `InstrumentForm` (React Component)

-   **Component Description**: A client-side React component that renders the complete form for creating or editing an instrument. It manages form state, validation, and submission logic using `react-hook-form` with a Zod schema.
-   **Main Elements**:
    -   `<Form>` from Shadcn UI, wrapping all fields.
    -   `<Select>` for the `type` field.
    -   `<Input>` for the `name` field.
    -   `<Textarea>` for the `short_description`.
    -   `<CurrencyInput>` (a custom or library-based component) for `invested_money_pln`, `current_value_pln`, and `goal_pln`.
    -   `<Button>` for form submission.
-   **Handled Interactions**:
    -   Form field changes.
    -   Form submission, which triggers validation and API calls.
-   **Handled Validation**:
    -   `type`: Must be one of the predefined `InstrumentType` enum values.
    -   `name`: Required, must be a string between 1 and 100 characters.
    -   `short_description`: Optional, max 500 characters.
    -   `invested_money_pln`, `current_value_pln`: Required, must be a string representing a positive number with up to two decimal places (e.g., "1500.50").
    -   `goal_pln`: Optional, same numeric format as above.
-   **Types**: `InstrumentFormViewModel`, `InstrumentDto`.
-   **Props**:
    -   `walletId: string`
    -   `instrument?: InstrumentDto` (The initial data for the form, provided in "edit" mode).
    -   `onSuccess: () => void` (Callback to execute on successful submission, e.g., for redirection).

### `CurrencyInput` (React Component)

-   **Component Description**: A reusable input component for monetary values. It should enforce the required numeric format and provide a user-friendly input experience.
-   **Main Elements**: An `<Input>` component with custom logic for formatting and validation.
-   **Handled Interactions**: `onChange` to update form state, `onBlur` to format the displayed value.
-   **Props**: Standard input props like `value`, `onChange`, `name`, `error`.

## 5. Types

### `InstrumentFormViewModel`

This type, derived from a Zod schema, will define the shape of the form's data.

```typescript
import { z } from 'zod';

const decimalStringSchema = z.string().regex(/^[0-9]+(\.[0-9]{1,2})?$/, {
  message: 'Must be a positive number with up to two decimal places.',
});

export const instrumentFormSchema = z.object({
  type: z.enum(['Bonds', 'ETF', 'Stocks'], { required_error: 'Type is required.' }),
  name: z.string().trim().min(1, 'Name is required.').max(100, 'Name must be 100 characters or less.'),
  short_description: z.string().trim().max(500, 'Description must be 500 characters or less.').optional().transform(val => (val === '' ? undefined : val)),
  invested_money_pln: decimalStringSchema,
  current_value_pln: decimalStringSchema,
  goal_pln: decimalStringSchema.optional().transform(val => (val === '' ? undefined : val)),
});

export type InstrumentFormViewModel = z.infer<typeof instrumentFormSchema>;
```

### DTOs

The form will interact with the following Data Transfer Objects from the API.

```typescript
// Request payload for creating an instrument
export type CreateInstrumentCommand = InstrumentFormViewModel;

// Request payload for updating an instrument
export type UpdateInstrumentCommand = Partial<InstrumentFormViewModel>;

// Data structure received from the API
export interface InstrumentDto {
  id: string;
  wallet_id: string;
  type: 'Bonds' | 'ETF' | 'Stocks';
  name: string;
  short_description: string | null;
  invested_money_grosze: number;
  current_value_grosze: number;
  goal_grosze: number | null;
  invested_money_pln: string;
  current_value_pln: string;
  goal_pln: string | null;
  created_at: string;
  updated_at: string;
}
```

## 6. State Management

State will be managed locally within the `InstrumentForm` component.

-   **Form State**: Managed by `react-hook-form`, which will handle field values, validation errors, and submission status.
-   **Server State**: API loading and error states (`isSubmitting`, `serverError`) will be managed using `useState` within the form's submission handler.
-   **Custom Hook (`useInstrumentForm`)**: A custom hook is recommended to encapsulate the form's logic, including:
    -   Initializing `react-hook-form` with the Zod resolver and default values.
    -   Providing the `onSubmit` handler.
    -   Handling API interactions (create/update).
    -   Managing success and error states.

## 7. API Integration

The form will integrate with two primary API endpoints.

-   **Create Instrument**:
    -   **Endpoint**: `POST /api/wallets/:walletId/instruments`
    -   **Request Type**: `CreateInstrumentCommand`
    -   **Response Type**: `{ data: InstrumentDto }`
-   **Update Instrument**:
    -   **Endpoint**: `PATCH /api/instruments/:instrumentId`
    -   **Request Type**: `UpdateInstrumentCommand`
    -   **Response Type**: `{ data: InstrumentDto }`
-   **Fetch Instrument (for Edit Mode)**:
    -   **Endpoint**: `GET /api/instruments/:instrumentId`
    -   **Response Type**: `{ data: InstrumentDto }`

API client functions will be created to abstract these fetch calls.

## 8. User Interactions

-   **Typing in fields**: Form state is updated on every keystroke.
-   **Selecting a type**: The `type` field in the form state is updated.
-   **Submitting the form**:
    1.  User clicks the "Save" or "Create" button.
    2.  `react-hook-form` triggers client-side validation using the Zod schema.
    3.  If validation fails, error messages are displayed inline, and the submission is blocked.
    4.  If validation passes, the corresponding API request (create or update) is sent. The submit button is disabled and shows a loading state.
    5.  On a successful API response, the `onSuccess` callback is invoked, and a success toast is displayed.
    6.  On an API error, an error message is displayed in a toast, and field-specific errors (like 409 Conflict) are set on the form.

## 9. Conditions and Validation

-   **Required Fields**: `type`, `name`, `invested_money_pln`, `current_value_pln` are validated using Zod's rules to ensure they are not empty.
-   **Data Format**: Monetary fields are validated against a regex to ensure they are valid decimal strings. String fields are validated for length.
-   **Name Uniqueness**: This is handled by the server. A `409 Conflict` response will be handled by setting a manual error on the `name` field in the form.
-   **Submission State**: The submit button will be disabled (`disabled={isSubmitting}`) during the API call to prevent duplicate submissions.

## 10. Error Handling

-   **Client-Side Validation Errors**: Displayed inline under each form field, managed by `react-hook-form`.
-   **API Validation Errors (`400`)**: A generic error toast is shown. If the response body contains per-field errors, they will be mapped back to the form fields using `setError`.
-   **Conflict Errors (`409`)**: A specific error message ("An instrument with this name already exists.") will be set for the `name` field.
-   **Not Found / Forbidden Errors (`404`, `403`)**: A general error toast will be displayed, and the user may be redirected to the dashboard.
-   **Server/Network Errors (`5xx`)**: A generic, non-technical error message will be shown in a toast (e.g., "An unexpected error occurred. Please try again.").

## 11. Implementation Steps

1.  **Create Astro Page Routes**: Set up the files `src/pages/wallets/[walletId]/instruments/new.astro` and `src/pages/wallets/[walletId]/instruments/[instrumentId]/edit.astro`.
2.  **Implement Data Fetching**: In `edit.astro`, implement the logic to fetch instrument data from the API based on the `instrumentId` URL parameter.
3.  **Define Types and Schema**: Create the Zod schema and `InstrumentFormViewModel` type in a shared location, likely `src/lib/validation/instruments.ts`.
4.  **Build `CurrencyInput` Component**: Create the reusable `CurrencyInput` component with appropriate formatting and validation logic.
5.  **Build `InstrumentForm` Component**:
    -   Create the `InstrumentForm.tsx` file.
    -   Set up the form layout using Shadcn UI components.
    -   Integrate `react-hook-form` and the Zod resolver (`@hookform/resolvers/zod`).
6.  **Implement State Management (`useInstrumentForm` hook)**:
    -   Create the custom hook to manage form initialization, state, and submission logic.
    -   Implement the `onSubmit` handler which differentiates between create and update modes.
7.  **Create API Client Functions**: Implement the `createInstrument`, `updateInstrument`, and `getInstrument` functions that handle the `fetch` calls.
8.  **Integrate API Calls**: Call the API client functions from the `useInstrumentForm` hook and handle success and error responses.
9.  **Implement Error Handling**: Add `Toast` notifications for success and various error scenarios. Map API errors back to form fields where applicable.
10. **Connect Page and Component**: In the Astro pages, render the `InstrumentForm` component, passing the `walletId` and fetched `instrument` data as props. Implement the `onSuccess` callback to handle redirection.
11. **Testing and Refinement**: Manually test both create and edit flows, including all validation and error cases. Ensure the UI is responsive and accessible.
