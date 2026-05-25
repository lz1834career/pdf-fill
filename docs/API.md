# @pdffill/core API

Programmatic API for listing, diagnosing, diffing, and filling PDF AcroForms (pdf-lib, no pdftk).

## Install

```bash
npm install @pdffill/core
```

CLI (optional):

```bash
npm install -g pdffill
```

## Quick start

```typescript
import { readFile, writeFile } from "node:fs/promises";
import {
  listFields,
  doctor,
  diffFields,
  fillForm,
  runPipeline,
  verifyFilledPdf,
} from "@pdffill/core";

const template = await readFile("template.pdf");

const fields = await listFields(template);
const report = await doctor(template);

const data = { "applicant.name": "Jane Doe", department: "Sales" };
const diff = await diffFields(template, data, {
  ignoreFields: ["reference_no"],
});
if (!diff.ok) {
  console.error(diff.missingInData, diff.unknownInData);
}

const { pdf, warnings } = await fillForm(template, data, {
  flatten: false,
  ignoreFields: ["reference_no"],
});

await writeFile("filled.pdf", pdf);
```

## Modules

### Field discovery

| Export | Description |
|--------|-------------|
| `listFields(bytes)` | `FieldInfo[]` — name, type, options, readOnly |
| `doctor(bytes)` | `DoctorReport` — encrypted, XFA, field count, issues |
| `readFillDataFromTemplate(bytes)` | Current AcroForm values as `FillData` |

### Scaffold

| Export | Description |
|--------|-------------|
| `scaffoldFillData(fields, options?, prefill?)` | Default fill JSON from metadata |
| `scaffoldFromTemplate(bytes, options)` | Async scaffold + optional prefill |
| `scaffoldJsonSchema(fields)` | JSON Schema for fill data |
| `scaffoldBusinessBundle` / `scaffoldAll` | Business JSON + `mapping` |

### Diff

| Export | Description |
|--------|-------------|
| `diffFields(template, data, options?)` | PDF field names vs `FillData` |
| `diffFieldsWithMapping(fields, business, mapping, options?)` | Business JSON + mapping gaps |

### Fill

| Export | Description |
|--------|-------------|
| `fillForm(template, data, options?)` | `FillResult` — `pdf`, `fieldsFilled`, `warnings` |

`FillOptions`: `flatten`, `strict`, `missing`, `updateAppearances`, `fontPath`, `schema`, `ignoreFields`, `requireDoctor`, `failOnWarnings`.

| Export | Description |
|--------|-------------|
| `runPipeline(template, data, options?)` | doctor → fill → optional verify |
| `batchFill(template, rows, options?)` | Multiple rows, `BatchRowResult[]` |

### Warnings

| Export | Description |
|--------|-------------|
| `parseFailOnWarningsSpec("MISSING_FIELD,*")` | Parse fail-on list |
| `assertWarningsAllowed(warnings, codes?)` | Throw `WARNINGS_NOT_ALLOWED` |

Called automatically when `fillForm` receives `failOnWarnings`.

### Mapping

| Export | Description |
|--------|-------------|
| `parseMappingFile(raw)` | `FieldMapping` |
| `applyFieldMapping(business, mapping)` | `FillData` |

### Verify

| Export | Description |
|--------|-------------|
| `verifyFilledPdf(pdf, expected)` | Post-fill value check |

### Config & reports

| Export | Description |
|--------|-------------|
| `parsePdffillConfig(raw)` | CLI-style project config |
| `buildFillReport` / `buildRunReport` | Operation receipt objects |
| `serializeBatchManifest(entries, "json" \| "jsonl")` | Batch manifest serialization |

### Errors

- `PdfFillError` — `code`: `NO_ACROFORM`, `DIFF_FAILED`, `WARNINGS_NOT_ALLOWED`, …
- `SchemaValidationError` — JSON Schema validation

### Test fixtures

```typescript
import { createComplexFixture } from "@pdffill/core/test-fixtures";
```

## Types

Key types are exported from the package root: `FillData`, `FillValue`, `FieldInfo`, `FieldDiffResult`, `OperationReport`, `PdffillConfig`, etc.
