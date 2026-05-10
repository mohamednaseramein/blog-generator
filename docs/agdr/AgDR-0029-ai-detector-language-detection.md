---
id: AgDR-0029
timestamp: 2026-05-07T00:00:00Z
agent: claude-opus-4-7 (Tech Lead role)
model: claude-opus-4-7
session: ai-detector-tech-design
trigger: user-prompt
status: executed
---

# AgDR-0029 — AI Detector Language Detection: Heuristic ASCII + Common-Word Check

> In the context of the AI content detector needing to short-circuit non-English drafts before calling the LLM (PRD FR-10 — non-English returns `mode: language_unsupported` with no LLM bill), facing a choice between a tiny heuristic check, the `franc` language-detection library, or an LLM round-trip for detection, I decided to implement a no-dependency heuristic in `backend/src/lib/language-detector.ts` (ASCII ratio ≥ 0.85 plus presence of any 5 of 10 common English stopwords), to achieve cheap, deterministic, and zero-network-cost gating for the v1 English-only constraint, accepting the tradeoff that romanised non-English content (e.g. romanised Arabic, transliterated Russian) and emoji-heavy drafts will sometimes misclassify and pass through to the LLM.

## Context

PRD non-goals: "Multi-language support beyond English in v1." The detector must short-circuit non-English drafts cheaply, before the LLM call, and return a clean response that tells the user English is the only supported language.

The check needs to be:

- Fast (sub-millisecond) — runs on every cache miss in the hot path
- Deterministic — the response is part of the cached result; non-determinism here would re-bill on retry
- Cheap to maintain — language-detection libraries have their own version-bump and accuracy gotchas

We are NOT trying to detect *every* language correctly. We are gating: "Is this English enough that the rubric makes sense?" False negatives (true English flagged non-English) are bad; false positives (non-English passed through) are mildly wasteful (one LLM call) but otherwise harmless because the rubric will return low-quality output and the user will notice.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Heuristic — ASCII ratio + stopword check (chosen)** | Sub-ms; zero deps; deterministic; trivial to test; matches the v1 "English-only" scope | Misclassifies romanised non-English (e.g. romanised Arabic written in ASCII); misclassifies code-heavy / emoji-heavy English |
| `franc` library (~50KB) | Detects 80+ languages with reasonable accuracy; widely used | New dep to manage; per-call CPU cost is modest but not zero; over-engineered for "is this English yes/no" |
| LLM round-trip for language detection | Most accurate | Defeats the purpose — adds the very cost we're trying to avoid; doubles latency |
| Anthropic SDK `messages.create` with a tiny pre-flight prompt | Same model as the main call, free of new deps | Adds ~1s + ~$0.001 per check; reduces our cache-hit benefit |

## Decision

**Chosen: Heuristic — ASCII ratio + common-word check.**

Implementation in `backend/src/lib/language-detector.ts`:

```ts
const COMMON_EN = ['the', 'and', 'of', 'to', 'in', 'is', 'it', 'that', 'for', 'with'];

export function isEnglish(text: string): boolean {
  const stripped = text.toLowerCase().replace(/[^a-z\s]/g, ' ');
  if (stripped.trim().length === 0) return false;

  const asciiRatio = (text.match(/[\x00-\x7F]/g)?.length ?? 0) / text.length;
  if (asciiRatio < 0.85) return false;

  const words = new Set(stripped.split(/\s+/));
  const hits = COMMON_EN.filter((w) => words.has(w)).length;
  return hits >= 5;
}
```

Thresholds (`0.85`, `5 of 10`) are chosen empirically against the 30-post fixture suite (FR-16): all 30 fixtures must pass `isEnglish()` and so must 5 known-non-English negative-control fixtures (added under `backend/fixtures/ai-detector/non-english/`).

If a future support load shows that a meaningful fraction of users are writing in romanised non-English, revisit with a follow-up AgDR proposing `franc` or moving to multi-language support (Phase 2 backlog item).

## Consequences

- Zero deps. Zero network cost. Sub-millisecond.
- Documented edge cases: romanised Arabic, transliterated Russian, very emoji-heavy or code-heavy English. These either misclassify (false English) or pass through to the LLM (false English-allowed). In neither case does the user lose money or get a wrong score — they get a low-quality score with high uncertainty, which the rubric will surface.
- The heuristic is part of the cached input contract: the same input always returns the same `mode`. Determinism preserved.
- Test coverage: unit tests cover the threshold boundaries; the fixture suite is the integration check.

## Artifacts

- Tech design: [`projects/blog-generator/technical-design-ai-detector.md`](../../projects/blog-generator/technical-design-ai-detector.md) §§ "Architecture" component diagram, "Implementation Plan" Task 6
- Implementation: `backend/src/lib/language-detector.ts` (new), `backend/src/lib/__tests__/language-detector.test.ts` (new)
- Phase-2 backlog: PRD § "Phase 2 Backlog" — Multi-language support
