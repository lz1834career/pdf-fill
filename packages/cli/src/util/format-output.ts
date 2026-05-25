/**
 * Replace `{key}` placeholders using row data (string/number/boolean coerced to string).
 */
export function formatOutputPath(
  pattern: string,
  ctx: Record<string, string | number | boolean | undefined>,
  index: number,
): string {
  let out = pattern.replace(/\{index\}/g, String(index));
  for (const [key, value] of Object.entries(ctx)) {
    if (value === undefined) continue;
    out = out.replaceAll(`{${key}}`, String(value));
  }
  return out;
}
