/**
 * InstrumentFormModal Component
 * 
 * Modal dialog for creating or editing an instrument.
 * Handles form validation and submission.
 */

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InstrumentDto, CreateInstrumentCommand, UpdateInstrumentCommand, InstrumentType } from "@/types";

// Form validation schema
const instrumentFormSchema = z.object({
  type: z.enum(["bonds", "etf", "stocks"], {
    required_error: "Instrument type is required.",
  }),
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(100, "Name must be 100 characters or less."),
  short_description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or less.")
    .optional()
    .or(z.literal("")),
  invested_money_pln: z
    .string()
    .trim()
    .min(1, "Invested money is required.")
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid amount (e.g., 100.00)"),
  current_value_pln: z
    .string()
    .trim()
    .min(1, "Current value is required.")
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid amount (e.g., 100.00)"),
  goal_pln: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid amount (e.g., 100.00)")
    .optional()
    .or(z.literal("")),
});

type InstrumentFormData = z.infer<typeof instrumentFormSchema>;

interface InstrumentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (command: CreateInstrumentCommand) => Promise<void>;
  mode: "create";
  initialData?: never;
}

interface InstrumentEditFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (command: UpdateInstrumentCommand) => Promise<void>;
  mode: "edit";
  initialData: InstrumentDto;
}

type InstrumentFormModalAllProps = InstrumentFormModalProps | InstrumentEditFormModalProps;

export function InstrumentFormModal(props: InstrumentFormModalAllProps) {
  const { isOpen, onClose, onSubmit, mode, initialData } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InstrumentFormData>({
    resolver: zodResolver(instrumentFormSchema),
    defaultValues: {
      type: initialData?.type || "stocks",
      name: initialData?.name || "",
      short_description: initialData?.short_description || "",
      invested_money_pln: initialData?.invested_money_pln || "",
      current_value_pln: initialData?.current_value_pln || "",
      goal_pln: initialData?.goal_pln || "",
    },
  });

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      form.reset({
        type: initialData?.type || "stocks",
        name: initialData?.name || "",
        short_description: initialData?.short_description || "",
        invested_money_pln: initialData?.invested_money_pln || "",
        current_value_pln: initialData?.current_value_pln || "",
        goal_pln: initialData?.goal_pln || "",
      });
    }
  }, [isOpen, initialData, form]);

  const handleSubmit = async (data: InstrumentFormData) => {
    setIsSubmitting(true);
    try {
      if (mode === "create") {
        const command: CreateInstrumentCommand = {
          type: data.type as InstrumentType,
          name: data.name,
          short_description: data.short_description || undefined,
          invested_money_pln: data.invested_money_pln,
          current_value_pln: data.current_value_pln,
          goal_pln: data.goal_pln || undefined,
        };
        await onSubmit(command);
      } else {
        const command: UpdateInstrumentCommand = {
          type: data.type as InstrumentType,
          name: data.name,
          short_description: data.short_description || undefined,
          invested_money_pln: data.invested_money_pln,
          current_value_pln: data.current_value_pln,
          goal_pln: data.goal_pln || undefined,
        };
        await onSubmit(command);
      }
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
      console.error("Error submitting instrument:", error);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add New Instrument" : "Edit Instrument"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new financial instrument to your wallet."
              : "Update the details of this instrument."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Type Field */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select instrument type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bonds">Bonds</SelectItem>
                      <SelectItem value="etf">ETF</SelectItem>
                      <SelectItem value="stocks">Stocks</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      placeholder="Enter instrument name"
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
              name="short_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter a short description"
                      disabled={isSubmitting}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Invested Money Field */}
            <FormField
              control={form.control}
              name="invested_money_pln"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invested Money (PLN)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder="0.00"
                      disabled={isSubmitting}
                      aria-required="true"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Current Value Field */}
            <FormField
              control={form.control}
              name="current_value_pln"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Value (PLN)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder="0.00"
                      disabled={isSubmitting}
                      aria-required="true"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Goal Field */}
            <FormField
              control={form.control}
              name="goal_pln"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal (PLN) - Optional</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder="0.00"
                      disabled={isSubmitting}
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
                {isSubmitting
                  ? mode === "create"
                    ? "Creating..."
                    : "Saving..."
                  : mode === "create"
                    ? "Create Instrument"
                    : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

