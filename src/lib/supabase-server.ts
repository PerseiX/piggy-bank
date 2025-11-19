import { createServerClient } from "@supabase/ssr";
import type { AstroCookies } from "astro";

import type { Database } from "@/db/database.types";

/**
 * Creates a Supabase client for server-side operations (Astro pages, middleware, API routes).
 * Uses cookies for session management, which allows sessions to persist across client and server.
 */
export function createSupabaseServerClient(cookies: AstroCookies) {
  return createServerClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_KEY,
    {
      cookies: {
        get(key: string) {
          return cookies.get(key)?.value;
        },
        set(key: string, value: string, options: any) {
          cookies.set(key, value, options);
        },
        remove(key: string, options: any) {
          cookies.delete(key, options);
        },
      },
    }
  );
}

