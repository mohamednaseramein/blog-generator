# AgDR-0018 — GitHub Actions deploy to EC2 (SSH + Docker Compose)

## Status

Accepted — implements [GH-59](https://github.com/mohamednaseramein/blog-generator/issues/59).

## Context

We need production updates on merge to `main` without manual SSH steps. The stack already runs under Docker Compose on a single EC2 instance (`docs/deployment.md`).

## Decision

1. **CI/CD** — Use **GitHub Actions** (`ubuntu-latest`) with **`appleboy/ssh-action`** (pinned `v1.2.3`) to run commands on the app host over SSH using repository secrets (`SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, optional `DEPLOY_PATH`).
2. **Deploy steps** — After `git fetch` / `checkout -B main origin/main`, run **`scripts/verify-deploy-env.sh`** (presence and shape checks, no secret logging), export `APP_VERSION` / `GIT_SHA`, then `docker compose --env-file backend/.env` **down → build --no-cache → up -d → ps** (or `docker-compose` v1 if present).
3. **Runtime validation** — The backend **must** call **`validateAndLogRuntimeEnv()`** at process start (`backend/src/config/env.ts`) so misconfigured containers fail fast with masked `[config]` logs.

## Consequences

- **Secrets** live only in GitHub Actions and on the server (`backend/.env`); nothing committed.
- **Trust** — SSH host key pinning is optional hardening (documented in `docs/deployment.md`); default relies on operator/network posture.
- **Alternatives considered** — Self-hosted runner on AWS (more setup); **AWS CodeDeploy / ECS** (heavier than current single-host Compose model).

## References

- [docs/deployment.md](../deployment.md)
- [environment-configuration.md](../environment-configuration.md)
- [AgDR-0004 — Docker containerisation](./AgDR-0004-docker-containerisation.md)
- [AgDR-0017 — Backend `.env` colocation](./AgDR-0017-backend-env-colocation.md)
