/**
 * WalletFormModal Component
 * 
 * Modal dialog wrapper for editing wallet information.
 * Reuses the WalletForm logic but adapts it for modal usage.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { UpdateWalletCommand } from "@/types";

// Form validation schema
const walletFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(100, "Name must be 100 characters or less."),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or less.")
    .optional()
    .or(z.literal("")),
});

type WalletFormData = z.infer<typeof walletFormSchema>;

interface WalletFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (command: UpdateWalletCommand) => Promise<void>;
  initialData: {
    id: string;
    name: string;
    description: string | null;
  };
}

export function WalletFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: WalletFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<WalletFormData>({
    resolver: zodResolver(walletFormSchema),
    defaultValues: {
      name: initialData.name,
      description: initialData.description || "",
    },
  });

  const handleSubmit = async (data: WalletFormData) => {
    setIsSubmitting(true);
    try {
      const command: UpdateWalletCommand = {
        name: data.name,
        description: data.description || null,
      };
      await onSubmit(command);
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
      console.error("Error updating wallet:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Wallet</DialogTitle>
          <DialogDescription>
            Update your wallet's name and description.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

