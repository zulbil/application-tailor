import {
  generateResumePDF,
  generateResumeDOCX,
  generateResumeHTML,
  resumeTemplates,
  fontOptions,
  colorOptions,
  fontSizeOptions,
} from "../resumeGenerator";
import type { DocumentPort } from "./types";

/** Binds the concrete resume renderer to the DocumentPort interface. */
export function createDocumentAdapter(): DocumentPort {
  return {
    renderPdf: generateResumePDF,
    renderDocx: generateResumeDOCX,
    renderHtml: generateResumeHTML,
    catalog: () => ({
      templates: resumeTemplates,
      fonts: fontOptions,
      colors: colorOptions,
      fontSizes: fontSizeOptions,
    }),
  };
}
