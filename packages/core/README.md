# @pdffill/core

Discover, diagnose, diff, and fill PDF AcroForms with [pdf-lib](https://pdf-lib.js.org/) (no pdftk).

```bash
npm install @pdffill/core
```

```typescript
import { readFile, writeFile } from "node:fs/promises";
import { fillForm, listFields, doctor } from "@pdffill/core";

const template = await readFile("template.pdf");
const { pdf } = await fillForm(template, { name: "Jane" });
await writeFile("filled.pdf", pdf);
```

Full API: [docs/API.md](https://github.com/lz1834career/pdf-fill/blob/main/docs/API.md).

CLI: [`pdffill`](https://www.npmjs.com/package/pdffill).
