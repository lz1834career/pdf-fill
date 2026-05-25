import { writeFile } from "node:fs/promises";
import type { Command } from "commander";
import {
  diffFields,
  diffFieldsWithMapping,
  listFields,
  parseFillDataInput,
  parseMappingFile,
  PdfFillError,
} from "@pdffill/core";
import { loadPdffillConfig, mergeConfig, resolveIgnoreFields, resolveMappingPath } from "../util/config.js";
import { printFieldDiff } from "../util/print-diff.js";
import { readBinary, readJson } from "../util/read-file.js";

export function registerDiffCommand(program: Command): void {
  program
    .command("diff")
    .description("Compare template fields to fill data (catch missing/unknown keys)")
    .argument("<pdf>", "PDF template path")
    .argument("<data.json>", "Fill data or business JSON (with --mapping)")
    .option("--config <path>", "pdffill.json config file")
    .option("--mapping <path>", "Business field mapping (overrides config.mapping)")
    .option(
      "--ignore-fields <names>",
      "Comma-separated PDF fields to exclude from missing checks",
    )
    .option("--include-readonly", "Include read-only PDF fields in diff")
    .option(
      "--compare-template",
      "Flag values identical to current template field values",
    )
    .option("--json", "Write diff result as JSON to stdout or --output")
    .option("-o, --output <path>", "Write JSON diff result to file")
    .action(
      async (
        pdfPath: string,
        dataPath: string,
        opts: {
          config?: string;
          mapping?: string;
          ignoreFields?: string;
          includeReadonly?: boolean;
          compareTemplate?: boolean;
          json?: boolean;
          output?: string;
        },
      ) => {
        try {
          const fileConfig = await loadPdffillConfig(opts.config);
          const merged = mergeConfig(fileConfig, opts);
          const template = await readBinary(pdfPath);
          const raw = await readJson(dataPath);
          const mappingPath = resolveMappingPath(fileConfig, opts.mapping);
          const ignoreFields = resolveIgnoreFields(fileConfig, opts.ignoreFields);
          const diffOpts = {
            ignoreFields,
            includeReadOnly: opts.includeReadonly ?? false,
            compareTemplate: opts.compareTemplate ?? false,
          };

          let result;
          if (mappingPath) {
            const mapping = parseMappingFile(await readJson(mappingPath));
            if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
              throw new PdfFillError(
                "With --mapping, data must be a JSON object",
                "INVALID_FILL_DATA_SHAPE",
              );
            }
            const fields = await listFields(template);
            result = diffFieldsWithMapping(
              fields,
              raw as Record<string, unknown>,
              mapping,
              diffOpts,
            );
          } else {
            const data = parseFillDataInput(raw);
            result = await diffFields(template, data, diffOpts);
          }

          if (opts.json || opts.output) {
            const text = `${JSON.stringify(result, null, 2)}\n`;
            if (opts.output) {
              await writeFile(opts.output, text, "utf8");
              console.log(`Wrote ${opts.output}`);
            } else {
              console.log(text.trimEnd());
            }
          } else {
            printFieldDiff(result);
          }

          if (!result.ok) process.exitCode = 1;
        } catch (err) {
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
