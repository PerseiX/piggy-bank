# View Implementation Plan: Create/Edit Wallet

## 1. Overview
This document outlines the implementation plan for the Create/Edit Wallet view. This view provides a form for users to create a new wallet or update an existing one. It will operate in two modes, "create" and "edit," determined by the URL. The view will feature client-side validation, handle API interactions for both creating and updating wallets, and provide clear user feedback for success and error scenarios.

## 2. View Routing
- **Create Mode**: `/wallets/new`
- **Edit Mode**: `/wallets/:id/edit`, where `:id` is the UUID of the wallet being edited.

## 3. Component Structure
The view will be composed of an Astro page component that handles routing and data fetching, and a client-side React component for the interactive form.

```
/src/pages/wallets/new.astro       (Redirects or renders the create form page)
/src/pages/wallets/[id]/edit.astro (Renders the edit form page)
└── WalletForm.tsx (client:visible)
    ├── Shadcn/ui Form
    │   ├── Label (for "Name")
    │   ├── Input (for name)
    │   ├── FormMessage (for name validation)
    │   ├── Label (for "Description")
    │   ├── Textarea (for description)
    │   ├── FormMessage (for description validation)
    └── Button (type="submit", text="Create Wallet" or "Save Changes")
```

## 4. Component Details

### `[...wallet].astro` (Dynamic Astro Page)
This page will handle both `/new` and `/[id]/edit` routes.

- **Component Description**: A server-side rendered Astro page that determines the mode (create or edit) based on the URL. For edit mode, it fetches the wallet's data and passes it as props to the `WalletForm` component. It also handles authorization, redirecting unauthenticated users or showing a 404 page if a wallet is not found.
- **Main Elements**: A main layout component, a heading (`<h1>`), and the client-side `<WalletForm />` component.
- **Handled Interactions**: None directly. It's responsible for rendering the correct UI based on the route.
- **Types**: `WalletDetailDto` (for fetching data in edit mode).
- **Props**: None.

### `WalletForm.tsx` (React Component)
- **Component Description**: A client-side, interactive form for creating or editing a wallet. It manages its own state, handles user input, performs client-side validation, and submits data to the API. It uses `react-hook-form` with a Zod resolver for state management and validation.
- **Main Elements**:
  - A `<form>` element using Shadcn/ui's Form provider.
  - Shadcn/ui `Input` for the wallet name.
  - Shadcn/ui `Textarea` for the wallet description.
  - Shadcn/ui `Button` for form submission.
  - Shadcn/ui `FormMessage` for displaying inline validation errors.
- **Handled Interactions**:
  - `onChange` on form fields to update internal state.
  - `onSubmit` on the form to trigger validation and the API call.
- **Handled Validation**:
  - `name`:
    - Required field.
    - Must be a string between 1 and 100 characters.
    - Handles a server-side `DUPLICATE_NAME` error (HTTP 409) by displaying a specific inline error message.
  - `description`:
    - Optional field.
    - If provided, must be a string with a maximum length of 500 characters.
- **Types**: `WalletFormViewModel`, `CreateWalletCommand`, `UpdateWalletCommand`.
- **Props**:
  ```typescript
  interface WalletFormProps {
    mode: 'create' | 'edit';
    initialData?: {
      id: string;
      name: string;
      description: string | null;
    };
  }
  ```

## 5. Types

### `WalletFormViewModel` (Client-side)
This type defines the shape of the data managed by `react-hook-form`.

```typescript
import { z } from 'zod';

export const walletFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100, "Name must be 100 characters or less."),
  description: z.string().trim().max(500, "Description must be 500 characters or less.").optional(),
});

export type WalletFormViewModel = z.infer<typeof walletFormSchema>;
```

### API Types (from `src/types.ts`)
- **Request (Create)**: `CreateWalletCommand`
- **Request (Update)**: `UpdateWalletCommand`
- **Response (Create)**: `WalletCreatedDto`
- **Response (Update)**: `WalletUpdatedDto`

## 6. State Management
- **Primary State**: Form state (`name`, `description`, validation errors, dirty fields) will be managed by `react-hook-form`. The form will be initialized with default empty values in "create" mode or with `initialData` props in "edit" mode.
- **Submission State**: A local `useState` hook (`const [isSubmitting, setIsSubmitting] = useState(false);`) will be used within `WalletForm.tsx` to track the loading state during API calls. This state will be used to disable the submit button and provide visual feedback to the user.
- **No custom hook is required**. The component's logic is self-contained.

## 7. API Integration
- **Create Wallet**:
  - **Trigger**: Form submission in "create" mode.
  - **Endpoint**: `POST /api/wallets`
  - **Request Body**: `CreateWalletCommand` (`{ name: string; description?: string; }`)
  - **Response Handling**:
    - `201 Created`: Redirect to the dashboard (`/`).
    - `409 Conflict`: Set a form error on the `name` field: "This wallet name is already in use."
    - Other errors: Display a generic error toast.
- **Update Wallet**:
  - **Trigger**: Form submission in "edit" mode.
  - **Endpoint**: `PATCH /api/wallets/${initialData.id}`
  - **Request Body**: `UpdateWalletCommand` (`{ name?: string; description?: string | null; }`)
  - **Response Handling**:
    - `200 OK`: Redirect to the dashboard (`/`).
    - `409 Conflict`: Set a form error on the `name` field: "This wallet name is already in use."
    - Other errors: Display a generic error toast.

## 8. User Interactions
- **Typing in Fields**: Form state updates on input change. Validation errors are shown on blur or submission.
- **Submitting the Form**:
  1. User clicks the "Create Wallet" or "Save Changes" button.
  2. Client-side validation is executed. If it fails, errors are displayed inline, and the submission is halted.
  3. If validation passes, the submit button is disabled.
  4. An API request is sent.
  5. On success, the user is redirected.
  6. On failure, an appropriate error message (inline for duplicate name, toast for others) is displayed, and the button is re-enabled.
- **Canceling**: An optional "Cancel" button can be added, which would navigate the user back to the dashboard (`/`).

## 9. Conditions and Validation
- **`name` is required**: The `min(1)` Zod rule and the `required` HTML attribute ensure the field is not empty. An error message is displayed if the condition is not met.
- **`name` length**: The `max(100)` Zod rule is enforced.
- **`description` length**: The `max(500)` Zod rule is enforced.
- **Form state**: The submit button will be disabled while `isSubmitting` is true to prevent multiple submissions. It can also be disabled if the form is pristine (no changes have been made) in edit mode.

## 10. Error Handling
- **Client-Side Validation Errors**: Handled by `react-hook-form` and displayed as inline messages next to the corresponding form fields.
- **Duplicate Wallet Name (409 Conflict)**: The `fetch` response is checked for this status code. If matched, `react-hook-form`'s `setError` function is used to manually apply an error to the `name` field.
- **Authentication Errors (401/403)**: A global fetch wrapper should be in place to catch these errors and redirect the user to the login page.
- **Not Found (404)**: In edit mode, if the initial server-side fetch in the Astro page fails with a 404, the page should render a custom 404 component instead of the form.
- **Server/Network Errors (5xx)**: A generic error message will be displayed using a Shadcn/ui `Toast` component (e.g., "An unexpected error occurred. Please try again.").

## 11. Implementation Steps
1. **Create Astro Page**: Create the dynamic Astro route file at `/src/pages/wallets/[...slug].astro`. Implement logic to handle `/new` and `/[id]/edit` paths. For edit mode, fetch wallet data server-side and handle not-found/unauthorized cases.
2. **Create React Form Component**: Create the `WalletForm.tsx` component in `/src/components/`.
3. **Set up Form Schema**: Define the `walletFormSchema` using Zod and the `WalletFormViewModel` type.
4. **Build Form UI**: Use Shadcn/ui's `Form`, `Input`, `Textarea`, `Label`, and `Button` components to build the form structure within `WalletForm.tsx`. Connect the fields to `react-hook-form`.
5. **Implement State Management**: Initialize `react-hook-form` using `useForm` with the Zod resolver. Manage the `isSubmitting` state with `useState`.
6. **Implement Submission Logic**: Write the `onSubmit` handler function. It should differentiate between "create" (`POST`) and "edit" (`PATCH`) modes based on the component's props.
7. **Implement Error Handling**: Inside the `onSubmit` handler's `catch` block, add logic to check for the HTTP status code (especially 409) and update the UI with form errors or toasts accordingly.
8. **Connect Page and Component**: In the Astro page, render the `<WalletForm client:visible />` component, passing the `mode` and `initialData` props as needed.
9. **Add Redirects**: On successful form submission, use `Astro.redirect` (if possible from an API route called by the form) or client-side navigation (`window.location.href`) to send the user to the dashboard.
10. **Testing**: Manually test all scenarios: creating a wallet, editing a wallet, input validation, duplicate name error, and general server errors.
