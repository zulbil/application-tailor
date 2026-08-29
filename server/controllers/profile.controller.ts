import type { ProfileService } from "../services";
import { asyncHandler } from "../http/async-handler";
import { getUserId, parseWith } from "../http/request";
import { saveProfileSchema } from "../http/schemas";
import { serializeProfileResponse } from "../views/profile.view";

export function createProfileController(service: ProfileService) {
  return {
    get: asyncHandler(async (req, res) => {
      const aggregate = await service.getProfile(getUserId(req));
      res.json(serializeProfileResponse(aggregate));
    }),

    save: asyncHandler(async (req, res) => {
      const input = parseWith(saveProfileSchema, req.body);
      const aggregate = await service.saveProfile(getUserId(req), input);
      res.json(serializeProfileResponse(aggregate));
    }),
  };
}
