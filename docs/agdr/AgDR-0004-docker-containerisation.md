# AgDR-0004 — Docker Containerisation Strategy

> In the context of needing a reproducible, portable runtime for the blog-generator, facing the choice of how to containerise the stack, I decided to use Docker Compose with two containers (backend + frontend) and Supabase cloud as the database, accepting that the database is not containerised locally, to achieve the simplest possible compose file with no local Postgres overhead.

## Context

The project uses Supabase cloud for the database, so there is no need for a local Postgres container. The frontend is a Vite-built React SPA served by Nginx. The backend is a Node.js Express API.

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| 2-container Compose (backend + frontend, DB = Supabase cloud) — chosen | Simple, no local DB management, matches prod topology | Requires internet access / Supabase credentials for local dev |
| 3-container Compose (+ local Postgres) | Fully offline dev | Two DB configs to maintain; diverges from Supabase SDK benefits |
| Self-hosted Supabase in Compose (~12 containers) | Fully offline + all Supabase features | Heavy setup, high maintenance, overkill for current team size |

## Decision

Chosen: **2-container Compose** — `backend` (Node 20 Alpine) + `frontend` (Nginx Alpine, multi-stage build). Database is Supabase cloud, not a local container.

Frontend container uses a multi-stage Dockerfile: Stage 1 builds the Vite bundle, Stage 2 copies the `dist/` into an Nginx image. This keeps the production image small (~25 MB).

## Consequences

- `docker-compose.yml` at repo root with `backend` and `frontend` services
- Backend env vars injected via `.env` file (Docker Compose `env_file`)
- Frontend build args for Vite public env vars (`VITE_API_URL`, `VITE_SUPABASE_ANON_KEY`)
- Nginx proxies `/api/*` to the backend container so the frontend doesn't need CORS config in production
- `docker-compose.override.yml` pattern available for local dev overrides without touching the main file

## Artifacts

- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `.dockerignore` (root + per-package)
