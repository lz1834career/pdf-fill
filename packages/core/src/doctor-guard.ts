import { doctorFromBytes } from "./engine/pdf-lib-engine.js";
import type { DoctorReport } from "./types.js";
import { PdfFillError } from "./types.js";
import { toUint8Array } from "./util/load-bytes.js";

/** Run doctor and throw if the template is not fill-ready. */
export async function assertDoctorReady(
  template: Uint8Array | ArrayBuffer,
): Promise<DoctorReport> {
  const report = await doctorFromBytes(toUint8Array(template));
  const blocking = report.issues.find(
    (i) =>
      i.level === "error" ||
      i.code === "NO_ACROFORM" ||
      i.code === "NO_FIELDS",
  );
  if (!report.ok || blocking) {
    throw new PdfFillError(
      blocking?.message ?? "Template failed doctor check",
      blocking?.code ?? "DOCTOR_FAILED",
    );
  }
  return report;
}
