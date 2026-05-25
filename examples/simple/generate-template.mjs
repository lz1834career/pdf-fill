/**
 * Run from repo root after build:
 *   node examples/simple/generate-template.mjs
 */
import { writeFile } from "node:fs/promises";
import { createSimpleTextFixture } from "@pdffill/core/test-fixtures";

const pdf = await createSimpleTextFixture();
await writeFile("examples/simple/template.pdf", pdf);
console.log("Wrote examples/simple/template.pdf");
