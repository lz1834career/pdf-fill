import { describe, expect, it } from "vitest";
import { assertWarningsAllowed, parseFailOnWarningsSpec } from "./warnings.js";
import { PdfFillError } from "./types.js";

describe("parseFailOnWarningsSpec", () => {
  it("parses comma list", () => {
    expect(parseFailOnWarningsSpec("MISSING_FIELD, UNKNOWN_FIELD")).toEqual([
      "MISSING_FIELD",
      "UNKNOWN_FIELD",
    ]);
  });

  it("parses wildcard", () => {
    expect(parseFailOnWarningsSpec("*")).toEqual(["*"]);
  });
});

describe("assertWarningsAllowed", () => {
  it("throws on matching code", () => {
    expect(() =>
      assertWarningsAllowed(
        [{ code: "MISSING_FIELD", message: "x", field: "a" }],
        ["MISSING_FIELD"],
      ),
    ).toThrow(PdfFillError);
  });

  it("ignores non-matching codes", () => {
    expect(() =>
      assertWarningsAllowed(
        [{ code: "MISSING_FIELD", message: "x" }],
        ["UNKNOWN_FIELD"],
      ),
    ).not.toThrow();
  });
});
