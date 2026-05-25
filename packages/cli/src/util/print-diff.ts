import type { FieldDiffResult } from "@pdffill/core";

export function printFieldDiff(result: FieldDiffResult): void {
  console.log(
    `Fields: ${result.pdfFieldCount} in PDF, ${result.dataKeyCount} in data — ${result.ok ? "OK" : "issues found"}`,
  );
  if (result.missingInData.length) {
    console.log(`Missing in data (${result.missingInData.length}):`);
    for (const f of result.missingInData) console.log(`  - ${f}`);
  }
  if (result.unknownInData.length) {
    console.log(`Unknown in data (${result.unknownInData.length}):`);
    for (const f of result.unknownInData) console.log(`  - ${f}`);
  }
  if (result.missingInBusinessData?.length) {
    console.log(`Missing in business JSON (${result.missingInBusinessData.length}):`);
    for (const g of result.missingInBusinessData) {
      console.log(`  - ${g.sourcePath} → ${g.pdfField}`);
    }
  }
  if (result.unmappedPdfFields?.length) {
    console.log(`Unmapped PDF fields (${result.unmappedPdfFields.length}):`);
    for (const f of result.unmappedPdfFields) console.log(`  - ${f}`);
  }
  if (result.typeMismatches?.length) {
    console.log(`Type mismatches (${result.typeMismatches.length}):`);
    for (const m of result.typeMismatches) {
      console.log(`  - ${m.field}: ${m.message}`);
    }
  }
  if (result.unchangedFromTemplate?.length) {
    console.log(
      `Unchanged from template (${result.unchangedFromTemplate.length}):`,
    );
    for (const u of result.unchangedFromTemplate) {
      console.log(`  - ${u.field}`);
    }
  }
}
