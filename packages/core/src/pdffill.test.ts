import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  createCheckboxRadioFixture,
  createComplexFixture,
  createSimpleTextFixture,
} from "./test-helpers/create-fixture.js";
import {
  doctorFromBytes as doctor,
  fillFormFromBytes as fillForm,
  listFieldsFromBytes as listFields,
} from "./engine/pdf-lib-engine.js";
import { PdfFillError } from "./types.js";
import { scaffoldFillData } from "./scaffold.js";
import { parseFillDataInput } from "./parse-fill-data.js";
import { verifyFilledPdf } from "./verify.js";

describe("scaffold", () => {
  it("builds fill object from fields", async () => {
    const pdf = await createSimpleTextFixture();
    const fields = await listFields(pdf);
    const data = scaffoldFillData(fields);
    expect(data).toEqual({
      first_name: "",
      last_name: "",
      email: "",
    });
  });
});

describe("parseFillDataInput", () => {
  it("rejects list-json array shape", () => {
    expect(() =>
      parseFillDataInput([{ name: "a", type: "text", readOnly: false }]),
    ).toThrow(PdfFillError);
  });
});

describe("listFields", () => {
  it("lists text fields on simple template", async () => {
    const pdf = await createSimpleTextFixture();
    const fields = await listFields(pdf);
    expect(fields.map((f) => f.name).sort()).toEqual([
      "email",
      "first_name",
      "last_name",
    ]);
    expect(fields.every((f) => f.type === "text")).toBe(true);
  });
});

describe("doctor", () => {
  it("reports ready for valid template", async () => {
    const pdf = await createSimpleTextFixture();
    const report = await doctor(pdf);
    expect(report.encrypted).toBe(false);
    expect(report.hasXFA).toBe(false);
    expect(report.fieldCount).toBe(3);
    expect(report.ok).toBe(true);
  });
});

describe("fillForm", () => {
  it("fills text and remains editable (not flattened)", async () => {
    const template = await createSimpleTextFixture();
    const { pdf, fieldsFilled } = await fillForm(template, {
      first_name: "Jane",
      last_name: "Doe",
      email: "jane@example.com",
    });
    expect(fieldsFilled).toHaveLength(3);

    const doc = await PDFDocument.load(pdf);
    const form = doc.getForm();
    expect(form.getTextField("first_name").getText()).toBe("Jane");
    expect(form.getFields().length).toBeGreaterThan(0);
  });

  it("flattens when requested", async () => {
    const template = await createSimpleTextFixture();
    const { pdf } = await fillForm(
      template,
      { first_name: "A", last_name: "B", email: "c@d.com" },
      { flatten: true },
    );
    const doc = await PDFDocument.load(pdf);
    const form = doc.getForm();
    expect(form.getFields().length).toBe(0);
  });

  it("fills checkbox and radio", async () => {
    const template = await createCheckboxRadioFixture();
    const { pdf } = await fillForm(template, {
      agree_terms: true,
      plan: "pro",
    });
    const doc = await PDFDocument.load(pdf);
    const form = doc.getForm();
    expect(form.getCheckBox("agree_terms").isChecked()).toBe(true);
    expect(form.getRadioGroup("plan").getSelected()).toBe("pro");
  });

  it("strict rejects unknown fields", async () => {
    const template = await createSimpleTextFixture();
    await expect(
      fillForm(template, { first_name: "X", unknown: "y" }, { strict: true }),
    ).rejects.toThrow(PdfFillError);
  });

  it("failOnWarnings throws WARNINGS_NOT_ALLOWED", async () => {
    const template = await createSimpleTextFixture();
    await expect(
      fillForm(template, { first_name: "X" }, { failOnWarnings: ["MISSING_FIELD"] }),
    ).rejects.toMatchObject({ code: "WARNINGS_NOT_ALLOWED" });
  });

  it("warns on unknown field when not strict", async () => {
    const template = await createSimpleTextFixture();
    const { warnings, fieldsFilled } = await fillForm(
      template,
      { first_name: "Only", extra: "bad" },
      { missing: "skip" },
    );
    expect(fieldsFilled).toEqual(["first_name"]);
    expect(warnings.some((w) => w.code === "UNKNOWN_FIELD")).toBe(true);
  });

  it("fills complex multi-page fixture", async () => {
    const template = await createComplexFixture();
    const fields = await listFields(template);
    expect(fields.length).toBeGreaterThanOrEqual(12);

    const { pdf, fieldsFilled, warnings } = await fillForm(template, {
      "applicant.name": "Test User",
      "applicant.id_number": "X1",
      department: "Eng",
      start_date: "2026-01-01",
      reason_multiline: "Line1\nLine2",
      budget_amount: 99,
      is_urgent: true,
      notify_email: false,
      workspace_type: "remote",
      priority: "critical",
      approver_name: "Boss",
      supervisor_signed: true,
    });

    expect(fieldsFilled).toContain("applicant.name");
    expect(warnings.some((w) => w.code === "MISSING_FIELD" && w.field === "reference_no")).toBe(true);

    const doc = await PDFDocument.load(pdf);
    const form = doc.getForm();
    expect(form.getTextField("applicant.name").getText()).toBe("Test User");
    expect(form.getCheckBox("is_urgent").isChecked()).toBe(true);
    expect(form.getRadioGroup("workspace_type").getSelected()).toBe("remote");
    const priority = form.getDropdown("priority").getSelected();
    const priorityVal = Array.isArray(priority) ? priority[0] : priority;
    expect(priorityVal).toBe("critical");
  });

  it("verify passes after fill", async () => {
    const template = await createSimpleTextFixture();
    const expected = {
      first_name: "A",
      last_name: "B",
      email: "c@d.com",
    };
    const { pdf } = await fillForm(template, expected);
    const result = await verifyFilledPdf(pdf, expected);
    expect(result.ok).toBe(true);
    expect(result.mismatches).toHaveLength(0);
  });

  it("fills Chinese text without throwing (uses system CJK font or NeedAppearances)", async () => {
    const template = await createComplexFixture();
    const { pdf, warnings } = await fillForm(template, {
      "applicant.name": "张三",
      "applicant.id_number": "ID-001",
      department: "研发中心",
      start_date: "2026-06-01",
      reason_multiline: "工位调整申请",
      budget_amount: 1000,
      is_urgent: false,
      notify_email: true,
      workspace_type: "desk",
      priority: "normal",
      approver_name: "李四",
      supervisor_signed: false,
    });

    const doc = await PDFDocument.load(pdf);
    expect(doc.getForm().getTextField("applicant.name").getText()).toBe("张三");
    const codes = warnings.map((w) => w.code);
    expect(
      codes.includes("CJK_FONT_NOT_FOUND") ||
        !codes.includes("APPEARANCE_UPDATE_FAILED"),
    ).toBe(true);
  });
});
