---
id: AgDR-0032
timestamp: 2026-05-07T00:00:00Z
agent: claude-opus-4-7 (Tech Lead role)
model: claude-opus-4-7
session: ai-detector-migration
trigger: user-prompt
status: executed
ticket: mohamednaseramein/blog-generator#116
---

# AgDR-0032 — Migration: Create `blog_ai_checks` Cache Table

> In the context of building the AI content detector (epic [#115](https://github.com/mohamednaseramein/blog-generator/issues/115), [PRD](../../projects/blog-generator/prd-ai-detector.md), [tech design](../../projects/blog-generator/technical-design-ai-detector.md)), facing the requirement to hard-cache LLM responses by input hash + rubric version so identical drafts never re-bill the LLM (PRD FR-7, cost target ≤ $0.02 per check), I decided to execute a schema migration creating a new `blog_ai_checks` table with a unique index on `(blog_id, input_hash, rubric_version)` and a JSONB `result` column, to achieve persistent, multi-pod-safe caching aligned with [AgDR-0028](./AgDR-0028-ai-detector-cache-layer.md), accepting the tradeoff of monotonic table growth until a Phase-2 cleanup cron is added.

**Migration type**: schema
**Affected tables / entities**: `blog_ai_checks` (new)
**Estimated downtime**: none — `CREATE TABLE` on a brand-new table; no existing readers or writers; runs inside a transaction; zero locks on existing tables
**Data volume**: starts at 0. Steady-state estimate per AgDR-0028: ~10K rows/day at scale, ~5KB/row JSONB → ~50MB/day until Phase-2 cleanup cron lands
**Target environment(s)**: staging → prod

## Context

The AI content detector (epic [#115](https://github.com/mohamednaseramein/blog-generator/issues/115)) requires a hard cache so that re-running the check on an unchanged draft never re-bills the LLM. [AgDR-0028](./AgDR-0028-ai-detector-cache-layer.md) chose Postgres over in-memory and Redis: already in stack, persistent across restarts, multi-pod-safe via a unique index plus `ON CONFLICT DO NOTHING`. This migration is the concrete schema that AgDR-0028 implies.

This is also Task #1 in the AI detector implementation plan and is gated by `require-migration-ticket.sh` — no migration files can be edited without this AgDR + a labelled tracker issue.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Single `CREATE TABLE` migration (chosen)** | Atomic; simple inverse (`DROP TABLE`); zero data risk on a brand-new table; aligns with the project's existing migration numbering convention | None for this case — it's the simplest correct path |
| `CREATE TABLE IF NOT EXISTS` at app boot | Avoids adding a migration file | Diverges from the project's migration convention (`backend/src/db/migrations/migrate-NNN-*.sql`); no version pinning; harder to audit; breaks the migration-gate hook's intent |
| Split into two migrations (table now, indexes later) | Smaller individual commits | Unnecessary churn — the unique index is part of the cache contract (multi-pod safety) and must ship in the same release; splitting risks an intermediate state where parallel cache misses double-bill the LLM |

## Decision

**Chosen: Single migration `backend/src/db/migrations/migrate-015-blog-ai-checks-table.sql`** containing the table, all three indexes, and the `mode` CHECK constraint:

```sql
CREATE TABLE blog_ai_checks (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id                  UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  input_hash               CHAR(64) NOT NULL,
  rubric_version           VARCHAR(32) NOT NULL,
  ai_likelihood_percent    SMALLINT,
  human_likelihood_percent SMALLINT,
  uncertainty_percent      SMALLINT,
  mode                     VARCHAR(32) NOT NULL,
  result                   JSONB NOT NULL,
  llm_provider             VARCHAR(32) NOT NULL,
  llm_model                VARCHAR(100) NOT NULL,
  tokens_input             INTEGER NOT NULL DEFAULT 0,
  tokens_output            INTEGER NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uniq_blog_ai_checks_cache_key
  ON blog_ai_checks (blog_id, input_hash, rubric_version);

CREATE INDEX idx_blog_ai_checks_blog_id ON blog_ai_checks (blog_id);
CREATE INDEX idx_blog_ai_checks_created_at ON blog_ai_checks (created_at);

ALTER TABLE blog_ai_checks
  ADD CONSTRAINT chk_blog_ai_checks_mode CHECK (
    mode IN ('pure_ai', 'ai_assisted', 'human_polish', 'pure_human', 'language_unsupported')
  );
```

`ON DELETE CASCADE` on the `blog_id` FK ensures cache rows are cleaned up automatically if a blog is deleted — no orphaned cache.

## Rollback Plan

**Explicit rollback steps**:

1. `DROP TABLE blog_ai_checks;` — drops the table, all indexes, and the CHECK constraint atomically. Foreign-key cascade means no orphaned references.
2. No data restoration is needed — the table contains only LLM-regenerable cache data. Users may see one cache miss per draft after rollback (≤ $0.02 per check); no user-visible failure.
3. Re-applying the migration file restores the table to its post-apply state.

**Rollback tested against**: **not tested yet** — will be tested against staging before prod apply. This is a hard prerequisite for the prod deploy ticket; I'll mark it as a blocker on the implementation PR.

**Rollback window**: Indefinite — the table only holds regenerable data, so rollback is safe at any time post-apply with no fidelity loss.

## Cross-Service Consumers

- **None at write time today.** The new `ai-detector-service` (Task 9 in the AI detector implementation plan) will be the only writer once it ships.
- No other backend services, external services, ETL jobs, or analytics pipelines reference `blog_ai_checks`.
- **Deploy-order constraint**: migration must apply before the backend pod that exposes `POST /api/blogs/:id/ai-check` starts. Standard "migrate before app start" sequencing — handled by the existing `npm run db:migrate` step in the deploy pipeline (per [AgDR-0018](./AgDR-0018-github-actions-ec2-deploy.md)). No bespoke handling needed.

## Testing Plan

- **Dev smoke**:
  - `cd backend && npm run db:migrate` — apply the migration locally
  - `psql $SUPABASE_DB_URL -c "\d blog_ai_checks"` — verify schema (columns, types, defaults, FK)
  - `psql $SUPABASE_DB_URL -c "\di blog_ai_checks*"` — verify all three indexes exist
  - Manual insert of a sample row, then a second insert with the same `(blog_id, input_hash, rubric_version)` — confirm `ON CONFLICT DO NOTHING` is a no-op and the original row is preserved
  - Drop a parent row in `blogs` — confirm the cascade deletes cache rows
- **Staging verify**:
  - Apply migration to staging Supabase
  - Run the AI detector's 30-fixture Vitest suite end-to-end (FR-16) once the service ships — verify cache rows persist
  - Hit the endpoint twice with the same draft — verify the second call returns `cached: true` and skips the LLM
  - Run the rollback (`DROP TABLE blog_ai_checks;`) and confirm the API returns `502 AI_UNAVAILABLE` cleanly (or whatever the cache-table-missing error path produces) — this validates the rollback runbook before prod
  - Re-apply the migration to restore
- **Canary / phased rollout**: N/A — the table starts empty and is a pure additive change. Rollout aligns with the AI detector feature flag plan (Phase 1 internal dogfood per PRD § Launch Plan).

## Observability

- **During apply**: `CREATE TABLE` on Postgres typically completes in < 100ms. Watch the Supabase migration job log for non-zero errors. No locks on existing tables → no impact on live traffic.
- **Post-apply**:
  - Row count growth in `blog_ai_checks` (Supabase metrics dashboard) — should stay near zero until the AI detector endpoint ships
  - Once the endpoint is live: cache hit ratio via the `recordAiCheckCacheHit` / `recordAiCheckCacheMiss` analytics events sent through the existing `/api/blogs/:id/events` endpoint
  - Cache hit ratio target: ≥ 50% after the first week of production use (PRD success metric — "Iteration: users who re-run after editing")
- **Alerts armed**:
  - P95 query latency on the `uniq_blog_ai_checks_cache_key` index < 50ms (Postgres slow-query log + Supabase metrics)
  - Table size > 1 GB triggers a follow-up to ship the Phase-2 cleanup cron earlier than originally planned
  - Cache hit ratio < 20% after week 2 → investigate (likely indicates input-hash normalisation bugs)

## Consequences

- **Enables** the AI detector's hard-cache requirement (PRD FR-7) and the cost ceiling (≤ $0.02 per check)
- **Adds** monotonic table growth until the Phase-2 cleanup cron lands — accepted per AgDR-0028 (estimated < 50MB/day at peak; well below operational concern)
- **Adds** one indexed Postgres roundtrip per AI check (cache lookup) — sub-millisecond, dwarfed by the LLM call latency
- **The `result` JSONB column** lets us evolve the response schema without further migrations, as long as the cache key (`input_hash + rubric_version`) is unaffected. Schema changes that affect the cache key require a `rubric_version` bump (which is the cache invalidator)
- **No impact** on existing tables, queries, or services. Pure additive change.

## Artifacts

- Ticket: [mohamednaseramein/blog-generator#116](https://github.com/mohamednaseramein/blog-generator/issues/116)
- AgDR-0028 (cache layer choice): [`docs/agdr/AgDR-0028-ai-detector-cache-layer.md`](./AgDR-0028-ai-detector-cache-layer.md)
- AgDR-0018 (deploy pipeline / migration sequencing): [`docs/agdr/AgDR-0018-github-actions-ec2-deploy.md`](./AgDR-0018-github-actions-ec2-deploy.md)
- Tech design: [`projects/blog-generator/technical-design-ai-detector.md`](../../projects/blog-generator/technical-design-ai-detector.md) § "Data Model" + Implementation Plan Task 1
- PRD: [`projects/blog-generator/prd-ai-detector.md`](../../projects/blog-generator/prd-ai-detector.md) § FR-7
- Migration file: `backend/src/db/migrations/migrate-015-blog-ai-checks-table.sql` (to be created during implementation)
- Staging-run log: filled in once applied
- Post-apply dashboard snapshot: filled in once applied
