---
name: Replit AI gateway providers
description: How to reach Anthropic Claude through the existing Replit AI Integrations gateway in this project
---

The Replit AI Integrations gateway used by this app is multi-provider.

**Rule:** To call Anthropic Claude, strip the trailing `/openai` from `AI_INTEGRATIONS_OPENAI_BASE_URL` and append `/anthropic`; use the same `AI_INTEGRATIONS_OPENAI_API_KEY` with the Anthropic SDK/messages API. Claude model names (e.g. `claude-sonnet-4-5`, `claude-haiku-4-5`) are rejected with `UNSUPPORTED_MODEL` on the `/openai` chat-completions path, including with an `anthropic/` prefix.

**Why:** Verified by curl in Aug 2026 when migrating `server/openai.ts` from gpt-4o to Claude; no separate Anthropic connector exists in the integrations catalog, and docs confirm Claude models are served by AI Integrations.

**How to apply:** When switching or adding LLM providers, don't request user API keys — reuse the gateway with the provider-specific path. Anthropic responses can wrap JSON in prose/fences; the app's shim in `server/openai.ts` extracts the first balanced JSON object and throws on `stop_reason === "max_tokens"`.
