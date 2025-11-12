import type { PostgrestError } from "@supabase/supabase-js"

import type { SupabaseClient } from "../../../db/supabase.client"
import type { Database } from "../../../db/database.types"
import type {
  UpdateWalletCommand,
  Wallet,
  WalletUpdate,
  WalletUpdatedDto,
} from "../../../types"

type WalletRow = Pick<
  Database["public"]["Tables"]["wallets"]["Row"],
  | "id"
  | "owner_id"
  | "name"
  | "description"
  | "deleted_at"
  | "created_at"
  | "updated_at"
>
type WalletResponseRow = Pick<
  WalletRow,
  "id" | "name" | "description" | "created_at" | "updated_at"
>

type UpdateWalletArgs = {
  supabase: SupabaseClient
  ownerId: Wallet["owner_id"]
  walletId: Wallet["id"]
  payload: UpdateWalletCommand
}

const WALLET_METADATA_COLUMNS =
  "id,owner_id,name,description,deleted_at,created_at,updated_at"
const WALLET_RESPONSE_COLUMNS = "id,name,description,created_at,updated_at"

export class WalletUpdateNotFoundError extends Error {
  public readonly code = "WALLET_NOT_FOUND"

  constructor(readonly walletId: string) {
    super(`Wallet with id "${walletId}" was not found`)
    this.name = "WalletUpdateNotFoundError"
  }
}

export class WalletUpdateForbiddenError extends Error {
  public readonly code = "WALLET_FORBIDDEN"

  constructor(readonly walletId: string, readonly ownerId: string) {
    super(`Wallet "${walletId}" is not accessible for owner "${ownerId}"`)
    this.name = "WalletUpdateForbiddenError"
  }
}

export class WalletUpdateNameConflictError extends Error {
  public readonly code = "WALLET_NAME_CONFLICT"

  constructor(readonly walletId: string, readonly walletName: string) {
    super(
      `Wallet "${walletName}" already exists for this owner (while updating "${walletId}")`,
    )
    this.name = "WalletUpdateNameConflictError"
  }
}

export class UpdateWalletServiceError extends Error {
  public readonly code = "UPDATE_WALLET_SERVICE_ERROR"

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = "UpdateWalletServiceError"
  }
}

export async function updateWallet({
  supabase,
  ownerId,
  walletId,
  payload,
}: UpdateWalletArgs): Promise<WalletUpdatedDto> {
  const walletResult = await supabase
    .from("wallets")
    .select(WALLET_METADATA_COLUMNS)
    .eq("id", walletId)
    .maybeSingle()

  if (walletResult.error) {
    throw new UpdateWalletServiceError("Failed to load wallet metadata", {
      cause: walletResult.error,
    })
  }

  const walletRow = (walletResult.data ?? null) as WalletRow | null

  if (!walletRow) {
    throw new WalletUpdateNotFoundError(walletId)
  }

  if (walletRow.owner_id !== ownerId) {
    throw new WalletUpdateForbiddenError(walletId, ownerId)
  }

  if (walletRow.deleted_at) {
    throw new WalletUpdateNotFoundError(walletId)
  }

  const updates: WalletUpdate = {}
  let hasChanges = false

  if (typeof payload.name === "string") {
    const normalizedExistingName = walletRow.name
    if (payload.name !== normalizedExistingName) {
      updates.name = payload.name
      hasChanges = true
    }
  }

  if (payload.description !== undefined) {
    const currentDescription = walletRow.description ?? null
    if (payload.description !== currentDescription) {
      updates.description = payload.description
      hasChanges = true
    }
  }

  if (!hasChanges) {
    return mapToWalletUpdatedDto(walletRow)
  }

  const updateResult = await supabase
    .from("wallets")
    .update(updates)
    .eq("id", walletId)
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .select(WALLET_RESPONSE_COLUMNS)
    .single()

  if (updateResult.error) {
    if (isUniqueConstraintViolation(updateResult.error)) {
      throw new WalletUpdateNameConflictError(
        walletId,
        updates.name ?? walletRow.name,
      )
    }

    throw new UpdateWalletServiceError("Failed to persist wallet changes", {
      cause: updateResult.error,
    })
  }

  return mapToWalletUpdatedDto(updateResult.data as WalletResponseRow)
}

function mapToWalletUpdatedDto(wallet: WalletResponseRow): WalletUpdatedDto {
  return {
    id: wallet.id,
    name: wallet.name,
    description: wallet.description,
    created_at: wallet.created_at,
    updated_at: wallet.updated_at,
  }
}

function isUniqueConstraintViolation(error: PostgrestError): boolean {
  return error.code === "23505"
}

