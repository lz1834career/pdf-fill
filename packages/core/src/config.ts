import type { MissingStrategy } from "./types.js";
import { PdfFillError } from "./types.js";
import { parseFailOnWarningsSpec } from "./warnings.js";

export interface PdffillConfig {
  ignoreFields?: string[];
  fontPath?: string;
  missing?: MissingStrategy;
  mapping?: string;
  flatten?: boolean;
  strict?: boolean;
  updateAppearances?: boolean;
  requireDoctor?: boolean;
  /** Warning codes that fail fill/run/batch (`*` = any). */
  failOnWarnings?: string[];
}

export function parsePdffillConfig(raw: unknown): PdffillConfig {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new PdfFillError(
      "Config file must be a JSON object",
      "INVALID_CONFIG",
    );
  }
  const o = raw as Record<string, unknown>;
  const config: PdffillConfig = {};

  if (o.ignoreFields !== undefined) {
    if (!Array.isArray(o.ignoreFields)) {
      throw new PdfFillError("ignoreFields must be an array of strings", "INVALID_CONFIG");
    }
    config.ignoreFields = o.ignoreFields.map(String);
  }

  if (o.fontPath !== undefined) {
    if (typeof o.fontPath !== "string") {
      throw new PdfFillError("fontPath must be a string", "INVALID_CONFIG");
    }
    config.fontPath = o.fontPath;
  }

  if (o.mapping !== undefined) {
    if (typeof o.mapping !== "string") {
      throw new PdfFillError("mapping must be a path string", "INVALID_CONFIG");
    }
    config.mapping = o.mapping;
  }

  if (o.missing !== undefined) {
    if (o.missing !== "skip" && o.missing !== "error") {
      throw new PdfFillError('missing must be "skip" or "error"', "INVALID_CONFIG");
    }
    config.missing = o.missing;
  }

  if (o.failOnWarnings !== undefined) {
    if (!Array.isArray(o.failOnWarnings)) {
      throw new PdfFillError("failOnWarnings must be an array of strings", "INVALID_CONFIG");
    }
    config.failOnWarnings = parseFailOnWarningsSpec(
      o.failOnWarnings.map(String),
    );
  }

  for (const key of ["flatten", "strict", "updateAppearances", "requireDoctor"] as const) {
    if (o[key] !== undefined) {
      if (typeof o[key] !== "boolean") {
        throw new PdfFillError(`${key} must be a boolean`, "INVALID_CONFIG");
      }
      config[key] = o[key] as boolean;
    }
  }

  return config;
}

/** CLI flags override config file values. */
export function mergePdffillConfig<T extends Record<string, unknown>>(
  config: PdffillConfig,
  cli: T,
): T & PdffillConfig {
  const merged = { ...config, ...cli } as T & PdffillConfig;
  if (cli.ignoreFields !== undefined) {
    merged.ignoreFields = cli.ignoreFields as string[];
  } else if (config.ignoreFields) {
    merged.ignoreFields = config.ignoreFields;
  }
  if (cli.failOnWarnings !== undefined) {
    merged.failOnWarnings =
      typeof cli.failOnWarnings === "string"
        ? parseFailOnWarningsSpec(cli.failOnWarnings)
        : (cli.failOnWarnings as string[]);
  } else if (config.failOnWarnings) {
    merged.failOnWarnings = config.failOnWarnings;
  }
  return merged;
}
