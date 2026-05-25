import { PDFBool, PDFName, type PDFForm } from "pdf-lib";

/** Ask PDF viewers to regenerate field appearances (needed for CJK without embedded font). */
export function setNeedAppearances(form: PDFForm, value = true): void {
  form.acroForm.dict.set(PDFName.of("NeedAppearances"), value ? PDFBool.True : PDFBool.False);
}
