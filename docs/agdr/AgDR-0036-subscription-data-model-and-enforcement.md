---
id: AgDR-0036
timestamp: 2026-05-14T00:00:00Z
agent: claude-opus-4-7 (Tech Lead role)
model: claude-opus-4-7
session: subscriptions-architecture
trigger: user-prompt
status: accepted
ticket: mohamednaseramein/blog-generator#149
---

# AgDR-0036 — Subscription Plans: Data-Model & Enforcement Architecture

> In the context of the Subscription Plans epic ([#149](https://github.com/mohamednaseramein/blog-generator/issues/149), [PRD](../../projects/blog-generator/prd-subscriptions.md), [tech design](../../projects/blog-generator/technical-design-subscriptions.md)), facing four design choices that shape every story in the epic — how plan limits are stored, how usage is counted, how enforcement is wired into existing handlers, and what HTTP status a quota block returns — I decided on typed limit columns, `created_at`-window counting with no counter table, a shared `assertWithinQuota` service helper called explicitly, and `402 Payment Required` with a typed `QUOTA_EXCEEDED` code, to achieve type-safety, minimal new infrastructure, and a clean independently-revertible enforcement layer, accepting that a fifth limit later needs a migration and that quota counts are eventually-consistent under deletes.

This AgDR records the four non-migration key decisions (KD-1, KD-3, KD-5, KD-6) from the technical design. The two remaining decisions — KD-2 (period tracking via `current_period_*` columns) and KD-4 (new-user subscription via the `handle_new_user()` trigger) — are recorded in [AgDR-0035](./AgDR-0035-migration-subscriptions-schema.md) because they are realised in the migration itself.

## Context

The epic introduces plans with four numeric limits (blogs/month, AI checks/month, author profiles total, reference extractions/month), self-serve plan switching, and server-side enforcement on four existing handlers (`handleCreateBlog`, `handleRunAiCheck`, the profile-create path, `handleAddReference`). Billing is display-only in v1. These four choices were made up-front because they constrain the schema (US-SUB-10), the services (US-SUB-05/06/07), and the enforcement story (US-SUB-08) — deciding them per-story would risk rework.

## Decision 1 (KD-1) — Plan limits: four typed columns, not JSONB

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Four explicit integer columns** (chosen) | Type-safe end-to-end (DB → repository → domain → handler); `CHECK (… >= 0)` constraints at the DB; queryable (`WHERE blog_quota IS NULL`); matches the codebase's typed/DDD lean | Adding a 5th limit later requires a migration |
| Single JSONB `limits` column | Add a limit with no migration; flexible | Loses DB-level type safety and constraints; every read needs runtime shape validation; awkward to query; invites silently-malformed limit objects |

### Decision

**Chosen: four nullable integer columns** — `blog_quota`, `ai_check_quota`, `author_profile_limit`, `reference_extraction_quota`, each `CHECK (col IS NULL OR col >= 0)`, `NULL` meaning unlimited. v1 has exactly four known limits; the flexibility JSONB buys is flexibility we do not need, and the type-safety loss is real. JSONB is the documented upgrade path if limits ever proliferate beyond what columns comfortably express.

## Decision 2 (KD-3) — Usage counting: `created_at` window, no counter table

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Count live rows by `created_at` within the period** (chosen) | No new table; all four metrics already have `created_at`; "deleting an item frees a slot this period" is acceptable per the PRD; trivially correct after a period roll | A deleted row stops counting — usage is not a permanent ledger; a high-churn user could create/delete to exceed the intended cap within a period |
| Dedicated `usage_counters` table, incremented per action | Usage is a permanent ledger; deletes don't refund slots; supports strict "creation events" semantics | New table + new write on every gated action; needs its own period-roll/reset logic; more to keep consistent |

### Decision

**Chosen: count live rows by `created_at`** within `[current_period_start, current_period_end)` for the three monthly metrics (blogs, AI checks, reference extractions), and a standing `COUNT(*)` of live non-predefined rows for author profiles. The PRD (Edge Cases) explicitly accepts "deleting an item frees a slot this period" — it even gives users a clear path to fit a downgrade. A `usage_counters` table is the documented upgrade path if a strict permanent-ledger model is later required. The churn-abuse risk is acceptable in a display-only-billing v1 and is called out for revisit when Stripe lands.

## Decision 3 (KD-5) — Enforcement: a shared service helper, not Express middleware

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Shared `assertWithinQuota(userId, metric)` service helper, called explicitly** (chosen) | One tested unit; each call-site is one explicit line; works across the four endpoints which live on different routers; composes with `handleRunAiCheck`'s ordered pre-checks (language, cache, rate-limit); trivial to revert per call-site | The four call-sites must each remember to call it (mitigated by tests + the isolated enforcement PR) |
| Express middleware per route | "Set once on the route" feel | The four endpoints are on different routers; param-plumbing "which metric does this route consume" is awkward; can't easily sit *after* the AI-check handler's own pre-checks; harder to unit-test in isolation |

### Decision

**Chosen: a shared service helper** `assertWithinQuota(userId, metric)` in `quota-service.ts`, throwing `AppError(402, 'QUOTA_EXCEEDED', …)` when at/over limit and no-op when under limit or unlimited. Called as one explicit line at the top of each of the four gated handlers (for `handleRunAiCheck`, after its existing pre-checks). This is also why US-SUB-08 ships last and isolated — the four call-sites are added in one PR that can be reverted on its own if enforcement misfires.

## Decision 4 (KD-6) — Quota-exceeded response: `402 Payment Required` + typed code

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **`402 Payment Required` + `code: 'QUOTA_EXCEEDED'`** (chosen) | Semantically signals "an upgrade unlocks this"; lets the frontend branch cleanly on status to show the upgrade prompt; distinct from `403` (auth/permission) and `401` (unauthenticated) | `402` is historically under-used; some proxies/clients treat it as unusual (low risk for a same-origin SPA API) |
| `403 Forbidden` | Conventional, universally understood | Conflates "you lack permission" with "you've hit your plan limit" — the frontend would need to inspect the body to tell them apart |

### Decision

**Chosen: `402 Payment Required`** with a typed payload `{ code: 'QUOTA_EXCEEDED', message, metric, limit, usage }`, carried through the existing `AppError` envelope (extended with structured `details`, or the gated handlers respond directly — an implementation-time call that preserves the envelope shape either way). Resolves PRD OQ-5. The frontend keys off the `402` + `QUOTA_EXCEEDED` code to surface `QuotaBlockPrompt` and fire the `quota_blocked` analytics event.

## Consequences

- **Type-safety** holds from the `plans` columns through the `PlanLimits` domain value object to the handlers — no runtime limit-shape validation needed.
- **No new infrastructure** for usage tracking — usage is derived from data that already exists; the only new tables are `plans` and `subscriptions` (AgDR-0035).
- **Enforcement is one revertible PR** — the four `assertWithinQuota` call-sites land together in US-SUB-08 and can be removed together if enforcement misbehaves in production.
- **A fifth limit later costs a migration** — accepted; if limits proliferate, the JSONB path is documented.
- **Usage is eventually-consistent under deletes** — not a permanent ledger; revisit with a `usage_counters` table if/when Stripe billing makes strict accounting necessary.
- **`402` becomes a meaningful status in this API** — the frontend's error handling must recognise it; documented for the US-SUB-08 frontend work.

## Artifacts

- Epic: [mohamednaseramein/blog-generator#149](https://github.com/mohamednaseramein/blog-generator/issues/149)
- Tech design: [`projects/blog-generator/technical-design-subscriptions.md`](../../projects/blog-generator/technical-design-subscriptions.md) § Key Technical Decisions (KD-1, KD-3, KD-5, KD-6)
- PRD: [`projects/blog-generator/prd-subscriptions.md`](../../projects/blog-generator/prd-subscriptions.md) (resolves OQ-5)
- Migration AgDR (KD-2, KD-4): [`docs/agdr/AgDR-0035-migration-subscriptions-schema.md`](./AgDR-0035-migration-subscriptions-schema.md)
- Stories affected: #155 (US-SUB-10), #152 (US-SUB-05/06/07), #154 (US-SUB-08)
