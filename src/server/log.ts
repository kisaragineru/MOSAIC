/**
 * Error logging that never includes personal data. Drizzle/pg error messages embed query
 * parameters (which may be diary text), so only names and SQLSTATE codes are logged.
 */
export function logError(context: string, e: unknown) {
  const err = e as { name?: string; code?: string; cause?: { code?: string; name?: string } };
  const code = err?.cause?.code ?? err?.code ?? "";
  console.error(`[error] ${context}: ${err?.name ?? typeof e}${code ? ` (${code})` : ""}`);
}
