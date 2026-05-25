import type { FieldInfo, FillData, FillValue } from "./types.js";

export interface ScaffoldOptions {
  /** Include read-only fields with their current PDF value or empty string */
  includeReadOnly?: boolean;
  /** Skip button fields */
  skipButtons?: boolean;
  /** Use non-empty values already in the template PDF */
  prefillFromTemplate?: boolean;
}

/** Keep template text only when non-empty; always keep booleans and option values. */
export function filterNonemptyPrefill(prefill: FillData): FillData {
  const out: FillData = {};
  for (const [name, value] of Object.entries(prefill)) {
    if (typeof value === "string" && value.trim() === "") continue;
    out[name] = value;
  }
  return out;
}

function mergePrefill(defaults: FillData, prefill: FillData): FillData {
  const out = { ...defaults };
  for (const [name, value] of Object.entries(prefill)) {
    if (!(name in out)) continue;
    out[name] = value;
  }
  return out;
}

function defaultValueForField(field: FieldInfo): FillValue {
  switch (field.type) {
    case "checkbox":
      return false;
    case "radio":
    case "dropdown":
    case "optionList":
      return field.options?.[0] ?? "";
    case "text":
    case "unknown":
    default:
      return "";
  }
}

/**
 * Build a fill-ready JSON object from parsed field metadata.
 * Keys match PDF AcroForm names exactly.
 */
export function scaffoldFillData(
  fields: FieldInfo[],
  options: ScaffoldOptions = {},
  prefill?: FillData,
): FillData {
  const { includeReadOnly = false, skipButtons = true } = options;
  const data: FillData = {};

  for (const field of fields) {
    if (skipButtons && field.type === "button") continue;
    if (field.readOnly && !includeReadOnly) continue;
    data[field.name] = defaultValueForField(field);
  }

  if (prefill && Object.keys(prefill).length > 0) {
    return mergePrefill(data, prefill);
  }
  return data;
}

/** JSON Schema (draft-07) describing fill data for the given fields. */
export function scaffoldJsonSchema(
  fields: FieldInfo[],
  options: ScaffoldOptions = {},
): object {
  const { includeReadOnly = false, skipButtons = true } = options;
  const properties: Record<string, object> = {};
  const required: string[] = [];

  for (const field of fields) {
    if (skipButtons && field.type === "button") continue;
    if (field.readOnly && !includeReadOnly) continue;

    required.push(field.name);

    switch (field.type) {
      case "checkbox":
        properties[field.name] = { type: "boolean" };
        break;
      case "radio":
      case "dropdown":
      case "optionList":
        properties[field.name] = {
          type: "string",
          ...(field.options?.length
            ? { enum: field.options }
            : {}),
        };
        break;
      default:
        properties[field.name] = { type: ["string", "number"] };
    }
  }

  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}
