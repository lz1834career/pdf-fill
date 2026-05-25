# pdffill

纯 JavaScript 的 PDF AcroForm 填充工具链（[pdf-lib](https://pdf-lib.js.org/)），无需 pdftk。支持字段发现、诊断、填前 diff、填充与校验；默认输出**可编辑** PDF。

## Features

- **CLI**：`doctor` · `list` · `scaffold` · `diff` · `fill` · `run` · `verify` · `batch`
- 业务字段映射（`--mapping`）、项目配置（`pdffill.json`）、JSON 回执（`--report` / jsonl manifest）
- 中文 / Unicode：自动字体或 `NeedAppearances`，不崩溃
- **库**：[`@pdffill/core`](docs/API.md) 可在 Node 中直接调用

不支持 XFA、无 AcroForm 的扫描件等，见 [docs/NON-GOALS.md](docs/NON-GOALS.md)。

## Install

```bash
# 仅 CLI
npm install -g pdffill

# 或从源码
git clone <your-repo-url>
cd pdffill
npm install && npm run build
```

需要 **Node.js 18+**。

## Quick start

```bash
pdffill list template.pdf
pdffill scaffold template.pdf -o data.json    # 新模板：生成填充用 JSON
# 编辑 data.json：{ "field.name": "value", "is_ok": true }

pdffill diff template.pdf data.json           # 可选：漏填 / 多余键检查
pdffill run template.pdf data.json -o filled.pdf
```

> **注意**：`fill` / `run` 使用 `{ "PDF字段名": 值 }`。`list --json` 的数组是字段元数据，不能当填充数据；误用会提示先 `scaffold`。

业务字段名与 PDF 不一致时：

```bash
pdffill run template.pdf data.business.json -o out.pdf --mapping mapping.json
```

## CLI commands

| Command | Description |
|---------|-------------|
| `doctor` | 模板是否可填（加密、XFA、字段数等） |
| `list` | 字段名、类型、选项 |
| `scaffold` | 生成 `data.json`（可选 mapping / schema / 模板预填） |
| `diff` | 模板 vs data 对比 |
| `fill` | 填充并输出 PDF |
| `run` | `doctor` → `fill` → `verify`（推荐） |
| `verify` | 校验已填 PDF |
| `batch` | JSON 数组或 CSV 批量输出 |

常用选项：`--flatten` · `--mapping` · `--config pdffill.json` · `--ignore-fields` · `--diff` · `--fail-on-warnings` · `--report` · `--manifest-format jsonl`

```bash
pdffill batch template.pdf rows.json -o ./out --verify --diff
```

## Configuration

`fill` / `run` / `batch` / `diff` 支持 `--config`（CLI 参数优先）：

```json
{
  "ignoreFields": ["reference_no"],
  "mapping": "mapping.json",
  "failOnWarnings": ["MISSING_FIELD"]
}
```

示例：[examples/complex/pdffill.json](examples/complex/pdffill.json)

## Examples

```bash
npm run example:complex
npm run example:pipeline
npm run example:diff
```

详见 [examples/complex/README.md](examples/complex/README.md)。

## API

```bash
npm install @pdffill/core
```

```typescript
import { readFile, writeFile } from "node:fs/promises";
import { fillForm, listFields, runPipeline } from "@pdffill/core";

const template = await readFile("template.pdf");
const { pdf } = await fillForm(template, { "applicant.name": "Jane" });
await writeFile("filled.pdf", pdf);
```

→ [docs/API.md](docs/API.md)

## Docs

| Doc | |
|-----|--|
| [DESIGN.md](docs/DESIGN.md) | 设计 |
| [TECH.md](docs/TECH.md) | 技术说明 |
| [CHANGELOG.md](CHANGELOG.md) | 版本记录 |
| [PUBLISHING.md](docs/PUBLISHING.md) | npm 发布 |

## Development

```bash
npm test
npm run typecheck
npm run pack:check   # 发布前 dry-run
```

## Comparison with [pdffiller](https://github.com/pdffillerjs/pdffiller)

| | pdffiller | pdffill |
|---|-----------|---------|
| 依赖 | pdftk | npm |
| 默认可编辑 | 否 | 是 |
| 诊断 / diff / 批量 | 需自建 | 内置 |

## License

MIT — see [LICENSE](LICENSE).
