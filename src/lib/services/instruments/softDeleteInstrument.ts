import type { PostgrestError } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import type { SupabaseClient } from "../../../db/supabase.client";
import type { InstrumentDeletedDto } from "../../../types";
import {
  InstrumentAlreadyDeletedError,
  InstrumentForbiddenError,
  InstrumentNotFoundError,
  InstrumentSoftDeleteFailedError,
} from "../../errors/instruments";
import { type InstrumentSoftDeleteRow, mapInstrumentSoftDeleteRowToDto } from "./mappers";

type InstrumentMetadataRow = Pick<Database["public"]["Tables"]["instruments"]["Row"], "id" | "owner_id" | "deleted_at">;

interface SoftDeleteInstrumentArgs {
  supabase: SupabaseClient;
  ownerId: string;
  instrumentId: string;
}

const INSTRUMENT_METADATA_COLUMNS = "id,owner_id,deleted_at";
const INSTRUMENT_SOFT_DELETE_COLUMNS = "id,deleted_at";

export async function softDeleteInstrument({
  supabase,
  ownerId,
  instrumentId,
}: SoftDeleteInstrumentArgs): Promise<InstrumentDeletedDto> {
  const metadataResult = await supabase
    .from("instruments")
    .select(INSTRUMENT_METADATA_COLUMNS)
    .eq("id", instrumentId)
    .maybeSingle();

  if (metadataResult.error) {
    throw new InstrumentSoftDeleteFailedError("Failed to load instrument metadata before soft delete", {
      cause: metadataResult.error,
    });
  }

  const instrumentRow = (metadataResult.data ?? null) as InstrumentMetadataRow | null;

  if (!instrumentRow) {
    throw new InstrumentNotFoundError(instrumentId);
  }

  if (instrumentRow.owner_id !== ownerId) {
    throw new InstrumentForbiddenError(instrumentId, ownerId);
  }

  if (instrumentRow.deleted_at) {
    throw new InstrumentAlreadyDeletedError(instrumentId);
  }

  const deletedAt = new Date().toISOString();

  const updateResult = await supabase
    .from("instruments")
    .update({ deleted_at: deletedAt })
    .eq("id", instrumentId)
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .select(INSTRUMENT_SOFT_DELETE_COLUMNS)
    .single();

  if (updateResult.error) {
    if (isNoRowsReturnedError(updateResult.error)) {
      throw new InstrumentAlreadyDeletedError(instrumentId);
    }

    throw new InstrumentSoftDeleteFailedError("Failed to soft delete instrument", { cause: updateResult.error });
  }

  const updatedRow = updateResult.data as InstrumentSoftDeleteRow;

  if (!updatedRow.deleted_at) {
    throw new InstrumentSoftDeleteFailedError("Soft delete succeeded but deleted_at timestamp is missing");
  }

  return mapInstrumentSoftDeleteRowToDto(updatedRow);
}

function isNoRowsReturnedError(error: PostgrestError): boolean {
  return error.code === "PGRST116" || error.code === "PGRST119";
}
