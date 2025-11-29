import { z } from "zod";

import type { CreateWalletCommand, UpdateWalletCommand } from "../../types";

const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/;

const baseCreateWalletSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(1, { message: "Name must contain at least 1 character" })
    .max(100, { message: "Name must contain at most 100 characters" }),
  description: z
    .string({ invalid_type_error: "Description must be a string" })
    .trim()
    .max(500, { message: "Description must contain at most 500 characters" })
    .nullish(),
});

export const createWalletSchema = baseCreateWalletSchema.transform((data) => {
  const payload: CreateWalletCommand = { name: data.name };

  if (typeof data.description === "string" && data.description.length > 0) {
    payload.description = data.description;
  }

  return payload;
});

export type CreateWalletSchemaOutput = z.infer<typeof createWalletSchema>;

export const walletIdParamSchema = z.object({
  id: z.string({ required_error: "Wallet id is required" }).uuid({ message: "Wallet id must be a valid UUID" }),
});

export type WalletIdParamSchemaOutput = z.infer<typeof walletIdParamSchema>;

const updateWalletNameSchema = z
  .string({
    invalid_type_error: "Name must be a string",
  })
  .trim()
  .min(1, { message: "Name must contain at least 1 character" })
  .max(100, { message: "Name must contain at most 100 characters" })
  .refine((value) => !CONTROL_CHAR_REGEX.test(value), {
    message: "Name cannot contain control characters",
  });

const updateWalletDescriptionSchema = z
  .union([
    z
      .string({
        invalid_type_error: "Description must be a string",
      })
      .trim()
      .max(500, { message: "Description must contain at most 500 characters" })
      .refine((value) => !CONTROL_CHAR_REGEX.test(value), {
        message: "Description cannot contain control characters",
      })
      .transform((value) => (value.length === 0 ? null : value)),
    z.null(),
  ])
  .optional();

const baseUpdateWalletSchema = z
  .object({
    name: updateWalletNameSchema.optional(),
    description: updateWalletDescriptionSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (typeof data.name === "undefined" && typeof data.description === "undefined") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided",
        path: [],
      });
    }
  });

export const updateWalletSchema = baseUpdateWalletSchema.transform((data) => {
  const payload: UpdateWalletCommand = {};

  if (typeof data.name === "string") {
    payload.name = data.name;
  }

  if (data.description !== undefined) {
    payload.description = data.description;
  }

  return payload;
});

export type UpdateWalletSchemaOutput = z.infer<typeof updateWalletSchema>;
