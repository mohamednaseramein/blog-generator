---
id: AgDR-0010
timestamp: 2026-04-22T00:00:00Z
agent: Claude
trigger: user-prompt
status: accepted
ticket: mohamednaseramein/blog-generator#28
---

# AgDR-0010 — Single Root `.env` and Explicit Dotenv Loading for CLI

## Context

The blog-generator repo is an npm **workspace** (`backend`, `frontend`) with
**Docker Compose** at the monorepo root. Environment variables were stored in
`blog-generator/.env`, but `npm run db:migrate --workspace=backend` runs with
`process.cwd()` equal to `backend/`. The default `import 'dotenv/config'` only
loads `backend/.env`, so `SUPABASE_DB_URL` and other root-level variables were
invisible to `migrate.ts` and `setup.ts`, causing confusing "not set" errors even
when the file was correct.

We needed a **documented convention** and **reliable loading** for CLI scripts.

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A — Single canonical `.env` at repo root** (chosen) | Matches Docker Compose `env_file: .env`; one place for secrets; no drift between services | npm workspace scripts default cwd=`backend/` — must load parent `.env` explicitly in CLI entrypoints |
| **B — Split `backend/.env` and `frontend/.env`** | Matches some per-tool defaults (Vite in `frontend/`) | Duplicates shared keys (`SUPABASE_URL`, anon key); easy to update one file and forget the other; Compose still wants a compose-level source |
| **C — Only root `.env` + symlink `backend/.env` → ../.env** | Tools that only read cwd `.env` work | Symlinks fragile on Windows; opaque for new contributors |

## Decision

**Option A — single canonical `.env` at `workspace/blog-generator/.env`**
(next to `docker-compose.yml`).

Implementation:

- Add `backend/src/db/load-env.ts` which loads, in order:
  1. `resolve(repoRoot, '.env')` — canonical file
  2. `resolve(backendRoot, '.env')` — optional overrides for backend-only local experiments
- Call `loadBlogGeneratorEnv()` at the top of `migrate.ts` and `setup.ts` before
  reading `process.env`.

Second file does not override already-set variables (dotenv default), so repo
root wins for shared keys unless backend `.env` is used only for keys not set
in root (rare).

## Security and Frontend Build

- **Server-only** variables (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`,
  `JWT_SECRET`, `ANTHROPIC_API_KEY`) must never use the `VITE_` prefix — Vite
  inlines `VITE_*` into the browser bundle.
- **Public** client config uses `VITE_*` only (e.g. `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`) as already documented in `.env.example`.

## Consequences

- Developers and CI run `db:migrate` / `db:setup` from repo root with workspace
  npm scripts without copying `.env` into `backend/`.
- Docker Compose continues to use root `.env` unchanged.
- Human-readable convention is documented in `docs/environment-configuration.md`.
- Optional `backend/.env` remains supported for local-only overrides without
  committing it.

## Artifacts

- `backend/src/db/load-env.ts`
- `backend/src/db/migrate.ts`, `backend/src/db/setup.ts` — call loader
- `.env.example` — note on root placement
- `docs/environment-configuration.md`
- Tracker: https://github.com/mohamednaseramein/blog-generator/issues/28
