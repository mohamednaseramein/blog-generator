---
id: AgDR-0019
timestamp: 2026-04-28T00:00:00Z
agent: claude-sonnet-4-6 (Tech Lead role)
model: claude-sonnet-4-6
session: feature-73-user-context-design
trigger: user-prompt
status: executed
---

# AgDR-0019 — Deterministic Field-to-Prompt Mapping for Author Profiles

> In the context of injecting Author Profile context into the three AI generation services (alignment, outline, draft), facing the choice between a deterministic template, a templated DSL, or LLM-driven inference, I decided to use a **deterministic string template with a small enum lookup table** built by a single helper `buildProfileContext(brief)`, to achieve predictable, debuggable prompt construction with trivial unit tests, accepting the tradeoff that the prompt structure is fixed in code rather than configurable at runtime.

## Context

Feature [#73 — User Context — Author Profile](https://github.com/mohamednaseramein/blog-generator/issues/73) introduces 5 new context fields (`author_role`, `audience_persona`, `intent`, `tone_of_voice`, `voice_note`) that must be injected into the system prompt of three existing AI services:

- `alignment-service.ts` — generates the 5-section alignment summary
- `outline-service.ts` — generates the structured outline
- `draft-service.ts` — generates the full markdown draft

The blog-generator already uses `@anthropic-ai/sdk` with prompt-engineered string templates (see AgDR-0006). The codebase pattern is inline string interpolation in service files. The new profile context must reach all three services with consistent shape, must be testable, and must be visible to the user via a new "View Prompt" panel that surfaces the actual system prompt sent to the LLM.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Deterministic template + enum lookup (chosen)** | Pure function, trivially unit-testable, predictable output, surfaces cleanly in View Prompt panel, single source of truth | Prompt copy lives in code; copy-edits require a code change |
| Database-driven prompt template (admin-editable) | Non-engineers can iterate on prompts; A/B testing possible | Adds complexity (templating engine, escape rules, deployment of template changes); over-engineered for v1 with no admin UI |
| LLM-driven inference (model summarises profile into a paragraph) | Could produce richer, more natural prompt prefixes | Adds a meta-LLM call per generation (cost + latency); non-deterministic output makes the View Prompt panel inconsistent and tests brittle |
| Mustache/Handlebars templated string | Templating familiar to many devs | Adds a runtime dep; no real value over template literals for a single 5-field interpolation |

| Intent → description mapping | Pros | Cons |
|---|---|---|
| **Hard-coded enum→string lookup (chosen)** | Single TS const, type-safe, exhaustive switch enforces handling new intents | Adding an intent requires editing two places (DB CHECK + TS map) |
| Stored on `author_profiles` row | Customisable per profile | Lets users degrade prompt quality with bad descriptions; no upside in v1 |
| Computed via LLM call | Most flexible | Same drawbacks as inference option above |

## Decision

- **Prompt construction**: `buildProfileContext(brief: BlogBrief): string` is a pure helper exported from `backend/src/services/profile-context-service.ts`. It interpolates the 5 profile fields plus an `intent` description (looked up via `INTENT_DESCRIPTIONS` const) into a fixed template prefix. The output is prepended to each existing service prompt.
- **Persistence of the assembled prompt**: each AI step row (`blog_briefs.alignment_system_prompt`, `blog_outlines.system_prompt`, `blog_drafts.system_prompt`) stores the full system prompt that was sent to the LLM. The View Prompt panel reads from these columns.
- **Sanitisation**: `voiceNote` is sanitised inside `buildProfileContext` to strip prompt-injection vectors (backticks, triple-quotes) and capped at 500 chars before interpolation.

## Consequences

- New file `backend/src/services/profile-context-service.ts` with two exports: `buildProfileContext` and `INTENT_DESCRIPTIONS`.
- All three existing AI services gain one line: `const profilePrefix = buildProfileContext(brief);` — prepended to the existing prompt string.
- Three small `ALTER TABLE … ADD COLUMN system_prompt TEXT` migrations on `blog_briefs`, `blog_outlines`, `blog_drafts` (or a single migration touching all three).
- A new endpoint `GET /api/blogs/:id/prompts/:step` returns the persisted prompt for the View Prompt panel.
- Prompt copy edits require a code change + PR — accepted because the prompt is a load-bearing technical contract, not marketing copy. Iterating on prompt quality is a deliberate engineering activity, not a content-team task.
- Adding a new `intent` enum value in the future requires updating: (1) DB CHECK constraint via migration, (2) `BlogIntent` TS tuple in `domain/types.ts`, (3) `INTENT_DESCRIPTIONS` map. A single test asserts the three lists match.
- Future "admin-editable prompts" would be a separate AgDR superseding this one if the need arises.

## Artifacts

- Feature ticket: [mohamednaseramein/blog-generator#73](https://github.com/mohamednaseramein/blog-generator/issues/73)
- Tech design: `projects/ai-blog-generator/technical-design-user-context.md`
- Implementation: TBD — sub-issues will be created from #73 (see "Implementation Plan" in the tech design)
