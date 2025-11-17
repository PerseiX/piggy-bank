import type { APIRoute } from "astro"

import {
  errorResponse,
  jsonResponse,
  logApiError,
} from "../../../../lib/api/responses"
import { extractBearerToken, fingerprint } from "../../../../lib/api/auth"
import {
  ensureCorrelationId,
  withCorrelationIdHeader,
} from "../../../../lib/api/correlationId"
import {
  InstrumentForbiddenError,
  InstrumentNotFoundError,
  InstrumentSoftDeletedError,
  InstrumentValueChangesServiceError,
} from "../../../../lib/errors/instruments"
import { getInstrumentValueChangeHistory } from "../../../../lib/services/instrumentValueChanges/getInstrumentValueChangeHistory"
import { instrumentIdParamSchema } from "../../../../lib/validation/instruments"

export const prerender = false

const ERROR_CODES = {
  validation: "VALIDATION_ERROR",
  unauthorized: "UNAUTHORIZED",
  forbidden: "FORBIDDEN",
  notFound: "NOT_FOUND",
  server: "SERVER_ERROR",
} as const

export const GET: APIRoute = async ({ request, params, locals }) => {
  const correlationId = ensureCorrelationId(request)

  const respondWithError = (
    status: number,
    error: {
      code: string
      message: string
      details?: unknown
    },
  ) =>
    errorResponse(
      status,
      { ...error, correlationId },
      withCorrelationIdHeader(undefined, correlationId),
    )

  const respondWithData = <T>(status: number, data: T) =>
    jsonResponse(status, data, withCorrelationIdHeader(undefined, correlationId))

  const supabase = locals.supabase

  if (!supabase) {
    logApiError("Supabase client missing from locals", null, { correlationId })
    return respondWithError(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    })
  }

  const paramValidationResult = instrumentIdParamSchema.safeParse({
    id: params?.id,
  })

  if (!paramValidationResult.success) {
    return respondWithError(400, {
      code: ERROR_CODES.validation,
      message: "Validation failed",
      details: paramValidationResult.error.flatten(),
    })
  }

  const instrumentId = paramValidationResult.data.id
  const token = extractBearerToken(request.headers.get("authorization"))

  if (!token) {
    return respondWithError(401, {
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
      instrumentId,
      correlationId,
    })
    return respondWithError(401, {
      code: ERROR_CODES.unauthorized,
      message: "Unauthorized",
    })
  }

  const ownerId = userData.user.id

  try {
    const history = await getInstrumentValueChangeHistory({
      supabase,
      ownerId,
      instrumentId,
    })

    return respondWithData(200, history)
  } catch (error) {
    const context = {
      userId: ownerId,
      instrumentId,
      correlationId,
    }

    if (error instanceof InstrumentForbiddenError) {
      logApiError("Instrument history access forbidden", error, context)
      return respondWithError(403, {
        code: ERROR_CODES.forbidden,
        message: "Access to instrument denied",
      })
    }

    if (error instanceof InstrumentSoftDeletedError) {
      logApiError("Instrument history access on soft-deleted instrument", error, context)
      return respondWithError(404, {
        code: ERROR_CODES.notFound,
        message: "Instrument not found",
      })
    }

    if (error instanceof InstrumentNotFoundError) {
      logApiError("Instrument history access on missing instrument", error, context)
      return respondWithError(404, {
        code: ERROR_CODES.notFound,
        message: "Instrument not found",
      })
    }

    if (error instanceof InstrumentValueChangesServiceError) {
      logApiError("Instrument history service failure", error, context)
      return respondWithError(500, {
        code: ERROR_CODES.server,
        message: "Internal server error",
      })
    }

    logApiError("Unexpected error during instrument history retrieval", error, context)

    return respondWithError(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    })
  }
}

