import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type {
	CreateWalletCommand,
	WalletWithInstrumentsDto,
	WalletDto,
	InstrumentDto,
	WalletSummaryDto,
} from "../../types";

/**
 * Type alias for the Supabase client used throughout the service.
 */
type SupabaseClientType = SupabaseClient<Database>;

/**
 * Custom error class for business logic violations.
 */
export class WalletValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "WalletValidationError";
	}
}

/**
 * Custom error class for database operation failures.
 */
export class WalletDatabaseError extends Error {
	constructor(message: string, public readonly cause?: unknown) {
		super(message);
		this.name = "WalletDatabaseError";
	}
}

/**
 * Creates a new wallet with optional initial instruments.
 *
 * This function handles the complete wallet creation flow:
 * 1. Validates that instrument goal amounts sum to wallet goal amount (if instruments provided)
 * 2. Inserts wallet into database
 * 3. For each instrument:
 *    - Inserts the instrument record
 *    - Creates an initial operation record with current_value
 * 4. Returns the created wallet with all instruments
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @param command - The wallet creation command with all required data
 * @param userId - The authenticated user's ID
 * @returns Promise resolving to WalletWithInstrumentsDto
 * @throws WalletValidationError if instrument goal amounts don't sum to wallet goal
 * @throws Error for database operation failures
 */
export async function createWallet(
	supabase: SupabaseClientType,
	command: CreateWalletCommand,
	userId: string
): Promise<WalletWithInstrumentsDto> {
	// Guard clause: validate user ID
	if (!userId || userId === "") {
		throw new WalletValidationError("User ID is required");
	}

	// Validate instruments sum if provided
	if (command.instruments && command.instruments.length > 0) {
		const instrumentsSum = command.instruments.reduce(
			(sum, instrument) => sum + instrument.goal_amount,
			0
		);

		if (instrumentsSum !== command.goal_amount) {
			throw new WalletValidationError(
				`Sum of instrument goal amounts (${instrumentsSum}) must equal wallet goal amount (${command.goal_amount})`
			);
		}
	}

	try {
		// Step 1: Insert the wallet
		const { data: wallet, error: walletError } = await supabase
			.from("wallets")
			.insert({
				user_id: userId,
				name: command.name,
				goal_amount: command.goal_amount,
				target_date: command.target_date,
				description: command.description,
			})
			.select()
			.single();

		if (walletError) {
			console.log(walletError)
			console.error("Failed to create wallet:", walletError);
			throw new WalletDatabaseError("Failed to create wallet", walletError);
		}

		if (!wallet) {
			throw new WalletDatabaseError("Wallet was not returned after creation");
		}

		// Step 2: Create instruments if provided
		const instrumentDtos: InstrumentDto[] = [];

		if (command.instruments && command.instruments.length > 0) {
			for (const [index, instrumentCommand] of command.instruments.entries()) {
				try {
					// Insert the instrument
					const { data: instrument, error: instrumentError } = await supabase
						.from("financial_instruments")
						.insert({
							wallet_id: wallet.id,
							type: instrumentCommand.type,
							name: instrumentCommand.name,
							goal_amount: instrumentCommand.goal_amount,
						})
						.select()
						.single();

					if (instrumentError) {
						console.error(`Failed to create instrument ${index + 1}:`, instrumentError);
						throw new WalletDatabaseError(
							`Failed to create instrument ${index + 1}`,
							instrumentError
						);
					}

					if (!instrument) {
						throw new WalletDatabaseError(
							`Instrument ${index + 1} was not returned after creation`
						);
					}

					// Create initial operation if current_value > 0
					if (instrumentCommand.current_value > 0) {
						const { error: operationError } = await supabase
							.from("financial_instrument_operations")
							.insert({
								instrument_id: instrument.id,
								amount: instrumentCommand.current_value,
								operation_date: new Date().toISOString(),
								description: "Initial deposit",
							});

						if (operationError) {
							console.error(
								`Failed to create initial operation for instrument ${index + 1}:`,
								operationError
							);
							throw new WalletDatabaseError(
								`Failed to create initial operation for instrument ${index + 1}`,
								operationError
							);
						}
					}

					// Build the InstrumentDto
					instrumentDtos.push({
						id: instrument.id,
						wallet_id: instrument.wallet_id,
						type: instrument.type,
						name: instrument.name,
						goal_amount: instrument.goal_amount,
						current_value: instrumentCommand.current_value,
						growth_percentage: instrumentCommand.growth_percentage,
					});
				} catch (error) {
					// Re-throw known errors
					if (error instanceof WalletDatabaseError || error instanceof WalletValidationError) {
						throw error;
					}
					// Wrap unexpected errors
					console.error(`Unexpected error creating instrument ${index + 1}:`, error);
					throw new WalletDatabaseError(
						`Unexpected error creating instrument ${index + 1}`,
						error
					);
				}
			}
		}

		// Step 3: Return the complete WalletWithInstrumentsDto
		return {
			id: wallet.id,
			name: wallet.name,
			goal_amount: wallet.goal_amount,
			target_date: wallet.target_date,
			description: wallet.description,
			instruments: instrumentDtos,
		};
	} catch (error) {
		// Re-throw known errors
		if (error instanceof WalletDatabaseError || error instanceof WalletValidationError) {
			throw error;
		}
		// Wrap unexpected errors at the top level
		console.error("Unexpected error in createWallet:", error);
		throw new WalletDatabaseError("An unexpected error occurred while creating the wallet", error);
	}
}

/**
 * Retrieves all wallets belonging to the authenticated user, including summary and instruments.
 * 
 * This function:
 * 1. Queries wallets table for all wallets belonging to the user
 * 2. For each wallet, fetches its financial instruments and operations
 * 3. Computes summary metrics (current_total, remaining_amount, days_left)
 * 4. Sorts results according to provided options
 * 
 * @param supabase - Authenticated Supabase client from context.locals
 * @param userId - The authenticated user's ID
 * @param options - Sorting options (sortBy and order)
 * @returns Promise resolving to array of WalletDto objects
 * @throws WalletDatabaseError for database operation failures
 */
export async function getWallets(
	supabase: SupabaseClientType,
	userId: string,
	options: { sortBy: string; order: string }
): Promise<WalletDto[]> {
	// Guard clause: validate user ID
	if (!userId || userId === "") {
		throw new WalletValidationError("User ID is required");
	}

	try {
		// Step 1: Fetch all wallets for the user with their instruments and operations
		const { data: wallets, error: walletsError } = await supabase
			.from("wallets")
			.select(`
				*,
				financial_instruments:financial_instruments(
					*,
					operations:financial_instrument_operations(amount, operation_date)
				)
			`)
			.eq("user_id", userId);

		if (walletsError) {
			console.error("Failed to fetch wallets:", walletsError);
			throw new WalletDatabaseError("Failed to fetch wallets", walletsError);
		}

		if (!wallets || wallets.length === 0) {
			// No wallets found - return empty array
			return [];
		}

		// Step 2: Transform raw data into DTOs with computed fields
		const walletDtos: WalletDto[] = wallets.map((wallet) => {
			// Calculate summary for each wallet
			const instruments = wallet.financial_instruments || [];
			
			// Calculate current_total by summing all operations across all instruments
			let currentTotal = 0;
			const instrumentDtos: InstrumentDto[] = instruments.map((instrument) => {
				// Sum operations for this instrument
				const operations = instrument.operations || [];
				const instrumentCurrentValue = operations.reduce(
					(sum, op) => sum + op.amount,
					0
				);
				
				currentTotal += instrumentCurrentValue;
				
				// Calculate growth percentage (placeholder - in a real app this would be more complex)
				// For now, we'll set a default value of 0
				const growthPercentage = 0;
				
				return {
					id: instrument.id,
					wallet_id: instrument.wallet_id,
					type: instrument.type,
					name: instrument.name,
					goal_amount: instrument.goal_amount,
					current_value: instrumentCurrentValue,
					growth_percentage: growthPercentage,
				};
			});
			
			// Calculate days left until target date
			const targetDate = new Date(wallet.target_date);
			const now = new Date();
			const daysLeft = Math.max(
				0,
				Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
			);
			
			// Calculate remaining amount
			const remainingAmount = Math.max(0, wallet.goal_amount - currentTotal);
			
			// Create summary object
			const summary: WalletSummaryDto = {
				current_total: currentTotal,
				remaining_amount: remainingAmount,
				days_left: daysLeft,
			};
			
			return {
				id: wallet.id,
				name: wallet.name,
				goal_amount: wallet.goal_amount,
				target_date: wallet.target_date,
				description: wallet.description,
				summary,
				instruments: instrumentDtos,
			};
		});

		// Step 3: Sort the results according to options
		const { sortBy, order } = options;
		
		const sortedWallets = [...walletDtos].sort((a, b) => {
			if (sortBy === "name") {
				return order === "asc"
					? a.name.localeCompare(b.name)
					: b.name.localeCompare(a.name);
			} else if (sortBy === "target_date") {
				const dateA = new Date(a.target_date).getTime();
				const dateB = new Date(b.target_date).getTime();
				return order === "asc" ? dateA - dateB : dateB - dateA;
			}
			
			// Default sort by target_date
			return 0;
		});

		return sortedWallets;
	} catch (error) {
		// Re-throw known errors
		if (error instanceof WalletDatabaseError || error instanceof WalletValidationError) {
			throw error;
		}
		// Wrap unexpected errors
		console.error("Unexpected error in getWallets:", error);
		throw new WalletDatabaseError("An unexpected error occurred while fetching wallets", error);
	}
}