import { describe, expect, it } from "vitest";
import { applyFieldMapping, parseMappingFile } from "./mapping.js";
import { scaffoldBusinessBundle } from "./scaffold-business.js";
import { createSimpleTextFixture } from "./test-helpers/create-fixture.js";
import { listFieldsFromBytes } from "./engine/pdf-lib-engine.js";
import { PdfFillError } from "./types.js";
import { parseRowsCsv, rowsToFillData } from "./parse-rows.js";
import { batchFill } from "./batch.js";
import { createSimpleTextFixture } from "./test-helpers/create-fixture.js";
import { verifyFilledPdf } from "./verify.js";

describe("mapping", () => {
  it("maps nested business keys to PDF fields", () => {
    const map = parseMappingFile({
      "user.first": "first_name",
      "user.last": "last_name",
      email: "email",
    });
    const data = applyFieldMapping(
      { user: { first: "A", last: "B" }, email: "a@b.com" },
      map,
    );
    expect(data).toEqual({
      first_name: "A",
      last_name: "B",
      email: "a@b.com",
    });
  });

  it("throws on missing source path", () => {
    expect(() =>
      applyFieldMapping({ a: 1 }, { "missing.path": "first_name" }),
    ).toThrow(PdfFillError);
  });
});

describe("scaffoldBusiness", () => {
  it("nested business + mapping fills via applyFieldMapping", async () => {
    const pdf = await createSimpleTextFixture();
    const fields = await listFieldsFromBytes(pdf);
    const { mapping, businessData } = scaffoldBusinessBundle(fields, "nested");
    const fill = applyFieldMapping(businessData, mapping);
    expect(fill.first_name).toBe("");
    expect(fill.email).toBe("");
  });

  it("flat business keys map to dotted PDF names", () => {
    const fields = [
      {
        name: "applicant.name",
        type: "text" as const,
        readOnly: false,
      },
    ];
    const { mapping, businessData } = scaffoldBusinessBundle(fields, "flat");
    expect(mapping.applicant_name).toBe("applicant.name");
    expect(businessData.applicant_name).toBe("");
  });
});

describe("batch", () => {
  it("fills multiple rows", async () => {
    const template = await createSimpleTextFixture();
    const rows = [
      { first_name: "A", last_name: "L1", email: "a@b.com" },
      { first_name: "B", last_name: "L2", email: "b@c.com" },
    ];
    const results = await batchFill(template, rows);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.ok)).toBe(true);
    const v0 = await verifyFilledPdf(results[0]!.pdf!, rows[0]!);
    expect(v0.ok).toBe(true);
  });

  it("parses CSV rows", () => {
    const csv = `first_name,last_name,email
A,L1,a@b.com`;
    const parsed = parseRowsCsv(csv);
    const fill = rowsToFillData(parsed);
    expect(fill[0]).toEqual({
      first_name: "A",
      last_name: "L1",
      email: "a@b.com",
    });
  });
});
