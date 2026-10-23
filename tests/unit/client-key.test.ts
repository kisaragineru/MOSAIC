import { afterEach, describe, expect, it, vi } from "vitest";

let incoming = new Headers();
vi.mock("next/headers", () => ({ headers: async () => incoming, cookies: async () => ({ get: () => undefined }) }));
vi.mock("server-only", () => ({}));

const { clientKey } = await import("@/server/auth/session");

describe("clientKey", () => {
  afterEach(() => {
    delete process.env.TRUST_PROXY;
    delete process.env.CLIENT_IP_HEADER;
  });

  it("ignores headers unless TRUST_PROXY=1", async () => {
    incoming = new Headers({ "x-forwarded-for": "1.2.3.4" });
    expect(await clientKey()).toBeNull();
  });

  it("uses the first X-Forwarded-For entry by default", async () => {
    process.env.TRUST_PROXY = "1";
    incoming = new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" });
    expect(await clientKey()).toBe("1.2.3.4");
  });

  it("uses only CLIENT_IP_HEADER when set, so a forged X-Forwarded-For is ignored", async () => {
    process.env.TRUST_PROXY = "1";
    process.env.CLIENT_IP_HEADER = "x-nf-client-connection-ip";
    incoming = new Headers({ "x-forwarded-for": "6.6.6.6", "x-nf-client-connection-ip": "5.6.7.8" });
    expect(await clientKey()).toBe("5.6.7.8");
    incoming = new Headers({ "x-forwarded-for": "6.6.6.6" });
    expect(await clientKey()).toBeNull();
  });
});
