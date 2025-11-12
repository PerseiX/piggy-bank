import type { SupabaseClient } from "../../../db/supabase.client"
import type { Database } from "../../../db/database.types"
import type {
  Instrument,
  InstrumentDto,
  WalletDetailDto,
  WalletAggregatesDto,
} from "../../../types"
import {
  formatCurrencyFromGrosze,
  formatOptionalCurrencyFromGrosze,
} from "../currency/format"

type WalletRow = Pick<
  Database["public"]["Tables"]["wallets"]["Row"],
  "id" | "name" | "description" | "created_at" | "updated_at" | "owner_id"
>

type InstrumentRow = Pick<
  Database["public"]["Tables"]["instruments"]["Row"],
  | "id"
  | "wallet_id"
  | "owner_id"
  | "type"
  | "name"
  | "short_description"
  | "invested_money_grosze"
  | "current_value_grosze"
  | "goal_grosze"
  | "created_at"
  | "updated_at"
>

type GetWalletDetailParams = {
  supabase: SupabaseClient
  walletId: WalletRow["id"]
  ownerId: WalletRow["owner_id"]
}

const WALLET_METADATA_COLUMNS =
  "id,name,description,created_at,updated_at,owner_id"

const INSTRUMENT_COLUMNS =
  "id,wallet_id,owner_id,type,name,short_description,invested_money_grosze,current_value_grosze,goal_grosze,created_at,updated_at"

export class WalletNotFoundError extends Error {
  public readonly code = "WALLET_NOT_FOUND"

  constructor(readonly walletId: string) {
    super(`Wallet with id "${walletId}" was not found`)
    this.name = "WalletNotFoundError"
  }
}

export class WalletForbiddenError extends Error {
  public readonly code = "WALLET_FORBIDDEN"

  constructor(readonly walletId: string, readonly ownerId: string) {
    super(`Wallet "${walletId}" is not accessible for owner "${ownerId}"`)
    this.name = "WalletForbiddenError"
  }
}

export class GetWalletDetailServiceError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = "GetWalletDetailServiceError"
  }
}

export async function getWalletDetail({
  supabase,
  walletId,
  ownerId,
}: GetWalletDetailParams): Promise<WalletDetailDto> {
  const walletResult = await supabase
    .from("wallets")
    .select(WALLET_METADATA_COLUMNS)
    .eq("id", walletId)
    .is("deleted_at", null)
    .maybeSingle()

  if (walletResult.error) {
    throw new GetWalletDetailServiceError("Failed to load wallet metadata", {
      cause: walletResult.error,
    })
  }

  const walletRow = (walletResult.data ?? null) as WalletRow | null

  if (!walletRow) {
    throw new WalletNotFoundError(walletId)
  }

  if (walletRow.owner_id !== ownerId) {
    throw new WalletForbiddenError(walletId, ownerId)
  }

  const instrumentsResult = await supabase
    .from("instruments")
    .select(INSTRUMENT_COLUMNS)
    .eq("wallet_id", walletId)
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })

  if (instrumentsResult.error) {
    throw new GetWalletDetailServiceError("Failed to load wallet instruments", {
      cause: instrumentsResult.error,
    })
  }

  const instrumentRows = (instrumentsResult.data ?? []) as InstrumentRow[]

  const aggregates = buildAggregates(instrumentRows)
  const instruments = instrumentRows.map(mapInstrumentToDto)

  return {
    id: walletRow.id,
    name: walletRow.name,
    description: walletRow.description,
    created_at: walletRow.created_at,
    updated_at: walletRow.updated_at,
    aggregates,
    instruments,
  }
}

function buildAggregates(instruments: InstrumentRow[]): WalletAggregatesDto {
  const targetSum = instruments.reduce((total, instrument) => {
    return total + (instrument.goal_grosze ?? 0)
  }, 0)

  const currentSum = instruments.reduce((total, instrument) => {
    return total + instrument.current_value_grosze
  }, 0)

  const investedSum = instruments.reduce((total, instrument) => {
    return total + instrument.invested_money_grosze
  }, 0)

  return {
    target_grosze: targetSum,
    target_pln: formatCurrencyFromGrosze(targetSum).pln,
    current_value_grosze: currentSum,
    current_value_pln: formatCurrencyFromGrosze(currentSum).pln,
    invested_sum_grosze: investedSum,
    invested_sum_pln: formatCurrencyFromGrosze(investedSum).pln,
    progress_percent: calculateProgressPercent(currentSum, targetSum),
    performance_percent: calculatePerformancePercent(currentSum, investedSum),
  }
}

function mapInstrumentToDto(instrument: InstrumentRow): InstrumentDto {
  const invested = formatCurrencyFromGrosze(instrument.invested_money_grosze)
  const current = formatCurrencyFromGrosze(instrument.current_value_grosze)
  const goal = formatOptionalCurrencyFromGrosze(instrument.goal_grosze)

  return {
    id: instrument.id,
    wallet_id: instrument.wallet_id,
    type: instrument.type as Instrument["type"],
    name: instrument.name,
    short_description: instrument.short_description,
    invested_money_grosze: invested.grosze,
    invested_money_pln: invested.pln,
    current_value_grosze: current.grosze,
    current_value_pln: current.pln,
    goal_grosze: goal?.grosze ?? null,
    goal_pln: goal?.pln ?? null,
    created_at: instrument.created_at,
    updated_at: instrument.updated_at,
  }
}

function calculateProgressPercent(
  currentValue: number,
  targetValue: number,
): number {
  if (!Number.isFinite(currentValue) || !Number.isFinite(targetValue)) {
    return 0
  }

  if (targetValue <= 0) {
    return 0
  }

  const ratio = currentValue / targetValue

  return Number((ratio * 100).toFixed(2))
}

function calculatePerformancePercent(
  currentValue: number,
  investedValue: number,
): number {
  if (!Number.isFinite(currentValue) || !Number.isFinite(investedValue)) {
    return 0
  }

  if (investedValue <= 0) {
    return 0
  }

  const performance = (currentValue - investedValue) / investedValue

  return Number((performance * 100).toFixed(2))
}

