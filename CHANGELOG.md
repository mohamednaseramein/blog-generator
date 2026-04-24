# Changelog

All notable changes to this project are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **CI/CD** — EC2 deploy uses [`scripts/deploy-ec2.sh`](scripts/deploy-ec2.sh) (no `docker compose down` on the happy path; optional `up --wait` with Compose 2.29+; optional `DOWN_BEFORE_DEPLOY=1` / `DEPLOY_BUILD_NO_CACHE=0` on the host). Documented in [`docs/zero-downtime-sdlc.md`](docs/zero-downtime-sdlc.md) and [`docs/deployment.md`](docs/deployment.md).
- **CI/CD** — EC2 deploy clones the workflow’s GitHub repository into `DEPLOY_PATH` when the directory is missing; optional `GIT_CLONE_TOKEN` for private repos (`docs/deployment.md` updated).

### Added

- **CI/CD** — GitHub Actions workflow [`.github/workflows/deploy-ec2.yml`](.github/workflows/deploy-ec2.yml) deploys Docker Compose on EC2 after pushes to `main`; documented in [`docs/deployment.md`](docs/deployment.md) (README and release docs updated).
- **Config** — API startup validates `backend`/container env (URLs, JWT-shaped Supabase keys, Anthropic `sk-ant-` in production, JWT length, optional `SUPABASE_DB_URL` / `SCRAPE_TIMEOUT_MS` / `ANTHROPIC_MODEL`) and logs a masked `[config]` summary; see [`backend/src/config/env.ts`](backend/src/config/env.ts). Deploy runs [`scripts/verify-deploy-env.sh`](scripts/verify-deploy-env.sh) on the host before Compose. **AgDR** — [`docs/agdr/AgDR-0018-github-actions-ec2-deploy.md`](docs/agdr/AgDR-0018-github-actions-ec2-deploy.md).

## [0.1.0] — 2026-04-24

### Added

- **Versioning** — single source of truth: root `package.json` `version`, synced to backend and frontend via `npm run version:sync` after each bump.
- **API** — `GET /health` now includes `version`; `GET /version` returns `version` and optional `gitSha` (when the running image or process sets `GIT_SHA`).
- **UI** — footer shows the app version (e.g. `v0.1.0`) from the same semver as the API.
- **Containers** — OCI image labels `org.opencontainers.image.version` and `org.opencontainers.image.revision`; build args `APP_VERSION` and `GIT_SHA` in Docker Compose.
- **Docs** — [Release & version bump](docs/releases.md) and this changelog.

[Unreleased]: https://github.com/mohamednaseramein/blog-generator/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mohamednaseramein/blog-generator/releases/tag/v0.1.0
