import type { SupabaseClient } from "../../../db/supabase.client";
import { formatGroszeToPlnString } from "../../currency";
import type { Instrument, Wallet, WalletAggregatesDto, WalletListItemDto } from "../../../types";

export type WalletSortField = "name" | "updated_at" | "created_at";
export type WalletSortOrder = "asc" | "desc";

type WalletRow = Pick<Wallet, "id" | "name" | "description" | "created_at" | "updated_at">;

type InstrumentRow = Pick<Instrument, "wallet_id" | "invested_money_grosze" | "current_value_grosze" | "goal_grosze">;

type SortColumn = keyof WalletRow;

const SORT_COLUMN_MAP: Record<WalletSortField, SortColumn> = {
  name: "name",
  created_at: "created_at",
  updated_at: "updated_at",
};

export class GetWalletsServiceError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "GetWalletsServiceError";
  }
}

export interface GetWalletsForOwnerParams {
  supabase: SupabaseClient;
  ownerId: string;
  sort: WalletSortField;
  order: WalletSortOrder;
}

export async function getWalletsForOwner({
  supabase,
  ownerId,
  sort,
  order,
}: GetWalletsForOwnerParams): Promise<WalletListItemDto[]> {
  const isAscending = order === "asc";

  const { data: wallets, error: walletsError } = await supabase
    .from("wallets")
    .select("id, name, description, created_at, updated_at")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .order(SORT_COLUMN_MAP[sort], { ascending: isAscending });

  if (walletsError) {
    throw new GetWalletsServiceError("Failed to load wallets", walletsError);
  }

  const walletRows = (wallets ?? []) as WalletRow[];

  if (walletRows.length === 0) {
    return [];
  }

  const walletIds = walletRows.map((wallet) => wallet.id);

  const { data: instruments, error: instrumentsError } = await supabase
    .from("instruments")
    .select("wallet_id, invested_money_grosze, current_value_grosze, goal_grosze")
    .in("wallet_id", walletIds)
    .is("deleted_at", null);

  if (instrumentsError) {
    throw new GetWalletsServiceError("Failed to load instruments for wallets", instrumentsError);
  }

  const instrumentRows = (instruments ?? []) as InstrumentRow[];

  const instrumentsByWallet = groupInstrumentsByWallet(instrumentRows);

  return walletRows.map((wallet) => {
    const walletInstruments = instrumentsByWallet.get(wallet.id) ?? [];
    const aggregates = buildAggregates(walletInstruments);

    return {
      ...wallet,
      aggregates,
    };
  });
}

function groupInstrumentsByWallet(instruments: InstrumentRow[]): Map<string, InstrumentRow[]> {
  const grouped = new Map<string, InstrumentRow[]>();

  for (const instrument of instruments) {
    const existing = grouped.get(instrument.wallet_id);

    if (existing) {
      existing.push(instrument);
      continue;
    }

    grouped.set(instrument.wallet_id, [instrument]);
  }

  return grouped;
}

function buildAggregates(instruments: InstrumentRow[]): WalletAggregatesDto {
  const targetSum = sumInstrumentField(instruments, (instrument) => instrument.goal_grosze ?? 0);
  const currentSum = sumInstrumentField(instruments, (instrument) => instrument.current_value_grosze);
  const investedSum = sumInstrumentField(instruments, (instrument) => instrument.invested_money_grosze);

  return {
    target_grosze: targetSum,
    target_pln: formatGroszeToPlnString(targetSum),
    current_value_grosze: currentSum,
    current_value_pln: formatGroszeToPlnString(currentSum),
    invested_sum_grosze: investedSum,
    invested_sum_pln: formatGroszeToPlnString(investedSum),
    progress_percent: calculateProgressPercent(currentSum, targetSum),
    performance_percent: calculatePerformancePercent(currentSum, investedSum),
  };
}

function sumInstrumentField(instruments: InstrumentRow[], selector: (instrument: InstrumentRow) => number): number {
  return instruments.reduce((total, instrument) => {
    const value = selector(instrument);

    if (!Number.isFinite(value)) {
      return total;
    }

    return total + value;
  }, 0);
}

function calculateProgressPercent(currentValue: number, targetValue: number): number {
  if (targetValue <= 0) {
    return 0;
  }

  const ratio = currentValue / targetValue;

  return Number((ratio * 100).toFixed(2));
}

function calculatePerformancePercent(currentValue: number, investedValue: number): number {
  if (investedValue <= 0) {
    return 0;
  }

  const performance = (currentValue - investedValue) / investedValue;

  return Number((performance * 100).toFixed(2));
}
