import type { ChallengeService } from "../services";
import { asyncHandler } from "../http/async-handler";
import { getUserId, parseWith } from "../http/request";
import { challengeSchema, acknowledgeChallengeSchema } from "../http/schemas";

export function createChallengeController(service: ChallengeService) {
  return {
    get: asyncHandler(async (req, res) => {
      res.json(await service.getCurrent(getUserId(req)));
    }),

    create: asyncHandler(async (req, res) => {
      const { goalCount } = parseWith(challengeSchema, req.body);
      res.json(await service.createOrUpdate(getUserId(req), goalCount));
    }),

    acknowledge: asyncHandler(async (req, res) => {
      const { challengeId } = parseWith(acknowledgeChallengeSchema, req.body);
      await service.acknowledge(challengeId);
      res.json({ success: true });
    }),
  };
}
