import { describe, expect, it } from "vitest";
import { levelOf, levelScopes, withLevel } from "@/lib/sharing/scope-levels";

describe("sharing levels per connection", () => {
  it("reads a level from the scopes chosen", () => {
    expect(levelOf("tuvi", [])).toBe("none");
    expect(levelOf("tuvi", ["tuvi", "values"])).toBe("tuvi");
    expect(levelOf("tuvi", ["tuvi", "tuvi_detail"])).toBe("detail");
    // An older choice of the full chart alone still counts as the full chart.
    expect(levelOf("tuvi", ["tuvi_detail"])).toBe("detail");
    expect(levelOf("answers", ["tuvi", "values"])).toBe("values");
    expect(levelOf("answers", ["preferences", "values"])).toBe("both");
  });

  it("changes only its own group's scopes", () => {
    expect(withLevel(["preferences", "tuvi"], "tuvi", "detail")).toEqual(["tuvi", "tuvi_detail", "preferences"]);
    expect(withLevel(["tuvi", "tuvi_detail", "values"], "tuvi", "none")).toEqual(["values"]);
    expect(withLevel(["tuvi", "preferences"], "answers", "values")).toEqual(["tuvi", "values"]);
    expect(withLevel(["tuvi", "preferences", "values"], "answers", "none")).toEqual(["tuvi"]);
  });

  it("knows only its own levels", () => {
    expect(levelScopes("tuvi", "both")).toBeNull();
    expect(levelScopes("answers", "toString")).toBeNull();
    expect(levelScopes("answers", "both")).toEqual(["preferences", "values"]);
  });
});
