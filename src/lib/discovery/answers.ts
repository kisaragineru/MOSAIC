import type { QuestionOption, Signal } from "@/content/questions";

export interface QuestionContent {
  format: "single" | "multi" | "scale" | "short" | "free";
  options: QuestionOption[] | null;
  maxChoices: number | null;
  scale: { min: number; max: number } | null;
}

export type Answer = { choice: string } | { choices: string[] } | { scale: number } | { text: string };

export const SHORT_MAX = 280;
export const FREE_MAX = 5000;

/** Validate a raw answer against the question version. Returns a normalised answer or throws. */
export function normalizeAnswer(q: QuestionContent, raw: unknown): Answer {
  const r = (raw ?? {}) as Record<string, unknown>;
  const values = new Set((q.options ?? []).map((o) => o.value));
  switch (q.format) {
    case "single": {
      const v = r.choice;
      if (typeof v !== "string" || !values.has(v)) throw new Error("invalid_choice");
      return { choice: v };
    }
    case "multi": {
      const v = r.choices;
      if (!Array.isArray(v) || v.length === 0) throw new Error("invalid_choice");
      const uniq = [...new Set(v)];
      if (!uniq.every((x) => typeof x === "string" && values.has(x))) throw new Error("invalid_choice");
      if (q.maxChoices && uniq.length > q.maxChoices) throw new Error("too_many_choices");
      // Keep catalog order so equal answers compare equal.
      const order = (q.options ?? []).map((o) => o.value);
      return { choices: (uniq as string[]).sort((a, b) => order.indexOf(a) - order.indexOf(b)) };
    }
    case "scale": {
      const v = typeof r.scale === "string" ? Number(r.scale) : r.scale;
      if (typeof v !== "number" || !Number.isInteger(v) || !q.scale || v < q.scale.min || v > q.scale.max) {
        throw new Error("invalid_scale");
      }
      return { scale: v };
    }
    case "short":
    case "free": {
      const v = typeof r.text === "string" ? r.text.trim() : "";
      const max = q.format === "short" ? SHORT_MAX : FREE_MAX;
      if (v.length === 0) throw new Error("empty_answer");
      if (v.length > max) throw new Error("answer_too_long");
      return { text: v };
    }
  }
}

export function sameAnswer(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Signals triggered by an answer. */
export function signalsFor(answer: Answer, signals: Signal[] | null | undefined): Signal[] {
  if (!signals) return [];
  return signals.filter((s) => {
    if (s.whenValue !== undefined) {
      if ("choice" in answer) return answer.choice === s.whenValue;
      if ("choices" in answer) return answer.choices.includes(s.whenValue);
      return false;
    }
    if ("scale" in answer) {
      if (s.whenScaleAtLeast !== undefined) return answer.scale >= s.whenScaleAtLeast;
      if (s.whenScaleAtMost !== undefined) return answer.scale <= s.whenScaleAtMost;
    }
    return false;
  });
}

/** Follow-up question triggered by an answer, if any. */
export function followUpFor(answer: Answer, followUps: { whenValue: string; questionId: string }[] | null | undefined) {
  if (!followUps) return null;
  for (const f of followUps) {
    if ("choice" in answer && answer.choice === f.whenValue) return f.questionId;
    if ("choices" in answer && answer.choices.includes(f.whenValue)) return f.questionId;
  }
  return null;
}
