import { writeFile } from "node:fs/promises";
import type { Command } from "commander";
import {
  runPipeline,
  buildRunReport,
  parseFillDataInput,
  parseMappingFile,
  applyFieldMapping,
  PdfFillError,
  SchemaValidationError,
} from "@pdffill/core";
import type { FieldDiffResult } from "@pdffill/core";
import { loadPdffillConfig } from "../util/config.js";
import { printFieldDiff } from "../util/print-diff.js";
import {
  assertDiffOk,
  resolveDataAndDiff,
} from "../util/resolve-data-diff.js";
import { readBinary, readJson, readJsonSchema } from "../util/read-file.js";
import { resolveFillCli } from "../util/resolve-fill-cli.js";
import { writeJsonReport } from "../util/write-report.js";

export function registerRunCommand(program: Command): void {
  program
    .command("run")
    .description("One-shot: doctor → fill → verify")
    .argument("<pdf>", "PDF template path")
    .argument("<data.json>", "Fill data (object) or business JSON with --mapping")
    .requiredOption("-o, --output <path>", "Output PDF path")
    .option("--mapping <path>", "Business JSON → PDF field mapping")
    .option("--flatten", "Flatten form")
    .option("--strict", "Fail on unknown fields in data")
    .option("--schema <path>", "JSON Schema for data")
    .option("--missing <mode>", "skip or error", "skip")
    .option("--no-update-appearances", "Skip appearance regeneration")
    .option("--font <path>", "CJK/Unicode font")
    .option("--skip-doctor", "Skip template doctor check")
    .option("--no-verify", "Skip post-fill verify")
    .option(
      "--ignore-fields <names>",
      "Comma-separated PDF field names to skip MISSING_FIELD warnings",
    )
    .option("--report <path>", "Write operation report JSON")
    .option("--config <path>", "pdffill.json config file")
    .option("--diff", "Run field diff before pipeline; fail on mismatch")
    .option(
      "--compare-template",
      "With --diff: flag values unchanged from template",
    )
    .option(
      "--fail-on-warnings <codes>",
      "Fail if warnings match codes (comma-separated, or * for any)",
    )
    .action(
      async (
        pdfPath: string,
        dataPath: string,
        opts: {
          output: string;
          mapping?: string;
          flatten?: boolean;
          strict?: boolean;
          schema?: string;
          missing: string;
          updateAppearances?: boolean;
          font?: string;
          skipDoctor?: boolean;
          noVerify?: boolean;
          ignoreFields?: string;
          report?: string;
          config?: string;
          diff?: boolean;
          compareTemplate?: boolean;
          failOnWarnings?: string;
        },
      ) => {
        const startedAt = new Date();
        let fieldDiff: FieldDiffResult | undefined;
        try {
          const fileConfig = await loadPdffillConfig(opts.config);
          const resolved = resolveFillCli(opts, fileConfig);
          const template = await readBinary(pdfPath);
          const raw = await readJson(dataPath);
          let data;
          if (opts.diff) {
            const resolvedDiff = await resolveDataAndDiff({
              template,
              raw,
              mappingPath: resolved.mappingPath,
              ignoreFields: resolved.ignoreFields,
              compareTemplate: opts.compareTemplate ?? false,
            });
            fieldDiff = resolvedDiff.diff;
            if (!fieldDiff.ok) printFieldDiff(fieldDiff);
            assertDiffOk(fieldDiff);
            data = resolvedDiff.data;
          } else if (resolved.mappingPath) {
            const map = parseMappingFile(await readJson(resolved.mappingPath));
            if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
              throw new PdfFillError(
                "With --mapping, data must be a JSON object",
                "INVALID_FILL_DATA_SHAPE",
              );
            }
            data = applyFieldMapping(raw as Record<string, unknown>, map);
          } else {
            data = parseFillDataInput(raw);
          }

          const schema = opts.schema
            ? await readJsonSchema(opts.schema)
            : undefined;
          const result = await runPipeline(template, data, {
            flatten: resolved.flatten,
            strict: resolved.strict,
            missing: resolved.missing,
            updateAppearances: resolved.updateAppearances,
            fontPath: resolved.fontPath,
            schema,
            skipDoctor: resolved.skipDoctor,
            verify: opts.noVerify !== true,
            ignoreFields: resolved.ignoreFields,
            failOnWarnings: resolved.failOnWarnings,
          });

          await writeFile(opts.output, result.fill.pdf);
          for (const w of result.fill.warnings) {
            console.warn(`[${w.code}] ${w.message}`);
          }
          console.log(`OK: ${opts.output} (${result.fill.fieldsFilled.length} field(s))`);
          if (result.verify) {
            console.log(`Verified ${result.verify.checked.length} field(s)`);
          }

          if (opts.report) {
            await writeJsonReport(
              opts.report,
              buildRunReport({
                ok: true,
                startedAt,
                durationMs: Date.now() - startedAt.getTime(),
                template: pdfPath,
                output: opts.output,
                fill: result.fill,
                doctor: result.doctor,
                verify: result.verify,
                diff: fieldDiff,
              }),
            );
          }
        } catch (err) {
          if (opts.report) {
            const error =
              err instanceof PdfFillError
                ? { code: err.code, message: err.message }
                : err instanceof SchemaValidationError
                  ? { code: "SCHEMA_VALIDATION", message: err.message }
                  : {
                      code: "UNKNOWN",
                      message: err instanceof Error ? err.message : String(err),
                    };
            await writeJsonReport(
              opts.report,
              buildRunReport({
                ok: false,
                startedAt,
                durationMs: Date.now() - startedAt.getTime(),
                template: pdfPath,
                output: opts.output,
                fill: { pdf: new Uint8Array(0), fieldsFilled: [], warnings: [] },
                diff: fieldDiff,
                error,
              }),
            );
          }
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
