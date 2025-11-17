import { z } from "zod"

export { walletIdParamSchema } from "./wallets"
export type { WalletIdParamSchemaOutput } from "./wallets"

import type {
  CreateInstrumentCommand,
  InstrumentType,
  UpdateInstrumentCommand,
} from "../../types"

const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/
const PLN_DECIMAL_PATTERN = /^[0-9]+(\.[0-9]{1,2})?$/

const instrumentTypeValues = ["bonds", "etf", "stocks"] as const

const listWalletInstrumentsSortEnum = z.enum([
  "name",
  "updated_at",
  "type",
  "current_value_grosze",
])

const listWalletInstrumentsOrderEnum = z.enum(["asc", "desc"])

export type ListWalletInstrumentsSortField = z.infer<
  typeof listWalletInstrumentsSortEnum
>
export type ListWalletInstrumentsSortOrder = z.infer<
  typeof listWalletInstrumentsOrderEnum
>

export const LIST_WALLET_INSTRUMENTS_DEFAULT_SORT: ListWalletInstrumentsSortField =
  "updated_at"
export const LIST_WALLET_INSTRUMENTS_DEFAULT_ORDER: ListWalletInstrumentsSortOrder =
  "desc"

const normalizedSortSchema = z
  .string({
    invalid_type_error: "Sort must be a string",
  })
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(listWalletInstrumentsSortEnum)

const normalizedOrderSchema = z
  .string({
    invalid_type_error: "Order must be a string",
  })
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(listWalletInstrumentsOrderEnum)

export const listWalletInstrumentsQuerySchema = z
  .object({
    sort: normalizedSortSchema.optional(),
    order: normalizedOrderSchema.optional(),
  })
  .strict()
  .transform((value) => ({
    sort: value.sort ?? LIST_WALLET_INSTRUMENTS_DEFAULT_SORT,
    order: value.order ?? LIST_WALLET_INSTRUMENTS_DEFAULT_ORDER,
  }))

export type ListWalletInstrumentsQuery = z.infer<
  typeof listWalletInstrumentsQuerySchema
>

function isValidInstrumentType(value: string): value is InstrumentType {
  return instrumentTypeValues.includes(value as InstrumentType)
}

function createPlnAmountSchema(fieldLabel: string) {
  return z
    .string({
      required_error: `${fieldLabel} is required`,
      invalid_type_error: `${fieldLabel} must be provided as a string`,
    })
    .trim()
    .min(1, { message: `${fieldLabel} must not be empty` })
    .refine((value) => PLN_DECIMAL_PATTERN.test(value), {
      message: `${fieldLabel} must be a non-negative amount with up to two decimal places`,
    })
}

function createOptionalPlnAmountSchema(fieldLabel: string) {
  return z
    .string({
      invalid_type_error: `${fieldLabel} must be provided as a string`,
    })
    .trim()
    .refine(
      (value) => value.length === 0 || PLN_DECIMAL_PATTERN.test(value),
      {
        message: `${fieldLabel} must be a non-negative amount with up to two decimal places`,
      },
    )
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional()
}

function createPartialPlnAmountSchema(fieldLabel: string) {
  return z
    .string({
      invalid_type_error: `${fieldLabel} must be provided as a string`,
    })
    .trim()
    .min(1, { message: `${fieldLabel} must not be empty` })
    .refine((value) => PLN_DECIMAL_PATTERN.test(value), {
      message: `${fieldLabel} must be a non-negative amount with up to two decimal places`,
    })
    .optional()
}

const instrumentTypeSchema = z
  .string({
    required_error: "Instrument type is required",
    invalid_type_error: "Instrument type must be a string",
  })
  .trim()
  .transform((value) => value.toLowerCase())
  .refine(isValidInstrumentType, {
    message: "Instrument type must be one of bonds, etf, or stocks",
  })

const baseCreateInstrumentSchema = z
  .object({
    type: instrumentTypeSchema,
    name: z
      .string({
        required_error: "Name is required",
        invalid_type_error: "Name must be a string",
      })
      .trim()
      .min(1, { message: "Name must contain at least 1 character" })
      .max(100, { message: "Name must contain at most 100 characters" })
      .refine((value) => !CONTROL_CHAR_REGEX.test(value), {
        message: "Name cannot contain control characters",
      }),
    short_description: z
      .string({
        invalid_type_error: "Short description must be a string",
      })
      .trim()
      .max(500, {
        message: "Short description must contain at most 500 characters",
      })
      .refine((value) => !CONTROL_CHAR_REGEX.test(value), {
        message: "Short description cannot contain control characters",
      })
      .transform((value) => (value.length === 0 ? undefined : value))
      .optional(),
    invested_money_pln: createPlnAmountSchema("Invested money"),
    current_value_pln: createPlnAmountSchema("Current value"),
    goal_pln: createOptionalPlnAmountSchema("Goal"),
  })
  .strict()

export const createInstrumentSchema = baseCreateInstrumentSchema.transform(
  (data) => {
    const payload: CreateInstrumentCommand = {
      type: data.type,
      name: data.name,
      invested_money_pln: data.invested_money_pln,
      current_value_pln: data.current_value_pln,
    }

    if (data.short_description) {
      payload.short_description = data.short_description
    }

    if (data.goal_pln) {
      payload.goal_pln = data.goal_pln
    }

    return payload
  },
)

export type CreateInstrumentSchemaOutput = z.infer<typeof createInstrumentSchema>

export const decimalStringSchema = createPlnAmountSchema("Amount")

const baseUpdateInstrumentSchema = z
  .object({
    type: instrumentTypeSchema.optional(),
    name: z
      .string({
        invalid_type_error: "Name must be a string",
      })
      .trim()
      .min(1, { message: "Name must contain at least 1 character" })
      .max(100, { message: "Name must contain at most 100 characters" })
      .refine((value) => !CONTROL_CHAR_REGEX.test(value), {
        message: "Name cannot contain control characters",
      })
      .optional(),
    short_description: z
      .string({
        invalid_type_error: "Short description must be a string",
      })
      .trim()
      .max(500, {
        message: "Short description must contain at most 500 characters",
      })
      .refine((value) => !CONTROL_CHAR_REGEX.test(value), {
        message: "Short description cannot contain control characters",
      })
      .transform((value) => (value.length === 0 ? null : value))
      .optional(),
    invested_money_pln: createPartialPlnAmountSchema("Invested money"),
    current_value_pln: createPartialPlnAmountSchema("Current value"),
    goal_pln: z
      .string({
        invalid_type_error: "Goal must be provided as a string",
      })
      .trim()
      .refine(
        (value) => value.length === 0 || PLN_DECIMAL_PATTERN.test(value),
        {
          message:
            "Goal must be a non-negative amount with up to two decimal places",
        },
      )
      .transform((value) => (value.length === 0 ? null : value))
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasAtLeastOneField =
      data.type !== undefined ||
      data.name !== undefined ||
      data.short_description !== undefined ||
      data.invested_money_pln !== undefined ||
      data.current_value_pln !== undefined ||
      data.goal_pln !== undefined

    if (!hasAtLeastOneField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided",
        path: [],
      })
    }
  })

export const updateInstrumentSchema = baseUpdateInstrumentSchema.transform(
  (data) => {
    const payload: UpdateInstrumentCommand = {}

    if (data.type !== undefined) {
      payload.type = data.type
    }

    if (data.name !== undefined) {
      payload.name = data.name
    }

    if (data.short_description !== undefined) {
      payload.short_description = data.short_description
    }

    if (data.invested_money_pln !== undefined) {
      payload.invested_money_pln = data.invested_money_pln
    }

    if (data.current_value_pln !== undefined) {
      payload.current_value_pln = data.current_value_pln
    }

    if (data.goal_pln !== undefined) {
      payload.goal_pln = data.goal_pln
    }

    return payload
  },
)

export type UpdateInstrumentSchemaOutput = z.infer<typeof updateInstrumentSchema>

const baseInstrumentIdParamSchema = z
  .object({
    id: z
      .string({ required_error: "Instrument id is required" })
      .uuid({ message: "Instrument id must be a valid UUID" }),
  })
  .strict()

export const instrumentIdParamSchema = baseInstrumentIdParamSchema

export type InstrumentIdParamSchemaOutput = z.infer<
  typeof instrumentIdParamSchema
>

export const deleteInstrumentParamsSchema = baseInstrumentIdParamSchema

export type DeleteInstrumentParamsSchemaOutput = z.infer<
  typeof deleteInstrumentParamsSchema
>

