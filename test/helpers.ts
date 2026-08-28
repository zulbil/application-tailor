import express from "express";
import { createServer } from "http";
import type { RequestHandler } from "express";
import { registerRoutes } from "../server/routes";
import { MemoryStorage } from "./fakes/memory-storage";

export interface TestContext {
  storage: MemoryStorage;
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

export function createTestContext(): TestContext {
  const storage = new MemoryStorage();

  const build = async (isAuthenticated: RequestHandler) => {
    const app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    await registerRoutes(httpServer, app, {
      storage,
      setupAuth: async () => {},
      isAuthenticated,
    });
    return app;
  };

  return {
    storage,
    appAs: (userId: string) => build(passAuthAs(userId)),
    appAnon: () => build(rejectAuth),
  };
}

/** Seed a profile (and optional experiences) for `userId`, return the profile id. */
export async function seedProfile(
  storage: MemoryStorage,
  userId: string,
  overrides: Partial<Parameters<MemoryStorage["saveProfile"]>[1]> = {},
): Promise<string> {
  const { profile } = await storage.saveProfile(
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
    },
    [],
    [],
  );
  return profile.id;
}
