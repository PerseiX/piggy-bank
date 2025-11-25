# Layout and Header Implementation

This document describes the implementation of the application layout with user state verification and logout functionality.

## Implementation Date
November 25, 2025

## Overview
Extended `Layout.astro` with authentication state awareness and created `AppHeader.tsx` component to display user information and provide logout functionality for authenticated users.

## Changes Implemented

### 1. AppHeader Component (`src/components/AppHeader.tsx`)

**Purpose**: Responsive header component that adapts based on authentication state.

**Features**:
- **Authenticated State**:
  - Displays app logo with link to home
  - Shows user email with avatar initial
  - Provides "Sign Out" button that calls `/api/auth/logout`
  - Navigation links (currently "Wallets")
  - Loading state during logout process
  - Toast notifications for logout success/failure
  
- **Unauthenticated State**:
  - Displays app logo
  - Shows "Sign In" and "Sign Up" buttons linking to auth pages
  
**Props**:
```typescript
type AppHeaderProps = {
  user?: {
    id: string;
    email?: string;
  } | null;
};
```

**Logout Flow**:
1. User clicks "Sign Out" button
2. Component sets loading state
3. Calls `POST /api/auth/logout`
4. On success: Shows success toast and redirects to `/auth/login`
5. On error: Shows error toast and keeps user on current page

**Responsive Design**:
- Mobile: Shows avatar and logout button, hides email text
- Desktop: Shows avatar, email, and logout button
- Navigation links hidden on mobile (< md breakpoint)

**Accessibility**:
- Semantic HTML with `<header>` element
- ARIA attributes for avatar (aria-hidden on decorative element)
- Disabled state on logout button during loading
- Clear focus states on interactive elements

### 2. Extended Layout (`src/layouts/Layout.astro`)

**Changes**:
- Added `AppHeader` component import
- Added optional `showHeader` prop (default: `true`)
- Reads user from `Astro.locals.user` (provided by middleware)
- Passes user data to `AppHeader` component
- Uses `client:load` directive for interactive header

**Props**:
```typescript
interface Props {
  title?: string;
  showHeader?: boolean;
}
```

**Usage**:
```astro
<Layout title="My Page">
  <!-- Your content -->
</Layout>

<!-- Or hide header on specific pages -->
<Layout title="Auth Page" showHeader={false}>
  <!-- Auth content -->
</Layout>
```

### 3. Simplified Index Page (`src/pages/index.astro`)

**Changes**:
- Removed redundant authentication checks (handled by middleware)
- Simplified to rely on middleware for auth enforcement
- Cleaner, more maintainable code

**Before**:
```astro
// Multiple auth checks and redirects
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return Astro.redirect("/signin");
}
```

**After**:
```astro
// User guaranteed authenticated by middleware
const { data: { session } } = await Astro.locals.supabase.auth.getSession();
```

## Architecture Compliance

### Astro Best Practices ✅
- Server-side rendering with user data from `Astro.locals`
- Client-side interactivity only where needed (`client:load` directive)
- Semantic HTML structure
- Proper use of Astro components and layouts

### React Best Practices ✅
- Functional component with hooks (`useState`)
- Proper error handling and loading states
- Event handlers with useCallback-equivalent pattern
- No "use client" directives (Astro integration)
- Clean, maintainable component structure

### Accessibility ✅
- Semantic HTML (`<header>`, `<nav>`)
- ARIA attributes where appropriate
- Keyboard navigation support
- Focus management
- Screen reader friendly text

## User Experience Highlights

1. **Seamless Authentication State**: Header automatically reflects user's login status
2. **Clear Feedback**: Toast notifications for all actions
3. **Loading States**: Disabled UI during async operations prevents double-clicks
4. **Responsive Design**: Works on mobile and desktop
5. **Navigation**: Easy access to main sections from header
6. **Brand Consistency**: Logo and app name always visible

## Integration with Existing Systems

### Works With Middleware
- Middleware sets `Astro.locals.user` → Header displays user info
- Middleware redirects unauthenticated users → Header never shows invalid state
- Logout clears session → Middleware redirects on next request

### Works With Auth Flow
- Login/Signup sets session → Middleware populates user → Header shows user
- Logout clears session → Redirects to login → Header shows Sign In/Up buttons
- Session expiry → Middleware redirects → User sees auth pages

### Works With Protected Routes
- All pages using `Layout.astro` get the header automatically
- `AuthLayout.astro` remains separate (no header for auth pages)
- Can selectively disable header with `showHeader={false}` prop

## Styling

Uses Tailwind CSS utility classes with:
- Consistent spacing and sizing
- Border and shadow for visual hierarchy
- Color tokens (`primary`, `muted-foreground`, etc.)
- Responsive breakpoints (`sm:`, `md:`, `hidden`)
- Hover and transition effects
- Container for proper content width

## Files Created/Modified

### Created
- `src/components/AppHeader.tsx` - New header component
- `.ai/layout-header-implementation.md` - This document

### Modified
- `src/layouts/Layout.astro` - Added header and user state
- `src/pages/index.astro` - Simplified auth logic

## Testing Checklist

- [x] No linting errors
- [ ] Header shows user email when logged in
- [ ] Logout button works and redirects to login
- [ ] Header shows Sign In/Up when not logged in
- [ ] Responsive design works on mobile
- [ ] Avatar shows correct initial
- [ ] Navigation links work
- [ ] Toast notifications appear on logout
- [ ] Loading state disables button during logout
- [ ] Error handling works if logout fails
- [ ] AuthLayout pages don't show the header

## Next Enhancements (Optional)

1. **User Profile Page**: Link from user avatar/email
2. **Notifications**: Bell icon with notification count
3. **Settings**: Gear icon linking to settings page
4. **Mobile Menu**: Hamburger menu for mobile navigation
5. **Dark Mode Toggle**: Theme switcher in header
6. **Search**: Global search functionality
7. **Breadcrumbs**: Show current page location

## Conclusion

The layout now provides a consistent, user-friendly header across the application with proper authentication state handling and logout functionality. The implementation follows best practices for both Astro and React while maintaining accessibility and responsive design principles.

