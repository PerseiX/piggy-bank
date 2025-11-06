import type { APIRoute } from "astro"
import { createHash } from "node:crypto"

import {
  errorResponse,
  jsonResponse,
  logApiError,
} from "../../../lib/api/responses"
import { createWalletSchema } from "../../../lib/validation/wallets"
import {
  CreateWalletServiceError,
  DuplicateWalletNameError,
  createWallet,
} from "../../../lib/services/wallets/createWallet"

export const prerender = false

const ERROR_CODES = {
  validation: "VALIDATION_ERROR",
  unauthorized: "UNAUTHORIZED",
  duplicateName: "DUPLICATE_NAME",
  server: "SERVER_ERROR",
} as const

const AUTH_SCHEME = "bearer"

export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase

  if (!supabase) {
    logApiError("Supabase client missing from locals", null)
    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    })
  }

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
    })
    return errorResponse(401, {
      code: ERROR_CODES.unauthorized,
      message: "Unauthorized",
    })
  }

  const ownerId = userData.user.id
  let parsedBody: unknown

  try {
    parsedBody = await request.json()
  } catch (error) {
    logApiError("Failed to parse JSON body", error, { userId: ownerId })
    return errorResponse(400, {
      code: ERROR_CODES.validation,
      message: "Request body must be valid JSON",
    })
  }

  const validationResult = createWalletSchema.safeParse(parsedBody ?? {})

  if (!validationResult.success) {
    return errorResponse(400, {
      code: ERROR_CODES.validation,
      message: "Validation failed",
      details: validationResult.error.flatten(),
    })
  }

  const payload = validationResult.data
  const payloadFingerprint = fingerprint(payload)

  try {
    const wallet = await createWallet({
      supabase,
      ownerId,
      payload,
    })

    return jsonResponse(201, wallet)
  } catch (error) {
    if (error instanceof DuplicateWalletNameError) {
      return errorResponse(409, {
        code: ERROR_CODES.duplicateName,
        message: "A wallet with this name already exists",
      })
    }

    const context = { userId: ownerId, payloadFingerprint }

    if (error instanceof CreateWalletServiceError) {
      logApiError("Wallet creation failed", error, context)
      return errorResponse(500, {
        code: ERROR_CODES.server,
        message: "Could not create wallet",
      })
    }

    logApiError("Unexpected error during wallet creation", error, context)

    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    })
  }
}

function extractBearerToken(headerValue: string | null): string | null {
  if (!headerValue) {
    return null
  }

  const [scheme, token] = headerValue.split(" ")

  if (!token || scheme.toLowerCase() !== AUTH_SCHEME) {
    return null
  }

  return token.trim()
}

function fingerprint(value: unknown): string {
  try {
    return createHash("sha256")
      .update(typeof value === "string" ? value : JSON.stringify(value))
      .digest("hex")
  } catch {
    return "unavailable"
  }
}

