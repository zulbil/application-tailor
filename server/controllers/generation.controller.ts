import type { GenerationService } from "../services";
import { asyncHandler } from "../http/async-handler";
import { getUserId, parseWith } from "../http/request";
import { generateForProfileSchema, generateForApplicationSchema } from "../http/schemas";

export function createGenerationController(service: GenerationService) {
  return {
    resumeForProfile: asyncHandler(async (req, res) => {
      const input = parseWith(generateForProfileSchema, req.body);
      res.json(await service.resumeForProfile(getUserId(req), input));
    }),

    coverLetterForProfile: asyncHandler(async (req, res) => {
      const input = parseWith(generateForProfileSchema, req.body);
      res.json(await service.coverLetterForProfile(getUserId(req), input));
    }),

    analyzeGap: asyncHandler(async (req, res) => {
      const input = parseWith(generateForProfileSchema, req.body);
      res.json(await service.analyzeGap(getUserId(req), input));
    }),

    forApplication: asyncHandler(async (req, res) => {
      const input = parseWith(generateForApplicationSchema, req.body);
      res.json(await service.generateForApplication(getUserId(req), req.params.id, input));
    }),

    evaluateRanking: asyncHandler(async (req, res) => {
      res.json(await service.evaluateRanking(getUserId(req), req.params.id));
    }),

    getRanking: asyncHandler(async (req, res) => {
      res.json(await service.getCachedRanking(getUserId(req), req.params.id));
    }),
  };
}
