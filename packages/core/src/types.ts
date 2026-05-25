export type FieldType =
  | "text"
  | "checkbox"
  | "radio"
  | "dropdown"
  | "optionList"
  | "button"
  | "unknown";

export type FillValue = string | number | boolean;

export type FillData = Record<string, FillValue>;

export type MissingStrategy = "skip" | "error";

export interface FieldInfo {
  name: string;
  type: FieldType;
  readOnly: boolean;
  options?: string[];
  exportValues?: string[];
}

export type IssueLevel = "error" | "warn" | "info";

export interface DoctorIssue {
  level: IssueLevel;
  code: string;
  message: string;
}

export interface DoctorReport {
  ok: boolean;
  encrypted: boolean;
  hasXFA: boolean;
  fieldCount: number;
  issues: DoctorIssue[];
}

export interface Warning {
  code: string;
  message: string;
  field?: string;
}

export interface FillOptions {
  flatten?: boolean;
  strict?: boolean;
  missing?: MissingStrategy;
  /** Default true. When false, sets NeedAppearances for Unicode if needed. */
  updateAppearances?: boolean;
  /** Path to .ttf/.otf/.ttc supporting Chinese (overrides PDFFILL_FONT_PATH). */
  fontPath?: string;
  schema?: object;
  /** PDF field names to skip when reporting MISSING_FIELD. */
  ignoreFields?: string[];
  /** Run doctor before fill; throws if template is not fill-ready. */
  requireDoctor?: boolean;
  /** Warning codes that cause fill to fail (`*` = any warning). */
  failOnWarnings?: string[];
}

export interface FillResult {
  pdf: Uint8Array;
  fieldsFilled: string[];
  warnings: Warning[];
}

export interface InputSource {
  input: Uint8Array | ArrayBuffer;
}

export class PdfFillError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "PdfFillError";
  }
}

export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: unknown,
  ) {
    super(message);
    this.name = "SchemaValidationError";
  }
}
