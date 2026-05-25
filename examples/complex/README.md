# 复杂模板示例

`template-complex.pdf` 由代码生成（非扫描件），包含：

| 页 | 字段 | 类型 | 说明 |
|----|------|------|------|
| 1 | `reference_no` | text | **只读**，预填 REF-2026-0001，fill 会报错若尝试改 |
| 1 | `applicant.name` | text | 带点号的字段名 |
| 1 | `applicant.id_number` | text | |
| 1 | `department` | text | |
| 1 | `start_date` | text | |
| 1 | `reason_multiline` | text | 多行 |
| 1 | `budget_amount` | text | JSON 可传 number |
| 2 | `is_urgent` | checkbox | |
| 2 | `notify_email` | checkbox | 模板里默认勾选 |
| 2 | `workspace_type` | radio | `desk` / `hotdesk` / `remote` |
| 2 | `priority` | dropdown | `low` / `normal` / `high` / `critical` |
| 2 | `approver_name` | text | |
| 2 | `supervisor_signed` | checkbox | |

**注意**：`data.json` 不包含只读字段 `reference_no`。填充时用 `pdffill.json` 的 `ignoreFields` 跳过该字段的 `MISSING_FIELD` 警告；填前可用 `pdffill diff` 检查。

## 文件说明

| 文件 | 用途 |
|------|------|
| `fields.json` | `pdffill list --json` 的字段元数据（**不要**用于 fill） |
| `data.json` | `pdffill fill` 用的键值数据 |
| `data.zh.json` | 中文填充示例 |
| `pdffill.json` | 项目配置（`ignoreFields: ["reference_no"]` 等） |

生成骨架：

```bash
node packages/cli/dist/index.js scaffold examples/complex/template-complex.pdf \
  -o examples/complex/data.json \
  --fields-output examples/complex/fields.json \
  --schema-output examples/complex/schema.json \
  --with-mapping
```

`--with-mapping` 额外生成 `data.business.json`（嵌套业务结构）+ `mapping.json`。

批量并校验：

```bash
node packages/cli/dist/index.js batch examples/complex/template-complex.pdf examples/complex/rows.json -o examples/complex/out --verify
```

## 命令

```bash
npm run build
node examples/complex/generate-template.mjs

node packages/cli/dist/index.js doctor examples/complex/template-complex.pdf
node packages/cli/dist/index.js list examples/complex/template-complex.pdf
node packages/cli/dist/index.js diff examples/complex/template-complex.pdf examples/complex/data.json --config examples/complex/pdffill.json
node packages/cli/dist/index.js run examples/complex/template-complex.pdf examples/complex/data.json -o examples/complex/filled.pdf --config examples/complex/pdffill.json --diff
node packages/cli/dist/index.js run examples/complex/template-complex.pdf examples/complex/data.business.json -o examples/complex/filled-business.pdf --mapping examples/complex/mapping.json

# 批量 + jsonl manifest + 每行 diff
node packages/cli/dist/index.js batch examples/complex/template-complex.pdf examples/complex/rows.json -o examples/complex/out --manifest examples/complex/manifest.jsonl --manifest-format jsonl --config examples/complex/pdffill.json --diff

# 有 MISSING_FIELD 警告时失败（未 ignore 时）
# node packages/cli/dist/index.js fill ... --fail-on-warnings MISSING_FIELD

# 业务字段 + mapping
node packages/cli/dist/index.js fill examples/complex/template-complex.pdf examples/complex/data.business.json -o examples/complex/filled-business.pdf --mapping examples/complex/mapping.json

# 批量（JSON / CSV）
node packages/cli/dist/index.js batch examples/complex/template-complex.pdf examples/complex/rows.json -o examples/complex/out --pattern "{applicant.name}-{index}.pdf"
node packages/cli/dist/index.js batch examples/complex/template-complex.pdf examples/complex/rows.csv -o examples/complex/out-csv
node packages/cli/dist/index.js fill examples/complex/template-complex.pdf examples/complex/data.json -o examples/complex/filled-flat.pdf --flatten
```

### 中文数据

默认会自动处理 Unicode：

1. 在 Windows/macOS/Linux 上查找系统字体（如 `msyh.ttc`），嵌入后生成外观；
2. 若找不到字体，设置 `NeedAppearances` 并由阅读器渲染（不崩溃）。

```bash
npx pdffill fill examples/complex/template-complex.pdf examples/complex/data.zh.json -o examples/complex/filled-zh.pdf

# 指定字体
npx pdffill fill ... data.zh.json -o out.pdf --font "C:\Windows\Fonts\msyh.ttc"

# 或环境变量
set PDFFILL_FONT_PATH=C:\Windows\Fonts\msyh.ttc
```

