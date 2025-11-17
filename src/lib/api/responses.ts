const JSON_HEADERS = {
  "Content-Type": "application/json;charset=utf-8",
} as const

type JsonHeaders = typeof JSON_HEADERS

type ApiErrorBody = {
  error: {
    code: string
    message: string
    details?: unknown
    correlationId?: string
  }
}

export type ApiErrorDescriptor = ApiErrorBody["error"]

export function jsonResponse<T>(
  status: number,
  data: T,
  init?: ResponseInit
): Response {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: mergeHeaders(init?.headers),
    ...init,
  })
}

export function errorResponse(
  status: number,
  error: ApiErrorDescriptor,
  init?: ResponseInit
): Response {
  const body: ApiErrorBody = { error }

  return new Response(JSON.stringify(body), {
    status,
    headers: mergeHeaders(init?.headers),
    ...init,
  })
}

export function logApiError(
  message: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (error instanceof Error) {
    console.error(message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
    })
    return
  }

  console.error(message, { error, context })
}

function mergeHeaders(additional?: HeadersInit): JsonHeaders | Headers {
  if (!additional) {
    return JSON_HEADERS
  }

  const headers = new Headers(JSON_HEADERS)
  const additionalHeaders = new Headers(additional)

  additionalHeaders.forEach((value, key) => {
    headers.set(key, value)
  })

  return headers
}

