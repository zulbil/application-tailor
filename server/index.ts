import express from "express";
import { createServer } from "http";
import { config, isProduction } from "./config";
import { logger } from "./lib/logger";
import { httpLogger } from "./http/http-logger";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));
app.use(httpLogger);

(async () => {
  // registerRoutes mounts all /api routes and the terminal error handler.
  await registerRoutes(httpServer, app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (isProduction) {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  httpServer.listen(
    { port: config.PORT, host: "0.0.0.0", reusePort: true },
    () => logger.info({ port: config.PORT, env: config.NODE_ENV }, "server listening"),
  );
})();
