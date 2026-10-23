/**
 * Thin wrapper around the Anthropic SDK. Server-only: the API key never reaches the browser.
 *
 * Every AI feature in MOSAIC is optional. If ANTHROPIC_API_KEY is unset, the user has not
 * opted in, or the call fails/refuses, callers fall back to deterministic, evidence-only output.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

let client: Anthropic | null | undefined;
function getClient(): Anthropic | null {
  if (client !== undefined) return client;
  client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ timeout: 60_000, maxRetries: 2 }) : null;
  return client;
}

export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export type AiFailure = "not_configured" | "refused" | "invalid_output" | "rate_limited" | "unavailable";

/**
 * Structured generation. Returns null-with-reason instead of throwing so that callers always
 * have a deterministic fallback. Never logs prompt content (it contains personal records).
 */
export async function generateStructured<S extends z.ZodType>(opts: {
  system: string;
  user: string;
  schema: S;
  maxTokens?: number;
}): Promise<{ ok: true; data: z.infer<S> } | { ok: false; reason: AiFailure }> {
  const c = getClient();
  if (!c) return { ok: false, reason: "not_configured" };
  try {
    const response = await c.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: opts.maxTokens ?? 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(opts.schema) },
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    });
    if (response.stop_reason === "refusal") return { ok: false, reason: "refused" };
    if (response.parsed_output == null) return { ok: false, reason: "invalid_output" };
    return { ok: true, data: response.parsed_output as z.infer<S> };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return { ok: false, reason: "rate_limited" };
    if (error instanceof Anthropic.APIError) {
      console.error(`[ai] API error status=${error.status}`);
      return { ok: false, reason: "unavailable" };
    }
    console.error("[ai] request failed:", error instanceof Error ? error.name : "unknown");
    return { ok: false, reason: "unavailable" };
  }
}
