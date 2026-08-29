import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async route handler so a rejected promise is forwarded to Express's
 * error pipeline instead of becoming an unhandled rejection. Lets controllers
 * be written without try/catch.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
