import type { Database } from "../../../db/database.types";
import type { SupabaseClient } from "../../../db/supabase.client";
import type { InstrumentDto } from "../../../types";
import type { ListWalletInstrumentsSortField, ListWalletInstrumentsSortOrder } from "../../validation/instruments";
import {
  InstrumentWalletForbiddenError,
  InstrumentWalletNotFoundError,
  InstrumentWalletSoftDeletedError,
  ListWalletInstrumentsServiceError,
} from "../../errors/instruments";
import { InstrumentRowForDto, mapInstrumentRecordToDto } from "./mappers";

interface ListWalletInstrumentsArgs {
  supabase: SupabaseClient;
  ownerId: string;
  walletId: string;
  sort: ListWalletInstrumentsSortField;
  order: ListWalletInstrumentsSortOrder;
}

type WalletGuardRow = Pick<Database["public"]["Tables"]["wallets"]["Row"], "id" | "owner_id" | "deleted_at">;

const WALLET_GUARD_COLUMNS = "id,owner_id,deleted_at";

const INSTRUMENT_COLUMNS =
  "id,wallet_id,owner_id,type,name,short_description,invested_money_grosze,current_value_grosze,goal_grosze,created_at,updated_at";

const SORT_COLUMN_MAP: Record<ListWalletInstrumentsSortField, string> = {
  name: "name",
  updated_at: "updated_at",
  type: "type",
  current_value_grosze: "current_value_grosze",
};

export async function listWalletInstruments({
  supabase,
  ownerId,
  walletId,
  sort,
  order,
}: ListWalletInstrumentsArgs): Promise<InstrumentDto[]> {
  const walletResult = await supabase.from("wallets").select(WALLET_GUARD_COLUMNS).eq("id", walletId).maybeSingle();

  if (walletResult.error) {
    throw new ListWalletInstrumentsServiceError("Failed to load wallet metadata", { cause: walletResult.error });
  }

  const walletRow = walletResult.data as WalletGuardRow | null;

  if (!walletRow) {
    throw new InstrumentWalletNotFoundError(walletId);
  }

  if (walletRow.deleted_at) {
    throw new InstrumentWalletSoftDeletedError(walletId);
  }

  if (walletRow.owner_id !== ownerId) {
    throw new InstrumentWalletForbiddenError(walletId, ownerId);
  }

  const isAscending = order === "asc";

  const instrumentsResult = await supabase
    .from("instruments")
    .select(INSTRUMENT_COLUMNS)
    .eq("wallet_id", walletId)
    .is("deleted_at", null)
    .order(SORT_COLUMN_MAP[sort], { ascending: isAscending });

  if (instrumentsResult.error) {
    throw new ListWalletInstrumentsServiceError("Failed to load instruments for wallet", {
      cause: instrumentsResult.error,
    });
  }

  const instrumentRows = (instrumentsResult.data ?? []) as InstrumentRowForDto[];

  return instrumentRows.map((instrument) => mapInstrumentRecordToDto(instrument));
}
