# pdffill

纯 JavaScript（pdf-lib）的 PDF AcroForm 工具链：**发现字段 → 诊断 → 校验 → 填充**。无需 pdftk。

- 设计文档：[docs/DESIGN.md](docs/DESIGN.md)
- 技术文档：[docs/TECH.md](docs/TECH.md)
- 范围外：[docs/NON-GOALS.md](docs/NON-GOALS.md)
- 变更记录：[CHANGELOG.md](CHANGELOG.md)
- API 参考：[docs/API.md](docs/API.md)
- 发布说明：[docs/PUBLISHING.md](docs/PUBLISHING.md)

> 下文命令在项目根目录执行。构建后可用 `npx pdffill …`，或 `node packages/cli/dist/index.js …`（等价）。

## 安装

```bash
npm install
npm run build
```

## 功能一览（v0.6.0）

| 命令 | 作用 |
|------|------|
| `doctor` | 诊断模板能否填充（加密、XFA、字段数、重名等） |
| `list` | 列出表单字段名、类型、可选项 |
| `scaffold` | 从模板生成 `data.json` 骨架（可选业务版 + mapping、模板预填） |
| `diff` | 对比模板字段与 data（漏填、多余键、类型、mapping 缺口） |
| `fill` | 用 JSON 填充模板，输出 PDF |
| `run` | 一键：**doctor → fill → verify**（推荐） |
| `verify` | 校验已填 PDF 的字段值是否与 JSON 一致 |
| `batch` | 同一模板、多行数据，批量输出 PDF（JSON 数组 / CSV）；支持 `--diff` |

**内置能力**：默认可编辑（不 flatten）、`--flatten` 归档、`--strict` / `--schema`、`--mapping` 业务字段映射、中文自动字体、`warnings` 提示缺字段、`--fail-on-warnings` 按 code 失败、`--report` / `--manifest`（含 **jsonl**）业务回执、`--diff` 填前校验、`--ignore-fields` 忽略只读/系统字段等。

**不适用**：纯 XFA、扫描件、无 AcroForm 字段的 PDF（`list` 为 0 条）。详见 [docs/NON-GOALS.md](docs/NON-GOALS.md)。

## 两种 JSON 格式（重要）

| 文件 | 格式 | 用途 |
|------|------|------|
| `fields.json` | `[{ "name", "type", ... }]` | `list --json` 的字段说明，**不能**用于 fill |
| `data.json` | `{ "字段名": 值 }` | **fill / run / verify / batch** 使用 |

```json
// ✅ 填充用
{ "applicant.name": "张三", "is_urgent": true }

// ❌ 这是 list 输出；若误用会提示运行 scaffold
[{ "name": "applicant.name", "type": "text" }]
```

## 推荐操作流程

### 路径 A：最快（已知 PDF 字段名）

```bash
pdffill doctor template.pdf
pdffill list template.pdf
# 按 list 结果编写 data.json
pdffill diff template.pdf data.json    # 填前检查漏填/多余键（推荐）
pdffill run template.pdf data.json -o filled.pdf
```

### 路径 B：从模板生成 data（新模板）

```bash
pdffill scaffold template.pdf -o data.json --fields-output fields.json
# 编辑 data.json
pdffill run template.pdf data.json -o filled.pdf
```

### 路径 C：业务字段名 ≠ PDF 字段名

```bash
pdffill scaffold template.pdf \
  -o data.json \
  --with-mapping \
  --business-output data.business.json \
  --mapping-output mapping.json

# 编辑 data.business.json（可为嵌套 JSON）
pdffill run template.pdf data.business.json -o filled.pdf --mapping mapping.json
```

### 路径 D：批量生成多份 PDF

```bash
pdffill batch template.pdf rows.json -o ./out --pattern "{index}.pdf" --verify
pdffill batch template.pdf rows.csv -o ./out --verify
```

```text
doctor → list / scaffold → 编辑 data → run（或 fill + verify）→ batch（可选）
```

## 命令说明

### doctor — 诊断模板

```bash
pdffill doctor template.pdf
pdffill doctor template.pdf --json
```

关注：`fieldCount`、`hasXFA`、`encrypted`。有 `error` 级 issue 时退出码为 1。

### list — 解析字段

```bash
pdffill list template.pdf
pdffill list template.pdf --json
```

示例输出：

```text
applicant.name    text
workspace_type    radio options=[desk, hotdesk, remote]
is_urgent         checkbox
```

**`data.json` 的键必须与 `name` 完全一致**（含 `applicant.name` 这类带点名称）。

### scaffold — 生成数据骨架

```bash
pdffill scaffold template.pdf -o data.json
pdffill scaffold template.pdf \
  -o data.json \
  --fields-output fields.json \
  --schema-output schema.json \
  --with-mapping \
  --business-output data.business.json \
  --mapping-output mapping.json \
  --business-style nested
```

| 选项 | 说明 |
|------|------|
| `--with-mapping` | 额外生成业务 JSON + `mapping.json` |
| `--business-style nested\|flat` | 嵌套（`a.b`→树）或扁平（`a_b` 键） |
| `--include-readonly` | 骨架包含只读字段 |
| `--prefill-from-template` | 用模板里已有非空字段值作为默认值（如 `reference_no`） |

### fill — 填充

```bash
pdffill fill template.pdf data.json -o filled.pdf
pdffill fill template.pdf data.json -o flat.pdf --flatten
pdffill fill template.pdf data.business.json -o out.pdf --mapping mapping.json
pdffill fill template.pdf data.json -o out.pdf --schema schema.json --strict
```

| 数据值 | PDF 字段类型 |
|--------|----------------|
| 字符串 / 数字 | text |
| `true` / `false` | checkbox |
| 字符串（须在 options 内） | radio / dropdown |

常用选项：`--flatten`、`--strict`、`--schema`、`--missing skip|error`、`--font`、`--no-update-appearances`、`--ignore-fields reference_no`、`--require-doctor`、`--report report.json`、`--config pdffill.json`、`--diff`（填前字段对比，失败则 `DIFF_FAILED`）。

`--report` 写出 JSON 回执（`ok`、`fieldsFilled`、`warnings`、`durationMs` 等），便于对接业务系统或 CI。

### diff — 填前字段对比

```bash
pdffill diff template.pdf data.json
pdffill diff template.pdf data.json --json -o diff.json
pdffill diff template.pdf data.business.json --mapping mapping.json
pdffill diff template.pdf data.json --compare-template --include-readonly
pdffill diff template.pdf data.json --config examples/complex/pdffill.json
```

| 输出项 | 含义 |
|--------|------|
| `missingInData` | PDF 有、data 里没有的字段 |
| `unknownInData` | data 里有、PDF 不认识的键 |
| `typeMismatches` | 值类型与字段类型不符（如 checkbox 用了字符串） |
| `unchangedFromTemplate` | 与模板当前值相同（`--compare-template`） |
| `missingInBusinessData` | mapping 路径在业务 JSON 中无值（`--mapping` 时） |

有 issue 时退出码为 1；适合 CI 在 `run` 之前 gate。

### 项目配置 `pdffill.json`

`fill` / `run` / `batch` / `diff` 支持 `--config`，避免重复写常用参数。CLI 显式传参优先于配置文件。

```json
{
  "ignoreFields": ["reference_no"],
  "fontPath": "C:/Windows/Fonts/msyh.ttc",
  "missing": "skip",
  "mapping": "mapping.json",
  "flatten": false,
  "strict": false,
  "requireDoctor": false,
  "failOnWarnings": ["MISSING_FIELD"]
}
```

| 配置项 | 说明 |
|--------|------|
| `ignoreFields` | 跳过 `MISSING_FIELD` 与 diff 中的字段 |
| `failOnWarnings` | 匹配的 warning code 导致失败；`["*"]` 表示任意 warning |
| `mapping` | 默认 mapping 文件路径 |

示例：`examples/complex/pdffill.json`。

### run — 一键流水线（推荐）

```bash
pdffill run template.pdf data.json -o filled.pdf
pdffill run template.pdf data.business.json -o out.pdf --mapping mapping.json
```

等价于 **doctor → fill → verify**。可选：`--skip-doctor`、`--no-verify`、`--report report.json`、`--diff`（diff 在 doctor 之前执行），其余选项同 `fill`。

`--report` 在启用 `--diff` 时会包含 `diff` 字段（与 `pdffill diff --json` 结构相同）。

### verify — 填后校验

```bash
pdffill verify filled.pdf data.json
pdffill verify filled.pdf data.json --json
```

### batch — 批量填充

```bash
pdffill batch template.pdf rows.json -o ./out --pattern "{index}.pdf"
pdffill batch template.pdf rows.csv -o ./out --verify --mapping mapping.json
pdffill batch template.pdf rows.json -o ./out --fail-fast
pdffill batch template.pdf rows.json -o ./out --manifest manifest.jsonl --manifest-format jsonl
pdffill batch template.pdf rows.json -o ./out --diff --config pdffill.json
pdffill batch template.pdf rows.json -o ./out --fail-on-warnings MISSING_FIELD
```

`--manifest` 为每行输出 `ok`、`output`、`warnings`、`verify`（若启用 `--verify`）、`diff`（若启用 `--diff`）等。默认 **JSON 数组**；`--manifest-format jsonl` 为每行一个 JSON 对象，便于日志流式追加。

`--fail-on-warnings`：`fill` / `run` / `batch` 均支持；未配置时 warning 仅打印，不改变退出码（除非配合 `--fail-on-warnings *`）。

`rows.json` 为对象数组，每元素结构与单次 `data.json` 相同：

```json
[
  { "applicant.name": "Alice", "department": "Sales", "is_urgent": false },
  { "applicant.name": "Bob", "department": "HR", "is_urgent": true }
]
```

`rows.csv` 首行为表头，列名即字段名（可与 `--mapping` 配合）。

## 中文 / Unicode

填充数据含中文时，会自动查找系统字体（如 Windows `simhei.ttf`）；找不到则设置 `NeedAppearances`，**不会崩溃**。

```bash
pdffill fill template.pdf data.zh.json -o out.pdf
pdffill fill template.pdf data.zh.json -o out.pdf --font C:\Windows\Fonts\msyh.ttc
# 或环境变量 PDFFILL_FONT_PATH
```

## 仓库内示例

```bash
npm run example:complex      # 生成复杂模板 PDF
npm run example:scaffold     # 生成 data / fields / mapping / schema
npm run example:pipeline     # run：填充 data.json
npm run example:run-business # run：业务 JSON + mapping
npm run example:diff         # diff：对比 data 与模板字段
npm run example:run-diff     # run + --diff + pdffill.json
npm run example:batch-jsonl  # batch + manifest jsonl
```

示例目录 [examples/complex/](examples/complex/README.md)：

| 文件 | 说明 |
|------|------|
| `template-complex.pdf` | 2 页，含 text / checkbox / radio / dropdown |
| `data.json` | 按 PDF 字段名填写 |
| `data.business.json` | 嵌套业务数据 |
| `mapping.json` | 业务路径 → PDF 字段 |
| `rows.json` / `rows.csv` | 批量数据 |
| `pdffill.json` | 项目配置（`ignoreFields` 等） |

简单三字段模板：

```bash
node examples/simple/generate-template.mjs
pdffill run examples/simple/template.pdf examples/simple/data.json -o examples/simple/filled.pdf
```

## 与 pdffiller 的区别

| | [pdffiller](https://github.com/pdffillerjs/pdffiller) | pdffill |
|---|----------------------|---------|
| 依赖 | 系统安装 pdftk | `npm install` |
| 默认可编辑 | 否（常输出只读） | 是（不 flatten） |
| 字段发现 | FDF 工具流 | `list --json` |
| 填充前诊断 | 无 | `doctor` |
| 中文 | 易踩坑 | 自动处理 |
| 批量 / 映射 / 填后校验 | 需自建 | `batch` / `--mapping` / `verify` |

## 库 API（`@pdffill/core`）

完整说明见 [docs/API.md](docs/API.md)。

```typescript
import {
  listFields,
  doctor,
  diffFields,
  fillForm,
  runPipeline,
  scaffoldFillData,
  applyFieldMapping,
  batchFill,
  verifyFilledPdf,
  parseFailOnWarningsSpec,
} from "@pdffill/core";

const template = await readFile("template.pdf");

const fields = await listFields(template);
const report = await doctor(template);

const { pdf, warnings } = await fillForm(template, {
  "applicant.name": "Jane",
}, { flatten: false });

const result = await runPipeline(template, data, { verify: true });
```

## 开发

```bash
npm test
npm run typecheck
```

发布 npm 包前见 [docs/PUBLISHING.md](docs/PUBLISHING.md)。首发前请把两个 `package.json` 里的 `repository` / `homepage` 改成你的真实 Git 地址。

## License

MIT
