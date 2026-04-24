# Changelog

All notable changes to this project are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- (nothing yet)

## [0.1.0] — 2026-04-24

### Added

- **Versioning** — single source of truth: root `package.json` `version`, synced to backend and frontend via `npm run version:sync` after each bump.
- **API** — `GET /health` now includes `version`; `GET /version` returns `version` and optional `gitSha` (when the running image or process sets `GIT_SHA`).
- **UI** — footer shows the app version (e.g. `v0.1.0`) from the same semver as the API.
- **Containers** — OCI image labels `org.opencontainers.image.version` and `org.opencontainers.image.revision`; build args `APP_VERSION` and `GIT_SHA` in Docker Compose.
- **Docs** — [Release & version bump](docs/releases.md) and this changelog.

[Unreleased]: https://github.com/mohamednaseramein/blog-generator/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mohamednaseramein/blog-generator/releases/tag/v0.1.0
