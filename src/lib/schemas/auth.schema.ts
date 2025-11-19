import { z } from "zod";

/**
 * Zod schema for authentication form validation.
 * Used for both sign in and sign up forms.
 */
export const AuthFormSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters long.",
  }),
});

/**
 * TypeScript type inferred from AuthFormSchema.
 * Represents the shape of the authentication form data.
 */
export type AuthFormViewModel = z.infer<typeof AuthFormSchema>;

