import type { UserRepository } from "../repositories/types";
import { asyncHandler } from "../http/async-handler";
import { getUserId } from "../http/request";

export function createAuthController(users: UserRepository) {
  return {
    getUser: asyncHandler(async (req, res) => {
      const user = await users.findById(getUserId(req));
      res.json(user);
    }),
  };
}
