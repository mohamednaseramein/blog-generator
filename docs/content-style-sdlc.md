# Content style: no em dashes (SDLC)

This document records a **house rule** for Blog Generator: **do not use the Unicode em dash (U+2014)** in AI-generated copy, stored blog content, or user-facing product strings. Use a **spaced hyphen** (` ` + `-` + ` `) or rephrase with a period or colon when a break reads more clearly.

## Why

Alignment between model output, Markdown posts, SEO fields, and UI copy is easier when one punctuation rule applies everywhere. The em dash is easy for models to emit; we normalize it so published text stays consistent.

## SDLC mapping

| Phase | Responsibility |
|--------|----------------|
| **Requirements** | Ban U+2014 in generated and user-visible text; allow en dashes in numeric ranges where already used (e.g. word ranges) unless product later extends the rule. |
| **Design** | Prompts include `PROMPT_EMDASH_BAN` from `backend/src/lib/copy-style.ts`. |
| **Implementation** | `stripEmDashes` on single strings; `stripEmDashesDeep` on JSON-shaped model output before save; read paths strip legacy stored text when serving. |
| **Verification** | Unit tests in `backend/src/lib/__tests__/copy-style.test.ts`; manual spot-check of outline, alignment, draft, and publish export. |
| **Operation** | If a new LLM call path is added, import the same helpers and prompt line. |

## Technical reference

- **Source of truth:** `backend/src/lib/copy-style.ts` (`PROMPT_EMDASH_BAN`, `stripEmDashes`, `stripEmDashesDeep`).
- **Not in scope for this rule:** Log lines, developer-only comments, and non-UI server diagnostics (may still be cleaned over time for consistency).

## Related

- Task: [feat-no-em-dash-content-style.md](./tasks/feat-no-em-dash-content-style.md)
