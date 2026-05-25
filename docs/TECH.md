# pdffill — 技术文档

## 1. 架构

```text
packages/cli          →  commander，读写文件，调用 core
packages/core         →  pdf-lib 适配，纯逻辑，可测
fixtures/             →  测试用 PDF（测试内生成 + 提交 golden）
```

```text
                    ┌─────────────┐
  template.pdf ────►│  loadPdf    │
  data.json    ────►│  fillForm   │──► filled.pdf
  options      ────►│  (core)     │──► warnings[]
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  pdf-lib    │
                    │  PDFForm    │
                    └─────────────┘
```

**引擎接口（预留）**

```typescript
interface PdfEngine {
  listFields(bytes: Uint8Array): Promise<FieldInfo[]>;
  doctor(bytes: Uint8Array): Promise<DoctorReport>;
  fill(bytes: Uint8Array, data: FillData, opts: FillOptions): Promise<FillResult>;
}
```

MVP 仅实现 `PdfLibEngine`。

---

## 2. 技术栈

| 项 | 选择 |
|----|------|
| 语言 | TypeScript 5.x |
| 运行时 | Node.js ≥ 18 |
| PDF | pdf-lib ^1.17 |
| 构建 | tsup |
| 测试 | vitest |
| CLI | commander |
| Schema | ajv（JSON Schema draft-07） |
| 包管理 | npm workspaces |

---

## 3. 目录结构

```text
pdffill/
  docs/
  packages/
    core/
      src/
        index.ts
        types.ts
        engine/pdf-lib-engine.ts
        schema/validate.ts
        util/read-file.ts
      package.json
    cli/
      src/
        index.ts
        commands/list.ts
        commands/doctor.ts
        commands/fill.ts
      package.json
  package.json
  tsconfig.base.json
  vitest.workspace.ts (或根 vitest 配置)
```

---

## 4. pdf-lib 实现要点

### 4.1 列出字段

```typescript
const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
const form = doc.getForm();
for (const field of form.getFields()) {
  // 根据 field 构造函数名或 kind 映射 FieldType
}
```

- `PDFTextField` → `text`
- `PDFCheckBox` → `checkbox`，记录 `getExportValues()` 若可用
- `PDFRadioGroup` → `radio`，`getOptions()`
- `PDFDropdown` → `dropdown`
- `PDFOptionList` → `optionList`
- `PDFButton` → `button`（fill 时忽略）

### 4.2 填充

1. `PDFDocument.load(template)`
2. `getForm()`；若 `hasXFA()` → `issues` 记录（MVP 不 `deleteXFA`）
3. 对每个 `data` 键：`form.getFieldMaybe(name)` 或 `getTextField` 等
4. 类型分发：`setText` / `check` / `uncheck` / `select`
5. 若 `updateAppearances: true` → `form.updateFieldAppearances()`
6. 若 `flatten: true` → `form.flatten()`
7. `doc.save()`

### 4.3 可编辑 vs 只读

| `flatten` | 结果 |
|-----------|------|
| `false`（默认） | 字段保留，Acrobat 可编辑 |
| `true` | 外观进内容流，字段不可编辑 |

与 [pdffiller `fillForm`](https://github.com/pdffillerjs/pdffiller) 默认行为相反；与 [火山引擎文章](https://www.volcengine.com/article/193924) 中 pdf-lib 示例一致。

### 4.4 NeedAppearances

pdf-lib 在 `getForm()` 后 save 时常会处理 appearance。显式调用 `updateFieldAppearances()` 作为默认，降低阅读器「请保存更改」概率。

### 4.5 Unicode / 中文（已实现）

1. 检测填充数据中的非 WinAnsi 字符（码点 > 0xFF）
2. 尝试加载 CJK 字体：`--font` / `PDFFILL_FONT_PATH` / 系统字体路径（Windows `msyh.ttc` 等）
3. 成功：`@pdf-lib/fontkit` + `embedFont` + `updateFieldAppearances(font)`
4. 失败：`NeedAppearances=true`，`save({ updateFieldAppearances: false })`，避免 Helvetica 编码崩溃
5. **关键**：`pdf-lib` 的 `save()` 默认也会 `updateFieldAppearances()`，必须显式关闭

### 4.6 其他限制

- 纯 XFA、加密 PDF 仍不支持
- **XFA**：`form.hasXFA()` 为 true 时 `doctor` 标 `fail` 或 `warn`
- **加密**：无法填充时 `doctor` 报告 `encrypted`

---

## 5. CLI 规格

### 5.1 `pdffill list <pdf>`

| 选项 | 说明 |
|------|------|
| `--json` | JSON 输出（默认人类可读表格） |

### 5.2 `pdffill doctor <pdf>`

| 选项 | 说明 |
|------|------|
| `--json` | JSON 报告 |
| 退出码 | `0` ok，`1` 有 error 级 issue |

### 5.3 `pdffill scaffold <pdf>`

| 选项 | 说明 |
|------|------|
| `-o, --output` | fill 用 data.json（默认 `data.json`） |
| `--fields-output` | 字段元数据（同 `list --json`） |
| `--schema-output` | JSON Schema |
| `--include-readonly` | 骨架包含只读字段 |
| `--with-mapping` | 生成 `data.business.json` + `mapping.json` |
| `--business-output` / `--mapping-output` | 自定义路径 |
| `--business-style nested\|flat` | 业务 JSON 结构（默认 nested） |

### 5.5 `pdffill verify <pdf> <data.json>`

| 选项 | 说明 |
|------|------|
| `--json` | JSON 报告 |
| 退出码 | 0 通过，1 有不匹配 |

### 5.6 `pdffill fill <pdf> <data.json>`

| 选项 | 说明 |
|------|------|
| `-o, --output` | 输出路径（必填） |
| `--mapping <path>` | 业务 JSON → PDF 字段名（`mapping.json`） |
| `--flatten` | 扁平化 |
| `--strict` | 未知字段即失败 |
| `--schema <file>` | JSON Schema |
| `--missing <skip\|error>` | 缺字段策略 |
| `--no-update-appearances` | 关闭 appearance 更新 |
| `--font <path>` | CJK 字体 |

`mapping.json`：`{ "applicant.fullName": "applicant.name", ... }`（源路径支持嵌套 JSON 的点路径）

### 5.7 `pdffill run <pdf> <data.json>`

| 选项 | 说明 |
|------|------|
| `-o, --output` | 输出 PDF（必填） |
| `--mapping` | 业务 JSON 映射 |
| `--skip-doctor` | 跳过诊断 |
| `--no-verify` | 跳过填后校验 |
| 其余 | 同 fill |

### 5.8 `pdffill batch <pdf> <rows.json|rows.csv>`

| 选项 | 说明 |
|------|------|
| `-o, --output-dir` | 输出目录 |
| `--pattern` | 文件名模板，默认 `{index}.pdf`，支持 `{index}` 与行内字段 |
| `--mapping` | 同 fill |
| `--fail-fast` | 首行失败即停 |
| `--verify` | 每行写出后 `verify` 字段值 |
| 其余 | 同 fill（flatten、strict、font 等） |

---

## 6. Schema 校验

- 使用 ajv 编译 schema
- `data.json` 在填表前校验；失败抛 `SchemaValidationError`，CLI exit 2

---

## 7. 测试策略

### 7.1 程序化 fixture（`packages/core/src/test-helpers/create-fixture.ts`）

- `simple-text.pdf`：3 个 text 字段
- `checkbox-radio.pdf`：1 checkbox + 1 radio group
- 测试内 `beforeAll` 生成，保证 CI 无手工 PDF

### 7.2 用例

| 用例 | 断言 |
|------|------|
| listFields | 字段名与类型 |
| fill text | 重新 load 后 `getText()` 等于输入 |
| fill checkbox | checked 状态 |
| flatten | fill 后字段 `getFields().length === 0` 或不可 get |
| strict unknown field | throws |
| doctor xfa/encrypted | 模拟或跳过 encrypted 实测 |

### 7.3 Golden（可选二期）

- 保存 `filled.pdf` 字节 hash；MVP 以字段读回为准

---

## 8. 依赖版本（锁定策略）

```json
{
  "pdf-lib": "^1.17.1",
  "commander": "^12.1.0",
  "ajv": "^8.17.1"
}
```

---

## 9. 构建与发布

```bash
npm install
npm run build -w @pdffill/core -w pdffill
npm test
npx pdffill list ./path/to.pdf
```

- `core`：`tsup` → `dist/index.js` + `d.ts`
- `cli`：bin `pdffill` → `dist/index.js`

---

## 10. 安全

- 不执行 PDF 内嵌 JavaScript
- 不解析外部 URL
- 输入大小：CLI 可读配置 `maxFileSize`（默认 50MB，二期）

---

## 11. 版本路线

| 版本 | 内容 |
|------|------|
| 0.1.0 | list / doctor / fill，pdf-lib only |
| 0.2.0 | verify，mapping file |
| 0.3.0 | optional pdftk engine |
