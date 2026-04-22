---
id: AgDR-0009
timestamp: 2026-04-21T00:00:00Z
agent: Claude (Sonnet 4.6)
trigger: user-prompt
status: accepted
ticket: mohamednaseramein/blog-generator#26
---

# AgDR-0009 — Migration: Create blog_references Table

## Context

EP-05 / US-09 replaces the single `blog_briefs.reference_url` column with a
dedicated `blog_references` table supporting up to 5 URLs per blog. Each URL
has its own scrape lifecycle (status, error, content) and — in US-10 — an
extraction lifecycle (extraction_status, extraction_json).

Putting references in a separate table (rather than a JSONB array on
`blog_briefs`) was chosen for clean queryability, individual row updates during
background jobs, and extensibility to extraction columns without altering the
brief table again.

## Options Considered

### Option A — New `blog_references` table (chosen)
- One row per URL, keyed by `(blog_id, position)`.
- Independent scrape and extraction lifecycle columns per row.
- Straightforward background-job update pattern: `UPDATE blog_references SET scrape_status = $1 WHERE id = $2`.
- **Rollback:** `DROP TABLE IF EXISTS blog_references;`

### Option B — JSONB array on `blog_briefs`
- `reference_urls JSONB` — array of `{url, scrapeStatus, scrapedContent}` objects.
- No new table, no migration to a new table.
- Updating a single array element in Postgres requires replacing the whole column — awkward for concurrent background jobs.
- No FK constraints per URL, harder to index.
- Rejected.

### Option C — Keep single URL, increase truncation limit
- Low effort, zero migration.
- Does not address the multi-URL requirement at all.
- Rejected.

## Decision

Option A — new `blog_references` table.

## Rollback Plan

```sql
DROP TABLE IF EXISTS blog_references;
```

Additive only — no existing table is modified. The old `blog_briefs.reference_url`
column is left in place during the transition period; it is dropped in a
follow-up migration (migrate-004) after both US-09 and US-10 merge.

**Tested against**: unit fixture (Supabase test project).

## Affected Tables / Entities

- `blog_references` (new)
- `blog_briefs` — `reference_url`, `scraped_content`, `scrape_status` columns deprecated
  (dropped in migrate-004, not this migration)

## Cross-Service Consumers

None at time of writing. Backend API is the sole reader/writer.

**Deploy-order constraint**: Backend migrates before frontend ships the
multi-URL form. Both ship in the same PR (US-09), so ordering is automatic.

## Estimated Downtime

None — `CREATE TABLE IF NOT EXISTS` is non-blocking on existing tables.

## Data Volume

0 rows at migration time. Up to 5 rows per blog post going forward.

## Testing Plan

- Dev smoke: `npm run db:migrate --workspace=backend`; verify `blog_references`
  appears in `\dt`.
- Staging verify: add 2 reference URLs via brief form; confirm 2 rows inserted
  with correct `blog_id`.
- Canary: n/a — table is empty, no traffic concern.

## Observability

- Supabase Table Editor: row count on `blog_references`.
- Backend logs: `[references-repository] saved reference for blogId=<id>`.

## Consequences

- `blog_references` is the authoritative source for all reference URL data
  from US-09 onward.
- Alignment service reads from `blog_references` (scrape_status = success)
  instead of `blog_briefs.scraped_content`.
- US-10 adds `extraction_status` and `extraction_json` columns to this table
  (no new migration needed — columns already present).

## Artifacts

- Migration file: `backend/src/db/migrations/migrate-003-blog-references.sql`
- Technical design: `projects/technical-design-ep05.md`
- Epic: https://github.com/mohamednaseramein/blog-generator/issues/23
- Ticket: https://github.com/mohamednaseramein/blog-generator/issues/26
