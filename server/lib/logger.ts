import pino, { type LoggerOptions } from "pino";
import { config, isProduction, isTest } from "../config";

function resolveLevel(): string {
  if (config.LOG_LEVEL) return config.LOG_LEVEL;
  if (isTest) return "silent";
  return isProduction ? "info" : "debug";
}

const options: LoggerOptions = {
  level: resolveLevel(),
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      'req.headers["x-forwarded-for"]',
      "res.headers['set-cookie']",
    ],
    remove: true,
  },
};

// Pretty output for local development; production emits newline-delimited JSON
// straight to stdout so the platform's log pipeline can parse it.
if (!isProduction && !isTest) {
  options.transport = {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
  };
}

/** Process-wide root logger. Prefer `req.log` inside request handlers. */
export const logger = pino(options);

/** A child logger tagged with a module name, for code outside the request path. */
export const moduleLogger = (name: string) => logger.child({ module: name });
