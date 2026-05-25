import type { PDFDocument } from "pdf-lib";
import type { FillValue } from "../types.js";

export function readFieldValue(
  form: ReturnType<PDFDocument["getForm"]>,
  name: string,
  type: string,
): FillValue | null {
  try {
    if (type === "checkbox") {
      return form.getCheckBox(name).isChecked();
    }
    if (type === "radio") {
      const v = form.getRadioGroup(name).getSelected();
      if (v === undefined) return null;
      const sel = Array.isArray(v) ? v[0] : v;
      return sel ?? null;
    }
    if (type === "dropdown") {
      const v = form.getDropdown(name).getSelected();
      if (v === undefined) return null;
      const sel = Array.isArray(v) ? v[0] : v;
      return sel ?? null;
    }
    return form.getTextField(name).getText() ?? "";
  } catch {
    return null;
  }
}
