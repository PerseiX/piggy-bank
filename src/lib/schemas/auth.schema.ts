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

/**
 * Zod schema for forgot password form validation.
 * Used for requesting a password reset link.
 */
export const ForgotPasswordSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

/**
 * TypeScript type inferred from ForgotPasswordSchema.
 */
export type ForgotPasswordViewModel = z.infer<typeof ForgotPasswordSchema>;

/**
 * Zod schema for update password form validation.
 * Used for setting a new password.
 */
export const UpdatePasswordSchema = z.object({
  password: z.string().min(8, {
    message: "Password must be at least 8 characters long.",
  }),
  confirmPassword: z.string().min(8, {
    message: "Password must be at least 8 characters long.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

/**
 * TypeScript type inferred from UpdatePasswordSchema.
 */
export type UpdatePasswordViewModel = z.infer<typeof UpdatePasswordSchema>;

