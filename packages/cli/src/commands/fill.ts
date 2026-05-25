import { writeFile } from "node:fs/promises";
import type { Command } from "commander";
import {
  fillForm,
  doctor,
  assertDoctorReady,
  buildFillReport,
  SchemaValidationError,
  PdfFillError,
  parseFillDataInput,
  parseMappingFile,
  applyFieldMapping,
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

export function registerFillCommand(program: Command): void {
  program
    .command("fill")
    .description("Fill PDF form fields from JSON (editable by default)")
    .argument("<pdf>", "Path to PDF template")
    .argument("<data.json>", "JSON object: field name → value")
    .requiredOption("-o, --output <path>", "Output PDF path")
    .option("--flatten", "Flatten form (read-only output)")
    .option("--strict", "Fail on unknown fields in JSON")
    .option("--schema <path>", "JSON Schema file to validate data")
    .option(
      "--missing <mode>",
      "When template field missing in JSON: skip or error",
      "skip",
    )
    .option(
      "--no-update-appearances",
      "Skip appearance regeneration (Unicode may use NeedAppearances only)",
    )
    .option(
      "--font <path>",
      "Font file (.ttf/.otf/.ttc) for Chinese/Unicode field appearances",
    )
    .option(
      "--mapping <path>",
      "Map business JSON paths to PDF field names (see mapping.json)",
    )
    .option(
      "--ignore-fields <names>",
      "Comma-separated PDF field names to skip MISSING_FIELD warnings",
    )
    .option("--require-doctor", "Run doctor before fill")
    .option("--report <path>", "Write operation report JSON")
    .option("--config <path>", "pdffill.json (ignoreFields, fontPath, mapping, …)")
    .option("--diff", "Run field diff before fill; fail on mismatch")
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
          flatten?: boolean;
          strict?: boolean;
          schema?: string;
          missing: string;
          updateAppearances?: boolean;
          font?: string;
          mapping?: string;
          ignoreFields?: string;
          requireDoctor?: boolean;
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
                "With --mapping, data file must be a JSON object (business fields)",
                "INVALID_FILL_DATA_SHAPE",
              );
            }
            data = applyFieldMapping(
              raw as Record<string, unknown>,
              map,
            );
          } else {
            data = parseFillDataInput(raw);
          }
          const schema = opts.schema
            ? await readJsonSchema(opts.schema)
            : undefined;
          const doctorReport =
            resolved.requireDoctor || opts.report
              ? resolved.requireDoctor
                ? await assertDoctorReady(template)
                : await doctor(template)
              : undefined;

          const result = await fillForm(template, data, {
            flatten: resolved.flatten,
            strict: resolved.strict,
            missing: resolved.missing,
            updateAppearances: resolved.updateAppearances,
            fontPath: resolved.fontPath,
            schema,
            ignoreFields: resolved.ignoreFields,
            failOnWarnings: resolved.failOnWarnings,
          });

          await writeFile(opts.output, result.pdf);
          for (const w of result.warnings) {
            console.warn(`[${w.code}] ${w.message}`);
          }
          console.log(
            `Wrote ${opts.output} (${result.fieldsFilled.length} field(s) filled)`,
          );

          if (opts.report) {
            await writeJsonReport(
              opts.report,
              buildFillReport({
                ok: true,
                startedAt,
                durationMs: Date.now() - startedAt.getTime(),
                template: pdfPath,
                output: opts.output,
                fill: result,
                doctor: doctorReport,
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
              buildFillReport({
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
