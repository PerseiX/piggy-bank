import type { PostgrestError } from "@supabase/supabase-js";

import type { SupabaseClient } from "../../../db/supabase.client";
import type { Database } from "../../../db/database.types";
import type { CreateWalletCommand, Wallet, WalletCreatedDto } from "../../../types";
import { buildEmptyWalletAggregates } from "./aggregates";

type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];
type WalletMetadataRow = Pick<WalletRow, "id" | "name" | "description" | "created_at" | "updated_at">;

export class DuplicateWalletNameError extends Error {
  public readonly code = "DUPLICATE_WALLET_NAME";

  constructor(readonly walletName: string) {
    super(`A wallet named "${walletName}" already exists for this user`);
    this.name = "DuplicateWalletNameError";
  }
}

export class CreateWalletServiceError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CreateWalletServiceError";
  }
}

interface CreateWalletArgs {
  supabase: SupabaseClient;
  ownerId: Wallet["owner_id"];
  payload: CreateWalletCommand;
}

const WALLET_METADATA_COLUMNS = "id,name,description,created_at,updated_at";

export async function createWallet({ supabase, ownerId, payload }: CreateWalletArgs): Promise<WalletCreatedDto> {
  const duplicateCheck = await supabase
    .from("wallets")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("name", payload.name)
    .is("deleted_at", null)
    .maybeSingle();

  if (duplicateCheck.error) {
    throw new CreateWalletServiceError("Failed to verify wallet name uniqueness", {
      cause: duplicateCheck.error,
    });
  }

  if (duplicateCheck.data) {
    throw new DuplicateWalletNameError(payload.name);
  }

  const insertResult = await supabase
    .from("wallets")
    .insert({
      name: payload.name,
      description: payload.description ?? null,
      owner_id: ownerId,
    })
    .select(WALLET_METADATA_COLUMNS)
    .single();

  if (insertResult.error) {
    if (isUniqueConstraintViolation(insertResult.error)) {
      throw new DuplicateWalletNameError(payload.name);
    }

    throw new CreateWalletServiceError("Failed to persist wallet", {
      cause: insertResult.error,
    });
  }

  return mapToWalletCreatedDto(insertResult.data as WalletMetadataRow);
}

function isUniqueConstraintViolation(error: PostgrestError): boolean {
  return error.code === "23505";
}

function mapToWalletCreatedDto(wallet: WalletMetadataRow): WalletCreatedDto {
  return {
    id: wallet.id,
    name: wallet.name,
    description: wallet.description,
    created_at: wallet.created_at,
    updated_at: wallet.updated_at,
    aggregates: buildEmptyWalletAggregates(),
  };
}
