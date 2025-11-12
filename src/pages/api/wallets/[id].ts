import type { APIRoute } from "astro"

import {
  errorResponse,
  jsonResponse,
  logApiError,
} from "../../../lib/api/responses"
import { extractBearerToken, fingerprint } from "../../../lib/api/auth"
import {
  GetWalletDetailServiceError,
  WalletForbiddenError,
  WalletNotFoundError,
  getWalletDetail,
} from "../../../lib/services/wallets/getWalletDetail"
import { walletIdParamSchema } from "../../../lib/validation/wallets"

export const prerender = false

const ERROR_CODES = {
  validation: "VALIDATION_ERROR",
  unauthorized: "UNAUTHORIZED",
  forbidden: "FORBIDDEN",
  notFound: "NOT_FOUND",
  server: "SERVER_ERROR",
} as const

export const GET: APIRoute = async ({ request, params, locals }) => {
  const supabase = locals.supabase

  if (!supabase) {
    logApiError("Supabase client missing from locals", null)
    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    })
  }

  const paramValidationResult = walletIdParamSchema.safeParse({
    id: params?.id,
  })

  if (!paramValidationResult.success) {
    return errorResponse(400, {
      code: ERROR_CODES.validation,
      message: "Validation failed",
      details: paramValidationResult.error.flatten(),
    })
  }

  const walletId = paramValidationResult.data.id
  const token = extractBearerToken(request.headers.get("authorization"))

  if (!token) {
    return errorResponse(401, {
      code: ERROR_CODES.unauthorized,
      message: "Missing or invalid authorization token",
    })
  }

  const {
    data: userData,
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !userData?.user) {
    logApiError("Failed to authenticate request", authError, {
      tokenFingerprint: fingerprint(token),
      walletId,
    })
    return errorResponse(401, {
      code: ERROR_CODES.unauthorized,
      message: "Unauthorized",
    })
  }

  const ownerId = userData.user.id

  try {
    const wallet = await getWalletDetail({
      supabase,
      walletId,
      ownerId,
    })

    return jsonResponse(200, wallet)
  } catch (error) {
    const context = {
      userId: ownerId,
      walletId,
    }

    if (error instanceof WalletForbiddenError) {
      logApiError("Wallet access forbidden", error, context)
      return errorResponse(403, {
        code: ERROR_CODES.forbidden,
        message: "Access to wallet denied",
      })
    }

    if (error instanceof WalletNotFoundError) {
      logApiError("Wallet not found", error, context)
      return errorResponse(404, {
        code: ERROR_CODES.notFound,
        message: "Wallet not found",
      })
    }

    if (error instanceof GetWalletDetailServiceError) {
      logApiError("Wallet detail retrieval failed", error, context)
      return errorResponse(500, {
        code: ERROR_CODES.server,
        message: "Could not fetch wallet",
      })
    }

    logApiError("Unexpected error during wallet detail retrieval", error, context)

    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    })
  }
}

