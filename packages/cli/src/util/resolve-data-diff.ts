import {
  applyFieldMapping,
  diffFields,
  diffFieldsWithMapping,
  listFields,
  parseFillDataInput,
  parseMappingFile,
  PdfFillError,
  type FieldDiffResult,
  type FillData,
} from "@pdffill/core";
import { readJson } from "./read-file.js";

export interface ResolveDataDiffOptions {
  template: Uint8Array;
  raw: unknown;
  mappingPath?: string;
  ignoreFields?: string[];
  compareTemplate?: boolean;
  includeReadOnly?: boolean;
}

export interface ResolveDataDiffResult {
  data: FillData;
  diff: FieldDiffResult;
}

export async function resolveDataAndDiff(
  opts: ResolveDataDiffOptions,
): Promise<ResolveDataDiffResult> {
  const diffOpts = {
    ignoreFields: opts.ignoreFields ?? [],
    includeReadOnly: opts.includeReadOnly ?? false,
    compareTemplate: opts.compareTemplate ?? false,
  };

  if (opts.mappingPath) {
    const mapping = parseMappingFile(await readJson(opts.mappingPath));
    if (typeof opts.raw !== "object" || opts.raw === null || Array.isArray(opts.raw)) {
      throw new PdfFillError(
        "With --mapping, data must be a JSON object",
        "INVALID_FILL_DATA_SHAPE",
      );
    }
    const business = opts.raw as Record<string, unknown>;
    const fields = await listFields(opts.template);
    const diff = diffFieldsWithMapping(fields, business, mapping, diffOpts);
    const data = applyFieldMapping(business, mapping);
    return { data, diff };
  }

  const data = parseFillDataInput(opts.raw);
  const diff = await diffFields(opts.template, data, diffOpts);
  return { data, diff };
}

export function assertDiffOk(diff: FieldDiffResult): void {
  if (diff.ok) return;
  const parts: string[] = [];
  if (diff.missingInData.length) {
    parts.push(`${diff.missingInData.length} missing in data`);
  }
  if (diff.unknownInData.length) {
    parts.push(`${diff.unknownInData.length} unknown in data`);
  }
  if (diff.typeMismatches?.length) {
    parts.push(`${diff.typeMismatches.length} type mismatch(es)`);
  }
  if (diff.missingInBusinessData?.length) {
    parts.push(`${diff.missingInBusinessData.length} missing in business data`);
  }
  if (diff.unmappedPdfFields?.length) {
    parts.push(`${diff.unmappedPdfFields.length} unmapped PDF field(s)`);
  }
  throw new PdfFillError(
    `Field diff failed: ${parts.join(", ")}`,
    "DIFF_FAILED",
  );
}
