import { randomUUID } from "node:crypto";

export const CORRELATION_ID_HEADER = "x-correlation-id";

export function getRequestCorrelationId(request: Request): string | null {
  const headerValue = request.headers.get(CORRELATION_ID_HEADER);

  if (!headerValue) {
    return null;
  }

  const normalized = headerValue.trim();

  return normalized.length > 0 ? normalized : null;
}

export function createCorrelationId(): string {
  return randomUUID();
}

export function ensureCorrelationId(request: Request, fallback?: string): string {
  return getRequestCorrelationId(request) ?? fallback ?? createCorrelationId();
}

export function withCorrelationIdHeader(init: ResponseInit | undefined, correlationId: string): ResponseInit {
  const headers = new Headers(init?.headers);
  headers.set(CORRELATION_ID_HEADER, correlationId);

  return {
    ...init,
    headers,
  };
}
