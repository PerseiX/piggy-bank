import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

// ===========================================================================
// Form Schema and Types
// ===========================================================================

/**
 * Zod schema for wallet form validation.
 * Validates name and description fields with appropriate constraints.
 */
export const walletFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100, "Name must be 100 characters or less."),
  description: z.string().trim().max(500, "Description must be 500 characters or less.").optional().or(z.literal("")),
});

/**
 * Type definition for the wallet form view model.
 * Inferred from the Zod schema.
 */
export type WalletFormViewModel = z.infer<typeof walletFormSchema>;

// ===========================================================================
// Component Props
// ===========================================================================

interface WalletFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    description: string | null;
  };
}

// ===========================================================================
// WalletForm Component
// ===========================================================================

/**
 * A client-side form for creating or editing a wallet.
 * Manages form state, validation, and API interactions.
 *
 * @param mode - Determines if the form is in "create" or "edit" mode
 * @param initialData - Initial values for the form in edit mode
 */
export default function WalletForm({ mode, initialData }: WalletFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize react-hook-form with Zod resolver
  const form = useForm<WalletFormViewModel>({
    resolver: zodResolver(walletFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
    },
  });

  /**
   * Handles form submission.
   * Sends API request to create or update wallet based on mode.
   */
  const onSubmit = async (data: WalletFormViewModel) => {
    setIsSubmitting(true);

    try {
      // Get the current user to verify authentication
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast.error("You must be signed in to perform this action.");
        window.location.href = "/signin";
        return;
      }

      // Get session for access token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Session expired. Please sign in again.");
        window.location.href = "/signin";
        return;
      }

      // Prepare the request body
      const requestBody: Record<string, string> = {
        name: data.name,
      };

      // Only include description if it has content
      if (data.description && data.description.trim().length > 0) {
        requestBody.description = data.description;
      }

      // Determine API endpoint and method based on mode
      const url = mode === "create" ? "/api/wallets" : `/api/wallets/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      // Send API request with Authorization header
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      // Handle duplicate name error (409 Conflict)
      if (response.status === 409) {
        form.setError("name", {
          type: "manual",
          message: "This wallet name is already in use.",
        });
        setIsSubmitting(false);
        return;
      }

      // Handle other errors
      if (!response.ok) {
        const errorMessage =
          mode === "create"
            ? "Failed to create wallet. Please try again."
            : "Failed to update wallet. Please try again.";
        toast.error(errorMessage);
        setIsSubmitting(false);
        return;
      }

      // Success - redirect to dashboard
      const successMessage = mode === "create" ? "Wallet created successfully!" : "Wallet updated successfully!";
      toast.success(successMessage);

      // Redirect after a short delay to allow toast to be visible
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error) {
      // Handle network or unexpected errors
      console.error("Error submitting wallet form:", error);
      toast.error("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  /**
   * Handles cancel action - redirects back to dashboard
   */
  const handleCancel = () => {
    window.location.href = "/";
  };

  // Check if form has changes (for edit mode)
  const hasChanges = form.formState.isDirty;
  const isSubmitDisabled = isSubmitting || (mode === "edit" && !hasChanges);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-test-id="wallet-form">
        {/* Name Field */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Enter wallet name"
                  disabled={isSubmitting}
                  aria-required="true"
                  data-test-id="wallet-name-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description Field */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Enter wallet description (optional)"
                  disabled={isSubmitting}
                  rows={4}
                  data-test-id="wallet-description-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            data-test-id="wallet-cancel-button"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitDisabled} data-test-id="wallet-submit-button">
            {isSubmitting
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
                ? "Create Wallet"
                : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
