---
id: AgDR-0027
timestamp: 2026-05-07T00:00:00Z
agent: claude-opus-4-7 (Tech Lead role)
model: claude-opus-4-7
session: ai-detector-tech-design
trigger: user-prompt
status: executed
---

# AgDR-0027 — AI Detector Rubric Source Format: YAML in `backend/src/lib/`

> In the context of building the AI content detector (epic [#115](https://github.com/mohamednaseramein/blog-generator/issues/115), [PRD](../../projects/blog-generator/prd-ai-detector.md), [tech design](../../projects/blog-generator/technical-design-ai-detector.md)) where the rubric must drive both the LLM prompt AND the public `/help/ai-detector-rules` page without drift, facing a choice between an in-repo YAML file, an in-repo JSON file, a Postgres-stored rubric, or a split (prompt-text in code + rules in DB), I decided to put the rubric in a single in-repo YAML file at `backend/src/lib/ai-detector-rubric.yaml` with a build script that emits a derived JSON for the frontend, to achieve a single human-reviewable source of truth that flows into both the prompt and the help page, accepting the tradeoff of adding the `js-yaml` parser as a backend dependency and committing to a build-step that has to run in both backend and frontend pipelines.

## Context

The AI detector's rubric defines every rule, weight range, definition, AI/human example, and fix tip. It needs to:

1. Be loaded into the LLM system prompt at runtime (backend)
2. Be rendered on the public `/help/ai-detector-rules` page (frontend)
3. Be versioned in git so changes are code-reviewed
4. Be the **same content** in both places — drift is the failure mode this design exists to prevent

PRD goals 6 (rules reference page) and FR-14 require a single source so prompt and help page can't diverge. Rubric content is multi-line prose (definitions, examples) — the file format matters for editor ergonomics during the inevitable rule-tuning cycles after launch.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **YAML in `backend/src/lib/ai-detector-rubric.yaml` (chosen)** | Multi-line prose authored cleanly via literal block scalars (`\|`); excellent diff readability for the rule-tuning cycles after launch; single file → trivially the source of truth; existing PR review process catches drift | Adds `js-yaml` (~30KB gzipped) to backend deps; requires a build script to derive the frontend JSON |
| JSON in `backend/src/lib/ai-detector-rubric.json` | No new dep; same single-file model | Multi-line prose with embedded examples requires escaped `\n` and quoted strings — much harder to author and review; Git diffs of long examples are noisy |
| Postgres-stored rubric (e.g. new `ai_detector_rules` table) | Editable without redeploy; live A/B testing per env | Defeats the "single source" guarantee — rubric becomes per-environment state; introduces drift between staging and prod; requires admin UI; incompatible with the help page being a static build artefact |
| Split — prompt template in code, rules table in DB | Fast iteration on individual rules without code review | Two sources to keep aligned; help page would need a runtime DB call (slower, breaks SSG); doubles the failure modes |

## Decision

**Chosen: YAML in `backend/src/lib/ai-detector-rubric.yaml`.**

Loaded once at backend process start by `backend/src/lib/ai-detector-rubric.ts`, which exposes `RUBRIC_VERSION`, `getSystemPrompt()`, and `getRulesForHelpPage()`. A small build script (`scripts/build-rubric-json.ts`) parses the same YAML and emits `frontend/src/lib/ai-detector-rubric.generated.json` for the help page. Both backend and frontend `npm run build` invoke the script.

The YAML's `version:` field is the value returned in the API response as `rubric_version` and is the value used in the cache key. Bumping it is the **only** way to invalidate the result cache — making the version bump a deliberate code-review checkpoint.

CI invariant: a step in the pipeline asserts that if the YAML content hash changed, the `version:` field also changed. This is the mechanical guard against silent rubric edits.

## Consequences

- One file to author. Prose is readable. Editor-friendly for non-engineering reviewers (UX Designer, Head of Product) when refining rule definitions.
- Rubric updates require a PR — slower iteration than a DB-stored rubric, but matches the "transparent and reviewable" goal.
- Adds `js-yaml` to backend `package.json`. Trivial cost; widely-used library.
- Build script is a small additional moving part; covered by the integration tests for the help page.
- Frontend bundle includes the generated JSON (~few KB). No runtime fetch needed — the page works offline-first.

## Artifacts

- Tech design: [`projects/blog-generator/technical-design-ai-detector.md`](../../projects/blog-generator/technical-design-ai-detector.md) §§ "Rubric Source File", "Implementation Plan" Tasks 3, 4, 12
- Implementation: `backend/src/lib/ai-detector-rubric.yaml` (new), `backend/src/lib/ai-detector-rubric.ts` (new), `scripts/build-rubric-json.ts` (new), `frontend/src/lib/ai-detector-rubric.generated.json` (build output, gitignored)
