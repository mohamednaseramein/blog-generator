# [CI] Zero-downtime EC2 deploy (rolling-style Compose)

| Field | Value |
|--------|--------|
| Type | CI / infrastructure |
| Priority | P1 |
| Tracker | (link local PR or issue when filed) |

## Driver

Production deploys used `docker compose down` before `build`, which **stopped the full stack** for the entire image build. That is avoidable: builds can run while the current containers keep serving traffic. Aligning the pipeline with a **zero-downtime** mindset in the **SDLC** (design → build → release → operate) needs an explicit **rolling-style** process and docs so future changes (Swarm, K8s, blue/green) follow the same contracts (health checks, backward-compatible migrations).

## Scope

- Replace “`down` → `build` → `up`” on the server with **“`build` (while still running) → `up` to swap”** for routine releases.
- Add `scripts/deploy-ec2.sh` used by **GitHub Actions** and **manual** deploys; optional `up --wait` when Compose supports it and services expose health.
- Document SDLC touchpoints, env flags (`DOWN_BEFORE_DEPLOY`, `DEPLOY_BUILD_NO_CACHE`), and follow-ups (true HA with Swarm/Kubernetes).
- Add **nginx**-friendly health check for the frontend so `up --wait` is meaningful when enabled.

## Acceptance criteria

- [x] CI and documented manual path **do not** run `docker compose down` on the success path; traffic is only interrupted for **container switch** (seconds), not for **full `build` duration** (minutes).
- [x] Deploy uses **health-aware** `up` where supported (`--wait` when available).
- [x] `docs/zero-downtime-sdlc.md` and `docs/deployment.md` describe the strategy, flags, and limitations (single host Compose vs HA).
- [x] `DOWN_BEFORE_DEPLOY=1` remains available for break-glass full teardown.
- [x] `DEPLOY_BUILD_NO_CACHE=0` allows faster cached builds (optional, documented).

## Risks / dependencies

- **Migrations** must stay backward-compatible for one version overlap if the API is ever scaled horizontally; current stack is one replica per service.
- **Docker Compose** `up --wait` requires a sufficiently new Compose on the host; script falls back without failing.
