import type { ApplicationService } from "../services";
import { asyncHandler } from "../http/async-handler";
import { getUserId, parseWith } from "../http/request";
import {
  createApplicationSchema,
  updateStatusSchema,
  resumeSettingsSchema,
  updateContentSchema,
} from "../http/schemas";

export function createApplicationController(service: ApplicationService) {
  return {
    list: asyncHandler(async (req, res) => {
      res.json(await service.list(getUserId(req)));
    }),

    get: asyncHandler(async (req, res) => {
      res.json(await service.get(getUserId(req), req.params.id));
    }),

    create: asyncHandler(async (req, res) => {
      const input = parseWith(createApplicationSchema, req.body);
      res.json(await service.create(getUserId(req), input));
    }),

    updateStatus: asyncHandler(async (req, res) => {
      const { status } = parseWith(updateStatusSchema, req.body);
      res.json(await service.updateStatus(getUserId(req), req.params.id, status));
    }),

    remove: asyncHandler(async (req, res) => {
      await service.remove(getUserId(req), req.params.id);
      res.json({ success: true });
    }),

    updateSettings: asyncHandler(async (req, res) => {
      const settings = parseWith(resumeSettingsSchema, req.body);
      res.json(await service.updateSettings(getUserId(req), req.params.id, settings));
    }),

    updateContent: asyncHandler(async (req, res) => {
      const patch = parseWith(updateContentSchema, req.body);
      res.json(await service.updateContent(getUserId(req), req.params.id, patch));
    }),
  };
}
