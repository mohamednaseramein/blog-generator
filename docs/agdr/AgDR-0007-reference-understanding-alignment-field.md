# AgDR-0007 — Reference Understanding Field in Alignment Summary

> In the context of showing users what the AI understood from their reference URL, facing the choice of where to surface that understanding and how to extend the existing alignment JSON contract, I decided to add an optional `referenceUnderstanding` field to the `AlignmentSummary` type and prompt — present only when scraped content exists — accepting the trade-off of a variable-shape response over a fixed-shape one.

## Context

EP-03 / US-13 requires the alignment summary to surface the AI's interpretation of the scraped reference URL so users can verify alignment before content generation. The alignment summary already stores a 5-field JSON blob in `blog_briefs.alignment_summary`. The `BlogBrief` domain object carries `scrapedContent` and `scrapeStatus` — the data is available at generation time.

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Add optional `referenceUnderstanding` to AlignmentSummary (chosen)** | Single source of truth; persisted with alignment; no new DB column; backward compatible | Response shape varies (6 fields with reference, 5 without); requires conditional rendering |
| Separate API field returned alongside `summary` | Clean separation | Not persisted in alignment blob; lost on re-read; requires new DB column or response-only field |
| Always include field, empty string when no reference | Uniform shape | Misleading empty card shown to users without a reference; prompt must handle gracefully |
| New `blog_reference_insights` table | Clean normalisation | New migration, new repository, over-engineered for a single text field |

## Decision

- **`referenceUnderstanding?: string`** added to `AlignmentSummary` as an optional field
- Present in the prompt only when `brief.scrapedContent` is non-null — the prompt instructs the model to produce a sixth JSON field `"referenceUnderstanding"` describing what it understood from the scraped material
- Absent entirely when no scraped content — the existing 5-field contract is preserved for those briefs
- The frontend renders a "Reference Understanding" card conditionally on the field's presence
- No DB migration required — `alignment_summary` TEXT column stores the richer JSON transparently

## Consequences

- `AlignmentSummary` type gains `referenceUnderstanding?: string`
- Prompt extended with a conditional sixth field instruction when scrapedContent is present
- Frontend `AlignmentSummary` component adds one conditional card
- All existing tests for the 5-field case continue to pass unchanged
- Future steps (outline, draft) can read `referenceUnderstanding` from the stored JSON

## Artifacts

- Epic: https://github.com/mohamednaseramein/blog-generator/issues/14
- `backend/src/services/alignment-service.ts`
- `frontend/src/api/blog-api.ts`
- `frontend/src/components/AlignmentSummary.tsx`
