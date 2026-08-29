import type { Request } from "express";
import type { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { UnauthorizedError, ValidationError } from "./errors";

/**
 * The authenticated subject id. `isAuthenticated` guarantees `req.user`, but we
 * fail closed with 401 rather than trust it.
 */
export function getUserId(req: Request): string {
  const sub = (req as any).user?.claims?.sub;
  if (typeof sub !== "string" || sub.length === 0) {
    throw new UnauthorizedError();
  }
  return sub;
}

/** Parse `data` with a Zod schema, or throw a 400 with a readable message. */
export function parseWith<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(fromZodError(result.error).message);
  }
  return result.data;
}
