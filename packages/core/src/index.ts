export {
  listFieldsFromBytes as listFields,
  doctorFromBytes as doctor,
  fillFormFromBytes as fillForm,
  readFillDataFromTemplate,
} from "./engine/pdf-lib-engine.js";

export { assertDoctorReady } from "./doctor-guard.js";

export type {
  FieldInfo,
  FieldType,
  FillData,
  FillOptions,
  FillResult,
  FillValue,
  DoctorReport,
  DoctorIssue,
  Warning,
  MissingStrategy,
  InputSource,
} from "./types.js";

export { PdfFillError, SchemaValidationError } from "./types.js";

export { validateDataAgainstSchema } from "./schema/validate.js";

export {
  scaffoldFillData,
  scaffoldJsonSchema,
  filterNonemptyPrefill,
  type ScaffoldOptions,
} from "./scaffold.js";

export {
  scaffoldBusinessBundle,
  scaffoldAll,
  scaffoldFromTemplate,
  pdfFieldToFlatBusinessKey,
  type BusinessScaffoldStyle,
  type BusinessScaffoldResult,
  type FullScaffoldResult,
} from "./scaffold-business.js";

export {
  REPORT_VERSION,
  buildFillReport,
  buildRunReport,
  buildBatchManifest,
  serializeBatchManifest,
  type OperationReport,
  type BatchManifestEntry,
  type ManifestFormat,
} from "./report.js";

export { parseFillDataInput } from "./parse-fill-data.js";

export {
  verifyFilledPdf,
  type VerifyResult,
  type VerifyMismatch,
} from "./verify.js";

export {
  applyFieldMapping,
  parseMappingFile,
  type FieldMapping,
} from "./mapping.js";

export { batchFill, type BatchRowResult, type BatchFillOptions } from "./batch.js";

export {
  parseRowsJson,
  parseRowsCsv,
  rowsToFillData,
  csvRowsToFillData,
} from "./parse-rows.js";

export {
  runPipeline,
  type PipelineOptions,
  type PipelineResult,
} from "./pipeline.js";

export {
  diffFields,
  diffFieldsWithMapping,
  type FieldDiffResult,
  type DiffFieldsOptions,
  type UnchangedField,
  type TypeMismatch,
  type MappingGap,
} from "./diff-fields.js";

export {
  parsePdffillConfig,
  mergePdffillConfig,
  type PdffillConfig,
} from "./config.js";

export {
  parseFailOnWarningsSpec,
  assertWarningsAllowed,
} from "./warnings.js";
