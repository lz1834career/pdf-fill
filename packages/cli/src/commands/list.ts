import type { Command } from "commander";
import { listFields } from "@pdffill/core";
import type { FieldInfo } from "@pdffill/core";
import { readBinary } from "../util/read-file.js";

function printTable(fields: FieldInfo[]): void {
  if (fields.length === 0) {
    console.log("No AcroForm fields found.");
    return;
  }
  for (const f of fields) {
    const opts =
      f.options?.length ? ` options=[${f.options.join(", ")}]` : "";
    const ro = f.readOnly ? " readonly" : "";
    console.log(`${f.name}\t${f.type}${ro}${opts}`);
  }
}

export function registerListCommand(program: Command): void {
  program
    .command("list")
    .description("List AcroForm fields in a PDF")
    .argument("<pdf>", "Path to PDF template")
    .option("--json", "Output as JSON array")
    .action(async (pdfPath: string, opts: { json?: boolean }) => {
      const bytes = await readBinary(pdfPath);
      const fields = await listFields(bytes);
      if (opts.json) {
        console.log(JSON.stringify(fields, null, 2));
      } else {
        printTable(fields);
      }
    });
}
