---
id: AgDR-0035
timestamp: 2026-05-14T00:00:00Z
agent: claude-opus-4-7 (Tech Lead role)
model: claude-opus-4-7
session: subscriptions-migration
trigger: user-prompt
status: draft
ticket: mohamednaseramein/blog-generator#155
---

# AgDR-0035 — Migration: Create Subscription Plans Schema (`plans` + `subscriptions`)

> In the context of building the Subscription Plans epic ([#149](https://github.com/mohamednaseramein/blog-generator/issues/149), [PRD](../../projects/blog-generator/prd-subscriptions.md), [tech design](../../projects/blog-generator/technical-design-subscriptions.md)), facing the need for an admin-managed plan catalogue, one active subscription per user, and a zero-orphan cutover for every existing user, I decided to execute a schema migration in two files — `migrate-016` (DDL for `plans` + `subscriptions`) and `migrate-017` (seed 3 plans + backfill existing users to Free + extend the `handle_new_user()` trigger) — to achieve a correct starting state for the epic, accepting the tradeoff of monotonic `subscriptions` growth (one row per user, permanently) and a one-time function replacement that must be reverted as part of rollback.

**Migration type**: schema
**Affected tables / entities**: `plans` (new), `subscriptions` (new), `users` (read-only — backfill source + FK target), `public.handle_new_user()` (function replaced)
**Estimated downtime**: none — `CREATE TABLE` on two brand-new tables (no locks on existing tables), an idempotent `INSERT … SELECT` backfill, and a `CREATE OR REPLACE FUNCTION`. No `ALTER TABLE` on an existing hot table, no column rewrite, no index build on a large table.
**Data volume**: `plans` — 3 seed rows. `subscriptions` — one row per existing `users` row (exact count unknown from the design seat; early-stage product, expected < a few hundred). A size check is included in the testing plan.
**Target environment(s)**: staging → prod

## Context

The Subscription Plans epic ([#149](https://github.com/mohamednaseramein/blog-generator/issues/149)) introduces admin-managed plans, self-serve upgrade/downgrade, and server-side quota enforcement. The entire epic rests on two invariants this migration establishes:

1. **A plan catalogue exists** — `plans`, with four numeric limit columns, a single-default constraint, and a soft-delete (`archived_at`).
2. **Every user has exactly one active subscription** — `subscriptions`, with a partial unique index on `(user_id) WHERE status = 'active'`. Existing users are backfilled onto **Free**; new users auto-subscribe to the default plan via the existing `handle_new_user()` auth-sync trigger.

This is the first story (US-SUB-10) of the epic and is gated by `require-migration-ticket.sh` — no migration files can be edited without this AgDR plus a labelled tracker issue. The schema shape, the seed values, and the trigger extension are all specified in the [technical design](../../projects/blog-generator/technical-design-subscriptions.md) (§ Data Model, KD-2/KD-4).

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Two files — `migrate-016` (DDL) + `migrate-017` (seed + backfill + trigger)** (chosen) | Separates pure DDL from data/seed/function changes; matches the project's established convention (`migrate-008-author-profiles` then `migrate-009-seed-predefined-profiles`); rollback reasons cleanly per concern; the numbered runner guarantees `016` (creates `plans`) applies before `017` (the new function references `plans`) | Two files to review instead of one |
| Single combined migration file | Atomic in one file | Mixes DDL + DML + function replacement in one blob; harder to reason about rollback per-concern; diverges from the table-then-seed convention already in the repo |
| App-boot `CREATE TABLE IF NOT EXISTS` + seed-on-start | No migration file to add | Diverges from the `backend/src/db/migrations/migrate-NNN-*.sql` convention; no version pinning; not auditable; defeats the migration-gate hook's intent; seed/backfill on every boot is fragile |

A sub-decision — **how new users get a subscription** — was settled in the tech design (KD-4): extend the existing `handle_new_user()` trigger rather than add app-layer code in the registration handler. Rationale: the trigger already fires on `auth.users` INSERT to create the `public.users` row, so extending it guarantees no orphaned user regardless of code path (admin-created, trigger-created, or future OAuth signups). App-layer creation would miss those paths.

## Decision

**Chosen: two migration files**, exactly as specified in the technical design § Data Model.

**`migrate-016-subscriptions-schema.sql`** — DDL only:

- `plans` — `slug` (unique, stable), `name`, `description`, `price_cents` + `currency` (display-only in v1; Stripe seam), `billing_period` (`monthly` only), four nullable limit columns (`blog_quota`, `ai_check_quota`, `author_profile_limit`, `reference_extraction_quota`; NULL = unlimited) each with a `>= 0` CHECK, `is_public`, `is_default`, `archived_at` (soft delete), `sort_order`, timestamps. Partial unique index `uniq_plans_single_default ON plans (is_default) WHERE is_default = true AND archived_at IS NULL` enforces at most one default.
- `subscriptions` — `user_id` FK → `users(id) ON DELETE CASCADE`, `plan_id` FK → `plans(id)`, `status` (`active` only in v1; enum reserves `past_due`/`canceled` for Stripe), `current_period_start` / `current_period_end`, `stripe_subscription_id` (nullable UNIQUE — Stripe seam), `changed_by` (nullable admin FK), timestamps. Partial unique index `uniq_subscriptions_one_active_per_user ON subscriptions (user_id) WHERE status = 'active'` is the invariant the whole feature rests on.

**`migrate-017-seed-plans-and-backfill.sql`** — data + function:

- Seed 3 plans: **Free** (default, public, `price_cents = 0`, limits 3/5/1/10), **Pro** (public, `price_cents = 1900`, limits 50/200/10/300), **Team** (public, `price_cents = 9900`, limits NULL/NULL/50/NULL).
- Backfill: `INSERT INTO subscriptions … SELECT … FROM users u WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active')` — **idempotent**, current period set to calendar-month bounds (UTC).
- `CREATE OR REPLACE FUNCTION public.handle_new_user()` — the original body (insert the `public.users` row) plus: look up the default plan and insert an `active` subscription for the new user.

Seed values are admin-editable post-launch (PRD US-SUB-10 AC2). The verification query — `SELECT COUNT(*) FROM users u WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active')` — must return `0` (PRD US-SUB-10 AC4).

## Rollback Plan

**Explicit rollback steps** (run in order — both migrations are purely additive, so rollback is clean and destroys only subscription assignments, all of which point at Free immediately post-backfill):

1. **Restore the trigger function.** `CREATE OR REPLACE FUNCTION public.handle_new_user()` with its original `migrate-013` body (insert the `public.users` row only — no subscription insert). This must run first so no new signup tries to write to a `subscriptions` table that step 3 is about to drop.
2. **Drop `subscriptions`.** `DROP TABLE IF EXISTS subscriptions;` — drops the table, both partial unique indexes, and all FKs. Must precede step 3 because `subscriptions.plan_id` FK-references `plans`.
3. **Drop `plans`.** `DROP TABLE IF EXISTS plans;`
4. **Un-record the migrations.** `DELETE FROM schema_migrations WHERE filename IN ('migrate-016-subscriptions-schema.sql', 'migrate-017-seed-plans-and-backfill.sql');` so the runner will re-apply them on the next forward run.
5. No data restoration is needed on existing tables — `users`, `blogs`, `author_profiles`, etc. are never altered by this migration (only read for the backfill, and referenced as FK targets). Re-applying both files restores the post-apply state.

**Rollback tested against**: **not tested yet** — will be exercised against **staging** before prod apply (apply → verification query → run steps 1–4 → confirm tables gone + function restored → re-apply). This is a hard prerequisite for the prod-apply step and will be called out as a blocker on the implementation PR.

**Rollback window**: Indefinite for schema integrity — no existing table is mutated, so rollback is structurally safe at any time. The only loss is subscription state (plan assignments + period windows); within the v1 preview (display-only billing) that is low-fidelity data and re-derivable by re-running the backfill.

## Cross-Service Consumers

- **None at migration time.** `plans` and `subscriptions` are brand-new tables. The blog-generator backend is the only service and has no code reading or writing these tables until later stories in epic #149 add the repositories.
- No external services, ETL jobs, or analytics pipelines reference the affected tables. The `users` table is only read (backfill `SELECT`) and used as an FK target.
- **Deploy-order constraint**: the migration must apply before any backend code that reads `plans` / `subscriptions` is deployed — standard "migrate before app start" sequencing, handled by the existing `npm run db:migrate` deploy step. Within the migration set, `migrate-016` must apply before `migrate-017` (the replaced `handle_new_user()` references `plans`) — guaranteed by the numbered, lexically-sorted migration runner (`migrate.ts`).

## Testing Plan

- **Dev smoke**:
  - `npm run db:migrate --workspace=backend` — apply `016` + `017` against a dev Supabase
  - `psql $SUPABASE_DB_URL -c "\d plans"` / `"\d subscriptions"` — verify columns, types, defaults, FKs, partial unique indexes
  - `SELECT slug, price_cents, blog_quota, ai_check_quota, author_profile_limit, reference_extraction_quota, is_default FROM plans ORDER BY sort_order;` — verify the 3 seed rows and that exactly one is `is_default`
  - Run the verification query — must return `0`
  - Insert a row into `auth.users` (or use the Supabase test signup) — confirm the trigger creates both a `users` row and an `active` Free `subscriptions` row
- **Staging verify**:
  - Apply both migrations to staging Supabase
  - Verification query returns `0`; `SELECT COUNT(*) FROM subscriptions` equals `SELECT COUNT(*) FROM users` (size check)
  - Confirm the 3 plans seeded with the exact values from the tech design
  - Create a test signup on staging — confirm a Free subscription is auto-created by the trigger
  - **Exercise the rollback runbook** (steps 1–4 above), confirm `plans` + `subscriptions` are gone and `handle_new_user()` is back to its `migrate-013` body, then re-apply — this validates the runbook before prod
- **Canary / phased rollout**: N/A — additive schema, applied all-at-once per the PRD launch plan. The behaviour change users feel (quota enforcement) ships in a separate, later story (US-SUB-08), not in this migration.

## Observability

- **During apply**: `migrate.ts` logs each file as it applies (`▶️ Applying … / ✅ … applied`) and exits non-zero on failure. `CREATE TABLE` on new tables completes in well under a second; no locks on existing tables → no impact on live traffic. The backfill is a single `INSERT … SELECT` over `users` — bounded by the (small) user count.
- **Post-apply**:
  - Verification query = `0` orphaned users (release gate)
  - `plans` row count = 3; `subscriptions` row count = `users` row count
  - Watch backend error logs after the US-SUB-10 code deploy for any subscription-lookup failures (there should be none — no code reads these tables until later stories)
- **Alerts armed**: no DB dashboards exist for this project today (noted as a gap). For this migration the verification query + row-count checks serve as the explicit post-apply gate; ongoing `subscriptions` growth is bounded 1:1 with user count and needs no alert.

## Consequences

- **Enables** the entire Subscription Plans epic — every later story (admin catalogue, landing, self-serve, enforcement) reads from these two tables.
- **Establishes** the "exactly one active subscription per user" invariant at the database level via a partial unique index — enforcement code can rely on it rather than defensively handling the multi-row case.
- **Adds** one permanent `subscriptions` row per user (grows 1:1 with the user base; negligible storage).
- **Adds** a second responsibility to `handle_new_user()` — it now creates a subscription as well as a user row. Rollback must remember to revert the function, not just drop the tables (captured in the rollback plan).
- **Builds the Stripe seam** without integrating Stripe: `price_cents` + `currency`, the `status` enum, `stripe_subscription_id`, and the `current_period_*` columns all exist now; a later Stripe epic changes only how those columns are populated.
- **No impact** on existing tables, queries, or services — purely additive.

## Artifacts

- Ticket: [mohamednaseramein/blog-generator#155](https://github.com/mohamednaseramein/blog-generator/issues/155)
- Epic: [mohamednaseramein/blog-generator#149](https://github.com/mohamednaseramein/blog-generator/issues/149)
- Tech design: [`projects/blog-generator/technical-design-subscriptions.md`](../../projects/blog-generator/technical-design-subscriptions.md) § Data Model, KD-2, KD-4
- PRD: [`projects/blog-generator/prd-subscriptions.md`](../../projects/blog-generator/prd-subscriptions.md) § US-SUB-10
- Related: [`docs/agdr/AgDR-0025-role-column-vs-table.md`](./AgDR-0025-role-column-vs-table.md) (the `users` table this FK-references)
- Migration files: `backend/src/db/migrations/migrate-016-subscriptions-schema.sql`, `migrate-017-seed-plans-and-backfill.sql` (to be created during implementation)
- Staging-run log: filled in once applied
- Post-apply verification-query result: filled in once applied
