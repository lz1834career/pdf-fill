import { listFieldsFromBytes, readFillDataFromTemplate } from "./engine/pdf-lib-engine.js";
import type { FieldInfo, FieldType, FillData, FillValue } from "./types.js";
import type { FieldMapping } from "./mapping.js";
import { toUint8Array } from "./util/load-bytes.js";

export interface DiffFieldsOptions {
  /** PDF field names excluded from missingInData */
  ignoreFields?: string[];
  includeReadOnly?: boolean;
  skipButtons?: boolean;
  /** Flag keys whose values match the template's current values */
  compareTemplate?: boolean;
}

export interface UnchangedField {
  field: string;
  value: FillValue;
}

export interface TypeMismatch {
  field: string;
  expected: FieldType;
  actual: string;
  message: string;
}

export interface MappingGap {
  sourcePath: string;
  pdfField: string;
}

export interface FieldDiffResult {
  ok: boolean;
  pdfFieldCount: number;
  dataKeyCount: number;
  /** Fillable PDF fields with no entry in data */
  missingInData: string[];
  /** Data keys that are not PDF field names */
  unknownInData: string[];
  /** With --mapping: mapping paths present but no value in business JSON */
  missingInBusinessData?: MappingGap[];
  /** PDF fields not targeted by any mapping entry */
  unmappedPdfFields?: string[];
  unchangedFromTemplate?: UnchangedField[];
  typeMismatches?: TypeMismatch[];
  ignoredFields?: string[];
}

function isFillable(field: FieldInfo, options: DiffFieldsOptions): boolean {
  if (options.skipButtons !== false && field.type === "button") return false;
  if (!options.includeReadOnly && field.readOnly) return false;
  return true;
}

function valuesEqual(a: FillValue, b: FillValue): boolean {
  if (typeof a === "number" || typeof b === "number") {
    return String(a) === String(b);
  }
  return a === b;
}

function checkType(field: FieldInfo, value: FillValue): TypeMismatch | null {
  if (field.type === "checkbox" && typeof value !== "boolean") {
    return {
      field: field.name,
      expected: field.type,
      actual: typeof value,
      message: `Expected boolean for checkbox "${field.name}"`,
    };
  }
  if (
    (field.type === "radio" ||
      field.type === "dropdown" ||
      field.type === "optionList") &&
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return {
      field: field.name,
      expected: field.type,
      actual: typeof value,
      message: `Expected string for ${field.type} "${field.name}"`,
    };
  }
  if (
    field.type === "text" &&
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return {
      field: field.name,
      expected: field.type,
      actual: typeof value,
      message: `Expected string or number for text "${field.name}"`,
    };
  }
  if (
    field.options?.length &&
    typeof value === "string" &&
    !field.options.includes(value)
  ) {
    return {
      field: field.name,
      expected: field.type,
      actual: typeof value,
      message: `Value "${value}" not in options [${field.options.join(", ")}]`,
    };
  }
  return null;
}

/**
 * Compare template AcroForm fields to fill data (PDF field names as keys).
 */
export async function diffFields(
  template: Uint8Array | ArrayBuffer,
  data: FillData,
  options: DiffFieldsOptions = {},
): Promise<FieldDiffResult> {
  const bytes = toUint8Array(template);
  const fields = await listFieldsFromBytes(bytes);
  const ignored = new Set(options.ignoreFields ?? []);
  const fillable = fields.filter((f) => isFillable(f, options));
  const pdfNames = new Set(fillable.map((f) => f.name));
  const fieldByName = new Map(fields.map((f) => [f.name, f]));

  const missingInData: string[] = [];
  for (const name of pdfNames) {
    if (ignored.has(name)) continue;
    if (!(name in data)) missingInData.push(name);
  }

  const unknownInData: string[] = [];
  for (const key of Object.keys(data)) {
    if (!fieldByName.has(key)) unknownInData.push(key);
  }

  const typeMismatches: TypeMismatch[] = [];
  for (const [key, value] of Object.entries(data)) {
    const field = fieldByName.get(key);
    if (!field || !isFillable(field, options)) continue;
    const mismatch = checkType(field, value);
    if (mismatch) typeMismatches.push(mismatch);
  }

  let unchangedFromTemplate: UnchangedField[] | undefined;
  if (options.compareTemplate) {
    const current = await readFillDataFromTemplate(bytes);
    unchangedFromTemplate = [];
    for (const [field, value] of Object.entries(data)) {
      if (!(field in current)) continue;
      const templateValue = current[field]!;
      if (valuesEqual(value, templateValue)) {
        unchangedFromTemplate.push({ field, value });
      }
    }
  }

  const ok =
    missingInData.length === 0 &&
    unknownInData.length === 0 &&
    typeMismatches.length === 0;

  return {
    ok,
    pdfFieldCount: fillable.length,
    dataKeyCount: Object.keys(data).length,
    missingInData,
    unknownInData,
    unchangedFromTemplate,
    typeMismatches: typeMismatches.length ? typeMismatches : undefined,
    ignoredFields: ignored.size ? [...ignored] : undefined,
  };
}

/** Diff business JSON + mapping against template PDF fields. */
export function diffFieldsWithMapping(
  fields: FieldInfo[],
  business: Record<string, unknown>,
  mapping: FieldMapping,
  options: DiffFieldsOptions = {},
): FieldDiffResult {
  const ignored = new Set(options.ignoreFields ?? []);
  const fillable = fields.filter((f) => isFillable(f, options));
  const pdfNames = new Set(fillable.map((f) => f.name));
  const fieldByName = new Map(fields.map((f) => [f.name, f]));

  const mappedPdfFields = new Set(Object.values(mapping));
  const data: FillData = {};
  const missingInBusinessData: MappingGap[] = [];

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

  for (const [sourcePath, pdfField] of Object.entries(mapping)) {
    const v = getByPath(business, sourcePath);
    if (v === undefined || v === null) {
      missingInBusinessData.push({ sourcePath, pdfField });
      continue;
    }
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean"
    ) {
      data[pdfField] = v;
    }
  }

  const unmappedPdfFields: string[] = [];
  for (const name of pdfNames) {
    if (ignored.has(name)) continue;
    if (!mappedPdfFields.has(name)) unmappedPdfFields.push(name);
  }

  const missingInData: string[] = [];
  for (const name of pdfNames) {
    if (ignored.has(name)) continue;
    if (!(name in data)) missingInData.push(name);
  }

  const unknownInData: string[] = [];
  for (const key of Object.keys(data)) {
    if (!fieldByName.has(key)) unknownInData.push(key);
  }

  const typeMismatches: TypeMismatch[] = [];
  for (const [key, value] of Object.entries(data)) {
    const field = fieldByName.get(key);
    if (!field || !isFillable(field, options)) continue;
    const mismatch = checkType(field, value);
    if (mismatch) typeMismatches.push(mismatch);
  }

  const ok =
    missingInData.length === 0 &&
    unknownInData.length === 0 &&
    typeMismatches.length === 0 &&
    missingInBusinessData.length === 0 &&
    unmappedPdfFields.length === 0;

  return {
    ok,
    pdfFieldCount: fillable.length,
    dataKeyCount: Object.keys(business).length,
    missingInData,
    unknownInData,
    missingInBusinessData: missingInBusinessData.length
      ? missingInBusinessData
      : undefined,
    unmappedPdfFields: unmappedPdfFields.length ? unmappedPdfFields : undefined,
    typeMismatches: typeMismatches.length ? typeMismatches : undefined,
    ignoredFields: ignored.size ? [...ignored] : undefined,
  };
}
