import { describe, it, expect } from "vitest";
import { parseConfig } from "../server/config";

const validEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  SESSION_SECRET: "secret",
  AI_INTEGRATIONS_OPENAI_BASE_URL: "https://ai.example.test/v1",
  AI_INTEGRATIONS_OPENAI_API_KEY: "key",
  REPL_ID: "repl",
} satisfies NodeJS.ProcessEnv;

describe("parseConfig", () => {
  it("accepts a complete environment and applies defaults", () => {
    const cfg = parseConfig({ ...validEnv, PORT: undefined });
    expect(cfg.PORT).toBe(5000);
    expect(cfg.ISSUER_URL).toBe("https://replit.com/oidc");
  });

  it("coerces PORT to a number", () => {
    expect(parseConfig({ ...validEnv, PORT: "8080" }).PORT).toBe(8080);
  });

  it.each([
    "DATABASE_URL",
    "SESSION_SECRET",
    "AI_INTEGRATIONS_OPENAI_API_KEY",
    "REPL_ID",
  ] as const)("throws when %s is missing, naming it", (key) => {
    const env = { ...validEnv, [key]: undefined };
    expect(() => parseConfig(env)).toThrow(new RegExp(key));
  });

  it("rejects a non-URL AI base URL", () => {
    expect(() => parseConfig({ ...validEnv, AI_INTEGRATIONS_OPENAI_BASE_URL: "not-a-url" })).toThrow(
      /AI_INTEGRATIONS_OPENAI_BASE_URL/,
    );
  });
});
