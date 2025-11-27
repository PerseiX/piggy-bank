import type { APIRoute } from "astro";

export const prerender = false;

/**
 * Debug endpoint to check current session state
 * GET /api/auth/debug-session
 */
export const GET: APIRoute = async ({ locals, request }) => {
  try {
    const supabase = locals.supabase;

    // Check if supabase client exists
    if (!supabase) {
      return new Response(
        JSON.stringify({
          error: "Supabase client not found in locals",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    // Get all cookies
    const cookieHeader = request.headers.get("Cookie") || "no cookies";

    return new Response(
      JSON.stringify({
        session: {
          exists: !!sessionData.session,
          accessToken: sessionData.session?.access_token ? "present" : "missing",
          expiresAt: sessionData.session?.expires_at,
          error: sessionError?.message,
        },
        user: {
          exists: !!userData.user,
          id: userData.user?.id,
          email: userData.user?.email,
          emailConfirmed: userData.user?.email_confirmed_at ? true : false,
          error: userError?.message,
        },
        cookies: {
          header: cookieHeader,
        },
        locals: {
          userExists: !!locals.user,
          userId: locals.user?.id,
        },
      }, null, 2),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Debug session error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to debug session",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

