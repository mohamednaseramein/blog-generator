---
id: AgDR-0031
timestamp: 2026-05-07T00:00:00Z
agent: claude-opus-4-7 (Tech Lead role)
model: claude-opus-4-7
session: ai-detector-tech-design
trigger: user-prompt
status: executed
---

# AgDR-0031 — AI Detector Default LLM Model: Claude Haiku 4.5

> In the context of the AI content detector needing a default Anthropic model when `ANTHROPIC_MODEL` is unset (PRD FR-8 — provider/model from `.env`, `temperature=0` pinned in code), facing a choice between Claude Haiku 4.5 (cheapest), Claude Sonnet 4.6 (more reliable rubric adherence), or an auto-fallback that retries on Sonnet after a Haiku bad-JSON failure, I decided to default to `claude-haiku-4-5-20251001` matching the existing `.env.example` setting and to validate the choice against the 30-post fixture suite (FR-16) before launch, to achieve the lowest cost ceiling per check (target ≤ $0.02) with operational consistency to the rest of the app, accepting the tradeoff that if the fixture suite fails on Haiku we must escalate to Sonnet (with a follow-up AgDR documenting the cost impact) before launch.

## Context

The detector calls the Anthropic SDK with a strict-JSON-output rubric prompt. The PRD pins `temperature=0` in code and reads provider/model from `.env`, but the **default** matters because:

1. Local dev and CI run without explicit `ANTHROPIC_MODEL` set sometimes
2. The cost ceiling (≤ $0.02 per check) constrains the model choice in production
3. Haiku and Sonnet have different rubric-adherence characteristics — Sonnet is more reliable at following structured-output instructions, Haiku is faster and roughly 12× cheaper per token

The blog-generator already uses the env-driven model pattern in `services/alignment-service.ts` (default `claude-sonnet-4-6`). The repo's `.env.example` sets `ANTHROPIC_MODEL=claude-haiku-4-5-20251001` — operations is already aligned around Haiku for cheap calls.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Default `claude-haiku-4-5-20251001` (chosen)** | Matches the existing `.env.example` default; cheapest per token (≈ $0.001 / 1K input + $0.005 / 1K output); fast (P50 well under 5s for our token counts); fixture suite is the gate that proves it's good enough | Sonnet is empirically more reliable at strict-JSON output; if Haiku flakes on the rubric we have to escalate |
| Default `claude-sonnet-4-6` | More reliable rubric adherence; less risk of bad-JSON retries; familiar from `alignment-service.ts` | ~12× more expensive per token; pushes us closer to the $0.02 ceiling at typical token counts; slower P50 |
| Auto-fallback (Haiku first, retry on bad-JSON with Sonnet) | Cost optimisation when Haiku works; reliability when it doesn't | Complexity in the service layer; makes the cache key ambiguous (which model produced this row?); harder to reason about cost in monitoring; opaque to operators |

## Decision

**Chosen: Default to `claude-haiku-4-5-20251001`.**

```ts
// backend/src/services/ai-detector-service.ts
export const DEFAULT_AI_DETECTOR_ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

export function resolveAiDetectorAnthropicModel(): string {
  return process.env['ANTHROPIC_MODEL']?.trim() || DEFAULT_AI_DETECTOR_ANTHROPIC_MODEL;
}
```

The fixture suite (FR-16, Implementation Plan Task 18) is the gate. Acceptance: with the default Haiku model, `temperature=0`, and the v1.0.0 rubric, all 30 fixtures must satisfy:

- Known-AI fixtures: `ai_likelihood_percent ≥ 60`
- Known-human fixtures: `ai_likelihood_percent ≤ 40`
- Hybrid fixtures: `ai_likelihood_percent` in `[30, 70]`
- Bad-JSON rate (post-retry): 0% on the suite

If Haiku fails this gate during dev:

1. Open a follow-up AgDR proposing the escalation to Sonnet
2. Update `DEFAULT_AI_DETECTOR_ANTHROPIC_MODEL` and `.env.example` together
3. Re-validate cost target (≤ $0.02) at Sonnet token rates — if breached, escalate to Head of Product for the cost-vs-reliability call

The cache key already includes the model in the persisted row (`llm_model` column), so any future model change invalidates effectively-stale rows by being captured in the analytics, not by being a cache invalidator (the cache is keyed on input hash + rubric version only — model is a property of the result, not the key).

## Consequences

- Default cost per check at typical token counts (~3K input, ~600 output): ≈ $0.006. Well under the $0.02 ceiling.
- P50 latency on Haiku: typically 1–3 s for our token counts. Comfortably under the 5 s target.
- Rubric authors must be aware that the rubric is being followed by Haiku, not Sonnet — definitions need to be unambiguous, examples should be unmistakable. The fixture suite enforces this empirically.
- Per-deploy override is trivial — operators set `ANTHROPIC_MODEL=...` in `.env`. No code change.
- If a downstream use case (e.g. enterprise customers) needs higher accuracy, we can route those checks to Sonnet via a per-tenant config without changing this default. Phase-2 concern.

## Artifacts

- Tech design: [`projects/blog-generator/technical-design-ai-detector.md`](../../projects/blog-generator/technical-design-ai-detector.md) §§ "Architecture" component diagram, "Implementation Plan" Task 9, "Risks" — LLM bad-JSON
- Implementation: `backend/src/services/ai-detector-service.ts` (new), reads `process.env['ANTHROPIC_MODEL']`
- Existing precedent: `backend/src/services/alignment-service.ts` `resolveAlignmentAnthropicModel()` (defaults to Sonnet for that service); same pattern, different default
- `.env.example` — already sets `ANTHROPIC_MODEL=claude-haiku-4-5-20251001`
