import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFField,
  PDFForm,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
} from "pdf-lib";
import type {
  DoctorIssue,
  DoctorReport,
  FieldInfo,
  FillData,
  FillOptions,
  FillResult,
  FillValue,
  Warning,
} from "../types.js";
import { PdfFillError } from "../types.js";
import { toUint8Array } from "../util/load-bytes.js";
import { validateDataAgainstSchema } from "../schema/validate.js";
import { assertDoctorReady } from "../doctor-guard.js";
import { assertWarningsAllowed } from "../warnings.js";
import { applyFieldAppearances } from "../util/appearances.js";
import { readFieldValue } from "./field-read.js";
import { describeField, fieldTypeOf } from "./field-utils.js";

async function loadDocument(bytes: Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { ignoreEncryption: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/encrypt/i.test(message)) {
      throw new PdfFillError(
        "PDF is encrypted; cannot read or fill without password",
        "ENCRYPTED_PDF",
      );
    }
    throw err;
  }
}

function getForm(doc: PDFDocument): PDFForm | null {
  try {
    return doc.getForm();
  } catch {
    return null;
  }
}

export async function listFieldsFromBytes(
  bytes: Uint8Array | ArrayBuffer,
): Promise<FieldInfo[]> {
  const data = toUint8Array(bytes);
  const doc = await loadDocument(data);
  const form = getForm(doc);
  if (!form) return [];
  return form.getFields().map(describeField);
}

export async function doctorFromBytes(
  bytes: Uint8Array | ArrayBuffer,
): Promise<DoctorReport> {
  const data = toUint8Array(bytes);
  const issues: DoctorIssue[] = [];
  let encrypted = false;
  let hasXFA = false;
  let fieldCount = 0;

  try {
    const doc = await loadDocument(data);
    const form = getForm(doc);
    if (!form) {
      issues.push({
        level: "warn",
        code: "NO_ACROFORM",
        message: "Document has no AcroForm; nothing to fill",
      });
      return { ok: issues.every((i) => i.level !== "error"), encrypted, hasXFA, fieldCount, issues };
    }

    hasXFA = form.hasXFA();
    if (hasXFA) {
      issues.push({
        level: "error",
        code: "HAS_XFA",
        message:
          "PDF contains XFA forms; pdffill does not support XFA (see docs/NON-GOALS.md)",
      });
    }

    const fields = form.getFields();
    fieldCount = fields.length;
    if (fieldCount === 0) {
      issues.push({
        level: "warn",
        code: "NO_FIELDS",
        message: "AcroForm exists but has zero fields",
      });
    }

    const names = new Map<string, number>();
    for (const f of fields) {
      const n = f.getName();
      names.set(n, (names.get(n) ?? 0) + 1);
    }
    for (const [name, count] of names) {
      if (count > 1) {
        issues.push({
          level: "warn",
          code: "DUPLICATE_FIELD_NAME",
          message: `Field name "${name}" appears ${count} times; use fully qualified names when filling`,
        });
      }
    }

    if (issues.every((i) => i.level !== "error")) {
      issues.push({
        level: "info",
        code: "READY",
        message: `AcroForm with ${fieldCount} field(s) detected`,
      });
    }
  } catch (err) {
    if (err instanceof PdfFillError && err.code === "ENCRYPTED_PDF") {
      encrypted = true;
      issues.push({
        level: "error",
        code: "ENCRYPTED",
        message: err.message,
      });
    } else {
      throw err;
    }
  }

  const ok = !encrypted && issues.every((i) => i.level !== "error");
  return { ok, encrypted, hasXFA, fieldCount, issues };
}

function applyCheckbox(field: PDFCheckBox, value: FillValue): void {
  if (typeof value !== "boolean") {
    throw new PdfFillError(
      `Field "${field.getName()}" expects boolean for checkbox`,
      "TYPE_MISMATCH",
    );
  }
  if (value) field.check();
  else field.uncheck();
}

function applyRadio(field: PDFRadioGroup, value: FillValue): void {
  if (typeof value !== "string") {
    throw new PdfFillError(
      `Field "${field.getName()}" expects string for radio`,
      "TYPE_MISMATCH",
    );
  }
  const options = field.getOptions();
  if (options.length > 0 && !options.includes(value)) {
    throw new PdfFillError(
      `Field "${field.getName()}": value "${value}" not in [${options.join(", ")}]`,
      "INVALID_OPTION",
    );
  }
  field.select(value);
}

function applyDropdown(field: PDFDropdown, value: FillValue): void {
  if (typeof value !== "string") {
    throw new PdfFillError(
      `Field "${field.getName()}" expects string for dropdown`,
      "TYPE_MISMATCH",
    );
  }
  const options = field.getOptions();
  if (options.length > 0 && !options.includes(value)) {
    throw new PdfFillError(
      `Field "${field.getName()}": value "${value}" not in [${options.join(", ")}]`,
      "INVALID_OPTION",
    );
  }
  field.select(value);
}

function applyText(field: PDFTextField, value: FillValue): void {
  const text =
    typeof value === "string"
      ? value
      : typeof value === "number"
        ? String(value)
        : null;
  if (text === null) {
    throw new PdfFillError(
      `Field "${field.getName()}" expects string or number for text`,
      "TYPE_MISMATCH",
    );
  }
  field.setText(text);
}

function setFieldValue(field: PDFField, value: FillValue): void {
  if (field.isReadOnly()) {
    throw new PdfFillError(
      `Field "${field.getName()}" is read-only`,
      "READ_ONLY_FIELD",
    );
  }
  if (field instanceof PDFTextField) applyText(field, value);
  else if (field instanceof PDFCheckBox) applyCheckbox(field, value);
  else if (field instanceof PDFRadioGroup) applyRadio(field, value);
  else if (field instanceof PDFDropdown) applyDropdown(field, value);
  else if (field instanceof PDFOptionList) {
    if (typeof value !== "string") {
      throw new PdfFillError(
        `Field "${field.getName()}" expects string for option list`,
        "TYPE_MISMATCH",
      );
    }
    field.select(value);
  }
  else {
    throw new PdfFillError(
      `Field "${field.getName()}" type ${fieldTypeOf(field)} is not fillable`,
      "UNSUPPORTED_FIELD",
    );
  }
}

/** Read current AcroForm values from a template PDF. */
export async function readFillDataFromTemplate(
  template: Uint8Array | ArrayBuffer,
): Promise<FillData> {
  const bytes = toUint8Array(template);
  const doc = await loadDocument(bytes);
  const form = getForm(doc);
  if (!form) return {};

  const data: FillData = {};
  for (const field of form.getFields()) {
    const type = fieldTypeOf(field);
    if (type === "button") continue;
    const name = field.getName();
    const value = readFieldValue(form, name, type);
    if (value === null) continue;
    data[name] = value;
  }
  return data;
}

export async function fillFormFromBytes(
  template: Uint8Array | ArrayBuffer,
  data: FillData,
  options: FillOptions = {},
): Promise<FillResult> {
  const {
    flatten = false,
    strict = false,
    missing = "skip",
    updateAppearances = true,
    fontPath,
    schema,
    ignoreFields = [],
    requireDoctor = false,
    failOnWarnings,
  } = options;

  if (schema) {
    validateDataAgainstSchema(data as Record<string, unknown>, schema);
  }

  const bytes = toUint8Array(template);
  if (requireDoctor) {
    await assertDoctorReady(bytes);
  }
  const doc = await loadDocument(bytes);
  const form = getForm(doc);
  if (!form) {
    throw new PdfFillError("Document has no AcroForm", "NO_ACROFORM");
  }

  if (form.hasXFA()) {
    throw new PdfFillError(
      "PDF contains XFA; use pdftk or strip XFA manually (not supported in MVP)",
      "HAS_XFA",
    );
  }

  const warnings: Warning[] = [];
  const ignored = new Set(ignoreFields);
  const known = new Map(form.getFields().map((f) => [f.getName(), f]));
  const fieldsFilled: string[] = [];

  for (const key of Object.keys(data)) {
    const field = known.get(key);
    if (!field) {
      const msg = `Unknown field "${key}" in data`;
      if (strict) {
        throw new PdfFillError(msg, "UNKNOWN_FIELD");
      }
      warnings.push({ code: "UNKNOWN_FIELD", message: msg, field: key });
      continue;
    }
    setFieldValue(field, data[key]!);
    fieldsFilled.push(key);
  }

  for (const [name, field] of known) {
    if (name in data) continue;
    if (ignored.has(name)) continue;
    if (fieldTypeOf(field) === "button") continue;
    const msg = `Missing value for field "${name}"`;
    if (missing === "error") {
      throw new PdfFillError(msg, "MISSING_FIELD");
    }
    warnings.push({ code: "MISSING_FIELD", message: msg, field: name });
  }

  const appearanceCtx = await applyFieldAppearances(
    doc,
    form,
    data,
    { updateAppearances, fontPath, flatten },
    warnings,
  );

  if (flatten) {
    form.flatten({
      updateFieldAppearances:
        updateAppearances && !appearanceCtx.usedCjkFont,
    });
  }

  const pdf = await doc.save({
    updateFieldAppearances: appearanceCtx.saveUpdateFieldAppearances,
  });

  assertWarningsAllowed(warnings, failOnWarnings);

  return { pdf, fieldsFilled, warnings };
}
