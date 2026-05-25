import type { PDFDocument, PDFFont, PDFForm } from "pdf-lib";
import type { FillData, Warning } from "../types.js";
import { resolveCjkFontBytes } from "./cjk-font.js";
import { setNeedAppearances } from "./need-appearances.js";
import { dataContainsUnicode } from "./unicode.js";

export interface AppearanceContext {
  usedCjkFont: boolean;
  saveUpdateFieldAppearances: boolean;
}

export async function applyFieldAppearances(
  doc: PDFDocument,
  form: PDFForm,
  data: FillData,
  options: {
    updateAppearances: boolean;
    fontPath?: string;
    flatten?: boolean;
  },
  warnings: Warning[],
): Promise<AppearanceContext> {
  if (!options.updateAppearances) {
    if (dataContainsUnicode(data as Record<string, unknown>)) {
      setNeedAppearances(form, true);
    }
    return { usedCjkFont: false, saveUpdateFieldAppearances: false };
  }

  const hasUnicode = dataContainsUnicode(data as Record<string, unknown>);

  if (!hasUnicode) {
    try {
      form.updateFieldAppearances();
    } catch {
      warnings.push({
        code: "APPEARANCE_UPDATE_FAILED",
        message:
          "updateFieldAppearances() failed; try --no-update-appearances or provide --font",
      });
      setNeedAppearances(form, true);
    }
    return { usedCjkFont: false, saveUpdateFieldAppearances: false };
  }

  const fontBytes = await resolveCjkFontBytes(options.fontPath);
  if (fontBytes) {
    try {
      const mod = await import("@pdf-lib/fontkit");
      const fontkit = mod.default ?? mod;
      doc.registerFontkit(fontkit);
      const font: PDFFont = await doc.embedFont(fontBytes, { subset: true });
      form.updateFieldAppearances(font);
      return { usedCjkFont: true, saveUpdateFieldAppearances: false };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push({
        code: "CJK_FONT_EMBED_FAILED",
        message: `Failed to embed CJK font: ${msg}`,
      });
    }
  } else {
    warnings.push({
      code: "CJK_FONT_NOT_FOUND",
      message:
        "Unicode text detected but no CJK font found. Set PDFFILL_FONT_PATH or use --font. Using NeedAppearances for viewer rendering.",
    });
  }

  setNeedAppearances(form, true);
  return { usedCjkFont: false, saveUpdateFieldAppearances: false };
}
