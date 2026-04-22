---
id: AgDR-0011
timestamp: 2026-04-22T00:00:00Z
agent: Claude
trigger: user-prompt
status: accepted
ticket: mohamednaseramein/blog-generator#25
---

# AgDR-0011 — Per-Reference Extraction and Differentiation Angle in Alignment

## Context

US-09 added `blog_references` with scrape lifecycle columns and placeholder
`extraction_status` / `extraction_json`. Users only saw “✓ Scraped” with no
insight into whether a reference matched their blog idea. EP-05 US-10 adds an
AI extraction pass after each successful scrape, stores structured JSON per
row, surfaces it in the brief UI, and replaces the alignment-only
`referenceUnderstanding` card with a synthesised **differentiation angle**
when usable extractions exist.

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A — Claude extraction per URL after scrape** (chosen) | Reuses stored `extraction_json`; one API call per reference; aligns with prior EP-05 design | Extra latency and cost per URL (max 5) |
| **B — Extract only inside alignment** | Fewer total calls if user never opens alignment | No inline preview in brief step; repeats work on alignment regenerate |
| **C — Non-AI title/snippet only** | Free | No “relevance to brief” signal |

## Decision

**Option A** — `reference-extraction-service.ts` runs after `scrape_status`
becomes `success`, writes `extraction_json` + `extraction_status`
(`success` | `failed` | `irrelevant`). JSON shape:

```json
{
  "relevance": "high" | "medium" | "low",
  "summary": "one sentence tied to the blog brief",
  "keyAngle": "one sentence on angle or gap vs typical coverage",
  "irrelevantToBrief": false
}
```

Alignment generation:

- If **≥1** reference has `extraction_status === 'success'` and valid JSON,
  the alignment prompt includes those structured snippets and requires a new
  field **`differentiationAngle`** (synthesised across references). The
  optional **`referenceUnderstanding`** field is **not** requested in that
  path.
- If references exist, all scrapes settled, and **zero** successful
  extractions → alignment response includes `referencesAnalysis: 'none_usable'`
  and no extra reference fields.
- If scrapes succeeded but extraction still **pending**, fall back to the
  existing raw-scrape + `referenceUnderstanding` behaviour so alignment is
  not blocked.

## Consequences

- Up to **5 Claude calls** per blog after references are added (same order of
  magnitude as alignment itself).
- `alignment_summary` JSON persisted in `blog_briefs` may contain
  `differentiationAngle` instead of `referenceUnderstanding` for new flows;
  frontend renders whichever is present.
- Failed extraction sets `extraction_status = 'failed'` with null JSON.

## Artifacts

- `backend/src/services/reference-extraction-service.ts`
- `backend/src/services/reference-extraction-runner.ts`
- `backend/src/repositories/blog-references-repository.ts` — `updateReferenceExtraction`
- `backend/src/services/url-scraper-service.ts` — trigger runner after scrape success
- `backend/src/services/alignment-service.ts` — branching + `differentiationAngle`
- `backend/src/handlers/blog-alignment-handler.ts` — `referencesAnalysis` flag
- Frontend: `ReferenceUrlCard`, `ReferenceUrlList`, `AlignmentSummary`, `blog-api.ts`

Tracker: https://github.com/mohamednaseramein/blog-generator/issues/25
