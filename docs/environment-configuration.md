# Environment configuration (blog-generator)

This document is the **source of truth** for where environment variables live and how they are loaded. It implements the decision in [AgDR-0017 — Move .env to backend/](./agdr/AgDR-0017-backend-env-colocation.md) (supersedes AgDR-0010).

## Canonical location

Use **one `.env` file in `backend/`**:

`workspace/blog-generator/backend/.env` — co-located with the backend code that consumes it.

That file is **gitignored**. Copy from `backend/.env.example` and fill in real values.

## Variable categories

| Category | Examples | Where used |
|----------|-----------|------------|
| Supabase HTTP API | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Backend (server) |
| Direct Postgres (migrations) | `SUPABASE_DB_URL` | `npm run db:migrate` only |
| Browser-safe (Vite build args) | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Injected into frontend build via docker compose |
| Server secrets | `JWT_SECRET`, `ANTHROPIC_API_KEY` | Backend only |

**Never** prefix server-only or database credentials with `VITE_` — Vite embeds
those names into the client bundle.

## Local development

```bash
cp backend/.env.example backend/.env
# edit backend/.env

npm run db:migrate --workspace=backend
npm run dev
```

## Docker

Docker Compose `env_file` at the service level injects runtime variables into
the container, but **does not** affect compose-level `${VAR}` substitution used
in `build.args`. Pass `--env-file backend/.env` so compose can resolve the
frontend build args:

```bash
docker compose --env-file backend/.env up --build
```

## Related documents

- [AgDR-0017 — Move .env to backend/](./agdr/AgDR-0017-backend-env-colocation.md)
- [AgDR-0010 — Single root `.env` (superseded)](./agdr/AgDR-0010-single-root-env-configuration.md)
- [AgDR-0004 — Docker containerisation](./agdr/AgDR-0004-docker-containerisation.md)
