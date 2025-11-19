import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerClient } from "../lib/supabase-server";

export const onRequest = defineMiddleware((context, next) => {
  // Create a Supabase client that uses cookies for session management
  context.locals.supabase = createSupabaseServerClient(context.cookies);
  return next();
});

