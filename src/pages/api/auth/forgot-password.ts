import type { APIRoute } from "astro";
import { z } from "zod";

export const prerender = false;

const ForgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const POST: APIRoute = async ({ request, locals, url }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const result = ForgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: result.error.format(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { email } = result.data;

    // Construct the redirect URL for password reset
    const redirectTo = `${url.origin}/auth/update-password`;

    // Send password reset email via Supabase
    const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    // Note: We always return success to prevent email enumeration attacks
    // even if the email doesn't exist in the system
    if (error) {
      console.error("Password reset error:", error);
    }

    return new Response(
      JSON.stringify({
        message: "If an account exists with this email, you will receive password reset instructions.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred. Please try again.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

