import { z } from "zod";

// Constants for validation limits
const MAX_WALLET_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_INSTRUMENT_NAME_LENGTH = 255;
const MAX_INSTRUMENTS_COUNT = 50;
const MAX_GOAL_AMOUNT = 999999999999; // ~10 trillion cents = 100 billion currency units
const MIN_GROWTH_PERCENTAGE = -100; // Can't lose more than 100%
const MAX_GROWTH_PERCENTAGE = 1000; // 1000% growth limit
const MAX_FUTURE_YEARS = 100; // Maximum 100 years in the future

/**
 * Validation schema for creating a financial instrument.
 * Used when creating a wallet with initial instruments.
 * 
 * Constraints:
 * - type: must be one of the valid instrument types
 * - name: optional, max 255 characters
 * - goal_amount: 0 to ~10 trillion (prevents integer overflow)
 * - current_value: 0 to goal_amount (can't exceed goal)
 * - growth_percentage: -100% to 1000%
 */
export const InstrumentSchema = z.object({
	type: z.enum(["bonds", "etf", "stocks"], {
		errorMap: () => ({ message: "Type must be one of: bonds, etf, stocks" })
	}),
	name: z.string()
		.max(MAX_INSTRUMENT_NAME_LENGTH, `Instrument name must not exceed ${MAX_INSTRUMENT_NAME_LENGTH} characters`)
		.optional(),
	goal_amount: z.number()
		.int("Goal amount must be an integer")
		.nonnegative("Goal amount must be non-negative")
		.max(MAX_GOAL_AMOUNT, `Goal amount must not exceed ${MAX_GOAL_AMOUNT}`),
	current_value: z.number()
		.int("Current value must be an integer")
		.nonnegative("Current value must be non-negative")
		.max(MAX_GOAL_AMOUNT, `Current value must not exceed ${MAX_GOAL_AMOUNT}`),
	growth_percentage: z.number()
		.min(MIN_GROWTH_PERCENTAGE, `Growth percentage must be at least ${MIN_GROWTH_PERCENTAGE}%`)
		.max(MAX_GROWTH_PERCENTAGE, `Growth percentage must not exceed ${MAX_GROWTH_PERCENTAGE}%`),
}).refine(
	(data) => data.current_value <= data.goal_amount,
	{
		message: "Current value cannot exceed goal amount",
		path: ["current_value"],
	}
);

/**
 * Validation schema for creating a new wallet.
 * 
 * Validates:
 * - name: 1-255 characters
 * - goal_amount: 0 to ~10 trillion (prevents integer overflow)
 * - target_date: valid ISO date string, must be in the future, max 100 years ahead
 * - description: optional, max 1000 characters
 * - instruments: optional array, max 50 instruments
 */
export const CreateWalletSchema = z.object({
	name: z.string()
		.min(1, "Wallet name is required")
		.max(MAX_WALLET_NAME_LENGTH, `Wallet name must not exceed ${MAX_WALLET_NAME_LENGTH} characters`)
		.trim(),
	goal_amount: z.number()
		.int("Goal amount must be an integer")
		.nonnegative("Goal amount must be non-negative")
		.max(MAX_GOAL_AMOUNT, `Goal amount must not exceed ${MAX_GOAL_AMOUNT}`),
	target_date: z.string().refine(
		(dateStr) => {
			const date = new Date(dateStr);
			const now = new Date();
			const maxDate = new Date();
			maxDate.setFullYear(now.getFullYear() + MAX_FUTURE_YEARS);
			
			return !isNaN(date.getTime()) && date > now && date <= maxDate;
		},
		{ 
			message: `Target date must be a valid future date within the next ${MAX_FUTURE_YEARS} years` 
		}
	),
	description: z.string()
		.max(MAX_DESCRIPTION_LENGTH, `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`)
		.optional(),
	instruments: z.array(InstrumentSchema)
		.max(MAX_INSTRUMENTS_COUNT, `Cannot create more than ${MAX_INSTRUMENTS_COUNT} instruments at once`)
		.optional(),
});

export type CreateWalletInput = z.infer<typeof CreateWalletSchema>;

