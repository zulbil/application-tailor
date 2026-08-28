# Refactor Plan — Apply4Me

A staged plan to move Apply4Me from a working Replit prototype to a maintainable,
secure, and scalable codebase. Stages are ordered by **risk if left alone ×
cheapness/reversibility of the fix**: security first, then a safety net, then
cheap structural wins, then hardening the core (the AI layer), then scaling
decisions, and finally the one-way-door changes (schema, auth).

---

## How to read this document

Each phase lists **items**, each with:

- **Why** — the force driving the change (risk, cost, change-frequency, latency).
- **What** — the concrete change.
- **Done when** — an observable acceptance check.
- **Reversibility** — `reversible` (do it fast) or `one-way` (decide deliberately).

Progress is tracked with checkboxes. Keep this file updated as work lands.

---

## Phase 0 — Safety net (IN PROGRESS)

> Goal: stop the bleeding and build the net that makes every later phase safe.

- [x] **0.1 Fix the IDOR on application routes** — `one-way` risk, `reversible` fix
  - **Why:** Every `/api/applications/:id*` route fetches by ID with no check
    that the row belongs to the caller. Any authenticated user can read, mutate,
    or delete another user's applications, resumes, and cover letters. This is a
    personal-data leak.
  - **What:** A single `loadOwnedApplication(userId, id)` helper used by all 11
    `:id` routes (`GET`, `generate`, `status`, `delete`, `settings`, `content`,
    `ranking` ×2, `resume.pdf`, `resume.docx`, `resume-preview`). Returns 404 on
    a mismatch (not 403 — don't confirm existence).
  - **Done when:** an integration test proves user B gets 404 on user A's
    application for read, update, delete, and export.

- [x] **0.2 Test harness + regression tests** — `reversible`
  - **Why:** Nothing below is safe to attempt without tests.
  - **What:** `vitest` + `supertest`. An in-memory `IStorage` implementation
    (`test/fakes/memory-storage.ts`) so route tests need no database or network.
    A `deps` seam on `registerRoutes(httpServer, app, deps?)` to inject
    `storage`, `setupAuth`, and `isAuthenticated` (defaults are the real
    implementations, loaded lazily — production behavior is unchanged).
  - **Done when:** `npm test` runs green and covers: authorization (0.1),
    profile save round-trip, application create/list, and env-config validation.

- [x] **0.3 Validate configuration at boot** — `reversible`
  - **Why:** Only `DATABASE_URL` is checked today; `SESSION_SECRET`, the AI keys
    and `REPL_ID` fail lazily with `!` assertions on the first request that needs
    them. A misconfigured deploy should fail loudly at startup.
  - **What:** `server/config.ts` — parse `process.env` with Zod once, export a
    typed frozen object. Replace `process.env.X!` in `replitAuth.ts`,
    `storage.ts`, `index.ts`, and `openai.ts`.
  - **Done when:** booting without a required var exits non-zero with a message
    naming the missing var; a unit test asserts the parser rejects a bad env.

- [x] **0.4 Lazy-init the OpenAI client** — `reversible`
  - **Why:** `new OpenAI()` runs at module load in `openai.ts`; a missing key
    crashes any import of the module (including tests and tooling).
  - **What:** Construct the client on first use behind `getOpenAI()`.
  - **Done when:** importing `server/openai.ts` with no AI env set does not throw.

---

## Phase 1 — Structural cleanup (reversible, high leverage)

> Goal: make the codebase changeable. No behavior changes.

- [ ] **1.1 Split `routes.ts` (950 lines) into feature routers**
  - `routes/profile.ts`, `routes/applications.ts`, `routes/generation.ts`,
    `routes/challenge.ts`, `routes/export.ts`, `routes/index.ts` to compose them.
  - **Done when:** no route file exceeds ~200 lines; `registerRoutes` just wires.

- [ ] **1.2 Introduce a service layer**
  - **Why:** Business logic (orchestration, the profile→AI-input mapping that is
    copy-pasted ~5×) lives inline in handlers.
  - **What:** `services/profile.ts`, `services/application.ts`,
    `services/generation.ts`. Handlers do: validate input → call service → shape
    response. One `toAiProfile(profileData)` mapper replaces all copies.
  - **Done when:** handlers contain no `db`/`storage` orchestration beyond a
    single service call; the mapper exists once.

- [ ] **1.3 Centralized error handling**
  - **What:** `asyncHandler` wrapper; typed errors (`NotFoundError`,
    `ValidationError`, `ForbiddenError`); one Express error middleware that maps
    them to status + body. Remove per-handler try/catch.
  - **Done when:** no route handler contains `try/catch`; error shapes are
    identical to today (asserted by tests).

- [ ] **1.4 Structured logging**
  - **What:** `pino` (or similar). Request-id middleware. Replace `console.*`.
  - **Done when:** every log line is JSON with a request id; no bare `console.`
    in `server/`.

- [ ] **1.5 Client data layer consolidation**
  - **Why:** `lib/api.ts` hand-rolls ~25 `fetch` calls with duplicated error
    handling and ignores the existing `apiRequest`/`getQueryFn` helpers.
  - **What:** Route everything through `apiRequest`. One `hooks/use-<resource>.ts`
    per resource owning its query keys + invalidations. Reconsider the global
    `staleTime: Infinity`.
  - **Done when:** `lib/api.ts` has no raw `fetch`; mutations invalidate via
    their hook, not ad hoc.

- [ ] **1.6 Break up `job-application.tsx` (1,413 lines)**
  - Into `JobInputForm`, `GenerationPanel`, `ResumePreview`, `DesignControls`,
    `RankingCard`, `ExportMenu`, each with its own state and hooks.
  - **Done when:** no page/component file exceeds ~300 lines.

---

## Phase 2 — Harden the AI layer (the core of the product)

> Goal: make generation cheap to change, cheap to reason about, and reliable.

- [ ] **2.1 One `ai/` module with a provider interface**
  - `interface LlmClient { completeJson<T>({ system, user, schema, timeoutMs }): Promise<T> }`
  - Model name and provider become config, not literals in 4 places.

- [ ] **2.2 Zod-validate every LLM response**
  - Replace the hand-rolled `if (!parsed.logline ...)` fallbacks with schema
    parsing. On failure: one bounded retry with a "your output was invalid" nudge,
    then fail loudly. Use the provider's JSON-schema / structured-output mode.

- [ ] **2.3 Timeouts, one bounded retry, input caps**
  - Refuse/truncate job descriptions over a token budget (today the `.slice()`
    limits are inconsistent: 1500 vs 2000 vs none). Make it one policy.

- [ ] **2.4 Move prompts out of `.ts` into `ai/prompts/*.md`**
  - A tiny render function. Prompt iteration should not be a logic diff.

- [ ] **2.5 Instrument AI calls**
  - Log latency, model, prompt/completion tokens, cost estimate, outcome.
  - **Done when:** a dashboard/log query can answer "what did generation cost
    yesterday".

- [ ] **2.6 Rate-limit the AI endpoints** (`express-rate-limit`, per user).

---

## Phase 3 — Long-running work & document rendering

> Goal: decide the concurrency model, then stop Puppeteer from taking down the
> process. **Pick 3.1 first — it drives the rest.**

- [ ] **3.1 Decide sync vs async generation** — `one-way`
  - Personal/small scale: keep synchronous, add a hard timeout, a loading state,
    and make `generate` idempotent via a `generationStatus` column.
  - Multi-user: job queue (`pg-boss` / BullMQ), `202 + jobId`, poll or SSE.

- [ ] **3.2 Get Puppeteer out of the request path**
  - Shared browser instance / pool instead of launch-per-request; or a dedicated
    render process; or a lighter HTML→PDF path.
  - **Done when:** concurrent exports don't spike memory linearly with requests.

- [ ] **3.3 Fix the generation snapshot**
  - **Why:** the generated resume stores a snapshot of experiences, but export
    re-pulls **education** live from the profile — the PDF can drift from what
    was generated/reviewed.
  - **What:** persist the complete render input (including education) on the
    application at generation time; export renders exactly that.

---

## Phase 4 — Schema & auth (one-way doors — do last, deliberately)

- [ ] **4.1 `skills` → structured** — `one-way`
  - A `profile_skills` table or at least `text[]`. Enables filtering, dedupe, and
    structured gap analysis.

- [ ] **4.2 Schema hygiene** — `one-way`
  - `job_applications.updatedAt`; a real `pgEnum` for `status`; wrap
    `saveProfile` in a transaction; replace delete-all-then-reinsert of
    experiences/education with a stable upsert/diff so row IDs don't churn.

- [ ] **4.3 Abstract auth behind a seam** — `one-way`
  - `getCurrentUser(req)` + `requireAuth` middleware that the app depends on.
    Replit OIDC becomes one implementation behind it. Add a local-dev strategy so
    the app runs off Replit.

---

## Prioritization heuristic (for future items)

Score each candidate on two axes; do the top-right quadrant first:

1. **Pain / risk if left alone** — data-loss and security > correctness bugs >
   developer friction > cosmetic.
2. **Cost & reversibility of the fix** — a reversible change behind a default is
   cheap; a schema or auth migration is expensive and hard to undo.

Trace one request end to end and mark: trust boundary crossed? input validated?
long-running? can it partially fail? persisted atomically? observable? Each "no"
is a candidate.

---

## Changelog

- _2026-08-28_ — Plan created. **Phase 0 complete (0.1–0.4):**
  - `loadOwnedApplication` helper enforces ownership on all 11 `/api/applications/:id*`
    routes; non-owners get 404.
  - `vitest` + `supertest` added; `test/` has an in-memory `IStorage`, an app
    factory with injectable auth, and 25 passing tests (authorization/IDOR,
    profile round-trip, applications CRUD, config validation).
  - `server/config.ts` validates env at boot via Zod; wired into `storage.ts`,
    `replitAuth.ts`, `index.ts`, `openai.ts`.
  - OpenAI client is now lazily constructed; `AI_MODEL` is configurable.
  - `npm run check` (tsc) and `npm test` both green.
