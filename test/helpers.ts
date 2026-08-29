import express from "express";
import { createServer } from "http";
import type { RequestHandler } from "express";
import { registerRoutes } from "../server/routes";
import { httpLogger } from "../server/http/http-logger";
import type { AiPort, DocumentPort } from "../server/services";
import { createMemoryRepositories, type MemoryRepositories } from "./fakes/repositories";

export interface TestContextOptions {
  ai?: Partial<AiPort>;
  documents?: Partial<DocumentPort>;
}

export interface TestContext {
  repositories: MemoryRepositories;
  /** Build an Express app whose requests are authenticated as `userId`. */
  appAs(userId: string): Promise<express.Express>;
  /** Build an Express app with no authenticated user (every route -> 401). */
  appAnon(): Promise<express.Express>;
}

const passAuthAs =
  (userId: string): RequestHandler =>
  (req, _res, next) => {
    (req as any).user = { claims: { sub: userId } };
    next();
  };

const rejectAuth: RequestHandler = (_req, res) => {
  res.status(401).json({ message: "Unauthorized" });
};

const notImplemented =
  (name: string) =>
  async () => {
    throw new Error(`AI port method '${name}' not stubbed in this test`);
  };

function stubAi(overrides: Partial<AiPort> = {}): AiPort {
  return {
    generateResume: overrides.generateResume ?? (notImplemented("generateResume") as AiPort["generateResume"]),
    generateCoverLetter:
      overrides.generateCoverLetter ?? (notImplemented("generateCoverLetter") as AiPort["generateCoverLetter"]),
    evaluateResumeRanking:
      overrides.evaluateResumeRanking ?? (notImplemented("evaluateResumeRanking") as AiPort["evaluateResumeRanking"]),
    analyzeJobFitGap:
      overrides.analyzeJobFitGap ?? (notImplemented("analyzeJobFitGap") as AiPort["analyzeJobFitGap"]),
  };
}

function stubDocuments(overrides: Partial<DocumentPort> = {}): DocumentPort {
  return {
    renderPdf: overrides.renderPdf ?? (async () => Buffer.from("pdf")),
    renderDocx: overrides.renderDocx ?? (async () => Buffer.from("docx")),
    renderHtml: overrides.renderHtml ?? (() => "<html></html>"),
    catalog: overrides.catalog ?? (() => ({ templates: [], fonts: [], colors: [], fontSizes: [] })),
  };
}

export function createTestContext(options: TestContextOptions = {}): TestContext {
  const repositories = createMemoryRepositories();
  const ai = stubAi(options.ai);
  const documents = stubDocuments(options.documents);

  const build = async (isAuthenticated: RequestHandler) => {
    const app = express();
    app.use(express.json());
    app.use(httpLogger);
    const httpServer = createServer(app);
    await registerRoutes(httpServer, app, {
      repositories,
      ai,
      documents,
      setupAuth: async () => {},
      isAuthenticated,
    });
    return app;
  };

  return {
    repositories,
    appAs: (userId: string) => build(passAuthAs(userId)),
    appAnon: () => build(rejectAuth),
  };
}

/** Seed a profile for `userId`, returning its id. */
export async function seedProfile(
  repositories: MemoryRepositories,
  userId: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const { profile } = await repositories.profiles.save(
    userId,
    {
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      phone: "555-0100",
      location: "Remote",
      headline: "Engineer",
      skills: "TypeScript, Node.js",
      ...overrides,
    } as any,
    [],
    [],
  );
  return profile.id;
}
