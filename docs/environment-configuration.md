# Environment configuration (blog-generator)

This document is the **source of truth** for where environment variables live and how they are loaded. It implements the decision in [AgDR-0017 — Move .env to backend/](./agdr/AgDR-0017-backend-env-colocation.md) (supersedes AgDR-0010).

## Canonical location

Use **one `.env` file in `backend/`**:

`workspace/blog-generator/backend/.env` — co-located with the backend code that consumes it.

That file is **gitignored**.

- **Local development**: copy from `backend/.env.example` and fill in real values.
- **CI deploy to EC2**: the deploy workflow writes `backend/.env` on the server from the GitHub Actions **Environment** (`development`) using `vars.*` + `secrets.*` (no copying committed `.env` files).

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

## Startup validation (backend)

When the API process starts (`npm run dev`, `node dist/index.js`, or the backend container), it runs **`validateAndLogRuntimeEnv()`** in [`backend/src/config/env.ts`](../backend/src/config/env.ts): required variables must be present, match expected shapes (URLs, JWT-style Supabase keys, `sk-ant-` Anthropic key in **production**, JWT length ≥ 32), and must not contain obvious placeholder text. **`SUPABASE_ANON_KEY`** is optional in **development** (warning only); it is **required in production** (including the Docker backend image, where `NODE_ENV=production`). On success it logs a **masked** summary to stdout (`[config] …`); it never prints full secrets.

For **CI deploy** to EC2, [`scripts/verify-deploy-env.sh`](../scripts/verify-deploy-env.sh) performs similar checks on the server **before** `docker compose` runs (no secret values in logs).

## Related documents

- [deployment.md](./deployment.md) — EC2 deploy workflow and required GitHub Environment values.
- [AgDR-0017 — Move .env to backend/](./agdr/AgDR-0017-backend-env-colocation.md)
- [AgDR-0010 — Single root `.env` (superseded)](./agdr/AgDR-0010-single-root-env-configuration.md)
- [AgDR-0004 — Docker containerisation](./agdr/AgDR-0004-docker-containerisation.md)
