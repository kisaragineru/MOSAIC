import { describe, expect, it } from "vitest";
import { preferredZone, timeZoneOptions } from "@/lib/timezones";

describe("time zone options", () => {
  it("offers the current IANA names, including the app's default", () => {
    const z = timeZoneOptions();
    expect(z).toContain("Asia/Ho_Chi_Minh");
    expect(z).toContain("Asia/Tokyo");
    expect(z).not.toContain("Asia/Saigon");
    expect(new Set(z).size).toBe(z.length);
  });
  it("always contains the value being edited", () => {
    expect(timeZoneOptions("Etc/GMT-7")).toContain("Etc/GMT-7");
  });
  it("maps legacy aliases", () => {
    expect(preferredZone("Asia/Saigon")).toBe("Asia/Ho_Chi_Minh");
    expect(preferredZone("Asia/Tokyo")).toBe("Asia/Tokyo");
  });
});
