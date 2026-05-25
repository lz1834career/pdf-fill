import { PDFDocument } from "pdf-lib";
import type { FillData, FillValue } from "./types.js";
import { PdfFillError } from "./types.js";
import { toUint8Array } from "./util/load-bytes.js";
import { readFieldValue } from "./engine/field-read.js";
import { fieldTypeOf } from "./engine/field-utils.js";

export interface VerifyMismatch {
  field: string;
  expected: FillValue;
  actual: string | boolean | null;
}

export interface VerifyResult {
  ok: boolean;
  checked: string[];
  mismatches: VerifyMismatch[];
  missingInPdf: string[];
}

function valuesEqual(
  expected: FillValue,
  actual: string | boolean | null,
): boolean {
  if (actual === null) return false;
  if (typeof expected === "number") {
    return String(expected) === String(actual);
  }
  if (typeof expected === "boolean") {
    return expected === actual;
  }
  return String(expected) === String(actual);
}

/**
 * Verify filled PDF field values against expected data.
 * Only checks keys present in `expected` (partial verify).
 */
export async function verifyFilledPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  expected: FillData,
  fieldTypes?: Map<string, string>,
): Promise<VerifyResult> {
  const bytes = toUint8Array(pdfBytes);
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();

  const typeMap =
    fieldTypes ??
    new Map(form.getFields().map((f) => [f.getName(), fieldTypeOf(f)]));

  const checked: string[] = [];
  const mismatches: VerifyMismatch[] = [];
  const missingInPdf: string[] = [];

  for (const [name, exp] of Object.entries(expected)) {
    const type = typeMap.get(name);
    if (!type) {
      missingInPdf.push(name);
      continue;
    }
    if (type === "button") continue;

    const actual = readFieldValue(form, name, type) as
      | string
      | boolean
      | null;
    checked.push(name);
    if (!valuesEqual(exp, actual)) {
      mismatches.push({ field: name, expected: exp, actual });
    }
  }

  return {
    ok: mismatches.length === 0 && missingInPdf.length === 0,
    checked,
    mismatches,
    missingInPdf,
  };
}

export async function verifyFilledPdfFromFile(
  pdfBytes: Uint8Array | ArrayBuffer,
  expected: FillData,
): Promise<VerifyResult> {
  try {
    return await verifyFilledPdf(pdfBytes, expected);
  } catch (err) {
    throw new PdfFillError(
      err instanceof Error ? err.message : String(err),
      "VERIFY_FAILED",
    );
  }
}
