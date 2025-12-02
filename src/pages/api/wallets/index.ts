import type { APIRoute } from "astro";
import { z } from "zod";

import { errorResponse, jsonResponse, logApiError } from "../../../lib/api/responses";
import { JsonBodyParseError, parseJsonBody } from "../../../lib/api/requestBody";
import { extractBearerToken, fingerprint } from "../../../lib/api/auth";
import { createWalletSchema } from "../../../lib/validation/wallets";
import {
  CreateWalletServiceError,
  DuplicateWalletNameError,
  createWallet,
} from "../../../lib/services/wallets/createWallet";
import { GetWalletsServiceError, getWalletsForOwner } from "../../../lib/services/wallets/getWallets";

export const prerender = false;

export const GET_WALLETS_DEFAULT_SORT = "updated_at" as const;
export const GET_WALLETS_DEFAULT_ORDER = "desc" as const;

export const walletSortEnum = z.enum(["name", "updated_at", "created_at"]);
export const walletOrderEnum = z.enum(["asc", "desc"]);

export const getWalletsQuerySchema = z
  .object({
    sort: walletSortEnum.optional(),
    order: walletOrderEnum.optional(),
  })
  .transform((value) => ({
    sort: value.sort ?? GET_WALLETS_DEFAULT_SORT,
    order: value.order ?? GET_WALLETS_DEFAULT_ORDER,
  }));

export type WalletSortField = z.infer<typeof walletSortEnum>;
export type WalletSortOrder = z.infer<typeof walletOrderEnum>;
export type GetWalletsQuery = z.infer<typeof getWalletsQuerySchema>;

const ERROR_CODES = {
  validation: "VALIDATION_ERROR",
  unauthorized: "UNAUTHORIZED",
  duplicateName: "DUPLICATE_NAME",
  server: "SERVER_ERROR",
} as const;

export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;

  if (!supabase) {
    logApiError("Supabase client missing from locals", null);
    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    });
  }

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
      logApiError("Failed to parse JSON body", error, { userId: ownerId });
      return errorResponse(400, {
        code: ERROR_CODES.validation,
        message: "Request body must be valid JSON",
      });
    }

    logApiError("Unexpected error while parsing JSON body", error, {
      userId: ownerId,
    });
    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    });
  }

  const validationResult = createWalletSchema.safeParse(parsedBody ?? {});

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
    const wallet = await createWallet({
      supabase,
      ownerId,
      payload,
    });

    return jsonResponse(201, wallet);
  } catch (error) {
    if (error instanceof DuplicateWalletNameError) {
      return errorResponse(409, {
        code: ERROR_CODES.duplicateName,
        message: "A wallet with this name already exists",
      });
    }

    const context = { userId: ownerId, payloadFingerprint };

    if (error instanceof CreateWalletServiceError) {
      logApiError("Wallet creation failed", error, context);
      return errorResponse(500, {
        code: ERROR_CODES.server,
        message: "Could not create wallet",
      });
    }

    logApiError("Unexpected error during wallet creation", error, context);

    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    });
  }
};

export const GET: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;

  if (!supabase) {
    logApiError("Supabase client missing from locals", null);
    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    });
  }

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
    });
    return errorResponse(401, {
      code: ERROR_CODES.unauthorized,
      message: "Unauthorized",
    });
  }

  const ownerId = userData.user.id;
  const queryValidationResult = getWalletsQuerySchema.safeParse({
    sort: new URL(request.url).searchParams.get("sort") ?? undefined,
    order: new URL(request.url).searchParams.get("order") ?? undefined,
  });

  if (!queryValidationResult.success) {
    return errorResponse(400, {
      code: ERROR_CODES.validation,
      message: "Validation failed",
      details: queryValidationResult.error.flatten(),
    });
  }

  const { sort, order } = queryValidationResult.data;

  try {
    const wallets = await getWalletsForOwner({
      supabase,
      ownerId,
      sort,
      order,
    });

    return jsonResponse(200, wallets);
  } catch (error) {
    const context = {
      userId: ownerId,
      sort,
      order,
    };

    if (error instanceof GetWalletsServiceError) {
      logApiError("Wallet retrieval failed", error, context);
      return errorResponse(500, {
        code: ERROR_CODES.server,
        message: "Could not fetch wallets",
      });
    }

    logApiError("Unexpected error during wallet retrieval", error, context);

    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    });
  }
};
