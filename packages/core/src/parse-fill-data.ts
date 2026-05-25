import type { FillData, FillValue } from "./types.js";
import { PdfFillError } from "./types.js";

export function parseFillDataInput(raw: unknown): FillData {
  if (Array.isArray(raw)) {
    const first = raw[0];
    const looksLikeList =
      raw.length > 0 &&
      typeof first === "object" &&
      first !== null &&
      "name" in first &&
      "type" in first;
    throw new PdfFillError(
      looksLikeList
        ? "Data file is a field list (from `pdffill list --json`), not fill data. Run `pdffill scaffold <template.pdf>` to generate data.json."
        : "Fill data must be a JSON object { \"fieldName\": value }, not an array.",
      "INVALID_FILL_DATA_SHAPE",
    );
  }

  if (typeof raw !== "object" || raw === null) {
    throw new PdfFillError(
      "Fill data must be a JSON object",
      "INVALID_FILL_DATA_SHAPE",
    );
  }

  const data: FillData = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean"
    ) {
      data[k] = v as FillValue;
    } else if (v === null || v === undefined) {
      continue;
    } else {
      throw new PdfFillError(
        `Invalid value type for "${k}"; expected string, number, or boolean`,
        "INVALID_DATA",
      );
    }
  }
  return data;
}
