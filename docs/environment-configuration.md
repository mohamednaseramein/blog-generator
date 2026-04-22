# Environment configuration (blog-generator)

This document is the **source of truth** for where environment variables live and how they are loaded. It implements the decision in [AgDR-0010 — Single root `.env`](./agdr/AgDR-0010-single-root-env-configuration.md).

## Canonical location

Use **one `.env` file at the repository root**:

`workspace/blog-generator/.env` — same directory as `docker-compose.yml`.

That file is **gitignored**. Copy from `.env.example` and fill in real values.

## Why not `backend/.env` only?

- **Docker Compose** injects variables from the root `.env` via `env_file: .env`.
- **npm workspace** runs package scripts (e.g. `db:migrate`) with `cwd` set to
  `backend/`. Plain `dotenv/config` only reads `backend/.env`, so root secrets
  would be missed. The backend CLI tools `migrate.ts` and `setup.ts` call
  `loadBlogGeneratorEnv()` to load the **parent** `.env` first, then optional
  `backend/.env` for local overrides.

## Variable categories

| Category | Examples | Where used |
|----------|-----------|------------|
| Supabase HTTP API | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Backend (server) |
| Direct Postgres (migrations) | `SUPABASE_DB_URL` | `npm run db:migrate` only |
| Browser-safe (Vite) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Frontend build / runtime |
| Server secrets | `JWT_SECRET`, `ANTHROPIC_API_KEY` | Backend only |

**Never** prefix server-only or database credentials with `VITE_` — Vite embeds
those names into the client bundle.

## Local development

From repo root:

```bash
cp .env.example .env
# edit .env

npm run db:migrate --workspace=backend
npm run dev   # or docker compose up --build
```

## Docker

Compose reads root `.env` automatically for variable substitution and
`env_file` on services. No separate compose env file is required for the default
layout.

## Related documents

- [AgDR-0010 — Single root `.env`](./agdr/AgDR-0010-single-root-env-configuration.md)
- [AgDR-0004 — Docker containerisation](./agdr/AgDR-0004-docker-containerisation.md)
