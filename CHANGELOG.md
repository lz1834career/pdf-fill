# Changelog

## 0.6.0

### Added

- `--fail-on-warnings <codes>` on `fill` / `run` / `batch` — fail when warning codes match (`*` = any); config `failOnWarnings`
- `batch --diff` — per-row field diff before fill; `diff` on manifest entries
- Core: `parseFailOnWarningsSpec`, `assertWarningsAllowed` (`WARNINGS_NOT_ALLOWED`)
- Docs: [docs/API.md](docs/API.md), [docs/PUBLISHING.md](docs/PUBLISHING.md)

## 0.5.0

### Added

- `fill` / `run` `--diff` — field diff gate before fill; result included in `--report`
- `fill` / `run` `--compare-template` — with `--diff`, list values unchanged from template
- `batch --manifest-format jsonl` — one JSON object per line (default remains JSON array)
- Core: `serializeBatchManifest`, report `diff` field, `DIFF_FAILED` error code

## 0.4.0

### Added

- `pdffill diff` — compare template fields to `data.json` (missing / unknown / type / mapping gaps)
- `--config pdffill.json` on `fill`, `run`, `batch`, `diff` — project defaults (`ignoreFields`, `fontPath`, `mapping`, …)
- Core: `diffFields`, `diffFieldsWithMapping`, `parsePdffillConfig`, `mergePdffillConfig`

## 0.3.0

### Added

- `fill` / `run` `--report <path>` — JSON operation receipt (`ok`, `warnings`, `fieldsFilled`, `verify`, `durationMs`, …)
- `batch` `--manifest <path>` — per-row batch manifest JSON
- `scaffold --prefill-from-template` — seed `data.json` from non-empty template field values
- `fill` / `run` / `batch` `--ignore-fields` — skip `MISSING_FIELD` warnings for named PDF fields
- `fill` `--require-doctor` — doctor gate before fill
- Core: `readFillDataFromTemplate`, `scaffoldFromTemplate`, `assertDoctorReady`, `buildFillReport` / `buildRunReport`

## 0.2.0

### Added

- `pdffill run` — one-shot doctor → fill → verify
- `pdffill scaffold --with-mapping` — business JSON + mapping.json
- `pdffill batch --verify` — per-row verification
- `pdffill fill|batch --mapping` — business field mapping
- `pdffill batch` — JSON array / CSV bulk fill
- Chinese/Unicode fill via system font or `NeedAppearances` fallback
- `scaffold`, `verify`, `parseFillDataInput` array guard

### Fixed

- Crash on Chinese when `save()` re-ran `updateFieldAppearances` with Helvetica

## 0.1.0

- Initial: `list`, `doctor`, `fill` on pdf-lib (no pdftk)
