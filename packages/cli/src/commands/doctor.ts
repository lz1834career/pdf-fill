import type { Command } from "commander";
import { doctor } from "@pdffill/core";
import { readBinary } from "../util/read-file.js";

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Diagnose whether a PDF can be filled with pdffill")
    .argument("<pdf>", "Path to PDF template")
    .option("--json", "Output report as JSON")
    .action(async (pdfPath: string, opts: { json?: boolean }) => {
      const bytes = await readBinary(pdfPath);
      const report = await doctor(bytes);
      if (opts.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(report.ok ? "OK" : "NOT OK");
        console.log(`encrypted: ${report.encrypted}`);
        console.log(`hasXFA: ${report.hasXFA}`);
        console.log(`fieldCount: ${report.fieldCount}`);
        for (const issue of report.issues) {
          console.log(`[${issue.level}] ${issue.code}: ${issue.message}`);
        }
      }
      if (!report.ok) process.exitCode = 1;
    });
}
