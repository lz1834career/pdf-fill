import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Command } from "commander";
import {
  batchFill,
  diffFields,
  verifyFilledPdf,
  type BatchManifestEntry,
  type FieldDiffResult,
  PdfFillError,
  SchemaValidationError,
  parseRowsJson,
  parseRowsCsv,
  rowsToFillData,
  csvRowsToFillData,
  parseMappingFile,
} from "@pdffill/core";
import { loadPdffillConfig } from "../util/config.js";
import { assertDiffOk } from "../util/resolve-data-diff.js";
import { printFieldDiff } from "../util/print-diff.js";
import { readBinary, readJson, readJsonSchema } from "../util/read-file.js";
import { formatOutputPath } from "../util/format-output.js";
import { resolveFillCli } from "../util/resolve-fill-cli.js";
import { writeBatchManifest } from "../util/write-report.js";
import type { ManifestFormat } from "@pdffill/core";

export function registerBatchCommand(program: Command): void {
  program
    .command("batch")
    .description("Fill one template with many data rows (JSON array or CSV)")
    .argument("<pdf>", "PDF template path")
    .argument("<rows>", "JSON array file or .csv file")
    .requiredOption("-o, --output-dir <dir>", "Output directory")
    .option("--pattern <tpl>", "Output filename pattern", "{index}.pdf")
    .option("--mapping <path>", "Field mapping JSON (source path → PDF field)")
    .option("--flatten", "Flatten each output PDF")
    .option("--strict", "Fail on unknown fields")
    .option("--schema <path>", "JSON Schema applied to each row")
    .option("--missing <mode>", "skip or error", "skip")
    .option("--no-update-appearances", "Skip appearance regeneration")
    .option("--font <path>", "CJK/Unicode font path")
    .option("--fail-fast", "Stop on first row error")
    .option("--verify", "Verify each output PDF against its row data")
    .option(
      "--ignore-fields <names>",
      "Comma-separated PDF field names to skip MISSING_FIELD warnings",
    )
    .option("--manifest <path>", "Write batch manifest (per-row results)")
    .option(
      "--manifest-format <fmt>",
      "Manifest format: json (array) or jsonl (one object per line)",
      "json",
    )
    .option("--config <path>", "pdffill.json config file")
    .option("--diff", "Run field diff on each row before fill")
    .option(
      "--fail-on-warnings <codes>",
      "Fail if warnings match codes (comma-separated, or * for any)",
    )
    .action(
      async (
        pdfPath: string,
        rowsPath: string,
        opts: {
          outputDir: string;
          pattern: string;
          mapping?: string;
          flatten?: boolean;
          strict?: boolean;
          schema?: string;
          missing: string;
          updateAppearances?: boolean;
          font?: string;
          failFast?: boolean;
          verify?: boolean;
          ignoreFields?: string;
          manifest?: string;
          manifestFormat: string;
          config?: string;
          diff?: boolean;
          failOnWarnings?: string;
        },
      ) => {
        try {
          const fileConfig = await loadPdffillConfig(opts.config);
          const resolved = resolveFillCli(opts, fileConfig);
          const template = await readBinary(pdfPath);
          const isCsv = rowsPath.toLowerCase().endsWith(".csv");
          const mapping = resolved.mappingPath
            ? parseMappingFile(await readJson(resolved.mappingPath))
            : undefined;
          const schema = opts.schema
            ? await readJsonSchema(opts.schema)
            : undefined;

          let fillRows;
          let rawRowsForNames: Record<string, string | number | boolean>[] = [];

          if (isCsv) {
            const text = await readFile(rowsPath, "utf8");
            const csvRows = parseRowsCsv(text);
            fillRows = csvRowsToFillData(csvRows, mapping);
            rawRowsForNames = csvRows.map((r) => ({ ...r }));
          } else {
            const raw = await readJson(rowsPath);
            const jsonRows = parseRowsJson(raw);
            fillRows = rowsToFillData(jsonRows, mapping);
            rawRowsForNames = jsonRows.map((r) => {
              const flat: Record<string, string | number | boolean> = {};
              for (const [k, v] of Object.entries(r)) {
                if (
                  typeof v === "string" ||
                  typeof v === "number" ||
                  typeof v === "boolean"
                ) {
                  flat[k] = v;
                }
              }
              return flat;
            });
          }

          await mkdir(opts.outputDir, { recursive: true });

          const rowDiffs: (FieldDiffResult | undefined)[] = [];
          if (opts.diff) {
            for (let i = 0; i < fillRows.length; i++) {
              const diff = await diffFields(template, fillRows[i]!, {
                ignoreFields: resolved.ignoreFields,
              });
              rowDiffs[i] = diff;
              if (!diff.ok) {
                console.error(`Row ${i}: field diff failed`);
                printFieldDiff(diff);
                assertDiffOk(diff);
              }
            }
          }

          const results = await batchFill(template, fillRows, {
            flatten: resolved.flatten,
            strict: resolved.strict,
            missing: resolved.missing,
            updateAppearances: resolved.updateAppearances,
            fontPath: resolved.fontPath,
            schema,
            failFast: opts.failFast ?? false,
            ignoreFields: resolved.ignoreFields,
            failOnWarnings: resolved.failOnWarnings,
          });

          let failCount = 0;
          let verifyFailCount = 0;
          const manifestEntries: BatchManifestEntry[] = [];

          for (const row of results) {
            const rowStarted = Date.now();
            if (!row.ok) {
              failCount++;
              console.error(`Row ${row.index}: ${row.error}`);
              manifestEntries.push({
                index: row.index,
                ok: false,
                warnings: row.warnings,
                error: row.error,
                durationMs: Date.now() - rowStarted,
              });
              continue;
            }
            const ctx = { ...rawRowsForNames[row.index], index: row.index };
            const name = formatOutputPath(opts.pattern, ctx, row.index);
            const outPath = join(opts.outputDir, name);
            await mkdir(dirname(outPath), { recursive: true });
            await writeFile(outPath, row.pdf!);
            for (const w of row.warnings) {
              console.warn(`Row ${row.index} [${w.code}] ${w.message}`);
            }

            let verifyResult;
            if (opts.verify) {
              verifyResult = await verifyFilledPdf(
                row.pdf!,
                fillRows[row.index]!,
              );
              if (!verifyResult.ok) {
                verifyFailCount++;
                console.error(
                  `Row ${row.index}: verify failed (${verifyResult.mismatches.length} mismatch, ${verifyResult.missingInPdf.length} missing)`,
                );
              }
            }

            console.log(`Row ${row.index}: ${outPath}`);
            manifestEntries.push({
              index: row.index,
              ok: verifyResult ? verifyResult.ok : true,
              output: outPath,
              fieldsFilled: row.fieldsFilled,
              warnings: row.warnings,
              verify: verifyResult,
              diff: rowDiffs[row.index],
              durationMs: Date.now() - rowStarted,
            });
          }

          const ok = results.filter((r) => r.ok).length;
          console.log(`Done: ${ok}/${results.length} → ${opts.outputDir}`);
          if (opts.manifest) {
            const manifestFormat: ManifestFormat =
              opts.manifestFormat === "jsonl" ? "jsonl" : "json";
            await writeBatchManifest(
              opts.manifest,
              manifestEntries,
              manifestFormat,
            );
          }
          if (failCount > 0 || verifyFailCount > 0) process.exitCode = 1;
        } catch (err) {
          if (err instanceof SchemaValidationError) {
            console.error(err.message, err.errors);
            process.exitCode = 2;
            return;
          }
          if (err instanceof PdfFillError) {
            console.error(`${err.code}: ${err.message}`);
            process.exitCode = 1;
            return;
          }
          throw err;
        }
      },
    );
}
