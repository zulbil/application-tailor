import type { ErrorRequestHandler } from "express";
import { AppError } from "./errors";
import { logger } from "../lib/logger";

/**
 * Terminal error handler. Registered after every route. Known `AppError`s are
 * returned with their status and message; everything else is logged with the
 * request-scoped logger and reported as a generic 500 so internal details never
 * reach the client.
 */
export const errorMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  const log = (req as unknown as { log?: typeof logger }).log ?? logger;
  log.error({ err }, "unhandled error");
  res.status(500).json({ error: "Internal server error" });
};
