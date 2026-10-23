/** Errors whose `code` is safe to show to users (translated in the UI). */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(code);
    this.name = "AppError";
  }
}

export const notFound = () => new AppError("not_found", 404);
export const forbidden = () => new AppError("forbidden", 403);
export const unauthorized = () => new AppError("unauthorized", 401);
export const rateLimited = () => new AppError("rate_limited", 429);
export const invalid = (code = "invalid_input") => new AppError(code, 400);

/** Map Postgres errors raised by our SECURITY DEFINER functions to AppErrors. */
export function mapDbError(e: unknown): never {
  const err = e as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = err.cause?.code ?? err.code;
  const message = err.cause?.message ?? err.message ?? "";
  if (code === "P0002") throw notFound();
  if (code === "42501") throw unauthorized();
  if (code === "P0001" || code === "22023") throw new AppError(message.split("\n")[0] || "invalid", 400);
  throw e;
}
