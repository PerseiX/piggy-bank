import type { APIRoute } from "astro";

import { errorResponse, jsonResponse, logApiError } from "../../../../lib/api/responses";
import { extractBearerToken, fingerprint } from "../../../../lib/api/auth";
import {
  CreateInstrumentServiceError,
  InstrumentNameConflictError,
  InstrumentWalletForbiddenError,
  InstrumentWalletNotFoundError,
  InstrumentWalletSoftDeletedError,
  ListWalletInstrumentsServiceError,
} from "../../../../lib/errors/instruments";
import { createInstrument } from "../../../../lib/services/instruments/createInstrument";
import { listWalletInstruments } from "../../../../lib/services/instruments/listWalletInstruments";
import { createInstrumentSchema, listWalletInstrumentsQuerySchema } from "../../../../lib/validation/instruments";
import { walletIdParamSchema } from "../../../../lib/validation/wallets";
import type { InstrumentDto } from "../../../../types";

export const prerender = false;

const ERROR_CODES = {
  validation: "VALIDATION_ERROR",
  unauthorized: "UNAUTHORIZED",
  forbidden: "FORBIDDEN",
  notFound: "NOT_FOUND",
  conflict: "CONFLICT",
  server: "SERVER_ERROR",
} as const;

interface InstrumentListResponse {
  data: InstrumentDto[];
}

const ALLOWED_QUERY_KEYS = new Set(["sort", "order"]);

export const POST: APIRoute = async ({ request, params, locals }) => {
  const supabase = locals.supabase;

  if (!supabase) {
    logApiError("Supabase client missing from locals", null);
    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    });
  }

  const paramValidationResult = walletIdParamSchema.safeParse({
    id: params?.walletId,
  });

  if (!paramValidationResult.success) {
    return errorResponse(400, {
      code: ERROR_CODES.validation,
      message: "Validation failed",
      details: paramValidationResult.error.flatten(),
    });
  }

  const walletId = paramValidationResult.data.id;
  const token = extractBearerToken(request.headers.get("authorization"));

  if (!token) {
    return errorResponse(401, {
      code: ERROR_CODES.unauthorized,
      message: "Missing or invalid authorization token",
    });
  }

  const { data: userData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !userData?.user) {
    logApiError("Failed to authenticate request", authError, {
      tokenFingerprint: await fingerprint(token),
      walletId,
    });
    return errorResponse(401, {
      code: ERROR_CODES.unauthorized,
      message: "Unauthorized",
    });
  }

  const ownerId = userData.user.id;
  let parsedBody: unknown;

  try {
    parsedBody = await request.json();
  } catch (error) {
    logApiError("Failed to parse JSON body", error, { userId: ownerId, walletId });
    return errorResponse(400, {
      code: ERROR_CODES.validation,
      message: "Request body must be valid JSON",
    });
  }

  const validationResult = createInstrumentSchema.safeParse(parsedBody ?? {});

  if (!validationResult.success) {
    return errorResponse(400, {
      code: ERROR_CODES.validation,
      message: "Validation failed",
      details: validationResult.error.flatten(),
    });
  }

  const payload = validationResult.data;
  const payloadFingerprint = await fingerprint(payload);

  try {
    const instrument = await createInstrument({
      supabase,
      walletId,
      ownerId,
      payload,
    });

    return jsonResponse(201, instrument);
  } catch (error) {
    const context = {
      userId: ownerId,
      walletId,
      payloadFingerprint,
    };

    if (error instanceof InstrumentWalletSoftDeletedError) {
      logApiError("Cannot create instrument for soft-deleted wallet", error, context);
      return errorResponse(400, {
        code: ERROR_CODES.validation,
        message: "Wallet is no longer active",
      });
    }

    if (error instanceof InstrumentWalletForbiddenError) {
      logApiError("Wallet access forbidden during instrument creation", error, context);
      return errorResponse(403, {
        code: ERROR_CODES.forbidden,
        message: "Access to wallet denied",
      });
    }

    if (error instanceof InstrumentWalletNotFoundError) {
      logApiError("Wallet not found during instrument creation", error, context);
      return errorResponse(404, {
        code: ERROR_CODES.notFound,
        message: "Wallet not found",
      });
    }

    if (error instanceof InstrumentNameConflictError) {
      return errorResponse(409, {
        code: ERROR_CODES.conflict,
        message: "An instrument with this name already exists in the wallet",
      });
    }

    if (error instanceof CreateInstrumentServiceError) {
      logApiError("Instrument creation failed", error, context);
      return errorResponse(500, {
        code: ERROR_CODES.server,
        message: "Could not create instrument",
      });
    }

    logApiError("Unexpected error during instrument creation", error, context);

    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    });
  }
};

export const GET: APIRoute = async ({ request, params, locals }) => {
  const supabase = locals.supabase;

  if (!supabase) {
    logApiError("Supabase client missing from locals", null);
    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    });
  }

  const paramValidationResult = walletIdParamSchema.safeParse({
    id: params?.walletId,
  });

  if (!paramValidationResult.success) {
    return errorResponse(400, {
      code: ERROR_CODES.validation,
      message: "Validation failed",
      details: paramValidationResult.error.flatten(),
    });
  }

  const walletId = paramValidationResult.data.id;

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const unknownKeys = new Set<string>();
  const duplicateKeys: string[] = [];
  const keyCounts = new Map<string, number>();

  searchParams.forEach((_, key) => {
    const nextCount = (keyCounts.get(key) ?? 0) + 1;
    keyCounts.set(key, nextCount);

    if (!ALLOWED_QUERY_KEYS.has(key)) {
      unknownKeys.add(key);
    }
  });

  for (const [key, count] of keyCounts.entries()) {
    if (count > 1) {
      duplicateKeys.push(key);
    }
  }

  if (unknownKeys.size > 0 || duplicateKeys.length > 0) {
    return errorResponse(400, {
      code: ERROR_CODES.validation,
      message: "Validation failed",
      details: {
        unknownKeys: Array.from(unknownKeys),
        duplicateKeys,
      },
    });
  }

  const queryValidationResult = listWalletInstrumentsQuerySchema.safeParse({
    sort: searchParams.get("sort") ?? undefined,
    order: searchParams.get("order") ?? undefined,
  });

  if (!queryValidationResult.success) {
    return errorResponse(400, {
      code: ERROR_CODES.validation,
      message: "Validation failed",
      details: queryValidationResult.error.flatten(),
    });
  }

  const { sort, order } = queryValidationResult.data;

  const token = extractBearerToken(request.headers.get("authorization"));

  if (!token) {
    return errorResponse(401, {
      code: ERROR_CODES.unauthorized,
      message: "Missing or invalid authorization token",
    });
  }

  const { data: userData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !userData?.user) {
    logApiError("Failed to authenticate request", authError, {
      tokenFingerprint: await fingerprint(token),
      walletId,
    });
    return errorResponse(401, {
      code: ERROR_CODES.unauthorized,
      message: "Unauthorized",
    });
  }

  const ownerId = userData.user.id;

  try {
    const instruments = await listWalletInstruments({
      supabase,
      ownerId,
      walletId,
      sort,
      order,
    });

    const response: InstrumentListResponse = { data: instruments };

    return jsonResponse(200, response);
  } catch (error) {
    const context = {
      userId: ownerId,
      walletId,
      sort,
      order,
    };

    if (error instanceof InstrumentWalletSoftDeletedError) {
      logApiError("Attempt to list instruments for soft-deleted wallet", error, context);
      return errorResponse(404, {
        code: ERROR_CODES.notFound,
        message: "Wallet not found",
      });
    }

    if (error instanceof InstrumentWalletForbiddenError) {
      logApiError("Wallet access forbidden during instrument listing", error, context);
      return errorResponse(403, {
        code: ERROR_CODES.forbidden,
        message: "Access to wallet denied",
      });
    }

    if (error instanceof InstrumentWalletNotFoundError) {
      logApiError("Wallet not found during instrument listing", error, context);
      return errorResponse(404, {
        code: ERROR_CODES.notFound,
        message: "Wallet not found",
      });
    }

    if (error instanceof ListWalletInstrumentsServiceError) {
      logApiError("Instrument list service failure", error, context);
      return errorResponse(500, {
        code: ERROR_CODES.server,
        message: "Internal server error",
      });
    }

    logApiError("Unexpected error during instrument listing", error, context);

    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    });
  }
};
