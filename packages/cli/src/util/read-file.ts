import { readFile } from "node:fs/promises";

export async function readBinary(path: string): Promise<Uint8Array> {
  const buf = await readFile(path);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

export async function readJson(path: string): Promise<Record<string, unknown>> {
  const text = await readFile(path, "utf8");
  return JSON.parse(text) as Record<string, unknown>;
}

export async function readJsonSchema(path: string): Promise<object> {
  return (await readJson(path)) as object;
}
