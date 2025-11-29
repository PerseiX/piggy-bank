import type { PostgrestError } from "@supabase/supabase-js";

import type { SupabaseClient } from "../../../db/supabase.client";
import type { Database } from "../../../db/database.types";
import type { InstrumentUpdate, InstrumentUpdatedDto, UpdateInstrumentCommand } from "../../../types";
import { parsePlnToGrosze } from "../../formatters/currency";
import {
  InstrumentForbiddenError,
  InstrumentNameConflictError,
  InstrumentNotFoundError,
  InstrumentSoftDeletedError,
  ParentWalletSoftDeletedError,
  UpdateInstrumentServiceError,
} from "../../errors/instruments";
import { type InstrumentRowForDto, mapInstrumentRowToDto } from "./mappers";

type InstrumentMetadataRow = InstrumentRowForDto & {
  deleted_at: Database["public"]["Tables"]["instruments"]["Row"]["deleted_at"];
};

type WalletMetadataRow = Pick<Database["public"]["Tables"]["wallets"]["Row"], "id" | "owner_id" | "deleted_at">;

interface UpdateInstrumentArgs {
  supabase: SupabaseClient;
  ownerId: string;
  instrumentId: string;
  payload: UpdateInstrumentCommand;
}

const INSTRUMENT_METADATA_COLUMNS =
  "id,wallet_id,owner_id,type,name,short_description,invested_money_grosze,current_value_grosze,goal_grosze,created_at,updated_at,deleted_at";
const INSTRUMENT_RESPONSE_COLUMNS =
  "id,wallet_id,owner_id,type,name,short_description,invested_money_grosze,current_value_grosze,goal_grosze,created_at,updated_at";
const WALLET_METADATA_COLUMNS = "id,owner_id,deleted_at";

export async function updateInstrument({
  supabase,
  ownerId,
  instrumentId,
  payload,
}: UpdateInstrumentArgs): Promise<InstrumentUpdatedDto> {
  const instrumentResult = await supabase
    .from("instruments")
    .select(INSTRUMENT_METADATA_COLUMNS)
    .eq("id", instrumentId)
    .maybeSingle();

  if (instrumentResult.error) {
    throw new UpdateInstrumentServiceError("Failed to load instrument metadata", {
      cause: instrumentResult.error,
    });
  }

  const instrumentRow = (instrumentResult.data ?? null) as InstrumentMetadataRow | null;

  if (!instrumentRow) {
    throw new InstrumentNotFoundError(instrumentId);
  }

  if (instrumentRow.owner_id !== ownerId) {
    throw new InstrumentForbiddenError(instrumentId, ownerId);
  }

  if (instrumentRow.deleted_at) {
    throw new InstrumentSoftDeletedError(instrumentId);
  }

  const walletResult = await supabase
    .from("wallets")
    .select(WALLET_METADATA_COLUMNS)
    .eq("id", instrumentRow.wallet_id)
    .maybeSingle();

  if (walletResult.error) {
    throw new UpdateInstrumentServiceError("Failed to verify parent wallet", {
      cause: walletResult.error,
    });
  }

  const walletRow = (walletResult.data ?? null) as WalletMetadataRow | null;

  if (!walletRow || walletRow.deleted_at) {
    throw new ParentWalletSoftDeletedError(instrumentRow.wallet_id);
  }

  const updates: InstrumentUpdate = {};
  let hasChanges = false;
  let pendingNameCheck: string | null = null;

  if (payload.type !== undefined && payload.type !== instrumentRow.type) {
    updates.type = payload.type;
    hasChanges = true;
  }

  if (payload.name !== undefined && payload.name !== instrumentRow.name) {
    updates.name = payload.name;
    hasChanges = true;
    pendingNameCheck = payload.name;
  }

  if (payload.short_description !== undefined) {
    const nextShortDescription = payload.short_description ?? null;
    const currentShortDescription = instrumentRow.short_description ?? null;

    if (nextShortDescription !== currentShortDescription) {
      updates.short_description = nextShortDescription;
      hasChanges = true;
    }
  }

  if (payload.invested_money_pln !== undefined) {
    const nextInvestedMoney = parsePlnToGrosze(payload.invested_money_pln);

    if (nextInvestedMoney !== instrumentRow.invested_money_grosze) {
      updates.invested_money_grosze = nextInvestedMoney;
      hasChanges = true;
    }
  }

  if (payload.current_value_pln !== undefined) {
    const nextCurrentValue = parsePlnToGrosze(payload.current_value_pln);

    if (nextCurrentValue !== instrumentRow.current_value_grosze) {
      updates.current_value_grosze = nextCurrentValue;
      hasChanges = true;
    }
  }

  if (payload.goal_pln !== undefined) {
    const nextGoal = payload.goal_pln === null ? null : parsePlnToGrosze(payload.goal_pln);

    if (nextGoal !== instrumentRow.goal_grosze) {
      updates.goal_grosze = nextGoal;
      hasChanges = true;
    }
  }

  if (!hasChanges) {
    return mapInstrumentRowToDto(instrumentRow);
  }

  if (pendingNameCheck) {
    const duplicateCheck = await supabase
      .from("instruments")
      .select("id")
      .eq("wallet_id", instrumentRow.wallet_id)
      .ilike("name", pendingNameCheck)
      .neq("id", instrumentId)
      .is("deleted_at", null)
      .maybeSingle();

    if (duplicateCheck.error) {
      throw new UpdateInstrumentServiceError("Failed to verify instrument name uniqueness", {
        cause: duplicateCheck.error,
      });
    }

    if (duplicateCheck.data) {
      throw new InstrumentNameConflictError(instrumentRow.wallet_id, pendingNameCheck);
    }
  }

  const updateResult = await supabase
    .from("instruments")
    .update(updates)
    .eq("id", instrumentId)
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .select(INSTRUMENT_RESPONSE_COLUMNS)
    .single();

  if (updateResult.error) {
    if (isUniqueConstraintViolation(updateResult.error)) {
      throw new InstrumentNameConflictError(
        instrumentRow.wallet_id,
        pendingNameCheck ?? updates.name ?? instrumentRow.name
      );
    }

    throw new UpdateInstrumentServiceError("Failed to persist instrument", {
      cause: updateResult.error,
    });
  }

  return mapInstrumentRowToDto(updateResult.data as InstrumentRowForDto);
}

function isUniqueConstraintViolation(error: PostgrestError): boolean {
  return error.code === "23505";
}
