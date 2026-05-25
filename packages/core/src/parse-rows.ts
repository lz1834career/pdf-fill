import type { FillData } from "./types.js";
import { PdfFillError } from "./types.js";
import { parseFillDataInput } from "./parse-fill-data.js";
import { applyFieldMapping, parseMappingFile, type FieldMapping } from "./mapping.js";

/** Parse batch input: JSON array of objects. */
export function parseRowsJson(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) {
    throw new PdfFillError(
      "Batch input must be a JSON array of row objects",
      "INVALID_BATCH_INPUT",
    );
  }
  return raw.map((row, i) => {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      throw new PdfFillError(
        `Batch row ${i} must be a JSON object`,
        "INVALID_BATCH_ROW",
      );
    }
    return row as Record<string, unknown>;
  });
}

/**
 * Minimal CSV: first row = headers, comma-separated, double-quote escaped.
 * No multiline cells.
 */
export function parseRowsCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length < 2) {
    throw new PdfFillError(
      "CSV must have a header row and at least one data row",
      "INVALID_BATCH_INPUT",
    );
  }

  const headers = parseCsvLine(lines[0]!);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    if (cells.length !== headers.length) {
      throw new PdfFillError(
        `CSV row ${i + 1} has ${cells.length} columns, expected ${headers.length}`,
        "INVALID_BATCH_ROW",
      );
    }
    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]!] = cells[c] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function coerceCsvRow(row: Record<string, string>): FillData {
  const data: FillData = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === "true") data[k] = true;
    else if (v === "false") data[k] = false;
    else if (v !== "" && !Number.isNaN(Number(v)) && /^-?\d+(\.\d+)?$/.test(v)) {
      data[k] = Number(v);
    } else {
      data[k] = v;
    }
  }
  return data;
}

export function rowsToFillData(
  rows: Record<string, unknown>[],
  mapping?: FieldMapping,
): FillData[] {
  return rows.map((row, index) => {
    try {
      if (mapping) {
        return applyFieldMapping(row, mapping);
      }
      return parseFillDataInput(row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new PdfFillError(`Batch row ${index}: ${msg}`, "INVALID_BATCH_ROW");
    }
  });
}

export function csvRowsToFillData(
  rows: Record<string, string>[],
  mapping?: FieldMapping,
): FillData[] {
  return rows.map((row, index) => {
    try {
      if (mapping) {
        return applyFieldMapping(row, mapping);
      }
      return coerceCsvRow(row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new PdfFillError(`Batch row ${index}: ${msg}`, "INVALID_BATCH_ROW");
    }
  });
}

export { parseMappingFile };
