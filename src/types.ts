import type { Enums, Tables, TablesInsert, TablesUpdate } from "./db/database.types";

// ===========================================================================
// Entity Type Aliases
// ===========================================================================

/**
 * Represents the `wallets` table in the database.
 * Directly maps to the auto-generated Supabase type.
 */
export type Wallet = Tables<"wallets">;
export type WalletInsert = TablesInsert<"wallets">;
export type WalletUpdate = TablesUpdate<"wallets">;

/**
 * Represents the `financial_instruments` table in the database.
 * Directly maps to the auto-generated Supabase type.
 */
export type FinancialInstrument = Tables<"financial_instruments">;
export type FinancialInstrumentInsert = TablesInsert<"financial_instruments">;
export type FinancialInstrumentUpdate = TablesUpdate<"financial_instruments">;

/**
 * Represents the `instrument_type` enum from the database.
 */
export type InstrumentType = Enums<"instrument_type">;

// ===========================================================================
// Data Transfer Objects (DTOs)
// ===========================================================================

/**
 * DTO for a financial instrument, including calculated fields.
 * This extends the base `FinancialInstrument` type with `current_value`
 * and `growth_percentage`, which are computed in the backend.
 */
export type InstrumentDto = Pick<
	FinancialInstrument,
	"id" | "wallet_id" | "type" | "name" | "goal_amount"
> & {
	current_value: number;
	growth_percentage: number;
};

/**
 * DTO for the calculated summary of a wallet's financial status.
 * All fields are computed on the fly by the API.
 */
export type WalletSummaryDto = {
	current_total: number;
	remaining_amount: number;
	days_left: number;
};

/**
 * DTO for a wallet, including its summary and associated financial instruments.
 * This is the primary DTO used for listing wallets.
 */
export type WalletDto = Pick<
	Wallet,
	"id" | "name" | "goal_amount" | "target_date" | "description"
> & {
	summary: WalletSummaryDto;
	instruments: InstrumentDto[];
};

/**
 * DTO for detailed view of a single wallet.
 * It has the same structure as `WalletDto`.
 */
export type WalletDetailsDto = WalletDto;

/**
 * DTO for a wallet returned after a successful update operation.
 * Contains the updated properties of the wallet.
 */
export type UpdatedWalletDto = Pick<
	Wallet,
	"id" | "name" | "goal_amount" | "target_date" | "description"
>;

/**
 * DTO for a newly created wallet, including its initial instruments.
 */
export type WalletWithInstrumentsDto = Pick<
	Wallet,
	"id" | "name" | "goal_amount" | "target_date" | "description"
> & {
	instruments: InstrumentDto[];
};

// ===========================================================================
// Command Models
// ===========================================================================

/**
 * Command model for creating a new financial instrument.
 * Includes fields that may not directly map to the database table
 * but are used by business logic (e.g., to create an initial operation).
 */
export type CreateInstrumentCommand = Pick<
	FinancialInstrumentInsert,
	"type" | "name" | "goal_amount"
> & {
	current_value: number;
	growth_percentage: number;
};

/**
 * Command model for adding an instrument to an existing wallet.
 * Reuses `CreateInstrumentCommand` as the structure is identical.
 */
export type AddInstrumentCommand = CreateInstrumentCommand;

/**
 * Command model for creating a new wallet, along with its initial instruments.
 */
export type CreateWalletCommand = Pick<
	WalletInsert,
	"name" | "goal_amount" | "target_date" | "description"
> & {
	instruments: CreateInstrumentCommand[];
};

/**
 * Command model for updating an existing wallet.
 * All properties are optional as per `WalletUpdate` type from Supabase.
 */
export type UpdateWalletCommand = Pick<
	WalletUpdate,
	"name" | "goal_amount" | "target_date" | "description"
>;

/**
 * Command model for updating a financial instrument.
 * All properties are required as per PUT method semantics.
 */
export type UpdateInstrumentCommand = Pick<FinancialInstrument, "type" | "name" | "goal_amount"> & {
	current_value: number;
	growth_percentage: number;
};
