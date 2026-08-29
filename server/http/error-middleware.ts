import type { ErrorRequestHandler } from "express";
import { AppError } from "./errors";

/**
 * Terminal error handler. Registered after every route. Known `AppError`s are
 * returned with their status and message; everything else is logged and
 * reported as a generic 500 so internal details never reach the client.
 */
export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
};
