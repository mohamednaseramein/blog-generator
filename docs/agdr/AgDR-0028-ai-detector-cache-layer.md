---
id: AgDR-0028
timestamp: 2026-05-07T00:00:00Z
agent: claude-opus-4-7 (Tech Lead role)
model: claude-opus-4-7
session: ai-detector-tech-design
trigger: user-prompt
status: executed
---

# AgDR-0028 — AI Detector Cache Layer: Postgres Table

> In the context of the AI content detector's hard-cache requirement (PRD FR-7 — identical input + same `rubric_version` returns cached result without re-billing the LLM), facing a choice between a new Postgres table (`blog_ai_checks`), an in-memory per-process cache, or a Redis instance, I decided to store cache rows in a new Postgres table keyed by `(blog_id, input_hash, rubric_version)` with a unique index, to achieve persistence across restarts, future-proof multi-pod scaling, and zero new infrastructure, accepting the tradeoff of one DB roundtrip on cache hit (~milliseconds) and a table that grows monotonically until a Phase-2 cleanup cron is added.

## Context

The PRD requires hard caching: identical `(body + seo_title + meta_description)` hashed with the current `rubric_version` must return the previous LLM result without re-calling the API. Cost target is ≤ $0.02 per call; without caching, a user re-running on an unchanged draft would re-bill every time.

The blog-generator stack today:

- Backend: Express + TypeScript, Anthropic SDK for LLM calls, Supabase Postgres for all persistence
- Deploy: single backend pod (EC2 docker compose); see [AgDR-0018](./AgDR-0018-github-actions-ec2-deploy.md)
- No Redis. No background job queue. No existing cache layer beyond per-request memoisation.

Cache hit rate is expected to be high — users typically re-click "Run AI check" on the Publish step after running it once on the Draft step (same body) — so the cache is load-bearing for the cost target.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **New Postgres table `blog_ai_checks` (chosen)** | Already in stack — zero new infra, zero new ops burden; persistent across restarts; multi-pod safe via the unique index + `ON CONFLICT DO NOTHING`; results queryable for analytics later | One DB roundtrip on cache hit (single-row index lookup; ~ms); table grows until a cleanup cron is added (deferred to Phase 2) |
| In-memory `Map<inputHash, AiCheckResult>` per process | Sub-millisecond hit; no DB cost | Lost on every redeploy → cache miss after every push; breaks the moment we scale to multiple pods (different pods, different caches → inconsistent results for the same draft); user-visible flapping |
| Redis (new dep) | Sub-millisecond hit; multi-pod safe by design | New piece of infra to provision, secure, monitor; additional `.env` keys; recovery story for Redis failure must be designed; out of scope for v1 |

## Decision

**Chosen: New Postgres table `blog_ai_checks`.**

Schema per the tech design's migration `015-blog-ai-checks-table.sql`. Unique index on `(blog_id, input_hash, rubric_version)` is the cache key. The handler does:

```ts
// Cache lookup
const cached = await repo.findFresh(blogId, inputHash, rubricVersion);
if (cached) return cached.toApiResponse({ cached: true });

// Cache miss — call LLM, then:
await repo.insert(row); // ON CONFLICT (blog_id, input_hash, rubric_version) DO NOTHING
```

The `ON CONFLICT DO NOTHING` handles the parallel-miss race: two concurrent calls miss the cache, both bill the LLM, both try to insert — only the first insert succeeds. Both clients receive a consistent response (we don't re-read after the no-op insert because the `RETURNING` from the insert returns the row that won; if it returns nothing we re-read once).

Cleanup is deferred to Phase 2: rows older than 90 days will be purged by a daily cron. Until then the table grows monotonically. Estimated bytes per row ≈ 5KB (JSONB is the bulk); even at 10K runs/day that's ~50MB/day, an order of magnitude below anything that matters operationally.

## Consequences

- Zero new infrastructure. Zero new `.env` keys. Zero new ops alerts.
- Cache hit: one indexed Postgres lookup (~ms). Cache miss: same lookup + LLM call + one insert. Negligible overhead beyond the LLM call itself.
- Multi-pod-safe by design. When we scale beyond one pod, no migration work needed for the cache.
- Future: when we add a daily cron for housekeeping (Phase 2), it'll read this table along with a few others.
- If a future scale point makes the Postgres roundtrip the bottleneck (which the math says won't happen), revisit with a Redis AgDR.

## Artifacts

- Tech design: [`projects/blog-generator/technical-design-ai-detector.md`](../../projects/blog-generator/technical-design-ai-detector.md) §§ "Data Model", "Implementation Plan" Tasks 1, 8
- Implementation: `backend/src/db/migrations/migrate-015-blog-ai-checks-table.sql` (new), `backend/src/repositories/blog-ai-checks-repository.ts` (new)
