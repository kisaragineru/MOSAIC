import { afterEach, describe, expect, it } from "vitest";
import { launchChecklist } from "@/server/services/launch";

const saved = { DEV_TOOLS: process.env.DEV_TOOLS, ADMIN_EMAILS: process.env.ADMIN_EMAILS };
const devtools = () => launchChecklist().find((x) => x.key === "devtools")!.ok;

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k];
  else process.env[k] = v;
});

describe("launch checklist: development tools", () => {
  it("off is fine; on is fine only when they are the admins' alone", () => {
    delete process.env.DEV_TOOLS;
    delete process.env.ADMIN_EMAILS;
    expect(devtools()).toBe(true);
    process.env.DEV_TOOLS = "on";
    expect(devtools()).toBe(false);
    process.env.ADMIN_EMAILS = "boss@example.test";
    expect(devtools()).toBe(true);
  });
});
