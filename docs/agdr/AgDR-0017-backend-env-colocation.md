# AgDR-0017 — Move .env to backend/ (supersedes AgDR-0010)

> In the context of env file organisation, facing the need to co-locate secrets with the service that uses them, I decided to move `.env` to `backend/` and use `docker compose --env-file backend/.env` for compose-level variable substitution, accepting that developers must pass the `--env-file` flag when running `docker compose up`.

## Context

AgDR-0010 chose a single root `.env` primarily because Docker Compose auto-loads `.env` from the project root, enabling `${VAR}` interpolation in `docker-compose.yml` without any extra flags. The backend-specific `load-env.ts` was added to walk up to the root from `backend/` cwd.

Two issues motivated revisiting this:

1. **Discoverability** — all backend secrets live next to `docker-compose.yml`, not next to the backend code that consumes them. New contributors look in `backend/` first.
2. **Vite `.env.example` precedent** — adding `frontend/.env.example` in PR #51 established per-workspace env files as the project convention. Keeping the backend file at the root is now inconsistent.

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A — Root `.env`** (AgDR-0010) | Compose auto-interpolation; no flag needed | Secrets not co-located with backend; inconsistent with frontend/.env.example |
| **B — `backend/.env` + `--env-file` flag** (chosen) | Co-located with backend code; consistent with frontend convention; one canonical file | Compose users must pass `--env-file backend/.env`; documented in compose file and env.example |
| **C — Symlink `backend/.env → ../.env`** | Satisfies both locations | Fragile on Windows, opaque to contributors (rejected in AgDR-0010) |

## Decision

**Option B** — `backend/.env` is the canonical file.

- `docker-compose.yml` backend service: `env_file: backend/.env` (runtime injection)
- Compose-level `${VAR}` interpolation for frontend build args: pass `--env-file backend/.env` to `docker compose`; documented via a comment at the top of `docker-compose.yml` and in `backend/.env.example`
- `load-env.ts` simplified to load `backendRoot/.env` only (no repo-root walk-up)

## Consequences

- `docker compose up` must be run as `docker compose --env-file backend/.env up` — documented in the compose file header comment
- `docs/environment-configuration.md` updated to reflect new location
- AgDR-0010 status: **superseded** by this record

## Artifacts

- Ticket: https://github.com/mohamednaseramein/blog-generator/issues/52
- `backend/.env.example`
- `docker-compose.yml`
- `backend/src/db/load-env.ts`
