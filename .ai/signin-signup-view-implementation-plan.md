# View Implementation Plan: Sign In / Sign Up

## 1. Overview
This document outlines the implementation plan for the Sign In and Sign Up views. These views will allow new users to register and existing users to authenticate using their email and password. The entire authentication flow will be handled client-side using the Supabase client library, integrated within a reusable React form component.

## 2. View Routing
- **Sign In Page**: `/signin`
- **Sign Up Page**: `/signup`

Both pages will render the same core `AuthForm` component but with a different configuration. An Astro middleware should be implemented to redirect already authenticated users from these routes to the dashboard (`/`).

## 3. Component Structure
The view will be composed of Astro pages that host a shared, client-rendered React component.

```
- /src/pages/
  - signin.astro
  - signup.astro
- /src/components/
  - AuthForm.tsx         (React Component)
- /src/layouts/
  - Layout.astro         (Base Layout)
```

**Component Hierarchy:**
```
Layout.astro
└── [SignInPage.astro | SignUpPage.astro]
    └── AuthForm.tsx (client:load)
        ├── Card (Shadcn)
        │   ├── CardHeader
        │   ├── CardContent
        │   │   └── Form (react-hook-form)
        │   │       ├── FormField (Email)
        │   │       │   └── Input (Shadcn)
        │   │       ├── FormField (Password)
        │   │       │   └── Input (Shadcn)
        │   │       └── Button (Shadcn)
        │   └── CardFooter
        └── Toaster (e.g., Sonner for error notifications)
```

## 4. Component Details
### `AuthForm.tsx`
- **Component description**: A client-side React component that renders a form for either signing in or signing up. It manages form state, validation, submission, and communication with Supabase.
- **Main elements**:
  - A `Card` component from Shadcn/ui to wrap the form.
  - A `Form` component built with `react-hook-form` and Shadcn's form components.
  - Two `Input` fields for email and password.
  - A submit `Button` that shows a loading state.
  - A link to navigate between the sign-in and sign-up pages.
- **Handled interactions**:
  - `onSubmit`: Handles form submission, validates data, calls the appropriate Supabase auth function, and manages loading/error states.
- **Handled validation**: Client-side validation is performed using `zod` and `react-hook-form`.
  - `email`: Must be a valid email format.
  - `password`: Must be at least 8 characters long.
- **Types**: `AuthFormProps`, `AuthFormViewModel` (derived from `AuthFormSchema`).
- **Props**:
  - `variant: 'signin' | 'signup'`: Determines the form's mode, affecting the title, button text, and the Supabase function called on submit.

### `signin.astro` & `signup.astro`
- **Component description**: Astro pages that provide the routes `/signin` and `/signup`. They are responsible for rendering the main layout and the `AuthForm` component, passing the correct `variant` prop.
- **Main elements**: `Layout`, `<AuthForm client:load variant="..." />`.
- **Handled interactions**: None.
- **Handled validation**: None.
- **Types**: None.
- **Props**: None.

## 5. Types
### `AuthFormSchema` (Zod Schema)
A `zod` schema to define the validation rules for the form data.

```typescript
import { z } from "zod";

export const AuthFormSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters long.",
  }),
});
```

### `AuthFormViewModel` (TypeScript Type)
The type representing the form's data structure, inferred from the Zod schema.

```typescript
import { z } from "zod";
import { AuthFormSchema } from "./schemas"; // Assuming schema is in a separate file

export type AuthFormViewModel = z.infer<typeof AuthFormSchema>;
```

## 6. State Management
State will be managed locally within the `AuthForm.tsx` component using React hooks.
- **`react-hook-form`**: Manages form state, including input values, validation errors, and submission status. It will be initialized using the `zodResolver` for schema-based validation.
- **`useState`**:
  - `isLoading (boolean)`: To track the submission process, disable the form, and show loading indicators.
  - `serverError (string | null)`: To store and display any errors returned from Supabase after submission.

No custom hooks are required for this view.

## 7. API Integration
Integration is done directly with the Supabase client library (`@supabase/supabase-js`), not a custom REST API. A Supabase client instance should be initialized in `src/lib/supabase.ts` and imported into the component.

- **Sign Up**:
  - **Function**: `supabase.auth.signUp(credentials)`
  - **Request**: `{ email: string, password: string }`
  - **Response**: `Promise<{ data: { user; session }; error: AuthError | null }>`
- **Sign In**:
  - **Function**: `supabase.auth.signInWithPassword(credentials)`
  - **Request**: `{ email: string, password: string }`
  - **Response**: `Promise<{ data: { user; session }; error: AuthError | null }>`

## 8. User Interactions
- **Typing in fields**: Form state is updated via `react-hook-form`. Validation messages appear on blur or submit if data is invalid.
- **Submitting the form**:
  - **Outcome (Success)**: The user is authenticated, a session is created (via httpOnly cookie managed by `@supabase/ssr`), and the page redirects to the dashboard (`window.location.href = '/'`).
  - **Outcome (Failure)**: A server error message is displayed in a toast notification, and the form remains interactive.
- **Switching forms**: Clicking the link "Don't have an account? Sign Up" (or similar) navigates the user to the corresponding page (`/signup` or `/signin`).

## 9. Conditions and Validation
- **Email format**: Validated on the client-side using `zod` (`.string().email()`).
- **Password length**: Validated on the client-side using `zod` (`.string().min(8)`).
- **Duplicate Email**: This is a server-side condition handled by Supabase. The `AuthForm` will display the error returned from `supabase.auth.signUp()` if the email is already in use.
- **Invalid Credentials**: This is a server-side condition handled by Supabase. The `AuthForm` will display the "Invalid login credentials" error returned by `supabase.auth.signInWithPassword()`.

## 10. Error Handling
- **Client-Side Validation Errors**: Handled by `react-hook-form` and displayed as inline messages beneath the corresponding form fields.
- **Server-Side/API Errors**:
  - All calls to Supabase auth methods will be wrapped in a `try...catch` block.
  - Errors returned from Supabase (e.g., invalid credentials, user exists) will be caught and their `error.message` will be displayed to the user.
  - A global notification component (toast), such as `Sonner`, should be used to display these errors in a non-intrusive way.
  - A generic message like "An unexpected error occurred" will be shown for network issues or unknown Supabase errors.

## 11. Implementation Steps
1. **Setup Supabase Client**: Create `src/lib/supabase.ts` to initialize and export a singleton Supabase client instance using environment variables (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`).
2. **Install Dependencies**: Add `react-hook-form`, `zod`, `@hookform/resolvers`, and a toast library like `sonner`.
3. **Create Zod Schema**: Create a file for the `AuthFormSchema` as described in the **Types** section.
4. **Build `AuthForm.tsx` Component**:
   - Set up the component to accept the `variant` prop.
   - Use Shadcn/ui components (`Card`, `Input`, `Button`, `Form`) to build the UI.
   - Integrate `react-hook-form` with the `zodResolver` and the `AuthFormSchema`.
   - Implement the `onSubmit` handler which:
     - Sets `isLoading` to `true`.
     - Calls either `supabase.auth.signUp` or `supabase.auth.signInWithPassword` based on the `variant`.
     - Handles the success case by redirecting (`window.location.href`).
     - Handles the error case by setting `serverError` and displaying a toast.
     - Resets `isLoading` in a `finally` block.
5. **Create Astro Pages**:
   - Create `src/pages/signin.astro` and `src/pages/signup.astro`.
   - In each file, import and render the `AuthForm` component within the main layout, passing the appropriate `variant` prop and the `client:load` directive.
6. **Implement Middleware (Optional but Recommended)**:
   - In `src/middleware/index.ts`, check for a user session.
   - If a user is logged in and trying to access `/signin` or `/signup`, redirect them to the dashboard.
7. **Styling and Polish**: Ensure the form is responsive and adheres to the application's design system using Tailwind CSS utility classes. Add a link to easily navigate between the sign-in and sign-up pages.
