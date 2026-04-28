---
id: AgDR-0020
timestamp: 2026-04-28T12:15:00Z
agent: claude-haiku-4-5
model: claude-haiku-4-5
trigger: user-prompt
status: draft
ticket: mohamednaseramein/blog-generator#82
---

# AgDR-0020 — Migration: Create author_profiles Table and Add Profile Snapshot Columns to blog_briefs

> In the context of introducing Author Profiles (feature #73) to the blog generator, facing the need to persist reusable author voice/audience/intent context, I decided to execute a schema migration creating a new `author_profiles` table and adding four snapshot columns to `blog_briefs` to achieve context-aware blog generation, accepting the tradeoff that the migration adds a NOT NULL backfill step to existing rows.

**Migration type**: schema
**Affected tables / entities**: `author_profiles` (new), `blog_briefs` (altered)
**Estimated downtime**: none — PostgreSQL ADD COLUMN is non-blocking; backfill is in-transaction
**Data volume**: tens of rows in existing blog_briefs
**Target environment(s)**: staging → prod

## Context

Feature #73 introduces Author Profiles — reusable templates capturing author role, audience, intent, tone, and voice guidance. These are snapshotted onto each blog brief at creation time so the AI generation services can inject author context into their prompts. This migration creates the storage and the snapshot columns.

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Single migration (chosen)** | One atomic change; all tables consistent; clean rollback | Slightly more complex migration file |
| Separate migrations (author_profiles first, then blog_briefs) | Smaller files; easier to debug if one fails | Rollback logic more fragile; if step 2 fails, step 1 is orphaned |

## Decision

Chosen: **single migration** that creates `author_profiles` and immediately alters `blog_briefs` in the same transaction. Rollback is atomic and clean.

## Rollback Plan

**Explicit rollback steps**:

1. `ALTER TABLE blog_briefs DROP COLUMN IF EXISTS profile_id, author_role, intent, voice_note;`
2. `DROP TABLE IF EXISTS author_profiles;`

**Rollback tested against**: NOT TESTED — **blocker for prod apply**. Must test against a staging copy of prod before this ships to production.

**Rollback window**: safe indefinitely after apply (dropping columns and tables is always reversible if a backup exists).

## Cross-Service Consumers

- **alignment-service** — reads `blog_briefs.author_role`, `intent`, `voice_note`, `profile_id` (after migration); builds system prompt
- **outline-service** — reads same fields; builds system prompt
- **draft-service** — reads same fields; builds system prompt
- **profile CRUD API** — writes to `author_profiles` table (new endpoint)
- **blog brief API** — writes to new columns on `blog_briefs` at brief submit time

**Deploy-order constraint**: all-at-once. Services must deploy simultaneously so they all see the new columns from the start. No gradual rollout.

## Testing Plan

- **Dev smoke**: `npm run db:migrate` against local database; verify `author_profiles` table exists with all columns and constraints; verify `blog_briefs` has new columns; verify backfill defaults applied to existing rows.
- **Staging verify**: 
  1. Restore prod dump to staging
  2. Run migration
  3. SELECT COUNT(*) FROM author_profiles; — should be 0 (no seed yet, that's a separate migration)
  4. SELECT COUNT(*) FROM blog_briefs WHERE author_role IS NULL; — should be 0 (backfill applied)
  5. Insert a test author_profile; insert a test blog_brief referencing it; verify FK constraint works.
- **Canary / phased rollout**: n/a — schema-only, no data-dependent risk.

## Observability

- **During apply**: 
  - Monitor `pg_stat_activity` for lock contention (ADD COLUMN should not lock).
  - Monitor application error rate — should be flat (migration is transparent to running requests).
- **Post-apply**:
  - Query row count: `SELECT COUNT(*) FROM blog_briefs WHERE author_role IS NOT NULL;` — should equal the row count before migration (all rows backfilled).
  - Verify FK integrity: `SELECT COUNT(*) FROM blog_briefs WHERE profile_id IS NOT NULL AND profile_id NOT IN (SELECT id FROM author_profiles);` — should be 0.
- **Alerts armed**: None required for this migration (schema-only; no performance impact expected).

## Consequences

- New `author_profiles` table is ready for the profile API to write to (sub-issue #77).
- `blog_briefs` now carries a snapshot of the author context used for that blog (enables View Prompt panel and supports future profile change tracking).
- Future profile edits do not affect already-created blogs (snapshotted values prevent retroactive change).
- Adding a new `BlogIntent` enum value requires: (1) DB CHECK constraint update via migration, (2) TS tuple update in `domain/types.ts`, (3) `buildProfileContext` map update.

## Artifacts

- **Ticket**: [mohamednaseramein/blog-generator#82](https://github.com/mohamednaseramein/blog-generator/issues/82)
- **Feature sub-issue**: [mohamednaseramein/blog-generator#74](https://github.com/mohamednaseramein/blog-generator/issues/74) (part of feature #73 breakdown)
- **Commits / PRs**: TBD (will reference this AgDR)
- **Staging-run log**: TBD
- **Post-apply dashboard snapshot**: TBD

---

*Created by `/migration 74`. Migration ticket #82 is the authoritative tracker — use this when running `/start-ticket 82` before editing migration files.*
