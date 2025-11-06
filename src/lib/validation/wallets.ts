import { z } from "zod"

import type { CreateWalletCommand } from "../../types"

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
})

export const createWalletSchema = baseCreateWalletSchema.transform((data) => {
  const payload: CreateWalletCommand = { name: data.name }

  if (typeof data.description === "string" && data.description.length > 0) {
    payload.description = data.description
  }

  return payload
})

export type CreateWalletSchemaOutput = z.infer<typeof createWalletSchema>

