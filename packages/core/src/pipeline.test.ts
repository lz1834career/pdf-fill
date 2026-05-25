import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { createSimpleTextFixture } from "./test-helpers/create-fixture.js";
import { runPipeline } from "./pipeline.js";
import { PdfFillError } from "./types.js";

describe("runPipeline", () => {
  it("doctor → fill → verify succeeds", async () => {
    const template = await createSimpleTextFixture();
    const data = {
      first_name: "Run",
      last_name: "Test",
      email: "run@test.com",
    };
    const result = await runPipeline(template, data);
    expect(result.fill.fieldsFilled).toHaveLength(3);
    expect(result.verify?.ok).toBe(true);
  });

  it("can skip verify", async () => {
    const template = await createSimpleTextFixture();
    const result = await runPipeline(
      template,
      { first_name: "A", last_name: "B", email: "c@d.com" },
      { verify: false },
    );
    expect(result.verify).toBeUndefined();
  });

  it("throws when template has no fillable fields", async () => {
    const doc = await PDFDocument.create();
    const empty = await doc.save();
    await expect(runPipeline(empty, { field: "x" })).rejects.toThrow(
      PdfFillError,
    );
  });
});
