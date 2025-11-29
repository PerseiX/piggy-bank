/**
 * QuickEditValuesModal Component
 *
 * A simplified modal for quickly updating only the invested money and current value
 * of an existing instrument. Does not modify other fields like name, type, etc.
 */

import { useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { InstrumentDto, UpdateInstrumentCommand } from "@/types";

// ============================================================================
// Validation Schema
// ============================================================================

const quickEditValuesSchema = z.object({
  invested_money_pln: z
    .string()
    .trim()
    .min(1, "Invested amount is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid amount (e.g., 100.50)")
    .refine((val) => parseFloat(val) >= 0, "Must be greater than or equal to 0"),
  current_value_pln: z
    .string()
    .trim()
    .min(1, "Current value is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid amount (e.g., 100.50)")
    .refine((val) => parseFloat(val) >= 0, "Must be greater than or equal to 0"),
});

type QuickEditValuesFormData = z.infer<typeof quickEditValuesSchema>;

// ============================================================================
// Component Props
// ============================================================================

interface QuickEditValuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (command: UpdateInstrumentCommand) => Promise<void>;
  instrument: InstrumentDto;
}

// ============================================================================
// Component
// ============================================================================

export function QuickEditValuesModal({ isOpen, onClose, onSubmit, instrument }: QuickEditValuesModalProps) {
  const [formData, setFormData] = useState<QuickEditValuesFormData>({
    invested_money_pln: instrument.invested_money_pln,
    current_value_pln: instrument.current_value_pln,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof QuickEditValuesFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data when instrument changes
  useEffect(() => {
    setFormData({
      invested_money_pln: instrument.invested_money_pln,
      current_value_pln: instrument.current_value_pln,
    });
    setErrors({});
  }, [instrument]);

  // Handle input changes
  const handleChange = (field: keyof QuickEditValuesFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      // Validate form data
      const validated = quickEditValuesSchema.parse(formData);

      // Create the update command with only the monetary fields
      const command: UpdateInstrumentCommand = {
        invested_money_pln: validated.invested_money_pln,
        current_value_pln: validated.current_value_pln,
      };

      await onSubmit(command);

      // Close modal on success
      onClose();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        const fieldErrors: Partial<Record<keyof QuickEditValuesFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof QuickEditValuesFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        // API errors are handled by the parent component via toast
        console.error("Submission error:", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close with form reset
  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        invested_money_pln: instrument.invested_money_pln,
        current_value_pln: instrument.current_value_pln,
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Edit Values</DialogTitle>
          <DialogDescription>
            Update the invested money and current value for <strong>{instrument.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Invested Money Field */}
            <div className="grid gap-2">
              <Label htmlFor="invested_money_pln">
                Invested Amount (PLN) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="invested_money_pln"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={formData.invested_money_pln}
                onChange={(e) => handleChange("invested_money_pln", e.target.value)}
                aria-invalid={!!errors.invested_money_pln}
                aria-describedby={errors.invested_money_pln ? "invested_money_pln-error" : undefined}
                disabled={isSubmitting}
              />
              {errors.invested_money_pln && (
                <p id="invested_money_pln-error" className="text-sm text-destructive" role="alert">
                  {errors.invested_money_pln}
                </p>
              )}
            </div>

            {/* Current Value Field */}
            <div className="grid gap-2">
              <Label htmlFor="current_value_pln">
                Current Value (PLN) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="current_value_pln"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={formData.current_value_pln}
                onChange={(e) => handleChange("current_value_pln", e.target.value)}
                aria-invalid={!!errors.current_value_pln}
                aria-describedby={errors.current_value_pln ? "current_value_pln-error" : undefined}
                disabled={isSubmitting}
              />
              {errors.current_value_pln && (
                <p id="current_value_pln-error" className="text-sm text-destructive" role="alert">
                  {errors.current_value_pln}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Values"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
