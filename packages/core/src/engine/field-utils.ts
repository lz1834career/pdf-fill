import {
  PDFCheckBox,
  PDFDropdown,
  PDFField,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
} from "pdf-lib";
import type { FieldInfo, FieldType } from "../types.js";

export function fieldTypeOf(field: PDFField): FieldType {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFRadioGroup) return "radio";
  if (field instanceof PDFDropdown) return "dropdown";
  if (field instanceof PDFOptionList) return "optionList";
  return "unknown";
}

export function describeField(field: PDFField): FieldInfo {
  const type = fieldTypeOf(field);
  const info: FieldInfo = {
    name: field.getName(),
    type,
    readOnly: field.isReadOnly(),
  };

  if (field instanceof PDFRadioGroup) {
    info.options = field.getOptions();
  } else if (field instanceof PDFDropdown) {
    info.options = field.getOptions();
  } else if (field instanceof PDFOptionList) {
    info.options = field.getOptions();
  } else if (field instanceof PDFCheckBox) {
    try {
      info.exportValues = ["Yes", "Off"];
    } catch {
      /* optional */
    }
  }

  return info;
}
