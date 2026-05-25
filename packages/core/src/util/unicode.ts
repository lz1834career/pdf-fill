/** True if text cannot be encoded with pdf-lib default WinAnsi (Helvetica) appearances. */
export function needsUnicodeFont(text: string): boolean {
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    // WinAnsi covers 0x20–0xFF with gaps; CJK and most non-Latin are outside.
    if (cp > 0xff) return true;
  }
  return false;
}

export function dataContainsUnicode(data: Record<string, unknown>): boolean {
  for (const v of Object.values(data)) {
    if (typeof v === "string" && needsUnicodeFont(v)) return true;
  }
  return false;
}
