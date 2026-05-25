import type { Command } from "commander";
import {
  parseFillDataInput,
  verifyFilledPdf,
  PdfFillError,
} from "@pdffill/core";
import { readBinary, readJson } from "../util/read-file.js";

export function registerVerifyCommand(program: Command): void {
  program
    .command("verify")
    .description("Verify filled PDF field values match expected data.json")
    .argument("<pdf>", "Path to filled PDF")
    .argument("<data.json>", "Expected field values (same shape as fill)")
    .option("--json", "Output result as JSON")
    .action(async (pdfPath: string, dataPath: string, opts: { json?: boolean }) => {
      try {
        const pdf = await readBinary(pdfPath);
        const raw = await readJson(dataPath);
        const expected = parseFillDataInput(raw);
        const result = await verifyFilledPdf(pdf, expected);

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.ok ? "OK" : "FAILED");
          console.log(`checked: ${result.checked.length}`);
          for (const m of result.mismatches) {
            console.log(
              `  mismatch ${m.field}: expected ${JSON.stringify(m.expected)}, got ${JSON.stringify(m.actual)}`,
            );
          }
          for (const name of result.missingInPdf) {
            console.log(`  missing in PDF: ${name}`);
          }
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
    });
}
