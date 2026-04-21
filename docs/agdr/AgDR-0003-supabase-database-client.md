# AgDR-0003 — Supabase as Database Layer

> In the context of the blog-generator needing a hosted PostgreSQL database, facing the choice between raw pg driver against a self-managed Postgres instance vs a managed cloud platform, I decided to use Supabase cloud with the `@supabase/supabase-js` client to achieve zero database infrastructure overhead and a growth path to Supabase Auth, Realtime, and Storage, accepting a vendor dependency on Supabase.

## Context

The project is a greenfield application with a small team. The initial tech design used `pg` (node-postgres) pointing at a local PostgreSQL instance. The requirement is to switch to a hosted solution. Supabase was chosen over raw cloud Postgres (RDS, Neon, etc.) because the JS client unlocks future platform features beyond just a connection string.

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| Raw `pg` + Supabase Postgres URL | Minimal change, keeps existing repo layer | No SDK benefits, misses Auth/Realtime/Storage |
| `@supabase/supabase-js` client (chosen) | Query builder, typed responses, Auth/Realtime/Storage ready, active SDK | Vendor lock-in, slightly different query API |
| Prisma + Supabase Postgres URL | Strong typing, migrations tooling | Extra abstraction layer, heavier setup |

## Decision

Chosen: **`@supabase/supabase-js`** client on the backend (service role key, bypasses RLS) and optionally on the frontend (anon key, respects RLS) for future features.

EP-04 (Authentication) will evaluate whether to adopt Supabase Auth or keep custom JWT — that decision is deferred. For now, the backend uses service role to manage its own auth checks.

## Consequences

- Remove `pg` and `@types/pg` from backend dependencies
- Add `@supabase/supabase-js` to backend (and optionally frontend)
- Repositories are rewritten to use the Supabase query builder instead of raw SQL
- Schema is applied via the Supabase dashboard SQL editor (or Supabase CLI migrations)
- `DATABASE_URL` replaced by `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

## Artifacts

- `backend/src/db/supabase.ts`
- Updated `backend/src/repositories/`
- Updated `backend/package.json`
