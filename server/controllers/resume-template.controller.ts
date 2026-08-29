import type { DocumentPort } from "../services";
import { asyncHandler } from "../http/async-handler";

export function createResumeTemplateController(documents: DocumentPort) {
  return {
    list: asyncHandler(async (_req, res) => {
      res.json(documents.catalog());
    }),
  };
}
