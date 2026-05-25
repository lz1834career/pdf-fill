import { describe, expect, it } from "vitest";
import { createComplexFixture, createSimpleTextFixture } from "./test-helpers/create-fixture.js";
import { listFieldsFromBytes as listFields } from "./engine/pdf-lib-engine.js";
import { diffFields, diffFieldsWithMapping } from "./diff-fields.js";
import { parseMappingFile } from "./mapping.js";

describe("diffFields", () => {
  it("reports missing and unknown keys", async () => {
    const pdf = await createSimpleTextFixture();
    const result = await diffFields(pdf, { first_name: "A", extra: "x" });
    expect(result.ok).toBe(false);
    expect(result.missingInData).toContain("last_name");
    expect(result.missingInData).toContain("email");
    expect(result.unknownInData).toEqual(["extra"]);
  });

  it("respects ignoreFields", async () => {
    const pdf = await createComplexFixture();
    const partial = { "applicant.name": "Test" };
    const result = await diffFields(pdf, partial, {
      ignoreFields: ["reference_no"],
    });
    expect(result.missingInData).not.toContain("reference_no");
  });

  it("flags unchanged template values when compareTemplate", async () => {
    const pdf = await createComplexFixture();
    const result = await diffFields(
      pdf,
      { reference_no: "REF-2026-0001" },
      { compareTemplate: true, includeReadOnly: true },
    );
    expect(result.unchangedFromTemplate?.some((u) => u.field === "reference_no")).toBe(
      true,
    );
  });
});

describe("diffFieldsWithMapping", () => {
  it("reports mapping gaps", async () => {
    const pdf = await createComplexFixture();
    const fields = await listFields(pdf);
    const mapping = parseMappingFile({
      mapping: {
        "applicant.name": "applicant.name",
        "missing.path": "department",
      },
    });
    const result = diffFieldsWithMapping(
      fields,
      { applicant: { name: "A" } },
      mapping,
      { ignoreFields: ["reference_no"], includeReadOnly: true },
    );
    expect(result.missingInBusinessData?.length).toBeGreaterThan(0);
    expect(result.unmappedPdfFields?.length).toBeGreaterThan(0);
  });
});
