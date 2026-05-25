import { writeFile } from "node:fs/promises";
import {
  serializeBatchManifest,
  type BatchManifestEntry,
  type ManifestFormat,
} from "@pdffill/core";

export async function writeJsonReport(
  path: string,
  data: unknown,
): Promise<void> {
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`Wrote report ${path}`);
}

export async function writeBatchManifest(
  path: string,
  entries: BatchManifestEntry[],
  format: ManifestFormat = "json",
): Promise<void> {
  await writeFile(path, serializeBatchManifest(entries, format), "utf8");
  console.log(`Wrote manifest ${path} (${format})`);
}
