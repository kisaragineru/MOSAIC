import { describe, expect, it } from "vitest";
import { answerQuestion } from "@/server/services/discovery";
import { createMemory, deleteMemory, editMemory } from "@/server/services/memories";
import { addRelationshipEvent, createPerson } from "@/server/services/people";
import { reflect, setAiOptIn, validateAiOutput } from "@/server/services/reflection";
import { makeUser } from "../helpers/factory";

describe("reflections (evidence-first)", () => {
  it("says 'insufficient' instead of inventing when there are no records", async () => {
    const u = await makeUser();
    const r = await reflect(u.userId, { kind: "changes", locale: "en" });
    expect(r).toMatchObject({ status: "insufficient", evidence: [], findings: [], ai: null });
  });

  it("finds changed answers and rewritten entries, each with evidence refs", async () => {
    const u = await makeUser();
    await answerQuestion(u.userId, { questionId: "v.success", questionVersion: 1, answer: { choice: "mastery" } });
    await answerQuestion(u.userId, { questionId: "v.success", questionVersion: 1, answer: { choice: "loved" }, changeKind: "changed_mind" });
    const id = await createMemory(u.userId, { kind: "value", body: "Career first." });
    await editMemory(u.userId, id, { kind: "value", body: "People first." });
    const r = await reflect(u.userId, { kind: "changes", locale: "en" });
    expect(r.status).toBe("ok");
    expect(r.findings).toHaveLength(2);
    expect(r.findings[0]!.text.en).toContain("you said your view changed");
    const refs = new Set(r.evidence.map((e) => e.ref));
    for (const f of r.findings) for (const ref of f.refs) expect(refs.has(ref)).toBe(true);
    const past = await reflect(u.userId, { kind: "past_beliefs", locale: "vi" });
    expect(past.evidence.some((e) => e.excerpt === "Career first.")).toBe(true);
  });

  it("deleted records are never used", async () => {
    const u = await makeUser();
    const ids = [];
    for (const body of ["Worried about money", "Money stress again", "Money talk with mom"]) {
      ids.push(await createMemory(u.userId, { kind: "feeling", body, tags: ["money"], mood: 2 }));
    }
    let r = await reflect(u.userId, { kind: "patterns", locale: "en" });
    expect(r.findings.map((f) => f.text.en)).toContain("The tag “money” appears in 3 entries.");
    await deleteMemory(u.userId, ids[0]!);
    r = await reflect(u.userId, { kind: "patterns", locale: "en" });
    expect(JSON.stringify(r)).not.toContain("Worried about money");
    expect(r.findings.map((f) => f.text.en)).not.toContain("The tag “money” appears in 3 entries.");
  });

  it("relationship timeline groups records by year; other users get not_found", async () => {
    const u = await makeUser();
    const pid = await createPerson(u.userId, { nickname: "Lan" });
    await addRelationshipEvent(u.userId, pid, { title: "Met at university", occurredOn: "2015-09-01" });
    await createMemory(u.userId, { kind: "memory", body: "Lan's wedding", occurredOn: "2024-05-01", personIds: [pid] });
    const r = await reflect(u.userId, { kind: "relationship", personId: pid, locale: "en" });
    expect(r.findings.map((f) => f.text.en)).toEqual(["2015: 1 record(s) involving Lan.", "2024: 1 record(s) involving Lan."]);
    const other = await makeUser();
    await expect(reflect(other.userId, { kind: "relationship", personId: pid, locale: "en" })).rejects.toMatchObject({ code: "not_found" });
  });

  it("AI is off unless opted in; without an API key it falls back cleanly", async () => {
    const u = await makeUser();
    await createMemory(u.userId, { kind: "value", body: "Family" });
    expect((await reflect(u.userId, { kind: "values", locale: "en", useAi: true })).aiUnavailableReason).toBe("not_opted_in");
    await setAiOptIn(u.userId, true);
    const r = await reflect(u.userId, { kind: "values", locale: "en", useAi: true });
    expect(r).toMatchObject({ ai: null, aiUnavailableReason: "not_configured", status: "ok" });
  });
});

describe("AI output validation", () => {
  const ev = [{ ref: "E1", recordType: "memory" as const, recordId: "x", date: "2026-01-01", excerpt: "a" }];
  it("rejects uncited or unknown citations", () => {
    expect(validateAiOutput({ insufficient: false, answer: "You value family.", citations: [] }, ev)).toBeNull();
    expect(validateAiOutput({ insufficient: false, answer: "You value family (E2).", citations: ["E1"] }, ev)).toBeNull();
    expect(validateAiOutput({ insufficient: false, answer: "Family matters (E1).", citations: ["E1"] }, ev)).toEqual({ text: "Family matters (E1).", refs: ["E1"] });
    expect(validateAiOutput({ insufficient: true, answer: "Not enough information.", citations: [] }, ev)).toEqual({ text: "Not enough information.", refs: [] });
  });
});
