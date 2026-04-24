# [Feature] Ban em dashes (U+2014) in AI and blog copy

| Field | Value |
|--------|--------|
| Type | Feature (content quality) |
| Priority | P1 |

## User story

As a **content author using Blog Generator**, I want **generated copy and published posts to avoid em dashes** so that **tone and punctuation stay consistent across steps, exports, and the UI**.

## Acceptance criteria

- [x] Every Anthropic prompt that produces user-visible strings includes the shared **no em dash** instruction from `copy-style.ts`.
- [x] Model output is passed through `stripEmDashes` or `stripEmDashesDeep` before persistence or API response where the content is alignment, outline, draft, reference extraction, or SEO meta.
- [x] Read paths for stored alignment, outline, and draft apply the same stripping so older rows are harmonized at serve time.
- [x] Wizard and key user-visible strings in the frontend no longer use U+2014.
- [x] `docs/content-style-sdlc.md` describes the rule and SDLC ownership.

## Design notes

- Replacement is literal U+2014 to ` - ` (see `stripEmDashes`). En dashes in templates for ranges (e.g. `4–7` sections) are unchanged in this iteration.
- Future: optional ESLint or CI check for U+2014 in `frontend/src` strings.

## Out of scope

- Third-party or user-typed content in fields we do not control beyond normal validation.
- wholesale rewrite of non-UI backend log messages.
