import type { Response } from "express";
import type { ExportService } from "../services";
import type { RenderedDocument } from "../services/export.service";
import { asyncHandler } from "../http/async-handler";
import { getUserId } from "../http/request";

function sendDocument(res: Response, doc: RenderedDocument) {
  res.setHeader("Content-Type", doc.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${doc.filename}"`);
  res.send(doc.buffer);
}

export function createExportController(service: ExportService) {
  return {
    applicationPdf: asyncHandler(async (req, res) => {
      sendDocument(res, await service.applicationPdf(getUserId(req), req.params.id));
    }),

    applicationDocx: asyncHandler(async (req, res) => {
      sendDocument(res, await service.applicationDocx(getUserId(req), req.params.id));
    }),

    applicationPreview: asyncHandler(async (req, res) => {
      const html = await service.applicationPreviewHtml(getUserId(req), req.params.id);
      res.setHeader("Content-Type", "text/html");
      res.send(html);
    }),

    profilePdf: asyncHandler(async (req, res) => {
      sendDocument(res, await service.profilePdf(getUserId(req)));
    }),

    profileDocx: asyncHandler(async (req, res) => {
      sendDocument(res, await service.profileDocx(getUserId(req)));
    }),
  };
}
