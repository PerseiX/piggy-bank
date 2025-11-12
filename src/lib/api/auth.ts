import { createHash } from "node:crypto"

const BEARER_SCHEME = "bearer"

export function extractBearerToken(headerValue: string | null): string | null {
  if (!headerValue) {
    return null
  }

  const [scheme, token] = headerValue.split(" ")

  if (!token || scheme.toLowerCase() !== BEARER_SCHEME) {
    return null
  }

  return token.trim()
}

export function fingerprint(value: unknown): string {
  try {
    return createHash("sha256")
      .update(typeof value === "string" ? value : JSON.stringify(value))
      .digest("hex")
  } catch {
    return "unavailable"
  }
}

