import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/db/database.types";

// Singleton instance to ensure we reuse the same client
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Creates a browser-compatible Supabase client for client-side operations,
 * including authentication. This client persists sessions in cookies.
 * Returns a singleton instance to ensure cookie handling is consistent.
 */
export function getSupabaseBrowserClient() {
  // Return existing instance if already created
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or Key is not configured for browser client");
  }

  // Create browser client - it will automatically handle cookies
  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseKey);

  return browserClient;
}

