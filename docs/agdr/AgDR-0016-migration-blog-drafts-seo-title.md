# AgDR-0016: Add seo_title column to blog_drafts

> In the context of SEO metadata enrichment, facing the need to store a separate AI-generated SEO title alongside meta_description and suggested_slug, I decided to add a nullable TEXT column seo_title to blog_drafts, accepting that existing rows will have NULL until their drafts are re-confirmed.

## Context

The blog generator already stores `meta_description` and `suggested_slug` (added in migration-005). The SEO feature requires a third field: `seo_title` — a ≤60 char, keyword-first title distinct from the blog title, for pasting into a CMS `<title>` field.

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| Add nullable column to blog_drafts | Zero downtime, backward compatible, consistent with prior meta fields | Existing rows get NULL; users must re-confirm draft to populate |
| Store in blog_briefs | Co-located with keyword | Wrong layer — seo_title is generated output, not user input |

## Decision

Chosen: **nullable TEXT column on blog_drafts**, because it mirrors the existing pattern for `meta_description` and `suggested_slug` (migration-005), requires no backfill, and is zero-downtime.

## Consequences

- Existing confirmed drafts show "SEO title not generated" until re-confirmed
- No API contract break — column is additive

## Artifacts

- Ticket: https://github.com/mohamednaseramein/blog-generator/issues/48
- Migration: `backend/src/db/migrations/migrate-006-blog-drafts-seo-title.sql`
