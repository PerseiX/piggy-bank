const BEARER_SCHEME = "bearer";

export function extractBearerToken(headerValue: string | null): string | null {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");

  if (!token || scheme.toLowerCase() !== BEARER_SCHEME) {
    return null;
  }

  return token.trim();
}

export async function fingerprint(value: unknown): Promise<string> {
  try {
    const data = typeof value === "string" ? value : JSON.stringify(value);
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "unavailable";
  }
}
