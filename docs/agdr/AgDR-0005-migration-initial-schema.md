# Initial Schema — Create blogs and blog_briefs Tables

> In the context of a greenfield blog-generator project using Supabase as the hosted database, facing the need to define the initial persistence layer for EP-01, I decided to execute a schema migration creating the `blogs` and `blog_briefs` tables to achieve a persisted domain model, accepting that these tables define the core data contract for all subsequent epics.

**Migration type**: schema
**Affected tables / entities**: `blogs`, `blog_briefs`
**Estimated downtime**: none — additive, new tables on a brand-new database with no existing data
**Data volume**: 0 rows
**Target environment(s)**: staging → prod

## Context

The project requires two tables to support EP-01 (Blog Input & Alignment):
- `blogs` — one record per blog generation session, tracking status and wizard step
- `blog_briefs` — one-to-one with `blogs`, holding the user's form inputs and scrape/alignment state

Without these tables the API cannot write or read any data. This is the first migration in the project — there is no prior schema to coordinate with.

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| Raw `schema.sql` pasted manually into Supabase SQL Editor | Simple, zero tooling | Manual, error-prone, not reproducible, no audit trail |
| Versioned migration file (chosen) | Reproducible, auditable, version-controlled, runnable via CLI | Requires a migration runner (Supabase CLI or custom script) |

## Decision

Chosen: **versioned migration file**, because reproducibility and audit trail outweigh the setup cost of a migration runner. The schema is applied via the Supabase CLI (`supabase db push`) or a custom `db:migrate` npm script.

## Rollback Plan

1. Connect to the Supabase project (dashboard SQL Editor or `psql`)
2. Run:
   ```sql
   DROP TABLE IF EXISTS blog_briefs;
   DROP TABLE IF EXISTS blogs;
   ```
3. Verify via `\dt` (psql) or the Supabase Table Editor that both tables are gone

**Rollback tested against**: not tested — safe because both tables are empty at time of apply; no data at risk
**Rollback window**: any time before EP-01 data is written (i.e. before the app goes live)

## Cross-Service Consumers

- **blog-generator backend** — sole writer and reader of both tables; no other services
- **none** beyond the backend

Deploy-order constraint: none — migration runs before the backend starts

## Testing Plan

- **Dev smoke**: `npm run db:setup --workspace=backend` — verifies both tables are accessible via Supabase client
- **Staging verify**: run migration, then `npm run db:setup` and confirm `✅ Table "blogs" — OK` and `✅ Table "blog_briefs" — OK`
- **Canary / phased rollout**: n/a — new empty tables, no traffic impact

## Observability

- **During apply**: Supabase dashboard → Table Editor — both tables should appear immediately after the migration runs
- **Post-apply**: `npm run db:setup` exits 0; `/health` endpoint returns `{ status: "ok" }` and `POST /api/blogs` returns `201`
- **Alerts armed**: none yet — observability is scoped to EP-01 delivery

## Consequences

- `blogs` and `blog_briefs` tables are the foundation for all subsequent epics (EP-02 through EP-05)
- Column types and constraints defined here become the contract — future changes require new migrations
- `blog_briefs.blog_id` has a `UNIQUE` constraint enforcing the 1:1 relationship with `blogs`

## Artifacts

- Ticket: [mohamednaseramein/blog-generator#6](https://github.com/mohamednaseramein/blog-generator/issues/6)
- Migration file: `backend/src/db/migrations/migrate-001-initial-schema.sql`
- Commits / PRs: TBD
