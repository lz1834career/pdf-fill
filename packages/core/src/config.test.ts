import { describe, expect, it } from "vitest";
import { mergePdffillConfig, parsePdffillConfig } from "./config.js";
import { PdfFillError } from "./types.js";

describe("parsePdffillConfig", () => {
  it("parses valid config", () => {
    const c = parsePdffillConfig({
      ignoreFields: ["reference_no"],
      fontPath: "/fonts/simhei.ttf",
      missing: "skip",
    });
    expect(c.ignoreFields).toEqual(["reference_no"]);
    expect(c.missing).toBe("skip");
  });

  it("rejects invalid shape", () => {
    expect(() => parsePdffillConfig([])).toThrow(PdfFillError);
  });
});

describe("mergePdffillConfig", () => {
  it("CLI overrides config file", () => {
    const merged = mergePdffillConfig(
      { ignoreFields: ["a"], fontPath: "cfg.ttf" },
      { fontPath: "cli.ttf" },
    );
    expect(merged.ignoreFields).toEqual(["a"]);
    expect(merged.fontPath).toBe("cli.ttf");
  });

  it("keeps config ignoreFields when CLI omits them", () => {
    const merged = mergePdffillConfig(
      { ignoreFields: ["reference_no"] },
      {},
    );
    expect(merged.ignoreFields).toEqual(["reference_no"]);
  });
});
