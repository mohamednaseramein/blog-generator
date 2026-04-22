# Technical Design: EP-05 — Smart Reference Intelligence

**Author:** Tech Lead (Rex)
**Date:** 2026-04-21
**Status:** Approved
**Epic:** EP-05
**Stories:** US-09 (Multi-reference URL support), US-10 (Reference extraction & differentiation angle)

---

## Overview

Replace the single `referenceUrl` text field in the blog brief with a dynamic multi-URL list (max 5). Each URL is scraped automatically on entry. In US-10, a Claude extraction call per URL produces a relevance score, key angle, and 1-sentence summary — displayed inline on the brief form. The alignment step then shows a combined differentiation angle synthesised from all successful extractions.

---

## Domain Model

### New entity: `BlogReference`

```
BlogReference
  id                UUID PK
  blogId            UUID FK → blogs.id
  url               TEXT NOT NULL
  scrapeStatus      enum: pending | success | failed | timeout | skipped
  scrapeError       TEXT nullable       -- human-readable failure reason
  scrapedContent    TEXT nullable       -- raw extracted text (kept for re-extraction)
  extractionStatus  enum: pending | success | failed | irrelevant  (US-10)
  extractionJson    TEXT nullable        -- structured Claude output (US-10)
  position          SMALLINT NOT NULL    -- order user added URLs (1-based)
  createdAt         TIMESTAMPTZ
  updatedAt         TIMESTAMPTZ
```

### Changes to existing entities

- `blog_briefs`: `reference_url` and `scraped_content` columns **deprecated** in US-09, **dropped** in a follow-up cleanup migration after both stories merge
- `SubmitBriefInput`: remove `referenceUrl` field
- `BlogBrief` domain type: remove `referenceUrl`, `scrapedContent`, `scrapeStatus`, `alignmentIterations` stays

---

## Architecture

```
Brief Form
  └── ReferenceUrlList component
        └── on URL blur/enter → POST /api/blogs/:id/references
              └── saves row (pending) → scrapeReferenceInBackground()
                    └── updates scrapeStatus → success | failed | timeout
                    └── (US-10) extractReferenceInBackground()
                          └── updates extractionStatus + extractionJson

  └── GET /api/blogs/:id/references  (polled every 2s until all settled)
        └── feeds ReferenceUrlCard status display

Alignment Service
  └── reads blog_references WHERE blog_id = ? AND scrape_status = 'success'
  └── (US-10) reads extraction_json, builds differentiation angle prompt
```

---

## API Design

### POST `/api/blogs/:id/references`
Add a reference URL and trigger background scrape.

**Request:** `{ url: string }`
**Response 201:** `{ reference: BlogReferencePublic }`
**Errors:** 400 invalid URL, 400 max 5 reached, 404 blog not found

### DELETE `/api/blogs/:id/references/:refId`
Remove a reference (only allowed before brief is submitted / during edit).

**Response 200:** `{ deleted: true }`

### GET `/api/blogs/:id/references`
List all references with current statuses.

**Response 200:** `{ references: BlogReferencePublic[] }`

### GET `/api/blogs/:id/references/:refId/status`
Poll single reference scrape + extraction status.

**Response 200:** `{ scrapeStatus, extractionStatus, extractionJson }`

---

## Data Model

### Migration 003 — `blog_references` table

```sql
CREATE TABLE blog_references (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id           UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  position          SMALLINT NOT NULL DEFAULT 1,
  scrape_status     VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (scrape_status IN ('pending','success','failed','timeout','skipped')),
  scrape_error      TEXT,
  scraped_content   TEXT,
  extraction_status VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (extraction_status IN ('pending','success','failed','irrelevant')),
  extraction_json   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blog_references_blog_id ON blog_references(blog_id);
```

### Migration 004 (cleanup, after US-09 + US-10 merge)

```sql
ALTER TABLE blog_briefs
  DROP COLUMN IF EXISTS reference_url,
  DROP COLUMN IF EXISTS scraped_content,
  DROP COLUMN IF EXISTS scrape_status;
```

---

## Implementation Plan

### US-09 — Multi-reference URL Support

| # | Task | Layer |
|---|---|---|
| 1 | migrate-003-blog-references.sql | DB |
| 2 | `BlogReference` domain type + `ScrapeStatus` enum update | Domain |
| 3 | `blog-references-repository.ts` — insert, list, delete, updateScrapeResult | Repo |
| 4 | `url-scraper-service.ts` — new `scrapeReferenceInBackground(referenceId, url)` function (keep old one for now) | Service |
| 5 | `blog-references-handler.ts` — add/remove/list/status handlers | Handler |
| 6 | Wire routes: POST, DELETE, GET list, GET status | Routes |
| 7 | Update `blog-brief-handler.ts` — remove `referenceUrl` from input, keep `referenceUrl` on `BlogBrief` type (nullable) for backwards compat during transition | Handler |
| 8 | Update `alignment-service.ts` — read from `blog_references` WHERE scrape_status = success | Service |
| 9 | `blog-api.ts` — `addReference`, `removeReference`, `listReferences`, `getReferenceStatus` | Frontend |
| 10 | `ReferenceUrlCard.tsx` — per-URL card: input + status display | Component |
| 11 | `ReferenceUrlList.tsx` — manages list state, add/remove, max-5 cap | Component |
| 12 | Update `BlogBriefForm.tsx` — replace single URL field with `ReferenceUrlList` | Component |
| 13 | Tests | Tests |

### US-10 — Extraction & Differentiation Angle

| # | Task | Layer |
|---|---|---|
| 1 | `reference-extraction-service.ts` — Claude prompt per URL → relevance, key angle, summary | Service |
| 2 | Fire extraction in background after scrape succeeds | Service |
| 3 | Update repository — `updateExtractionResult` | Repo |
| 4 | GET status endpoint returns extraction fields | Handler |
| 5 | `ReferenceUrlCard.tsx` — enrich with extraction result card (relevance badge, angle, summary) | Component |
| 6 | Update `alignment-service.ts` — build differentiation angle from extraction_json rows | Service |
| 7 | Update `AlignmentSummary.tsx` — replace `referenceUnderstanding` card with `differentiationAngle` card | Component |
| 8 | Tests | Tests |

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Scrape timeout leaving UI stuck | Poll with 2s interval, show "Taking longer than expected…" after 10s, error after 15s |
| Claude extraction cost per URL × 5 URLs | Extraction fires only once per URL, result cached in DB |
| SSRF on private IPs | `ReferenceUrl` value object already blocks private ranges |
| Scraped content too large for Claude prompt | Cap `scraped_content` at 10k chars (existing), pass max 2k per URL to extraction prompt |
| Old `reference_url` column still read by alignment | Keep `getBriefByBlogId` returning it during transition; alignment service switches to `blog_references` immediately |

---

## Open Questions

None — all resolved in pre-build discussion.
