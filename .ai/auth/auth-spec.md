# Authentication Architecture Specification

This document outlines the technical architecture for implementing user authentication (registration, login, logout, password recovery) in the Piggy Bank application. The architecture is based on the requirements from `.ai/prd.md` (US-001, US-002, US-003) and the technology stack defined in `.ai/tech-stack.md`. Note: `prd.md` and `tech-stack.md` remain in the root `.ai/` directory.

## 1. User Interface Architecture

The frontend will be structured to clearly separate public-facing auth pages from protected application views, ensuring a seamless and secure user experience.

### 1.1. Pages

New pages will be created to handle authentication flows. Existing pages will be protected.

-   **`/src/pages/auth/login.astro`**:
    -   **Purpose**: Displays the login form for existing users.
    -   **Framework**: Astro page embedding a client-side React component (`AuthForm`).
    -   **Behavior**: If an authenticated user tries to access this page, they will be redirected to `/`.

-   **`/src/pages/auth/signup.astro`**:
    -   **Purpose**: Displays the registration form for new users.
    -   **Framework**: Astro page embedding a client-side React component (`AuthForm`).
    -   **Behavior**: If an authenticated user tries to access this page, they will be redirected to `/`.

-   **`/src/pages/auth/forgot-password.astro`**:
    -   **Purpose**: Provides a form for users to enter their email address to receive a password reset link.
    -   **Framework**: Astro page with a simple form component (React).

-   **`/src/pages/auth/update-password.astro`**:
    -   **Purpose**: A page where users can set a new password. This page is accessed via the link sent to their email.
    -   **Framework**: Astro page with a React component to handle the password update form. It will manage the password reset token provided by Supabase in the URL.

### 1.2. Components

-   **`src/components/AuthForm.tsx` (React)**:
    -   **Purpose**: A reusable, client-side component for handling both login and signup to ensure a consistent UX.
    -   **Props**: `mode: 'login' | 'signup'`.
    -   **Responsibilities**:
        -   Manage form state (email, password).
        -   Implement client-side validation using `zod` and `react-hook-form`.
        -   Submit form data to the corresponding API endpoints (`/api/auth/login` or `/api/auth/signup`).
        -   Display validation errors from the client and error messages from the server.

-   **`src/components/AppHeader.tsx` (React) - Extension**:
    -   **Purpose**: To be updated to reflect the user's authentication state.
    -   **Authenticated State**: Will display the user's email and a "Sign Out" button.
    -   **Unauthenticated State**: Will display "Sign In" and "Sign Up" links, directing to the respective pages.

### 1.3. Layouts

Layouts will enforce authentication boundaries and provide a consistent structure.

-   **`src/layouts/AuthLayout.astro`**:
    -   **Purpose**: A new layout for all authentication-related pages (`/auth/*`).
    -   **Content**: Will have a simple, centered layout suitable for forms, without the main application navigation.

-   **`src/layouts/AppLayout.astro` - Extension**:
    -   **Purpose**: The main layout for the authenticated parts of the application.
    -   **Behavior**: Will render the extended `AppHeader` component. The user's session data will be passed down from the page props, which are populated by the middleware.

### 1.4. Scenarios & User Flow

-   **New User Registration**:
    1.  User navigates to `/auth/signup`.
    2.  Fills out the `AuthForm` and submits.
    3.  The form calls `POST /api/auth/signup`.
    4.  On success, a session is created, and the user is redirected to `/`.
    5.  On failure (e.g., email already exists), an error message is displayed on the form.

-   **User Login**:
    1.  User navigates to `/auth/login`.
    2.  Submits credentials via the `AuthForm`.
    3.  The form calls `POST /api/auth/login`.
    4.  On success, the session is established, and the user is redirected to `/`.
    5.  On failure (e.g., invalid credentials), an error message is shown.

-   **User Logout**:
    1.  User clicks the "Sign Out" button in `AppHeader`.
    2.  A request is sent to `POST /api/auth/logout`.
    3.  The session is terminated, and the user is redirected to `/auth/login`.

-   **Accessing Protected Routes**:
    1.  An unauthenticated user attempts to access any route except `/auth/*`.
    2.  The Astro middleware intercepts the request.
    3.  The user is redirected to `/auth/login`.

### 1.5. Validation and Error Messages

-   **Client-Side**:
    -   **Email**: Must be a valid email format. Message: "Please enter a valid email address."
    -   **Password**: Must be at least 8 characters long. Message: "Password must be at least 8 characters long."
    -   Validation will be real-time (on blur) using `react-hook-form` and `zod`.
-   **Server-Side**:
    -   **Duplicate Email (Signup)**: "An account with this email already exists."
    -   **Invalid Credentials (Login)**: "Invalid email or password."
    -   **Generic Server Error**: "An unexpected error occurred. Please try again."

## 2. Backend Logic

The backend will consist of API endpoints for handling authentication logic and a middleware to protect routes.

### 2.1. API Endpoints

All endpoints will be located under `/src/pages/api/auth/`.

-   **`POST /api/auth/signup`**:
    -   **Request Body**: `{ email: string, password: string }`.
    -   **Logic**:
        1.  Validate input data using a Zod schema.
        2.  Call `supabase.auth.signUp()` with the provided credentials.
        3.  If successful, the response from Supabase will contain session data. Set the session cookies in the response headers.
        4.  Return a success response.
    -   **Error Handling**: Catches errors from Supabase (e.g., user already exists) and returns a `409 Conflict` or `400 Bad Request` status with a descriptive error message.

-   **`POST /api/auth/login`**:
    -   **Request Body**: `{ email: string, password: string }`.
    -   **Logic**:
        1.  Validate input.
        2.  Call `supabase.auth.signInWithPassword()`.
        3.  If successful, set session cookies.
        4.  Return a success response.
    -   **Error Handling**: Returns a `401 Unauthorized` status for invalid credentials.

-   **`POST /api/auth/logout`**:
    -   **Logic**:
        1.  Call `supabase.auth.signOut()`.
        2.  Clear the session cookies from the browser.
        3.  Return a success response.

-   **`POST /api/auth/forgot-password`**:
    -   **Request Body**: `{ email: string }`.
    -   **Logic**:
        1.  Validate email.
        2.  Call `supabase.auth.resetPasswordForEmail()` with a `redirectTo` URL pointing to `/auth/update-password`.
    -   **Note**: This endpoint will always return a success response to prevent email enumeration attacks.

### 2.4. Authorization

While the primary focus of this document is authentication (verifying user identity), the authentication system is the foundation for authorization (controlling access to resources). This section clarifies how authorization will be implemented to meet the requirements of US-016.

-   **User Identity**: The middleware (`src/middleware/index.ts`) makes the authenticated user's data available in `Astro.locals.user` on the server. This object, containing at least the user's ID, will be the source of truth for all authorization checks.

-   **Data Access Control**: All API endpoints that interact with user-specific data (e.g., wallets, instruments) **must** use the `Astro.locals.user.id` to scope their database queries. For instance, when fetching wallets, the query must include a clause like `WHERE owner_id = :current_user_id`. This ensures that a user can only view and manipulate their own data.

-   **Handling Unauthorized Access**: If a user attempts to access a resource they do not own (e.g., by guessing a wallet ID in the URL), the API endpoint should return a `404 Not Found` response. This is a common practice to avoid revealing the existence of resources to unauthorized users. A `403 Forbidden` is also acceptable if we prefer to be more explicit.

### 2.2. Data Models and Validation

-   **User Data**: The primary user data will reside in Supabase's `auth.users` table. For application-specific data, a `profiles` table can be created and linked via the user's ID.
-   **Validation**: `Zod` will be used for defining schemas for all API endpoint inputs to ensure type safety and validation consistency between client and server.

### 2.3. Server-Side Rendering & Middleware

To support dynamic, per-user content, the application must be configured for server-side rendering.

-   **`astro.config.mjs`**:
    -   The `output` option must be set to `'server'`. This enables server-side rendering for all pages and allows the use of middleware.

-   **`src/middleware/index.ts`**:
    -   **Purpose**: To manage sessions and protect routes on every request.
    -   **Logic**:
        1.  It will run for every page or API route request.
        2.  It will extract the access and refresh tokens from the request cookies.
        3.  If tokens exist, it will call `supabase.auth.setSession()` to validate them.
        4.  The user's authentication state and data will be stored in `Astro.locals` (e.g., `Astro.locals.user`). This makes it available in all server-rendered Astro pages.
        5.  For protected routes (all routes except `/auth/*` and auth API endpoints), if `Astro.locals.user` is not present, it will redirect the user to `/auth/login`.
        6.  For auth routes (e.g., `/auth/login`), if a user *is* logged in, it will redirect to `/`.

## 3. Authentication System (Supabase Auth)

Supabase Auth will be the foundation of the authentication system.

### 3.1. Supabase Client

-   A server-side Supabase client instance will be initialized in `src/db/supabase.ts` using the service role key for admin-level operations within API routes if needed.
-   For use in middleware and API routes handling user sessions, a new Supabase client will be created per request to handle the user's specific auth context via cookies.

### 3.2. Session Management

-   **Mechanism**: Supabase uses JSON Web Tokens (JWTs). The Supabase client library manages token refreshing automatically.
-   **Storage**: Session tokens (access and refresh) will be stored in secure, `HttpOnly` cookies. This prevents them from being accessed by client-side JavaScript, mitigating XSS risks.
-   **Flow**:
    1.  Login/Signup API endpoints receive tokens from Supabase.
    2.  The endpoints set these tokens as cookies in the HTTP response.
    3.  The `middleware` reads these cookies on subsequent requests to reconstruct the user session on the server.
    4.  The logout endpoint clears these cookies.

### 3.3. Password Recovery

-   The password recovery flow is orchestrated by Supabase.
-   When a user requests a password reset, Supabase sends them an email containing a secure link.
-   This link directs the user to the `/auth/update-password` page in the application. The link contains a token that Supabase's client-side library can detect and use to verify the user's identity.
-   The React component on the `update-password` page will handle the `onAuthStateChange` event from the Supabase client to capture the recovery event and allow the user to securely set a new password.
