# Production deployment (EC2 + GitHub Actions)

This document describes how **merges to `main`** trigger an **SSH deploy** to a single EC2 host running Docker Compose. It implements [GH-59](https://github.com/mohamednaseramein/blog-generator/issues/59).

## Overview

| Item | Detail |
|------|--------|
| Workflow | [.github/workflows/deploy-ec2.yml](../.github/workflows/deploy-ec2.yml) |
| Trigger | `push` to `main` |
| Target | Linux host with Docker and Docker Compose (v1 `docker-compose` or v2 `docker compose`) |
| Remote path | Defaults to `/home/<ssh-user>/blog-generator`; override with `DEPLOY_PATH` secret |

On the server, the job:

1. **Clones** the repository into `DEPLOY_PATH` if that directory does not exist yet (uses `github.repository` from the workflow). **Private repos** need the `GIT_CLONE_TOKEN` secret (PAT with **Contents: Read**). Then fetches and resets to `origin/main`.
2. Runs [`scripts/verify-deploy-env.sh`](../scripts/verify-deploy-env.sh) to confirm `package.json`, `backend/.env`, and required keys exist with **non-placeholder** values and plausible formats (without printing secrets).
3. Exports `APP_VERSION` (from root `package.json`) and `GIT_SHA` (short) for image build args.
4. Runs `docker compose --env-file backend/.env down`, `build --no-cache`, `up -d`, and `ps` (or the `docker-compose` equivalent if v1 is installed), with `[deploy]` log lines around each step.

The backend container then performs its own **[config] environment check** at startup (see [environment-configuration.md](./environment-configuration.md)).

## GitHub Actions secrets

Configure these in the repository: **Settings → Secrets and variables → Actions**.

| Secret | Required | Description |
|--------|----------|-------------|
| `SSH_HOST` | Yes | Public DNS or IP of the EC2 instance (e.g. `ec2-….compute.amazonaws.com`). |
| `SSH_USER` | Yes | SSH login (e.g. `ec2-user` on Amazon Linux). |
| `SSH_PRIVATE_KEY` | Yes | PEM private key that matches the instance key pair (full key, `-----BEGIN … PRIVATE KEY-----` through `-----END …`). |
| `DEPLOY_PATH` | No | **Absolute** path to the repo root on the server (e.g. `/home/ec2-user/blog-generator`). If unset, the workflow uses `/home/<ssh-user>/blog-generator` after resolving `HOME`. If you use `~/...` in this secret, it is expanded the same way. If the directory is missing, the workflow **clones** into it automatically. |
| `GIT_CLONE_TOKEN` | No | **GitHub PAT** with `Contents: Read` (fine-grained or classic `repo` read). Required on the **first** run (and ongoing `git fetch`) if the repository is **private**. Not needed for public repos. The token is passed to the EC2 script over SSH only for that run; `origin` on the server may store an authenticated HTTPS URL — lock down the instance and rotate the PAT periodically. |

Do **not** commit keys or hostnames if you can avoid it; keep them in secrets and internal runbooks only.

**First deploy after auto-clone:** create **`backend/.env`** on the server (copy from `backend/.env.example` and fill values). Until it exists, `verify-deploy-env.sh` / Compose will fail with a clear error.

### Optional hardening

- **Host key verification** — The deploy action performs SSH from GitHub-hosted runners. To pin the server host key, see [appleboy/ssh-action](https://github.com/appleboy/ssh-action) (`fingerprint` / host key options) and update the workflow if your security policy requires it.
- **Inbound SSH** — Restrict the instance security group to trusted IPs or use a self-hosted runner / Session Manager pattern if you cannot rely on broad GitHub runner IP ranges.

## EC2 prerequisites

1. **Git** — `git` installed. The workflow clones on first run if `DEPLOY_PATH` is empty, or refreshes an existing clone. Private repos need **`GIT_CLONE_TOKEN`** (or preconfigure `origin` with a deploy key and skip the token secret if you manage auth only on the host).
2. **`backend/.env`** — Present on the server (gitignored). Compose needs it for runtime and for compose-level variable substitution; see [environment-configuration.md](./environment-configuration.md).
3. **Docker** — Docker Engine and Compose v1 or v2; `ec2-user` must be able to run `docker` (e.g. member of `docker` group).
4. **Resources** — `build --no-cache` is CPU/network heavy; size the instance accordingly. The workflow allows up to **45 minutes** for the remote script.

## Manual deploy (same commands as CI)

From the repo root on the server:

```bash
cd ~/blog-generator   # or your DEPLOY_PATH
git fetch origin main
git checkout -B main origin/main
export APP_VERSION="$(grep -m1 '"version"' package.json | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')"
export GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo "")"
docker compose --env-file backend/.env down
docker compose --env-file backend/.env build --no-cache
docker compose --env-file backend/.env up -d
docker compose --env-file backend/.env ps
```

If only `docker-compose` (v1) is installed, substitute `docker-compose` for `docker compose`.

## Related documents

- [AgDR-0018 — GitHub Actions EC2 deploy](./agdr/AgDR-0018-github-actions-ec2-deploy.md) — architecture decision for this pipeline.
- [environment-configuration.md](./environment-configuration.md) — `.env` layout and Compose `--env-file`.
- [releases.md](./releases.md) — Versioning and release checklist (includes deploy verification).
