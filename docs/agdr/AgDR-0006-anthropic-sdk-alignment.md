# AgDR-0006 — Anthropic SDK for AI Alignment Summary

> In the context of generating a structured alignment summary from a user's blog brief, facing the need to call an LLM reliably with typed responses, I decided to use `@anthropic-ai/sdk` with prompt-engineered JSON output and a **configurable model** (`ANTHROPIC_MODEL`, default `claude-sonnet-4-6`) to achieve a fast, structured, and maintainable integration, accepting the trade-off of prompt fragility over the stronger contract of tool-use.

## Context

US-07 requires generating a five-section alignment summary (blog goal, target audience, SEO intent, tone, scope) from a user's brief. The summary must be regenerable with free-text feedback and structurally consistent so the frontend can render each section independently. The project already uses `ANTHROPIC_API_KEY` in `.env.example`, establishing Anthropic as the AI provider.

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **`@anthropic-ai/sdk` (chosen)** | Official SDK, typed, maintained, future-proof for streaming and tool-use | Adds a runtime dependency |
| Raw `fetch` to Anthropic REST API | Zero dependencies | Must hand-roll auth headers, error handling, retries; no types |
| OpenAI SDK (model-agnostic) | Widely used | Wrong provider; adds confusion; not aligned with existing stack |

| Output approach | Pros | Cons |
|-----------------|------|------|
| **Prompt-engineered JSON (chosen)** | Simple, fast, no schema overhead | Relies on model following prompt instructions; parse can fail |
| Tool use / function calling | Strongly typed contract; model is forced to conform | More complex prompt setup; overkill for a single structured call at this stage |

| Model | Pros | Cons |
|-------|------|------|
| **`claude-sonnet-4-6` (default when `ANTHROPIC_MODEL` unset)** | Best balance of quality, speed, and cost for structured summarisation; preserves prior behaviour | Slightly higher cost than Haiku |
| `claude-haiku-4-5-20251001` (via `ANTHROPIC_MODEL` in dev) | Faster, cheaper for JSON-shaped output | Lower reasoning quality for nuanced tone/SEO analysis |

## Decision

- **SDK**: `@anthropic-ai/sdk` — official, typed, consistent with the stack direction.
<<<<<<< HEAD
- **Model**: `claude-sonnet-4-6` — sufficient reasoning quality for structured content analysis at acceptable cost.
=======
- **Model**: resolved from optional env `ANTHROPIC_MODEL`; if unset or empty, use `claude-sonnet-4-6` (same as the original integration). Operators may set `ANTHROPIC_MODEL=claude-haiku-4-5-20251001` in local `.env` to reduce cost.
>>>>>>> feature/GH-3-us07-ai-alignment-summary
- **Output contract**: prompt-engineered JSON with a parse guard and a field-presence check. If Claude returns malformed JSON, the error is logged with the raw response and surfaced to the user as a retryable error.

## Consequences

- `@anthropic-ai/sdk` added to `backend/package.json` dependencies.
- `ANTHROPIC_API_KEY` env var required (already documented in `.env.example`).
- Optional `ANTHROPIC_MODEL` documented in `.env.example`; default remains Sonnet for production parity without extra config.
- If prompt adherence degrades across model versions, migrate to tool-use / function-calling.
- Revisit default and allowed models on next Anthropic model release.

## Artifacts

- PR #8: feat(#3): US-07 AI alignment summary and confirmation
- `backend/src/services/alignment-service.ts`
