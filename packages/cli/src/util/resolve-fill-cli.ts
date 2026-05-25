import {
  parseFailOnWarningsSpec,
  type MissingStrategy,
  type PdffillConfig,
} from "@pdffill/core";
import { resolveIgnoreFields, resolveMappingPath } from "./config.js";

export interface FillCliFlags {
  config?: string;
  mapping?: string;
  ignoreFields?: string;
  flatten?: boolean;
  strict?: boolean;
  missing?: string;
  updateAppearances?: boolean;
  font?: string;
  requireDoctor?: boolean;
  skipDoctor?: boolean;
  failOnWarnings?: string;
}

export interface ResolvedFillCli {
  mappingPath?: string;
  ignoreFields: string[];
  flatten: boolean;
  strict: boolean;
  missing: MissingStrategy;
  updateAppearances: boolean;
  fontPath?: string;
  requireDoctor: boolean;
  skipDoctor: boolean;
  failOnWarnings?: string[];
}

export function resolveFillCli(
  opts: FillCliFlags,
  fileConfig?: PdffillConfig,
): ResolvedFillCli {
  const missingRaw = opts.missing ?? fileConfig?.missing ?? "skip";
  return {
    mappingPath: resolveMappingPath(fileConfig, opts.mapping),
    ignoreFields: resolveIgnoreFields(fileConfig, opts.ignoreFields),
    flatten: opts.flatten ?? fileConfig?.flatten ?? false,
    strict: opts.strict ?? fileConfig?.strict ?? false,
    missing: missingRaw === "error" ? "error" : "skip",
    updateAppearances:
      opts.updateAppearances === false
        ? false
        : fileConfig?.updateAppearances === false
          ? false
          : true,
    fontPath: opts.font ?? fileConfig?.fontPath,
    requireDoctor: opts.requireDoctor ?? fileConfig?.requireDoctor ?? false,
    skipDoctor: opts.skipDoctor ?? false,
    failOnWarnings:
      parseFailOnWarningsSpec(opts.failOnWarnings) ??
      fileConfig?.failOnWarnings,
  };
}
