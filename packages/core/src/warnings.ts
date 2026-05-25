import type { Warning } from "./types.js";
import { PdfFillError } from "./types.js";

/**
 * Parse `--fail-on-warnings` or config `failOnWarnings`.
 * Use `*` or `all` to fail on any warning.
 */
export function parseFailOnWarningsSpec(
  spec?: string | string[],
): string[] | undefined {
  if (spec === undefined) return undefined;
  const list = (
    Array.isArray(spec) ? spec : spec.split(",")
  )
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return undefined;
  if (list.includes("*") || list.includes("all")) return ["*"];
  return list;
}

/** Throw if any warning matches the fail-on codes. */
export function assertWarningsAllowed(
  warnings: Warning[],
  failOn?: string[],
): void {
  if (!failOn?.length || warnings.length === 0) return;

  const matchAll = failOn.includes("*") || failOn.includes("all");
  const failing = warnings.filter(
    (w) => matchAll || failOn.includes(w.code),
  );
  if (failing.length === 0) return;

  const codes = [...new Set(failing.map((w) => w.code))];
  throw new PdfFillError(
    `Fill produced ${failing.length} warning(s) matching fail-on: ${codes.join(", ")}`,
    "WARNINGS_NOT_ALLOWED",
  );
}
