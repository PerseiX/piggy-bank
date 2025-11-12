import type { PostgrestError } from "@supabase/supabase-js"

import type { SupabaseClient } from "../../../db/supabase.client"
import type { Database } from "../../../db/database.types"
import type { Wallet, WalletDeletedDto } from "../../../types"

type WalletMetadataRow = Pick<
  Database["public"]["Tables"]["wallets"]["Row"],
  "id" | "owner_id" | "deleted_at"
>

type WalletDeleteResponseRow = Pick<
  Database["public"]["Tables"]["wallets"]["Row"],
  "id" | "deleted_at"
>

type SoftDeleteWalletParams = {
  supabase: SupabaseClient
  walletId: Wallet["id"]
  ownerId: Wallet["owner_id"]
  now: string
}

const WALLET_METADATA_COLUMNS = "id,owner_id,deleted_at"
const WALLET_DELETE_RESPONSE_COLUMNS = "id,deleted_at"

export class WalletSoftDeleteNotFoundError extends Error {
  public readonly code = "WALLET_NOT_FOUND"

  constructor(readonly walletId: string) {
    super(`Wallet with id "${walletId}" was not found`)
    this.name = "WalletSoftDeleteNotFoundError"
  }
}

export class WalletSoftDeleteForbiddenError extends Error {
  public readonly code = "WALLET_FORBIDDEN"

  constructor(readonly walletId: string, readonly ownerId: string) {
    super(`Wallet "${walletId}" is not accessible for owner "${ownerId}"`)
    this.name = "WalletSoftDeleteForbiddenError"
  }
}

export class SoftDeleteWalletServiceError extends Error {
  public readonly code = "SOFT_DELETE_WALLET_SERVICE_ERROR"

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = "SoftDeleteWalletServiceError"
  }
}

export async function softDeleteWallet({
  supabase,
  walletId,
  ownerId,
  now,
}: SoftDeleteWalletParams): Promise<WalletDeletedDto> {
  const walletResult = await supabase
    .from("wallets")
    .select(WALLET_METADATA_COLUMNS)
    .eq("id", walletId)
    .maybeSingle()

  if (walletResult.error) {
    throw new SoftDeleteWalletServiceError("Failed to load wallet metadata", {
      cause: walletResult.error,
    })
  }

  const walletRow = (walletResult.data ?? null) as WalletMetadataRow | null

  if (!walletRow) {
    throw new WalletSoftDeleteNotFoundError(walletId)
  }

  if (walletRow.owner_id !== ownerId) {
    throw new WalletSoftDeleteForbiddenError(walletId, ownerId)
  }

  if (walletRow.deleted_at) {
    throw new WalletSoftDeleteNotFoundError(walletId)
  }

  // Use a shared timestamp so downstream triggers receive the same deletion moment.
  const updateResult = await supabase
    .from("wallets")
    .update({ deleted_at: now })
    .eq("id", walletId)
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .select(WALLET_DELETE_RESPONSE_COLUMNS)
    .single()

  if (updateResult.error) {
    handleUpdateError(updateResult.error, walletId, ownerId)
  }

  const deletedWallet =
    (updateResult.data ?? null) as WalletDeleteResponseRow | null

  if (!deletedWallet || !deletedWallet.deleted_at) {
    throw new SoftDeleteWalletServiceError(
      "Soft delete wallet response missing expected data",
    )
  }

  return {
    id: deletedWallet.id,
    deleted_at: deletedWallet.deleted_at,
  }
}

function handleUpdateError(
  error: PostgrestError,
  walletId: string,
  ownerId: string,
): never {
  if (isPostgrestRowNotFoundError(error)) {
    throw new WalletSoftDeleteNotFoundError(walletId)
  }

  if (isPostgrestForbiddenError(error)) {
    throw new WalletSoftDeleteForbiddenError(walletId, ownerId)
  }

  throw new SoftDeleteWalletServiceError("Failed to soft delete wallet", {
    cause: error,
  })
}

function isPostgrestRowNotFoundError(error: PostgrestError): boolean {
  return error.code === "PGRST116"
}

function isPostgrestForbiddenError(error: PostgrestError): boolean {
  return error.code === "42501"
}

