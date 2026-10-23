import { ZodError } from "zod";
import { AppError } from "@/server/errors";
import { logError } from "@/server/log";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** Run a service call and turn known failures into user-facing error codes. */
export async function attempt<T>(context: string, fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.code };
    if (e instanceof ZodError) {
      const msg = e.issues[0]?.message ?? "";
      return { ok: false, error: /^[a-z_]+$/.test(msg) ? msg : "invalid_input" };
    }
    logError(context, e);
    return { ok: false, error: "generic" };
  }
}

export const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v : "";
};
export const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";

/** Only allow same-site relative redirect targets. */
export function safeNext(v: string | null | undefined, fallback = "/home") {
  return v && /^\/(?!\/)[\w\-/?=&.%]*$/.test(v) ? v : fallback;
}

export function withParam(path: string, key: string, value: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
}
