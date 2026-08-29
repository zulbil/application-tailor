import { z } from "zod";

/**
 * Centralized, validated configuration.
 *
 * Every environment variable the server depends on is parsed here exactly once,
 * at import time. A misconfigured deployment fails immediately with a message
 * naming the missing/invalid variable, instead of failing lazily on the first
 * request that happens to need it.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(5000),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Sessions
  SESSION_SECRET: z.string().min(1, "SESSION_SECRET is required"),

  // Replit AI Integrations (OpenAI-compatible)
  AI_INTEGRATIONS_OPENAI_BASE_URL: z
    .string()
    .url("AI_INTEGRATIONS_OPENAI_BASE_URL must be a URL"),
  AI_INTEGRATIONS_OPENAI_API_KEY: z
    .string()
    .min(1, "AI_INTEGRATIONS_OPENAI_API_KEY is required"),
  AI_MODEL: z.string().min(1).default("gpt-4o"),

  // Logging
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
    .optional(),

  // Replit auth (OIDC)
  REPL_ID: z.string().min(1, "REPL_ID is required"),
  ISSUER_URL: z.string().url().default("https://replit.com/oidc"),
});

export type AppConfig = z.infer<typeof envSchema>;

/**
 * Parse an env-like object into a validated config. Throws with a message that
 * names every offending variable. Exported for tests; the app uses `config`.
 */
export function parseConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return Object.freeze(parsed.data);
}

export const config = parseConfig();

export const isProduction = config.NODE_ENV === "production";
export const isTest = config.NODE_ENV === "test";
