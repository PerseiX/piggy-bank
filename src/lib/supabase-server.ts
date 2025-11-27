import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { AstroCookies } from "astro";

import type { Database } from "@/db/database.types";

export const cookieOptions: CookieOptionsWithName = {
  path: '/',
  // In test mode, we connect to cloud Supabase (HTTPS), so cookies should be secure
  // In local dev, we connect to local Supabase (HTTP), so cookies should not be secure
  secure: import.meta.env.PROD || import.meta.env.MODE === 'test',
  // IMPORTANT: httpOnly must be false for Supabase auth cookies
  // The browser client needs to read these cookies for session management
  // Supabase handles security through other means (short-lived tokens, refresh flow)
  httpOnly: false,
  sameSite: 'lax',
};

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(';').map((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    return { name, value: rest.join('=') };
  });
}

/**
 * Creates a Supabase client for server-side operations (Astro pages, middleware, API routes).
 * Uses cookies for session management, which allows sessions to persist across client and server.
 * Implements getAll/setAll pattern as per @supabase/ssr best practices.
 */
export function createSupabaseServerClient(context: {
  headers: Headers;
  cookies: AstroCookies;
}) {
  return createServerClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_KEY,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return parseCookieHeader(context.headers.get('Cookie') ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            context.cookies.set(name, value, options),
          );
        },
      },
    }
  );
}

