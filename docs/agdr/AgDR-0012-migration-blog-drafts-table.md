---
id: AgDR-0012
timestamp: 2026-04-22T00:00:00Z
agent: Claude
trigger: user-prompt
status: accepted
ticket: mohamednaseramein/blog-generator#33
---

# AgDR-0012 — Migration: `blog_drafts` Table (Step 4)

## Context

Step 4 persists a full AI-generated markdown draft per blog after the user
confirms their outline. This requires a new table keyed by `blog_id`, similar
to `blog_outlines`.

## Decision

Add `blog_drafts` with:

- `draft_markdown` — full post body in Markdown
- `draft_confirmed` — user confirmed the draft for downstream publish (Step 5)
- `draft_iterations` — count of generate/regenerate calls

One row per blog (`blog_id` UNIQUE), `ON DELETE CASCADE` from `blogs`.

## Rollback

```sql
DROP TABLE IF EXISTS blog_drafts;
```

## Downtime / risk

None — additive table, empty at deploy.

## Testing

Run `npm run db:migrate` in dev; smoke POST `/api/blogs/:id/draft` after outline
confirm.
