import { assertDoctorReady } from "./doctor-guard.js";
import type { DoctorReport, FillData, FillOptions, FillResult } from "./types.js";
import { PdfFillError } from "./types.js";
import { fillFormFromBytes } from "./engine/pdf-lib-engine.js";
import { verifyFilledPdf, type VerifyResult } from "./verify.js";
import { toUint8Array } from "./util/load-bytes.js";

export interface PipelineOptions extends FillOptions {
  /** Skip doctor check (not recommended). */
  skipDoctor?: boolean;
  /** Run verify after fill. Default true. */
  verify?: boolean;
}

export interface PipelineResult {
  fill: FillResult;
  verify?: VerifyResult;
  doctor?: DoctorReport;
  doctorOk: boolean;
}

/**
 * doctor → fill → optional verify in one call.
 */
export async function runPipeline(
  template: Uint8Array | ArrayBuffer,
  data: FillData,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const { skipDoctor = false, verify = true, ...fillOpts } = options;
  const bytes = toUint8Array(template);

  let doctorReport: DoctorReport | undefined;
  if (!skipDoctor) {
    doctorReport = await assertDoctorReady(bytes);
  }

  const fill = await fillFormFromBytes(bytes, data, fillOpts);

  let verifyResult: VerifyResult | undefined;
  if (verify) {
    verifyResult = await verifyFilledPdf(fill.pdf, data);
    if (!verifyResult.ok) {
      throw new PdfFillError(
        `Verify failed: ${verifyResult.mismatches.length} mismatch(es), ${verifyResult.missingInPdf.length} missing in PDF`,
        "VERIFY_FAILED",
      );
    }
  }

  return {
    fill,
    verify: verifyResult,
    doctor: doctorReport,
    doctorOk: !skipDoctor,
  };
}
