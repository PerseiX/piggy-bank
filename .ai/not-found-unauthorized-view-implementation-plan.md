# View Implementation Plan: Not Found / Unauthorized

## 1. Overview
This document outlines the implementation plan for the `Not Found (404)` and `Unauthorized (401)` error views. These views provide clear, user-friendly feedback when a user attempts to access a non-existent, soft-deleted, or restricted resource. The `401` view also handles the critical task of clearing the user's session data to ensure security.

## 2. View Routing
- **Not Found**: The view will be accessible at `/404`. Astro will automatically handle routing to `src/pages/404.astro` for server-rendered 404 responses.
- **Unauthorized**: The view will be accessible at `/401`. The application's global API handler will redirect users to this page when a `401 Unauthorized` status is received. This page will be located at `src/pages/401.astro`.

## 3. Component Structure
The views will be composed of a shared layout and a reusable display component to ensure consistency.

```
/src
├── components/
│   └── custom/
│       └── ErrorDisplay.astro      # Reusable component for displaying error info
├── layouts/
│   └── ErrorLayout.astro           # Shared layout for 404 and 401 pages
└── pages/
    ├── 401.astro                   # Unauthorized page
    └── 404.astro                   # Not Found page
```

## 4. Component Details

### `ErrorLayout.astro`
- **Component description**: A basic Astro layout that provides the HTML shell and centers the content. It will not include any authenticated elements like a user-specific navigation bar.
- **Main elements**: `<html>`, `<head>`, `<body>`, and a `<slot />` for the page content, wrapped in a flex container to center the content on the page.
- **Handled interactions**: None.
- **Handled validation**: None.
- **Types**: None.
- **Props**: `title: string`.

### `ErrorDisplay.astro`
- **Component description**: A reusable presentation component responsible for rendering the error title, descriptive message, and a call-to-action (CTA) button.
- **Main elements**: An `<h1>` for the title, a `<p>` for the message, and a Shadcn/ui `<Button>` component rendered as a link (`<a>` tag) for the CTA.
- **Handled interactions**: Navigation via the CTA link.
- **Handled validation**: None.
- **Types**: `Props`.
- **Props**:
  ```typescript
  interface Props {
    title: string;
    message: string;
    cta: {
      text: string;
      href: string;
    };
  }
  ```

### `404.astro`
- **Component description**: The page displayed when a resource is not found. It uses the `ErrorLayout` and `ErrorDisplay` components.
- **Main elements**: Instantiates `ErrorDisplay` with props specific to the 404 case.
- **Handled interactions**: User clicking the CTA to navigate to the dashboard.
- **Handled validation**: None.
- **Types**: None.
- **Props**: None.

### `401.astro`
- **Component description**: The page displayed when a user is unauthorized. It is responsible for clearing the user's session.
- **Main elements**: 
  - Instantiates `ErrorDisplay` with props specific to the 401 case.
  - A client-side `<script>` tag to handle session clearing logic.
- **Handled interactions**: User clicking the CTA to navigate to the sign-in page. The page load event triggers the session-clearing script.
- **Handled validation**: None.
- **Types**: None.
- **Props**: None.

## 5. Types
The only new type required is the props interface for the `ErrorDisplay` component.

```typescript
// src/components/custom/ErrorDisplay.astro
export interface Props {
  // The main title of the error page (e.g., "Page Not Found").
  title: string;
  // A descriptive message explaining the error to the user.
  message: string;
  // An object containing the text and URL for the call-to-action button.
  cta: {
    text: string;
    href: string;
  };
}
```

## 6. State Management
These views are stateless. The `401.astro` page contains a client-side script that interacts directly with `localStorage` to clear the user's session token upon page load. No custom hooks or state management libraries are necessary.

## 7. API Integration
These views do not directly integrate with any API endpoints. Instead, they are the destination following a failed API request. A global API handling mechanism (e.g., a `fetch` wrapper or interceptor) must be implemented or updated to perform the following logic:
- On receiving a `401 Unauthorized` response, redirect the user to `/401`.
- On receiving a `404 Not Found` response (where appropriate for page-level resources), redirect the user to `/404`.

The script in `401.astro` will perform a client-side action:
```javascript
// In src/pages/401.astro
<script>
  // Assuming the JWT is stored under the key 'session_token'
  localStorage.removeItem('session_token');
</script>
```

## 8. User Interactions
- **User lands on `/404`**: The user sees the "Not Found" message and can click the "Go to Dashboard" button to navigate to the application's root (`/`).
- **User lands on `/401`**: The user's session token is automatically cleared from `localStorage`. The user sees the "Unauthorized" message and can click the "Go to Sign In" button to navigate to `/signin`.

## 9. Conditions and Validation
No user-input validation occurs on these pages. The primary condition being handled is the HTTP status code from a previous, failed API request, which is managed by the global API client.

## 10. Error Handling
- **Endless Redirect Loop**: To prevent a redirect loop, the `ErrorLayout` must be minimal and must not trigger any authentication checks or API calls that could result in another `401` error.
- **Script Failure**: The session clearing script in `401.astro` should be wrapped in a `try...catch` block to prevent any potential browser-specific issues from breaking the page and to log errors to the console for debugging.

## 11. Implementation Steps
1. **Create `ErrorLayout.astro`**: In `src/layouts/`, create a new layout file that provides a basic HTML structure and centers its content without including any authenticated navigation or data-fetching.
2. **Create `ErrorDisplay.astro`**: In `src/components/custom/`, create the reusable component that accepts `title`, `message`, and `cta` props to render the error information.
3. **Implement `404.astro`**: Create the page in `src/pages/`. Use `ErrorLayout` and pass the appropriate 404-related props to `ErrorDisplay` (e.g., title: "Page Not Found", CTA to "/").
4. **Implement `401.astro`**: Create the page in `src/pages/`. 
   - Use `ErrorLayout` and pass 401-related props to `ErrorDisplay` (e.g., title: "Unauthorized", CTA to "/signin").
   - Add a `<script>` tag with JavaScript to remove the session token from `localStorage`.
5. **Update Global API Handler**: Modify the application's centralized API client to intercept `401` and `404` responses and perform a `window.location.href` redirect to the corresponding error page.
