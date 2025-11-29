export class JsonBodyParseError extends Error {
  public readonly code = "INVALID_JSON";

  constructor(message = "Request body must be valid JSON", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "JsonBodyParseError";
  }
}

export async function parseJsonBody<T = unknown>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch (error) {
    throw new JsonBodyParseError(undefined, { cause: error });
  }
}
