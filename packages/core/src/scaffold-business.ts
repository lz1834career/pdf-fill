import {
  listFieldsFromBytes,
  readFillDataFromTemplate,
} from "./engine/pdf-lib-engine.js";
import type { FieldInfo, FillData, FillValue } from "./types.js";
import type { FieldMapping } from "./mapping.js";
import {
  filterNonemptyPrefill,
  scaffoldFillData,
  type ScaffoldOptions,
} from "./scaffold.js";
import { toUint8Array } from "./util/load-bytes.js";

export type BusinessScaffoldStyle = "nested" | "flat";

function defaultValueForField(field: FieldInfo): FillValue {
  switch (field.type) {
    case "checkbox":
      return false;
    case "radio":
    case "dropdown":
    case "optionList":
      return field.options?.[0] ?? "";
    default:
      return "";
  }
}

/** `applicant.name` → `applicant_name` */
export function pdfFieldToFlatBusinessKey(pdfFieldName: string): string {
  return pdfFieldName.replace(/\./g, "_");
}

function setByPath(
  target: Record<string, unknown>,
  path: string,
  value: FillValue,
): void {
  const parts = path.split(".");
  let cur: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const next = cur[part];
    if (
      typeof next !== "object" ||
      next === null ||
      Array.isArray(next)
    ) {
      cur[part] = {};
    }
    cur = cur[part] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
}

export interface BusinessScaffoldResult {
  /** source path (dot) → PDF field name */
  mapping: FieldMapping;
  /** Business-shaped JSON for APIs / DB */
  businessData: Record<string, unknown>;
}

/**
 * Build mapping + business data from PDF field list.
 * - nested: `applicant.name` → `{ applicant: { name: "" } }`, mapping uses dot paths
 * - flat: `applicant.name` → key `applicant_name`, mapping `applicant_name` → `applicant.name`
 */
function businessValueForField(
  field: FieldInfo,
  pdfData: FillData,
): FillValue {
  return pdfData[field.name] ?? defaultValueForField(field);
}

export function scaffoldBusinessBundle(
  fields: FieldInfo[],
  style: BusinessScaffoldStyle = "nested",
  options: ScaffoldOptions = {},
  pdfData?: FillData,
): BusinessScaffoldResult {
  const { includeReadOnly = false, skipButtons = true } = options;
  const mapping: FieldMapping = {};
  const businessData: Record<string, unknown> = {};

  for (const field of fields) {
    if (skipButtons && field.type === "button") continue;
    if (field.readOnly && !includeReadOnly) continue;

    const pdfName = field.name;
    const value = pdfData
      ? businessValueForField(field, pdfData)
      : defaultValueForField(field);
    mapping[
      style === "nested" ? pdfName : pdfFieldToFlatBusinessKey(pdfName)
    ] = pdfName;

    if (style === "nested") {
      setByPath(businessData, pdfName, value);
    } else {
      businessData[pdfFieldToFlatBusinessKey(pdfName)] = value;
    }
  }

  return { mapping, businessData };
}

export interface FullScaffoldResult {
  pdfData: FillData;
  business?: BusinessScaffoldResult;
}

export function scaffoldAll(
  fields: FieldInfo[],
  options: ScaffoldOptions & {
    withMapping?: boolean;
    businessStyle?: BusinessScaffoldStyle;
    prefill?: FillData;
  } = {},
): FullScaffoldResult {
  const { prefill, ...scaffoldOpts } = options;
  const pdfData = scaffoldFillData(fields, scaffoldOpts, prefill);
  if (!options.withMapping) {
    return { pdfData };
  }
  return {
    pdfData,
    business: scaffoldBusinessBundle(
      fields,
      options.businessStyle ?? "nested",
      scaffoldOpts,
      pdfData,
    ),
  };
}

/** List fields and scaffold; optionally prefill non-empty template values. */
export async function scaffoldFromTemplate(
  template: Uint8Array | ArrayBuffer,
  options: ScaffoldOptions & {
    withMapping?: boolean;
    businessStyle?: BusinessScaffoldStyle;
  } = {},
): Promise<FullScaffoldResult> {
  const bytes = toUint8Array(template);
  const fields = await listFieldsFromBytes(bytes);
  let prefill: FillData | undefined;
  if (options.prefillFromTemplate) {
    const raw = await readFillDataFromTemplate(bytes);
    prefill = filterNonemptyPrefill(raw);
  }
  return scaffoldAll(fields, { ...options, prefill });
}
