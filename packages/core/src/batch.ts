import type { FillData, FillOptions, FillResult, Warning } from "./types.js";
import { PdfFillError } from "./types.js";
import { fillFormFromBytes } from "./engine/pdf-lib-engine.js";
import { toUint8Array } from "./util/load-bytes.js";

export interface BatchRowResult {
  index: number;
  ok: boolean;
  pdf?: Uint8Array;
  fieldsFilled?: string[];
  warnings: Warning[];
  error?: string;
}

export interface BatchFillOptions extends FillOptions {
  failFast?: boolean;
}

/**
 * Fill the same template with multiple data rows.
 */
export async function batchFill(
  template: Uint8Array | ArrayBuffer,
  rows: FillData[],
  options: BatchFillOptions = {},
): Promise<BatchRowResult[]> {
  const bytes = toUint8Array(template);
  const results: BatchRowResult[] = [];
  const { failFast, ...fillOpts } = options;

  for (let i = 0; i < rows.length; i++) {
    try {
      const result: FillResult = await fillFormFromBytes(bytes, rows[i]!, fillOpts);
      results.push({
        index: i,
        ok: true,
        pdf: result.pdf,
        fieldsFilled: result.fieldsFilled,
        warnings: result.warnings,
      });
    } catch (err) {
      const row: BatchRowResult = {
        index: i,
        ok: false,
        warnings: [],
        error: err instanceof Error ? err.message : String(err),
      };
      results.push(row);
      if (failFast) {
        throw new PdfFillError(
          `Row ${i} failed: ${row.error}`,
          "BATCH_ROW_FAILED",
        );
      }
    }
  }

  return results;
}
