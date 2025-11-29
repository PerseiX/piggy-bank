import type { SupabaseClient } from "../../../db/supabase.client";
import type { Database } from "../../../db/database.types";
import type { InstrumentDto } from "../../../types";
import { GetInstrumentServiceError } from "../../errors/instruments";
import { type InstrumentRowForDto, mapInstrumentRowToDto } from "./mappers";

type InstrumentOwnershipRow = Pick<Database["public"]["Tables"]["instruments"]["Row"], "owner_id" | "deleted_at">;

export interface GetInstrumentByIdArgs {
  supabase: SupabaseClient;
  ownerId: string;
  instrumentId: string;
}

export type GetInstrumentByIdFailureReason = "notFound" | "forbidden" | "softDeleted";

export type GetInstrumentByIdResult =
  | { ok: true; instrument: InstrumentDto }
  | { ok: false; reason: GetInstrumentByIdFailureReason };

const INSTRUMENT_COLUMNS =
  "id,wallet_id,owner_id,type,name,short_description,invested_money_grosze,current_value_grosze,goal_grosze,created_at,updated_at";
const OWNERSHIP_COLUMNS = "owner_id,deleted_at";

export async function getInstrumentById(args: GetInstrumentByIdArgs): Promise<GetInstrumentByIdResult> {
  const { supabase, ownerId, instrumentId } = args;

  const instrumentResult = await supabase
    .from("instruments")
    .select(INSTRUMENT_COLUMNS)
    .eq("id", instrumentId)
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .maybeSingle();

  if (instrumentResult.error) {
    throw new GetInstrumentServiceError("Failed to load instrument", {
      cause: instrumentResult.error,
    });
  }

  const instrumentRow = (instrumentResult.data ?? null) as InstrumentRowForDto | null;

  if (instrumentRow) {
    return {
      ok: true,
      instrument: mapInstrumentRowToDto(instrumentRow),
    };
  }

  const ownershipResult = await supabase
    .from("instruments")
    .select(OWNERSHIP_COLUMNS)
    .eq("id", instrumentId)
    .maybeSingle();

  if (ownershipResult.error) {
    throw new GetInstrumentServiceError("Failed to verify instrument ownership", {
      cause: ownershipResult.error,
    });
  }

  const ownershipRow = (ownershipResult.data ?? null) as InstrumentOwnershipRow | null;

  if (!ownershipRow) {
    return { ok: false, reason: "notFound" };
  }

  if (ownershipRow.deleted_at) {
    return { ok: false, reason: "softDeleted" };
  }

  if (ownershipRow.owner_id !== ownerId) {
    return { ok: false, reason: "forbidden" };
  }

  throw new GetInstrumentServiceError("Instrument state is inconsistent after lookup");
}
