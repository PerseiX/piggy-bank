import type { Database } from "../../../db/database.types"
import type { InstrumentCreatedDto, InstrumentDeletedDto } from "../../../types"
import {
  formatGroszeToPln,
  formatOptionalGroszeToPln,
} from "../../formatters/currency"

export type InstrumentRowForDto = Pick<
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

export function mapInstrumentRowToDto(
  instrument: InstrumentRowForDto,
): InstrumentCreatedDto {
  return {
    id: instrument.id,
    wallet_id: instrument.wallet_id,
    type: instrument.type,
    name: instrument.name,
    short_description: instrument.short_description,
    invested_money_grosze: instrument.invested_money_grosze,
    invested_money_pln: formatGroszeToPln(instrument.invested_money_grosze),
    current_value_grosze: instrument.current_value_grosze,
    current_value_pln: formatGroszeToPln(instrument.current_value_grosze),
    goal_grosze: instrument.goal_grosze,
    goal_pln: formatOptionalGroszeToPln(instrument.goal_grosze),
    created_at: instrument.created_at,
    updated_at: instrument.updated_at,
  }
}

export type InstrumentSoftDeleteRow = Pick<
  Database["public"]["Tables"]["instruments"]["Row"],
  "id" | "deleted_at"
>

export function mapInstrumentSoftDeleteRowToDto(
  instrument: InstrumentSoftDeleteRow,
): InstrumentDeletedDto {
  return {
    id: instrument.id,
    deleted_at: instrument.deleted_at,
  }
}
