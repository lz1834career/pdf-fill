import type { FieldDiffResult } from "./diff-fields.js";
import type {
  DoctorReport,
  FillResult,
  Warning,
} from "./types.js";
import type { VerifyResult } from "./verify.js";

export const REPORT_VERSION = "0.6.0";

export type ManifestFormat = "json" | "jsonl";

export interface OperationReport {
  version: typeof REPORT_VERSION;
  ok: boolean;
  command: "fill" | "run" | "batch";
  startedAt: string;
  durationMs: number;
  template?: string;
  output?: string;
  fieldsFilled: string[];
  warnings: Warning[];
  doctor?: DoctorReport;
  verify?: VerifyResult;
  diff?: FieldDiffResult;
  error?: { code: string; message: string };
}

export interface BatchManifestEntry {
  index: number;
  ok: boolean;
  output?: string;
  fieldsFilled?: string[];
  warnings: Warning[];
  verify?: VerifyResult;
  diff?: FieldDiffResult;
  error?: string;
  durationMs: number;
}

export function buildFillReport(params: {
  ok: boolean;
  startedAt: Date;
  durationMs: number;
  template?: string;
  output?: string;
  fill: FillResult;
  doctor?: DoctorReport;
  verify?: VerifyResult;
  diff?: FieldDiffResult;
  error?: { code: string; message: string };
}): OperationReport {
  return {
    version: REPORT_VERSION,
    command: "fill",
    ok: params.ok,
    startedAt: params.startedAt.toISOString(),
    durationMs: params.durationMs,
    template: params.template,
    output: params.output,
    fieldsFilled: params.fill.fieldsFilled,
    warnings: params.fill.warnings,
    doctor: params.doctor,
    verify: params.verify,
    diff: params.diff,
    error: params.error,
  };
}

export function buildRunReport(params: {
  ok: boolean;
  startedAt: Date;
  durationMs: number;
  template?: string;
  output?: string;
  fill: FillResult;
  doctor?: DoctorReport;
  verify?: VerifyResult;
  diff?: FieldDiffResult;
  error?: { code: string; message: string };
}): OperationReport {
  return {
    ...buildFillReport({ ...params, ok: params.ok }),
    command: "run",
  };
}

export function buildBatchManifest(
  entries: BatchManifestEntry[],
): BatchManifestEntry[] {
  return entries;
}

/** Serialize batch manifest as JSON array or JSONL (one entry per line). */
export function serializeBatchManifest(
  entries: BatchManifestEntry[],
  format: ManifestFormat = "json",
): string {
  if (format === "jsonl") {
    if (entries.length === 0) return "";
    return `${entries.map((e) => JSON.stringify(e)).join("\n")}\n`;
  }
  return `${JSON.stringify(entries, null, 2)}\n`;
}
