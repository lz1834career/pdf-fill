import { readFile } from "node:fs/promises";
import {
  mergePdffillConfig,
  parsePdffillConfig,
  type PdffillConfig,
} from "@pdffill/core";
import { readJson } from "./read-file.js";

export async function loadPdffillConfig(
  path?: string,
): Promise<PdffillConfig | undefined> {
  if (!path) return undefined;
  const raw = await readJson(path);
  return parsePdffillConfig(raw);
}

export function mergeConfig<T extends Record<string, unknown>>(
  config: PdffillConfig | undefined,
  cli: T,
): T & Partial<PdffillConfig> {
  if (!config) return cli;
  return mergePdffillConfig(config, cli);
}

export function resolveIgnoreFields(
  config: PdffillConfig | undefined,
  cliList?: string,
): string[] {
  if (cliList) {
    return cliList
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return config?.ignoreFields ?? [];
}

export function resolveMappingPath(
  config: PdffillConfig | undefined,
  cliPath?: string,
): string | undefined {
  return cliPath ?? config?.mapping;
}
