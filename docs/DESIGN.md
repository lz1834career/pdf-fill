# pdffill — 设计文档

## 1. 背景与问题

### 1.1 用户场景

- 合同、申请表、报表等 **已有 AcroForm 模板 PDF**
- 用 JSON/业务数据 **批量灌表**
- 部分场景要求 **填完后仍可编辑**（不 flatten）
- 部分场景要求 **只读归档**（flatten）
- 需要在 CI 中运行，**不愿依赖 pdftk 系统二进制**

### 1.2 现有方案不足

| 方案 | 问题 |
|------|------|
| [pdffillerjs/pdffiller](https://github.com/pdffillerjs/pdffiller) | 依赖 pdftk；`fillForm` 默认只读；API 老旧（callback） |
| [@sparticuz/pdffiller](https://www.npmjs.com/package/@sparticuz/pdffiller) | 仍要 pdftk；UTF-8 与 flatten 存在 [pdftk-java #128](https://gitlab.com/pdftk-java/pdftk/-/issues/128) 类限制 |
| 直接使用 pdf-lib | 能力齐全但无 `list`/`doctor`/schema/生产默认策略，踩 NeedAppearances、XFA、checkbox 导出值 |

### 1.3 产品定位

**pdffill**：围绕 AcroForm 的 **发现 → 诊断 → 校验 → 填充** 工具链，底层默认 **pdf-lib（纯 JavaScript）**，可选未来扩展 pdftk 引擎。

一句话：**Fill PDF forms like env vars — list, doctor, schema, fill.**

---

## 2. 目标用户

| 用户 | 需求 |
|------|------|
| 后端工程师 | Node 服务内 `fillForm()`，Docker 无 pdftk |
| 运维/自动化 | CLI + GitHub Actions golden test |
| 集成商 | 先 `list` 导出字段清单，再对接业务 JSON |

---

## 3. 设计原则

1. **Discover-first**：先 `list` / `doctor`，再 `fill`
2. **默认可编辑**：不 flatten；`--flatten` 显式开启
3. **默认生产友好**：填充后更新字段外观（`updateFieldAppearances`），减少 Acrobat「保存更改」提示
4. **失败要响**：未知字段、类型不匹配、schema 违反 → 结构化错误与 `warnings`
5. **范围极小**：只做 AcroForm 填充，其余见 [NON-GOALS.md](./NON-GOALS.md)

---

## 4. 功能范围

### 4.1 MVP（当前迭代）

| 命令/API | 说明 |
|----------|------|
| `list` | 列出字段：名称、类型、是否只读、checkbox/radio 合法值 |
| `doctor` | 检测：加密、XFA、字段数、重名、是否可填充 |
| `fill` | JSON 填表；`--flatten`；`--strict`；`--schema` |
| `scaffold` | 从模板生成 fill 用 `data.json` + 可选 `fields.json` / schema |
| `verify` | 填后校验字段值 |
| `batch` | JSON 数组 / CSV 批量出 PDF |
| `run` | doctor → fill → verify 一键 |
| `fill --mapping` | 业务 JSON + mapping.json |
| 库 API | 含 `runPipeline`, `batchFill`, `scaffoldBusinessBundle` 等 |

### 4.2 后续版本（非 MVP）

- `--engine pdftk`：难模板兜底
- 更完善的 CSV（多行单元格）

---

## 5. 与竞品对比（设计层）

| 维度 | pdffiller | pdffill |
|------|-----------|---------|
| 运行时依赖 | pdftk 二进制 | npm 包（pdf-lib） |
| 默认可编辑 | 否（fillForm 只读） | 是 |
| 字段发现 | dump FDF 风格 | `list` 结构化 JSON |
| 填充前诊断 | 无 | `doctor` |
| Schema 校验 | 无 | JSON Schema（可选） |
| 审计输出 | 无 | `warnings[]` |

---

## 6. 用户体验

### 6.1 CLI 主流程

```bash
pdffill doctor template.pdf
pdffill list template.pdf --json > fields.json
# 编写 data.json
pdffill fill template.pdf data.json -o filled.pdf
pdffill fill template.pdf data.json -o flat.pdf --flatten
```

### 6.2 库主流程

```typescript
import { listFields, doctor, fillForm } from "@pdffill/core";

const fields = await listFields({ input: buffer });
const report = await doctor({ input: buffer });
const result = await fillForm({
  template: buffer,
  data: { customer_name: "张三" },
  options: { flatten: false, missing: "error", updateAppearances: true },
});
```

---

## 7. 数据模型（概念）

### 7.1 字段描述 `FieldInfo`

- `name`：完全限定字段名
- `type`：`text` | `checkbox` | `radio` | `dropdown` | `optionList` | `button` | `unknown`
- `readOnly`：boolean
- `options?`：radio/dropdown 可选值
- `exportValues?`：checkbox 的 on/off 导出值

### 7.2 填充结果 `FillResult`

- `pdf`：`Uint8Array`
- `fieldsFilled`：string[]
- `warnings`：`Warning[]`（跳过、XFA 剥离提示等）

### 7.3 诊断 `DoctorReport`

- `ok`：boolean
- `encrypted`、`hasXFA`、`fieldCount`
- `issues`：`{ level, code, message }[]`

---

## 8. 错误策略

| 场景 | 默认行为 |
|------|----------|
| 数据中有模板不存在的字段 | `--strict` → 抛错；否则 warning + 跳过 |
| 缺少数据中的字段 | `missing: "skip"`（默认） |
| 类型不匹配（如 checkbox 传 string） | 抛错 |
| dropdown 值不在 options | 抛错 |
| 模板含 XFA | warning（不自动删 XFA，MVP 仅报告） |

---

## 9. 包与发布

| 包名 | 说明 |
|------|------|
| `@pdffill/core` | 核心库 |
| `pdffill` | CLI（依赖 core） |

许可证：MIT。

---

## 10. 成功标准（MVP）

- [x] 无 pdftk 下 `npm test` 通过
- [x] 自制 fixture：text、checkbox/radio、flatten（测试内生成）
- [x] CLI：`list` / `doctor` / `fill` / `scaffold` / `verify` / `batch` / `run`
- [x] README 含与 pdffiller 对比表
