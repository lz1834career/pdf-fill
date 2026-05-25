import { writeFile } from "node:fs/promises";
import type { Command } from "commander";
import {
  listFields,
  scaffoldAll,
  scaffoldFromTemplate,
  scaffoldJsonSchema,
} from "@pdffill/core";
import { readBinary } from "../util/read-file.js";

export function registerScaffoldCommand(program: Command): void {
  program
    .command("scaffold")
    .description(
      "Generate fill-ready data.json (and optional fields.json / schema.json) from a template",
    )
    .argument("<pdf>", "Path to PDF template")
    .option("-o, --output <path>", "PDF field names → values (fill direct)", "data.json")
    .option(
      "--fields-output <path>",
      "Also write field metadata (same as list --json)",
    )
    .option("--schema-output <path>", "Also write JSON Schema for fill data")
    .option("--include-readonly", "Include read-only fields")
    .option(
      "--with-mapping",
      "Also write business data + mapping.json for --mapping fill/batch",
    )
    .option(
      "--business-output <path>",
      "Business JSON path (with --with-mapping)",
      "data.business.json",
    )
    .option(
      "--mapping-output <path>",
      "Mapping JSON path (with --with-mapping)",
      "mapping.json",
    )
    .option(
      "--business-style <style>",
      "nested (applicant.name → tree) or flat (applicant_name keys)",
      "nested",
    )
    .option(
      "--prefill-from-template",
      "Use non-empty values already in the PDF as defaults",
    )
    .action(
      async (
        pdfPath: string,
        opts: {
          output: string;
          fieldsOutput?: string;
          schemaOutput?: string;
          includeReadonly?: boolean;
          withMapping?: boolean;
          businessOutput: string;
          mappingOutput: string;
          businessStyle: string;
          prefillFromTemplate?: boolean;
        },
      ) => {
        const bytes = await readBinary(pdfPath);
        const fields = await listFields(bytes);
        if (fields.length === 0) {
          console.error("No AcroForm fields found. Run pdffill doctor first.");
          process.exitCode = 1;
          return;
        }

        const style =
          opts.businessStyle === "flat" ? "flat" : "nested";

        const scaffoldOpts = {
          includeReadOnly: opts.includeReadonly ?? false,
          withMapping: opts.withMapping ?? false,
          businessStyle: style,
          prefillFromTemplate: opts.prefillFromTemplate ?? false,
        };

        const bundle = opts.prefillFromTemplate
          ? await scaffoldFromTemplate(bytes, scaffoldOpts)
          : scaffoldAll(fields, scaffoldOpts);

        await writeFile(
          opts.output,
          `${JSON.stringify(bundle.pdfData, null, 2)}\n`,
          "utf8",
        );
        console.log(
          `Wrote ${opts.output} (${Object.keys(bundle.pdfData).length} PDF field(s))`,
        );

        if (bundle.business) {
          await writeFile(
            opts.businessOutput,
            `${JSON.stringify(bundle.business.businessData, null, 2)}\n`,
            "utf8",
          );
          const mappingPayload = { mapping: bundle.business.mapping };
          await writeFile(
            opts.mappingOutput,
            `${JSON.stringify(mappingPayload, null, 2)}\n`,
            "utf8",
          );
          console.log(
            `Wrote ${opts.businessOutput} + ${opts.mappingOutput} (${Object.keys(bundle.business.mapping).length} mapped field(s), ${style})`,
          );
          console.log(
            "Fill with: pdffill fill <pdf> " +
              opts.businessOutput +
              " -o out.pdf --mapping " +
              opts.mappingOutput,
          );
        }

        if (opts.fieldsOutput) {
          await writeFile(
            opts.fieldsOutput,
            `${JSON.stringify(fields, null, 2)}\n`,
            "utf8",
          );
          console.log(`Wrote ${opts.fieldsOutput} (field metadata)`);
        }

        if (opts.schemaOutput) {
          const schema = scaffoldJsonSchema(fields, {
            includeReadOnly: opts.includeReadonly ?? false,
          });
          await writeFile(
            opts.schemaOutput,
            `${JSON.stringify(schema, null, 2)}\n`,
            "utf8",
          );
          console.log(`Wrote ${opts.schemaOutput} (JSON Schema)`);
        }
      },
    );
}
