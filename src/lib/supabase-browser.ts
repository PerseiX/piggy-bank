import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/db/database.types";

/**
 * Creates a browser-compatible Supabase client for client-side operations,
 * including authentication. This client persists sessions in cookies.
 */
export function getSupabaseBrowserClient() {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or Key is not configured for browser client");
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}

