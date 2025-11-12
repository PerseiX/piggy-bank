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
 * Represents the `instruments` table in the database.
 * Directly maps to the auto-generated Supabase type.
 */
export type Instrument = Tables<"instruments">;
export type InstrumentInsert = TablesInsert<"instruments">;
export type InstrumentUpdate = TablesUpdate<"instruments">;

/**
 * Represents the `instrument_value_changes` table in the database.
 * Directly maps to the auto-generated Supabase type.
 */
export type InstrumentValueChange = Tables<"instrument_value_changes">;
export type InstrumentValueChangeInsert = TablesInsert<"instrument_value_changes">;

/**
 * Represents the `instrument_type` enum from the database.
 */
export type InstrumentType = Enums<"instrument_type">;

// ===========================================================================
// Utility Types
// ===========================================================================

/**
 * Helper type for monetary values in dual format (grosze integer + PLN decimal string).
 * Used to return both formats for client convenience.
 */
export type CurrencyDualFormat = {
  grosze: number;
  pln: string;
};

/**
 * Direction of value change in instrument value history.
 */
export type ValueChangeDirection = "increase" | "decrease" | "unchanged";

// ===========================================================================
// Data Transfer Objects (DTOs)
// ===========================================================================

/**
 * DTO for computed wallet aggregates.
 * All fields are calculated server-side from instrument data.
 */
export type WalletAggregatesDto = {
  target_grosze: number;
  target_pln: string;
  current_value_grosze: number;
  current_value_pln: string;
  invested_sum_grosze: number;
  invested_sum_pln: string;
  progress_percent: number;
  performance_percent: number;
};

/**
 * DTO for instrument data in API responses.
 * Returns monetary values in dual format (grosze + PLN).
 * Derived from the `instruments` table.
 */
export type InstrumentDto = Pick<
  Instrument,
  "id" | "type" | "name" | "short_description" | "created_at" | "updated_at"
> & {
  wallet_id: string;
  invested_money_grosze: number;
  invested_money_pln: string;
  current_value_grosze: number;
  current_value_pln: string;
  goal_grosze: number | null;
  goal_pln: string | null;
};

/**
 * DTO for wallet in list response (GET /api/wallets).
 * Includes computed aggregates but not nested instruments.
 */
export type WalletListItemDto = Pick<
  Wallet,
  "id" | "name" | "description" | "created_at" | "updated_at"
> & {
  aggregates: WalletAggregatesDto;
};

/**
 * DTO for detailed wallet view (GET /api/wallets/:id).
 * Includes computed aggregates and nested instruments array.
 */
export type WalletDetailDto = Pick<
  Wallet,
  "id" | "name" | "description" | "created_at" | "updated_at"
> & {
  aggregates: WalletAggregatesDto;
  instruments: InstrumentDto[];
};

/**
 * DTO for wallet creation response (POST /api/wallets).
 * Returns the created wallet with initial (empty) aggregates.
 */
export type WalletCreatedDto = Pick<
  Wallet,
  "id" | "name" | "description" | "created_at" | "updated_at"
> & {
  aggregates: WalletAggregatesDto;
};

/**
 * DTO for wallet update response (PATCH /api/wallets/:id).
 * Returns basic wallet fields without aggregates or instruments.
 */
export type WalletUpdatedDto = Pick<
  Wallet,
  "id" | "name" | "description" | "created_at" | "updated_at"
>;

/**
 * DTO for wallet soft-delete response (DELETE /api/wallets/:id).
 * Returns confirmation with deletion timestamp.
 */
export type WalletDeletedDto = {
  id: string;
  deleted_at: string;
};

/**
 * DTO for instrument creation response (POST /api/wallets/:walletId/instruments).
 * Same structure as InstrumentDto.
 */
export type InstrumentCreatedDto = InstrumentDto;

/**
 * DTO for instrument update response (PATCH /api/instruments/:id).
 * Same structure as InstrumentDto.
 */
export type InstrumentUpdatedDto = InstrumentDto;

/**
 * DTO for instrument soft-delete response (DELETE /api/instruments/:id).
 * Returns confirmation with deletion timestamp.
 */
export type InstrumentDeletedDto = {
  id: string;
  deleted_at: string;
};

/**
 * DTO for instrument value change history item (GET /api/instruments/:id/value-changes).
 * Includes computed delta and direction fields.
 * Derived from the `instrument_value_changes` table.
 */
export type ValueChangeDto = Pick<
  InstrumentValueChange,
  "id" | "instrument_id" | "created_at"
> & {
  before_value_grosze: number;
  before_value_pln: string;
  after_value_grosze: number;
  after_value_pln: string;
  delta_grosze: number;
  delta_pln: string;
  direction: ValueChangeDirection;
};

// ===========================================================================
// Command Models (Input DTOs)
// ===========================================================================

/**
 * Command model for creating a new wallet (POST /api/wallets).
 * Accepts only name and optional description.
 * Derived from WalletInsert type.
 */
export type CreateWalletCommand = {
  name: string;
  description?: string;
};

/**
 * Command model for updating a wallet (PATCH /api/wallets/:id).
 * All fields are optional for partial updates.
 * Derived from WalletUpdate type.
 */
export type UpdateWalletCommand = {
  name?: string;
  description?: string | null;
};

/**
 * Command model for creating an instrument (POST /api/wallets/:walletId/instruments).
 * Accepts PLN decimal strings for monetary values.
 * Derived from InstrumentInsert type with custom monetary fields.
 */
export type CreateInstrumentCommand = {
  type: InstrumentType;
  name: string;
  short_description?: string;
  invested_money_pln: string;
  current_value_pln: string;
  goal_pln?: string;
};

/**
 * Command model for updating an instrument (PATCH /api/instruments/:id).
 * All fields are optional for partial updates.
 * Accepts PLN decimal strings for monetary values.
 */
export type UpdateInstrumentCommand = {
  type?: InstrumentType;
  name?: string;
  short_description?: string | null;
  invested_money_pln?: string;
  current_value_pln?: string;
  goal_pln?: string | null;
};
