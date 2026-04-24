# Zero-downtime strategy (SDLC + this repo)

This document maps **zero-downtime (ZD)** goals to the **software development life cycle (SDLC)** and describes what **this repository** actually implements today (Docker Compose on a single EC2 host).

## What we guarantee today

| Guarantee | Yes / partial / no | Notes |
|------------|--------------------|--------|
| No **full stack outage** during `docker build` on deploy | **Yes** | Legacy flow ran `docker compose down` first, taking **frontend and API** offline for the full build. The deploy script **no longer stops** the stack before build. |
| **Sub-second to few-second** blip on container **replace** | **Partial** | Expected when a new container swaps in. Not full HA with two active replicas. |
| Automatic wait until **API is healthy** after deploy | **Yes** (when the host’s Compose supports `up --wait`) | Backend exposes `GET /health`. |
| **Blue/green** or **N-replica** rolling on one host | **No** | Would need Swarm, Kubernetes, or a custom proxy + two stacks. See [Follow-ups](#follow-ups). |

## SDLC mapping

1. **Planning / architecture**  
   - Prefer **expand → migrate → contract** for database and **additive** API changes so two versions can overlap during rolling deploys.  
   - Treat **GET /health** and Compose **healthcheck**s as part of the interface for release automation.

2. **Development**  
   - Keep migrations **idempotent** and safe to run on startup (current backend runs `migrate` before listening).  
   - Avoid long **exclusive locks** in migrations; document exceptions.

3. **Build & CI**  
   - **GitHub Actions** call `scripts/deploy-ec2.sh` on the server.  
   - The script builds new images while **existing containers keep running**, then `up -d` switches to the new task.

4. **Release (runtime)**  
   - **No `down` on the happy path**; optional `DOWN_BEFORE_DEPLOY=1` for break-glass or full reset.  
   - **`DEPLOY_BUILD_NO_CACHE=1`** (default) keeps the previous “always clean build” behaviour; set to **`0`** for faster, cache-friendly builds on trusted hosts.

5. **Operate**  
   - After deploy, confirm **`/health`** and **`/version`** (or app behaviour) in production.  
   - Monitor for elevated **5xx** during the short swap window.

## How deploy works (technical)

1. `scripts/verify-deploy-env.sh` (unchanged).  
2. `docker compose build` (with or without `--no-cache`, see env vars). **Old containers are still up.**  
3. `docker compose up -d` with **`--wait`** if supported, so the API (and new frontend) pass health/started checks before the job finishes.  
4. If `DOWN_BEFORE_DEPLOY=1`, a **`down` runs first** (full outage; use only when needed).

## Environment variables (deploy host)

| Variable | Default | Purpose |
|----------|---------|---------|
| `DOWN_BEFORE_DEPLOY` | unset | If `1` or `true`, run `docker compose down` before build (full stop). |
| `DEPLOY_BUILD_NO_CACHE` | `1` | If `1`, `docker compose build --no-cache`. If `0`, use build cache. |

## Follow-ups (not in scope of this change)

- **Docker Swarm** or **Kubernetes** with `update_config: order: start-first` (or equivalent) and **N replicas** for true rolling **with** no single point of failure.  
- **Blue/green** on one host (two compose projects and a load balancer) for instant rollback by switching upstream.  
- **Database migration** gating in CI (e.g. separate job) when traffic runs on multiple API replicas.

## Related documents

- [deployment.md](./deployment.md) — EC2 + GitHub Actions pipeline.  
- [environment-configuration.md](./environment-configuration.md) — `.env` and Compose.  
- [AgDR-0018 — GitHub Actions EC2 deploy](./agdr/AgDR-0018-github-actions-ec2-deploy.md) — original deploy ADR.  
