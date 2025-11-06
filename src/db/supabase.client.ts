import { createClient, type SupabaseClient as SupabaseJsClient } from "@supabase/supabase-js"

import type { Database } from "./database.types"

export type SupabaseClient = SupabaseJsClient<Database>

let cachedClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient
  }

  const supabaseUrl = import.meta.env.SUPABASE_URL
  const supabaseKey = import.meta.env.SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or Key is not configured")
  }

  cachedClient = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  })

  return cachedClient
}

export const supabaseClient = getSupabaseClient()

