export const INSTRUMENT_ERROR_CODES = {
  walletNotFound: "WALLET_NOT_FOUND",
  walletForbidden: "WALLET_FORBIDDEN",
  walletSoftDeleted: "WALLET_SOFT_DELETED",
  nameConflict: "INSTRUMENT_NAME_CONFLICT",
  service: "CREATE_INSTRUMENT_SERVICE_ERROR",
  listService: "LIST_WALLET_INSTRUMENTS_SERVICE_ERROR",
  instrumentNotFound: "INSTRUMENT_NOT_FOUND",
  instrumentForbidden: "INSTRUMENT_FORBIDDEN",
  instrumentSoftDeleted: "INSTRUMENT_SOFT_DELETED",
  instrumentAlreadyDeleted: "INSTRUMENT_ALREADY_DELETED",
  parentWalletSoftDeleted: "PARENT_WALLET_SOFT_DELETED",
  getService: "GET_INSTRUMENT_SERVICE_ERROR",
  updateService: "UPDATE_INSTRUMENT_SERVICE_ERROR",
  softDeleteService: "SOFT_DELETE_INSTRUMENT_SERVICE_ERROR",
  valueChangesService: "GET_INSTRUMENT_VALUE_CHANGES_SERVICE_ERROR",
} as const;

export type InstrumentErrorCode = (typeof INSTRUMENT_ERROR_CODES)[keyof typeof INSTRUMENT_ERROR_CODES];

export class InstrumentWalletNotFoundError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.walletNotFound;

  constructor(readonly walletId: string) {
    super(`Wallet with id "${walletId}" was not found`);
    this.name = "InstrumentWalletNotFoundError";
  }
}

export class InstrumentWalletForbiddenError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.walletForbidden;

  constructor(
    readonly walletId: string,
    readonly ownerId: string
  ) {
    super(`Wallet "${walletId}" is not accessible for owner "${ownerId}"`);
    this.name = "InstrumentWalletForbiddenError";
  }
}

export class InstrumentWalletSoftDeletedError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.walletSoftDeleted;

  constructor(readonly walletId: string) {
    super(`Wallet with id "${walletId}" has been soft-deleted`);
    this.name = "InstrumentWalletSoftDeletedError";
  }
}

export class InstrumentNameConflictError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.nameConflict;

  constructor(
    readonly walletId: string,
    readonly instrumentName: string
  ) {
    super(`Instrument "${instrumentName}" already exists in wallet "${walletId}"`);
    this.name = "InstrumentNameConflictError";
  }
}

export class CreateInstrumentServiceError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.service;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CreateInstrumentServiceError";
  }
}

export class ListWalletInstrumentsServiceError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.listService;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ListWalletInstrumentsServiceError";
  }
}

export class InstrumentNotFoundError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.instrumentNotFound;

  constructor(readonly instrumentId: string) {
    super(`Instrument with id "${instrumentId}" was not found`);
    this.name = "InstrumentNotFoundError";
  }
}

export class InstrumentForbiddenError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.instrumentForbidden;

  constructor(
    readonly instrumentId: string,
    readonly ownerId: string
  ) {
    super(`Instrument "${instrumentId}" is not accessible for owner "${ownerId}"`);
    this.name = "InstrumentForbiddenError";
  }
}

export class InstrumentSoftDeletedError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.instrumentSoftDeleted;

  constructor(readonly instrumentId: string) {
    super(`Instrument with id "${instrumentId}" has been soft-deleted`);
    this.name = "InstrumentSoftDeletedError";
  }
}

export class InstrumentAlreadyDeletedError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.instrumentAlreadyDeleted;

  constructor(readonly instrumentId: string) {
    super(`Instrument with id "${instrumentId}" has already been soft-deleted`);
    this.name = "InstrumentAlreadyDeletedError";
  }
}

export class ParentWalletSoftDeletedError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.parentWalletSoftDeleted;

  constructor(readonly walletId: string) {
    super(`Parent wallet "${walletId}" has been soft-deleted`);
    this.name = "ParentWalletSoftDeletedError";
  }
}

export class UpdateInstrumentServiceError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.updateService;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UpdateInstrumentServiceError";
  }
}

export class GetInstrumentServiceError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.getService;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GetInstrumentServiceError";
  }
}

export class InstrumentSoftDeleteFailedError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.softDeleteService;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "InstrumentSoftDeleteFailedError";
  }
}

export class InstrumentValueChangesServiceError extends Error {
  public readonly code = INSTRUMENT_ERROR_CODES.valueChangesService;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "InstrumentValueChangesServiceError";
  }
}
