import type { Database } from "../../../db/database.types";
import type { SupabaseClient } from "../../../db/supabase.client";
import type { ValueChangeDirection, ValueChangeDto } from "../../../types";
import { formatGroszeToPlnString } from "../../currency";
import { formatGroszeToDual } from "../../formatters/currency";
import {
  InstrumentForbiddenError,
  InstrumentNotFoundError,
  InstrumentSoftDeletedError,
  InstrumentValueChangesServiceError,
} from "../../errors/instruments";

type InstrumentOwnershipRow = Pick<Database["public"]["Tables"]["instruments"]["Row"], "owner_id" | "deleted_at">;

type InstrumentValueChangeRow = Database["public"]["Tables"]["instrument_value_changes"]["Row"];

export interface GetInstrumentValueChangeHistoryArgs {
  supabase: SupabaseClient;
  instrumentId: string;
  ownerId: string;
}

export async function getInstrumentValueChangeHistory(
  args: GetInstrumentValueChangeHistoryArgs
): Promise<ValueChangeDto[]> {
  const { supabase, instrumentId, ownerId } = args;

  const ownershipResult = await supabase
    .from("instruments")
    .select("owner_id,deleted_at")
    .eq("id", instrumentId)
    .maybeSingle();

  if (ownershipResult.error) {
    throw new InstrumentValueChangesServiceError("Failed to verify instrument ownership", {
      cause: ownershipResult.error,
    });
  }

  const ownershipRow = ownershipResult.data as InstrumentOwnershipRow | null;

  if (!ownershipRow) {
    throw new InstrumentNotFoundError(instrumentId);
  }

  if (ownershipRow.deleted_at) {
    throw new InstrumentSoftDeletedError(instrumentId);
  }

  if (ownershipRow.owner_id !== ownerId) {
    throw new InstrumentForbiddenError(instrumentId, ownerId);
  }

  const historyResult = await supabase
    .from("instrument_value_changes")
    .select("id,instrument_id,before_value_grosze,after_value_grosze,created_at")
    .eq("instrument_id", instrumentId)
    .order("created_at", { ascending: false });

  if (historyResult.error) {
    throw new InstrumentValueChangesServiceError("Failed to load instrument value change history", {
      cause: historyResult.error,
    });
  }

  return (historyResult.data ?? []).map(mapValueChangeRowToDto);
}

function mapValueChangeRowToDto(row: InstrumentValueChangeRow): ValueChangeDto {
  const { before_value_grosze, after_value_grosze } = row;
  const delta = after_value_grosze - before_value_grosze;
  const beforeValue = formatGroszeToDual(before_value_grosze);
  const afterValue = formatGroszeToDual(after_value_grosze);

  return {
    id: row.id,
    instrument_id: row.instrument_id,
    created_at: row.created_at,
    before_value_grosze,
    before_value_pln: beforeValue.pln,
    after_value_grosze,
    after_value_pln: afterValue.pln,
    delta_grosze: delta,
    delta_pln: formatGroszeToPlnString(delta),
    direction: toValueChangeDirection(delta),
  };
}

function toValueChangeDirection(delta: number): ValueChangeDirection {
  if (delta > 0) {
    return "increase";
  }

  if (delta < 0) {
    return "decrease";
  }

  return "unchanged";
}
