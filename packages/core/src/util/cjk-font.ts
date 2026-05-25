import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { join } from "node:path";

const CANDIDATE_PATHS: Record<string, string[]> = {
  win32: [
    "C:\\Windows\\Fonts\\simhei.ttf",
    "C:\\Windows\\Fonts\\simsunb.ttf",
    "C:\\Windows\\Fonts\\msyh.ttc",
    "C:\\Windows\\Fonts\\msyhbd.ttc",
    "C:\\Windows\\Fonts\\simsun.ttc",
  ],
  darwin: [
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
  ],
  linux: [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc",
  ],
};

export async function resolveCjkFontBytes(
  fontPath?: string,
): Promise<Uint8Array | null> {
  const envPath = process.env.PDFFILL_FONT_PATH;
  const candidates = [
    fontPath,
    envPath,
    ...(CANDIDATE_PATHS[platform()] ?? []),
    join(homedir(), ".pdffill", "font.ttf"),
    join(homedir(), ".pdffill", "font.otf"),
    join(homedir(), ".pdffill", "font.ttc"),
  ].filter((p): p is string => Boolean(p));

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const buf = await readFile(path);
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    } catch {
      continue;
    }
  }
  return null;
}
