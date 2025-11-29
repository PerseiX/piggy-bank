import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerClient } from "../lib/supabase-server";

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  // Auth pages
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/update-password",
  // Auth API endpoints
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/forgot-password",
  // Legacy paths (if any)
  "/signin",
  "/signup",
];

export const onRequest = defineMiddleware(async (context, next) => {
  const { locals, cookies, url, request, redirect } = context;

  // Create a Supabase client that uses cookies for session management
  locals.supabase = createSupabaseServerClient({
    cookies,
    headers: request.headers,
  });

  // Check if the current path is public
  const isPublicPath = PUBLIC_PATHS.includes(url.pathname);

  // IMPORTANT: Always get user session first before any other operations
  const {
    data: { user },
  } = await locals.supabase.auth.getUser();

  if (user) {
    // User is authenticated
    locals.user = {
      id: user.id,
      email: user.email ?? undefined,
    };

    // Redirect authenticated users away from auth pages to home
    if (isPublicPath && url.pathname.startsWith("/auth")) {
      return redirect("/");
    }
  } else {
    // User is NOT authenticated
    if (!isPublicPath) {
      // Redirect to login for protected routes
      return redirect("/auth/login");
    }
  }

  return next();
});
