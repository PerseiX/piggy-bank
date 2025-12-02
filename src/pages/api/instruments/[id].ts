import type { APIRoute } from "astro";

import { errorResponse, jsonResponse, logApiError } from "../../../lib/api/responses";
import { JsonBodyParseError, parseJsonBody } from "../../../lib/api/requestBody";
import { extractBearerToken, fingerprint } from "../../../lib/api/auth";
import {
  GetInstrumentServiceError,
  InstrumentForbiddenError,
  InstrumentAlreadyDeletedError,
  InstrumentNameConflictError,
  InstrumentNotFoundError,
  InstrumentSoftDeletedError,
  InstrumentSoftDeleteFailedError,
  ParentWalletSoftDeletedError,
  UpdateInstrumentServiceError,
} from "../../../lib/errors/instruments";
import { getInstrumentById } from "../../../lib/services/instruments/getInstrumentById";
import { updateInstrument } from "../../../lib/services/instruments/updateInstrument";
import { softDeleteInstrument } from "../../../lib/services/instruments/softDeleteInstrument";
import {
  instrumentIdParamSchema,
  updateInstrumentSchema,
  deleteInstrumentParamsSchema,
} from "../../../lib/validation/instruments";

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

  const paramValidationResult = instrumentIdParamSchema.safeParse({
    id: params?.id,
  });

  if (!paramValidationResult.success) {
    return errorResponse(400, {
      code: ERROR_CODES.validation,
      message: "Validation failed",
      details: paramValidationResult.error.flatten(),
    });
  }

  const instrumentId = paramValidationResult.data.id;
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
      instrumentId,
    });
    return errorResponse(401, {
      code: ERROR_CODES.unauthorized,
      message: "Unauthorized",
    });
  }

  const ownerId = userData.user.id;

  try {
    const result = await getInstrumentById({
      supabase,
      ownerId,
      instrumentId,
    });

    if (result.ok) {
      return jsonResponse(200, result.instrument);
    }

    if (result.reason === "forbidden") {
      logApiError("Instrument access forbidden during fetch", null, {
        userId: ownerId,
        instrumentId,
      });
      return errorResponse(403, {
        code: ERROR_CODES.forbidden,
        message: "Access to instrument denied",
      });
    }

    if (result.reason === "softDeleted") {
      logApiError("Attempted access to soft-deleted instrument", null, {
        userId: ownerId,
        instrumentId,
      });
      return errorResponse(404, {
        code: ERROR_CODES.notFound,
        message: "Instrument not found",
      });
    }

    return errorResponse(404, {
      code: ERROR_CODES.notFound,
      message: "Instrument not found",
    });
  } catch (error) {
    const context = {
      userId: ownerId,
      instrumentId,
    };

    if (error instanceof GetInstrumentServiceError) {
      logApiError("Instrument retrieval service failure", error, context);
      return errorResponse(500, {
        code: ERROR_CODES.server,
        message: "Internal server error",
      });
    }

    logApiError("Unexpected error during instrument fetch", error, context);

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

  const paramValidationResult = instrumentIdParamSchema.safeParse({
    id: params?.id,
  });

  if (!paramValidationResult.success) {
    return errorResponse(400, {
      code: ERROR_CODES.validation,
      message: "Validation failed",
      details: paramValidationResult.error.flatten(),
    });
  }

  const instrumentId = paramValidationResult.data.id;
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
      instrumentId,
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
      logApiError("Failed to parse JSON body", error, {
        userId: ownerId,
        instrumentId,
      });

      return errorResponse(400, {
        code: ERROR_CODES.validation,
        message: "Request body must be valid JSON",
      });
    }

    logApiError("Unexpected error while parsing JSON body", error, {
      userId: ownerId,
      instrumentId,
    });
    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    });
  }

  const validationResult = updateInstrumentSchema.safeParse(parsedBody ?? {});

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
    const instrument = await updateInstrument({
      supabase,
      ownerId,
      instrumentId,
      payload,
    });

    return jsonResponse(200, instrument);
  } catch (error) {
    const context = {
      userId: ownerId,
      instrumentId,
      payloadFingerprint,
    };

    if (error instanceof InstrumentNotFoundError) {
      logApiError("Instrument not found during update", error, context);
      return errorResponse(404, {
        code: ERROR_CODES.notFound,
        message: "Instrument not found",
      });
    }

    if (error instanceof InstrumentSoftDeletedError) {
      logApiError("Soft-deleted instrument update attempted", error, context);
      return errorResponse(404, {
        code: ERROR_CODES.notFound,
        message: "Instrument not found",
      });
    }

    if (error instanceof InstrumentForbiddenError) {
      logApiError("Instrument update forbidden", error, context);
      return errorResponse(403, {
        code: ERROR_CODES.forbidden,
        message: "Access to instrument denied",
      });
    }

    if (error instanceof ParentWalletSoftDeletedError) {
      logApiError("Parent wallet is soft-deleted", error, context);
      return errorResponse(400, {
        code: ERROR_CODES.validation,
        message: "Instrument cannot be updated because the wallet is inactive",
      });
    }

    if (error instanceof InstrumentNameConflictError) {
      logApiError("Instrument name conflict during update", error, context);
      return errorResponse(409, {
        code: ERROR_CODES.conflict,
        message: "An instrument with this name already exists in the wallet",
      });
    }

    if (error instanceof UpdateInstrumentServiceError) {
      logApiError("Instrument update service failure", error, context);
      return errorResponse(500, {
        code: ERROR_CODES.server,
        message: "Could not update instrument",
      });
    }

    logApiError("Unexpected error during instrument update", error, context);

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

  const paramValidationResult = deleteInstrumentParamsSchema.safeParse({
    id: params?.id,
  });

  if (!paramValidationResult.success) {
    return errorResponse(400, {
      code: ERROR_CODES.validation,
      message: "Validation failed",
      details: paramValidationResult.error.flatten(),
    });
  }

  const instrumentId = paramValidationResult.data.id;
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
      instrumentId,
    });
    return errorResponse(401, {
      code: ERROR_CODES.unauthorized,
      message: "Unauthorized",
    });
  }

  const ownerId = userData.user.id;
  let bodyFingerprint: string | undefined;

  try {
    // DELETE requests should not include a body; parse defensively to surface malformed payloads.
    const rawBody = await request.text();
    const trimmedBody = rawBody.trim();

    if (trimmedBody.length > 0) {
      try {
        const parsedBody = JSON.parse(trimmedBody);
        bodyFingerprint = await fingerprint(parsedBody);
      } catch (error) {
        logApiError("Failed to parse DELETE instrument JSON body", error, {
          userId: ownerId,
          instrumentId,
        });

        return errorResponse(400, {
          code: ERROR_CODES.validation,
          message: "Request body must be valid JSON",
        });
      }
    }
  } catch (error) {
    logApiError("Failed to read DELETE instrument request body", error, {
      userId: ownerId,
      instrumentId,
    });

    return errorResponse(400, {
      code: ERROR_CODES.validation,
      message: "Request body must be valid JSON",
    });
  }

  try {
    const deletedInstrument = await softDeleteInstrument({
      supabase,
      ownerId,
      instrumentId,
    });

    return jsonResponse(200, deletedInstrument);
  } catch (error) {
    const context = {
      userId: ownerId,
      instrumentId,
      ...(bodyFingerprint ? { bodyFingerprint } : {}),
    };

    if (error instanceof InstrumentNotFoundError) {
      logApiError("Instrument not found during delete", error, context);
      return errorResponse(404, {
        code: ERROR_CODES.notFound,
        message: "Instrument not found",
      });
    }

    if (error instanceof InstrumentSoftDeletedError) {
      logApiError("Soft-deleted instrument delete attempted", error, context);
      return errorResponse(404, {
        code: ERROR_CODES.notFound,
        message: "Instrument not found",
      });
    }

    if (error instanceof InstrumentAlreadyDeletedError) {
      logApiError("Instrument already soft-deleted", error, context);
      return errorResponse(404, {
        code: ERROR_CODES.notFound,
        message: "Instrument not found",
      });
    }

    if (error instanceof InstrumentForbiddenError) {
      logApiError("Instrument delete forbidden", error, context);
      return errorResponse(403, {
        code: ERROR_CODES.forbidden,
        message: "Access to instrument denied",
      });
    }

    if (error instanceof InstrumentSoftDeleteFailedError) {
      logApiError("Instrument soft delete service failure", error, context);
      return errorResponse(500, {
        code: ERROR_CODES.server,
        message: "Could not delete instrument",
      });
    }

    logApiError("Unexpected error during instrument delete", error, context);

    return errorResponse(500, {
      code: ERROR_CODES.server,
      message: "Internal server error",
    });
  }
};
