export const INSTRUMENT_ERROR_CODES = {
  walletNotFound: "WALLET_NOT_FOUND",
  walletForbidden: "WALLET_FORBIDDEN",
  walletSoftDeleted: "WALLET_SOFT_DELETED",
  nameConflict: "INSTRUMENT_NAME_CONFLICT",
  service: "CREATE_INSTRUMENT_SERVICE_ERROR",
} as const

export type InstrumentErrorCode =
  (typeof INSTRUMENT_ERROR_CODES)[keyof typeof INSTRUMENT_ERROR_CODES]

export class InstrumentWalletNotFoundError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.walletNotFound

  constructor(readonly walletId: string) {
    super(`Wallet with id "${walletId}" was not found`)
    this.name = "InstrumentWalletNotFoundError"
  }
}

export class InstrumentWalletForbiddenError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.walletForbidden

  constructor(
    readonly walletId: string,
    readonly ownerId: string,
  ) {
    super(`Wallet "${walletId}" is not accessible for owner "${ownerId}"`)
    this.name = "InstrumentWalletForbiddenError"
  }
}

export class InstrumentWalletSoftDeletedError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.walletSoftDeleted

  constructor(readonly walletId: string) {
    super(`Wallet with id "${walletId}" has been soft-deleted`)
    this.name = "InstrumentWalletSoftDeletedError"
  }
}

export class InstrumentNameConflictError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.nameConflict

  constructor(
    readonly walletId: string,
    readonly instrumentName: string,
  ) {
    super(
      `Instrument "${instrumentName}" already exists in wallet "${walletId}"`,
    )
    this.name = "InstrumentNameConflictError"
  }
}

export class CreateInstrumentServiceError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.service

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = "CreateInstrumentServiceError"
  }
}

