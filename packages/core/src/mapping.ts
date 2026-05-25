import type { FillData, FillValue } from "./types.js";
import { PdfFillError } from "./types.js";

export type FieldMapping = Record<string, string>;

function parseFlatStringMap(raw: unknown, label: string): FieldMapping {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new PdfFillError(
      `${label} must be a JSON object of source paths → PDF field names`,
      "INVALID_MAPPING",
    );
  }
  const out: FieldMapping = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== "string" || !v.trim()) {
      throw new PdfFillError(
        `Mapping target for "${k}" must be a non-empty PDF field name string`,
        "INVALID_MAPPING",
      );
    }
    out[k] = v;
  }
  return out;
}

/** Accept `{ "mapping": { ... } }` or a flat map directly. */
export function parseMappingFile(raw: unknown): FieldMapping {
  if (
    typeof raw === "object" &&
    raw !== null &&
    !Array.isArray(raw) &&
    "mapping" in raw
  ) {
    return parseFlatStringMap(
      (raw as { mapping: unknown }).mapping,
      "mapping",
    );
  }
  return parseFlatStringMap(raw, "mapping file");
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function toFillValue(v: unknown, sourcePath: string): FillValue {
  if (
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  ) {
    return v;
  }
  throw new PdfFillError(
    `Mapped value at "${sourcePath}" must be string, number, or boolean`,
    "INVALID_MAPPED_VALUE",
  );
}

/**
 * Map business JSON (nested paths) to PDF AcroForm field names.
 * @example mapping `{ "customer.name": "applicant.name" }` + data `{ customer: { name: "A" } }`
 */
export function applyFieldMapping(
  source: Record<string, unknown>,
  mapping: FieldMapping,
): FillData {
  const data: FillData = {};
  for (const [sourcePath, pdfField] of Object.entries(mapping)) {
    const v = getByPath(source, sourcePath);
    if (v === undefined) {
      throw new PdfFillError(
        `Missing source path "${sourcePath}" in data for PDF field "${pdfField}"`,
        "MAPPING_SOURCE_MISSING",
      );
    }
    data[pdfField] = toFillValue(v, sourcePath);
  }
  return data;
}
