/**
 * Runs before any test module is imported. Provides the environment that
 * `server/config.ts` validates at import time so that importing server modules
 * in tests never throws on missing configuration. No real service is contacted.
 */
process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.SESSION_SECRET ??= "test-session-secret";
process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ??= "https://ai.example.test/v1";
process.env.AI_INTEGRATIONS_OPENAI_API_KEY ??= "test-ai-key";
process.env.REPL_ID ??= "test-repl-id";
