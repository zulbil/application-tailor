---
name: Headless PDF browser dependency
description: Why server-side PDF rendering uses Playwright Core with the Replit-provided Chromium binary.
---

Use Playwright Core with the system Chromium executable for server-side PDF rendering rather than a package that bundles browser-download tooling.

**Why:** The browser-download dependency chain carried unresolved archive and browser-manager advisories on Node 20, while patched Puppeteer releases required Node 22. The app already has Chromium supplied by its Replit environment, so downloading another browser is unnecessary.

**How to apply:** When changing PDF rendering or browser automation dependencies, preserve the system-executable launch path and verify both TypeScript types and an actual PDF render.