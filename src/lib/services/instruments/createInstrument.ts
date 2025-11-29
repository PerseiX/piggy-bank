import type { PostgrestError } from "@supabase/supabase-js";

import type { SupabaseClient } from "../../../db/supabase.client";
import type { CreateInstrumentCommand, InstrumentCreatedDto, InstrumentInsert } from "../../../types";
import { parsePlnToGrosze } from "../../formatters/currency";
import {
  CreateInstrumentServiceError,
  InstrumentNameConflictError,
  InstrumentWalletForbiddenError,
  InstrumentWalletNotFoundError,
  InstrumentWalletSoftDeletedError,
} from "../../errors/instruments";
import { InstrumentRowForDto, mapInstrumentRowToDto } from "./mappers";

type WalletRow = Pick<Database["public"]["Tables"]["wallets"]["Row"], "id" | "owner_id" | "deleted_at">;

interface CreateInstrumentArgs {
  supabase: SupabaseClient;
  walletId: string;
  ownerId: string;
  payload: CreateInstrumentCommand;
}

const WALLET_GUARD_COLUMNS = "id,owner_id,deleted_at";
const INSTRUMENT_COLUMNS =
  "id,wallet_id,owner_id,type,name,short_description,invested_money_grosze,current_value_grosze,goal_grosze,created_at,updated_at";

export async function createInstrument({
  supabase,
  walletId,
  ownerId,
  payload,
}: CreateInstrumentArgs): Promise<InstrumentCreatedDto> {
  const walletResult = await supabase.from("wallets").select(WALLET_GUARD_COLUMNS).eq("id", walletId).maybeSingle();

  if (walletResult.error) {
    throw new CreateInstrumentServiceError("Failed to load wallet metadata", {
      cause: walletResult.error,
    });
  }

  const walletRow = walletResult.data as WalletRow | null;

  if (!walletRow) {
    throw new InstrumentWalletNotFoundError(walletId);
  }

  if (walletRow.owner_id !== ownerId) {
    throw new InstrumentWalletForbiddenError(walletId, ownerId);
  }

  if (walletRow.deleted_at) {
    throw new InstrumentWalletSoftDeletedError(walletId);
  }

  const duplicateCheck = await supabase
    .from("instruments")
    .select("id")
    .eq("wallet_id", walletId)
    .eq("name", payload.name)
    .is("deleted_at", null)
    .maybeSingle();

  if (duplicateCheck.error) {
    throw new CreateInstrumentServiceError("Failed to verify instrument name uniqueness", {
      cause: duplicateCheck.error,
    });
  }

  if (duplicateCheck.data) {
    throw new InstrumentNameConflictError(walletId, payload.name);
  }

  const insertPayload: InstrumentInsert = {
    wallet_id: walletId,
    owner_id: ownerId,
    type: payload.type,
    name: payload.name,
    short_description: payload.short_description ?? null,
    invested_money_grosze: parsePlnToGrosze(payload.invested_money_pln),
    current_value_grosze: parsePlnToGrosze(payload.current_value_pln),
    goal_grosze: payload.goal_pln ? parsePlnToGrosze(payload.goal_pln) : null,
  };

  const insertResult = await supabase.from("instruments").insert(insertPayload).select(INSTRUMENT_COLUMNS).single();

  if (insertResult.error) {
    if (isUniqueConstraintViolation(insertResult.error)) {
      throw new InstrumentNameConflictError(walletId, payload.name);
    }

    throw new CreateInstrumentServiceError("Failed to persist instrument", {
      cause: insertResult.error,
    });
  }

  return mapInstrumentRowToDto(insertResult.data as InstrumentRowForDto);
}

function isUniqueConstraintViolation(error: PostgrestError): boolean {
  return error.code === "23505";
}
