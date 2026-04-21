---
id: AgDR-0008
timestamp: 2026-04-21T00:00:00Z
agent: Claude (Sonnet 4.6)
trigger: user-prompt
status: accepted
ticket: mohamednaseramein/blog-generator#19
---

# AgDR-0008 — Migration: Create blog_outlines Table

## Context

US-08 (EP-04) adds an AI-generated blog outline step (Step 3 of the wizard). The outline is a JSON
document containing ordered H2 sections, each with H3 sub-points and a word allocation. It must be
persisted so downstream steps (draft) can retrieve it without regeneration.

The alignment data lives in `blog_briefs` (a single extra JSONB column). The outline is heavier —
it has iteration tracking, a confirmed flag, and JSON structure — so a dedicated table was chosen
over adding more columns to `blog_briefs`.

## Options Considered

### Option A — New `blog_outlines` table (chosen)
- One row per blog, keyed by `blog_id` (UNIQUE FK on `blogs`).
- Stores `outline_json TEXT`, `outline_confirmed BOOLEAN`, `outline_iterations SMALLINT`.
- Mirrors the `blog_briefs` alignment columns pattern for consistency.
- **Rollback**: `DROP TABLE IF EXISTS blog_outlines;`

### Option B — Add outline columns to `blog_briefs`
- Avoids a new migration.
- `blog_briefs` is already 14 columns; mixing brief, scrape, alignment, and outline data in one
  table violates single-responsibility and makes future per-step queries harder.
- Rejected.

### Option C — Supabase Storage (JSON file)
- No schema migration needed.
- Loses ACID guarantees, transactional reads, and JOIN capability.
- Rejected.

## Decision

Option A — new `blog_outlines` table.

## Rollback Plan

```sql
DROP TABLE IF EXISTS blog_outlines;
```

Run via the Supabase SQL editor or the project's `npm run migrate` script with the inverse
migration file. No data is at risk because `blog_outlines` is additive — no existing table or
column is altered.

**Tested against**: unit fixture (Supabase test project — same SQL engine, empty dataset).

## Affected Tables / Entities

- `blog_outlines` (new)

## Cross-Service Consumers

None at time of writing. The frontend calls the backend API which is the sole writer/reader of this
table.

**Deploy-order constraint**: Backend must deploy (and migrate) before frontend ships the Outline
step UI, so the endpoint exists. Both ship in the same PR so ordering is automatic.

## Estimated Downtime

None — additive DDL only. `CREATE TABLE IF NOT EXISTS` acquires an `AccessShareLock` on the
catalog, not on existing tables.

## Data Volume

0 rows at migration time. Expected to grow ~1 row per blog created.

## Testing Plan

- Dev smoke: `npm run migrate` in the backend container; verify `blog_outlines` appears in
  `\dt` via `psql`.
- Staging verify: Create a blog, confirm alignment, hit `POST /api/blogs/:id/outline`, confirm
  row inserted with `SELECT * FROM blog_outlines WHERE blog_id = '<id>'`.
- Canary / phased rollout: n/a — table is empty, no traffic concern.

## Observability

- Supabase Table Editor: row count on `blog_outlines`.
- Backend logs: `[outline-repository] saved outline for blogId=<id>`.

## Consequences

- `blog_outlines` table is permanent. Future draft step reads `outline_json` from it.
- `outline_iterations` tracks regeneration depth (useful for analytics).
- `outline_confirmed` gates the Step 4 draft handler.

## Artifacts

- Migration file: `backend/src/db/migrations/migrate-002-blog-outlines.sql`
- Ticket: https://github.com/mohamednaseramein/blog-generator/issues/19
