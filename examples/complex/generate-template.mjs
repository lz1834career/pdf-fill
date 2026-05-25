/**
 * From repo root (after npm run build):
 *   node examples/complex/generate-template.mjs
 */
import { writeFile } from "node:fs/promises";
import { createComplexFixture } from "@pdffill/core/test-fixtures";

const pdf = await createComplexFixture();
await writeFile("examples/complex/template-complex.pdf", pdf);
console.log("Wrote examples/complex/template-complex.pdf");
console.log("Fields: run pdffill list examples/complex/template-complex.pdf");
