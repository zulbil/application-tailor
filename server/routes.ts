import { Router, type Express, type RequestHandler } from "express";
import { type Server } from "http";
import type { Repositories } from "./repositories/types";
import type { AiPort, DocumentPort } from "./services";
import { createServices } from "./services";
import { errorMiddleware } from "./http/error-middleware";
import { createAuthController } from "./controllers/auth.controller";
import { createProfileController } from "./controllers/profile.controller";
import { createApplicationController } from "./controllers/application.controller";
import { createGenerationController } from "./controllers/generation.controller";
import { createExportController } from "./controllers/export.controller";
import { createChallengeController } from "./controllers/challenge.controller";
import { createResumeTemplateController } from "./controllers/resume-template.controller";

export interface RegisterRoutesDeps {
  repositories: Repositories;
  ai: AiPort;
  documents: DocumentPort;
  setupAuth: (app: Express) => Promise<void>;
  isAuthenticated: RequestHandler;
}

/**
 * Wires the HTTP layer: resolves dependencies (real ones lazily so tests can
 * inject fakes without a DB), builds the service graph, mounts controllers on
 * an authenticated `/api` router, and installs the terminal error handler.
 */
export async function registerRoutes(
  httpServer: Server,
  app: Express,
  deps: Partial<RegisterRoutesDeps> = {},
): Promise<Server> {
  const repositories =
    deps.repositories ?? (await import("./repositories")).createRepositories();
  const ai = deps.ai ?? (await import("./services/ai.adapter")).createAiAdapter();
  const documents =
    deps.documents ?? (await import("./services/document.adapter")).createDocumentAdapter();
  const setupAuth = deps.setupAuth ?? (await import("./replitAuth")).setupAuth;
  const isAuthenticated =
    deps.isAuthenticated ?? (await import("./replitAuth")).isAuthenticated;

  await setupAuth(app);

  const services = createServices({ repositories, ai, documents });

  const auth = createAuthController(repositories.users);
  const profile = createProfileController(services.profile);
  const applications = createApplicationController(services.application);
  const generation = createGenerationController(services.generation);
  const exports = createExportController(services.export);
  const challenge = createChallengeController(services.challenge);
  const templates = createResumeTemplateController(documents);

  const api = Router();
  api.use(isAuthenticated);

  api.get("/auth/user", auth.getUser);

  api.get("/profile", profile.get);
  api.post("/profile", profile.save);
  api.get("/profile/export.pdf", exports.profilePdf);
  api.get("/profile/export.docx", exports.profileDocx);

  api.post("/generate-resume", generation.resumeForProfile);
  api.post("/generate-cover-letter", generation.coverLetterForProfile);
  api.post("/analyze-gap", generation.analyzeGap);

  api.get("/applications", applications.list);
  api.post("/applications", applications.create);
  api.get("/applications/:id", applications.get);
  api.post("/applications/:id/generate", generation.forApplication);
  api.patch("/applications/:id/status", applications.updateStatus);
  api.delete("/applications/:id", applications.remove);
  api.patch("/applications/:id/settings", applications.updateSettings);
  api.patch("/applications/:id/content", applications.updateContent);
  api.post("/applications/:id/ranking", generation.evaluateRanking);
  api.get("/applications/:id/ranking", generation.getRanking);
  api.get("/applications/:id/resume.pdf", exports.applicationPdf);
  api.get("/applications/:id/resume.docx", exports.applicationDocx);
  api.get("/applications/:id/resume-preview", exports.applicationPreview);

  api.get("/resume-templates", templates.list);

  api.get("/challenge", challenge.get);
  api.post("/challenge", challenge.create);
  api.post("/challenge/acknowledge", challenge.acknowledge);

  app.use("/api", api);
  app.use(errorMiddleware);

  return httpServer;
}
