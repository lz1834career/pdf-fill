import { describe, expect, it } from "vitest";
import { createComplexFixture } from "./test-helpers/create-fixture.js";
import {
  fillFormFromBytes as fillForm,
  readFillDataFromTemplate,
} from "./engine/pdf-lib-engine.js";
import { filterNonemptyPrefill } from "./scaffold.js";
import { scaffoldFromTemplate } from "./scaffold-business.js";
import {
  buildFillReport,
  REPORT_VERSION,
  serializeBatchManifest,
} from "./report.js";
import type { BatchManifestEntry } from "./report.js";

describe("readFillDataFromTemplate", () => {
  it("reads non-empty template values", async () => {
    const pdf = await createComplexFixture();
    const data = await readFillDataFromTemplate(pdf);
    expect(data.reference_no).toBe("REF-2026-0001");
    expect(data.notify_email).toBe(true);
  });
});

describe("scaffold prefill", () => {
  it("merges template values into scaffold", async () => {
    const pdf = await createComplexFixture();
    const bundle = await scaffoldFromTemplate(pdf, {
      includeReadOnly: true,
      prefillFromTemplate: true,
    });
    expect(bundle.pdfData.reference_no).toBe("REF-2026-0001");
    expect(bundle.pdfData.notify_email).toBe(true);
  });

  it("filterNonemptyPrefill drops blank strings", () => {
    expect(
      filterNonemptyPrefill({ a: "", b: "x", c: "  " }),
    ).toEqual({ b: "x" });
  });
});

describe("ignoreFields", () => {
  it("skips MISSING_FIELD warnings for ignored names", async () => {
    const pdf = await createComplexFixture();
    const { warnings } = await fillForm(pdf, { "applicant.name": "A" }, {
      ignoreFields: ["reference_no"],
    });
    expect(
      warnings.some((w) => w.code === "MISSING_FIELD" && w.field === "reference_no"),
    ).toBe(false);
    expect(warnings.some((w) => w.code === "MISSING_FIELD")).toBe(true);
  });
});

describe("buildFillReport", () => {
  it("builds versioned report object", async () => {
    const pdf = await createComplexFixture();
    const started = new Date();
    const fill = await fillForm(pdf, { "applicant.name": "Test" });
    const report = buildFillReport({
      ok: true,
      startedAt: started,
      durationMs: 12,
      template: "t.pdf",
      output: "out.pdf",
      fill,
    });
    expect(report.version).toBe(REPORT_VERSION);
    expect(report.command).toBe("fill");
    expect(report.fieldsFilled).toContain("applicant.name");
  });
});

describe("serializeBatchManifest", () => {
  const row: BatchManifestEntry = {
    index: 0,
    ok: true,
    output: "0.pdf",
    fieldsFilled: ["a"],
    warnings: [],
    durationMs: 10,
  };

  it("serializes JSON array", () => {
    const text = serializeBatchManifest([row], "json");
    expect(JSON.parse(text.trim())).toEqual([row]);
  });

  it("serializes JSONL", () => {
    const text = serializeBatchManifest([row, { ...row, index: 1 }], "jsonl");
    const lines = text.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!)).toMatchObject({ index: 0 });
    expect(JSON.parse(lines[1]!)).toMatchObject({ index: 1 });
  });
});
