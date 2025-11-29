import type { APIRoute } from "astro";

import { errorResponse, jsonResponse, logApiError } from "../../../lib/api/responses";
import { JsonBodyParseError, parseJsonBody } from "../../../lib/api/requestBody";
import { extractBearerToken, fingerprint } from "../../../lib/api/auth";
import {
  GetWalletDetailServiceError,
  WalletForbiddenError,
  WalletNotFoundError,
  getWalletDetail,
} from "../../../lib/services/wallets/getWalletDetail";
import {
  UpdateWalletServiceError,
  WalletUpdateForbiddenError,
  WalletUpdateNameConflictError,
  WalletUpdateNotFoundError,
  updateWallet,
} from "../../../lib/services/wallets/updateWallet";
import {
  SoftDeleteWalletServiceError,
  WalletSoftDeleteForbiddenError,
  WalletSoftDeleteNotFoundError,
  softDeleteWallet,
} from "../../../lib/services/wallets/softDeleteWallet";
import { updateWalletSchema, walletIdParamSchema } from "../../../lib/validation/wallets";

export const prerender = false;

const ERROR_CODES = {
  validation: "VALIDATION_ERROR",
  unauthorized: "UNAUTHORIZED",
  forbidden: "FORBIDDEN",
  notFound: "NOT_FOUND",
  conflict: "CONFLICT",
  server: "SERVER_ERROR",
} as const;

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
    id: params?.id,
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
      tokenFingerprint: fingerprint(token),
      walletId,
    });
    return errorResponse(401, {
      code: ERROR_CODES.unauthorized,
      message: "Unauthorized",
    });
  }

  const ownerId = userData.user.id;

  try {
    const wallet = await getWalletDetail({
      supabase,
      walletId,
      ownerId,
    });

    return jsonResponse(200, wallet);
  } catch (error) {
    const context = {
      userId: ownerId,
      walletId,
    };

    if (error instanceof WalletForbiddenError) {
      logApiError("Wallet access forbidden", error, context);
      return errorResponse(403, {
        code: ERROR_CODES.forbidden,
        message: "Access to wallet denied",
      });
    }

    if (error instanceof WalletNotFoundError) {
      logApiError("Wallet not found", error, context);
      return errorResponse(404, {
        code: ERROR_CODES.notFound,
        message: "Wallet not found",
      });
    }

    if (error instanceof GetWalletDetailServiceError) {
      logApiError("Wallet detail retrieval failed", error, context);
      return errorResponse(500, {
        code: ERROR_CODES.server,
        message: "Could not fetch wallet",
      });
    }

    logApiError("Unexpected error during wallet detail retrieval", error, context);

    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    });
  }
};

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  const supabase = locals.supabase;

  if (!supabase) {
    logApiError("Supabase client missing from locals", null);
    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    });
  }

  const paramValidationResult = walletIdParamSchema.safeParse({
    id: params?.id,
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
      tokenFingerprint: fingerprint(token),
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
    parsedBody = await parseJsonBody(request);
  } catch (error) {
    if (error instanceof JsonBodyParseError) {
      logApiError("Failed to parse JSON body", error, { userId: ownerId, walletId });
      return errorResponse(400, {
        code: ERROR_CODES.validation,
        message: "Request body must be valid JSON",
      });
    }

    logApiError("Unexpected error while parsing JSON body", error, {
      userId: ownerId,
      walletId,
    });
    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    });
  }

  const validationResult = updateWalletSchema.safeParse(parsedBody ?? {});

  if (!validationResult.success) {
    return errorResponse(400, {
      code: ERROR_CODES.validation,
      message: "Validation failed",
      details: validationResult.error.flatten(),
    });
  }

  const payload = validationResult.data;
  const payloadFingerprint = fingerprint(payload);

  try {
    const wallet = await updateWallet({
      supabase,
      ownerId,
      walletId,
      payload,
    });

    return jsonResponse(200, wallet);
  } catch (error) {
    const context = {
      userId: ownerId,
      walletId,
      payloadFingerprint,
    };

    if (error instanceof WalletUpdateNotFoundError) {
      logApiError("Wallet not found during update", error, context);
      return errorResponse(404, {
        code: ERROR_CODES.notFound,
        message: "Wallet not found",
      });
    }

    if (error instanceof WalletUpdateForbiddenError) {
      logApiError("Wallet update forbidden", error, context);
      return errorResponse(403, {
        code: ERROR_CODES.forbidden,
        message: "Access to wallet denied",
      });
    }

    if (error instanceof WalletUpdateNameConflictError) {
      logApiError("Wallet update name conflict", error, context);
      return errorResponse(409, {
        code: ERROR_CODES.conflict,
        message: "A wallet with this name already exists",
      });
    }

    if (error instanceof UpdateWalletServiceError) {
      logApiError("Wallet update service failure", error, context);
      return errorResponse(500, {
        code: ERROR_CODES.server,
        message: "Could not update wallet",
      });
    }

    logApiError("Unexpected error during wallet update", error, context);

    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    });
  }
};

export const DELETE: APIRoute = async ({ request, params, locals }) => {
  const supabase = locals.supabase;

  if (!supabase) {
    logApiError("Supabase client missing from locals", null);
    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    });
  }

  const paramValidationResult = walletIdParamSchema.safeParse({
    id: params?.id,
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
      tokenFingerprint: fingerprint(token),
      walletId,
    });
    return errorResponse(401, {
      code: ERROR_CODES.unauthorized,
      message: "Unauthorized",
    });
  }

  const ownerId = userData.user.id;
  const now = new Date().toISOString();

  try {
    const result = await softDeleteWallet({
      supabase,
      walletId,
      ownerId,
      now,
    });

    return jsonResponse(200, result);
  } catch (error) {
    const context = {
      userId: ownerId,
      walletId,
      tokenFingerprint: fingerprint(token),
      now,
    };

    if (error instanceof WalletSoftDeleteForbiddenError) {
      logApiError("Wallet soft delete forbidden", error, context);
      return errorResponse(403, {
        code: ERROR_CODES.forbidden,
        message: "Access to wallet denied",
      });
    }

    if (error instanceof WalletSoftDeleteNotFoundError) {
      logApiError("Wallet not found during soft delete", error, context);
      return errorResponse(404, {
        code: ERROR_CODES.notFound,
        message: "Wallet not found",
      });
    }

    if (error instanceof SoftDeleteWalletServiceError) {
      logApiError("Wallet soft delete service failure", error, context);
      return errorResponse(500, {
        code: ERROR_CODES.server,
        message: "Could not delete wallet",
      });
    }

    logApiError("Unexpected error during wallet soft delete", error, context);

    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    });
  }
};
