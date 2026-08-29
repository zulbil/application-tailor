import { randomUUID } from "crypto";
import { pinoHttp } from "pino-http";
import { logger } from "../lib/logger";

/**
 * Per-request logging. Attaches `req.log` (a child logger carrying the request
 * id) and `req.id`, echoes the id back as `x-request-id`, and logs one line per
 * completed request. Only `/api` traffic is logged — static/SPA/HMR requests
 * are ignored, matching the app's prior behaviour.
 */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers["x-request-id"];
    const id = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, _res, err) => `${req.method} ${req.url} failed: ${err.message}`,
  autoLogging: {
    ignore: (req) => !req.url || !req.url.startsWith("/api"),
  },
});
