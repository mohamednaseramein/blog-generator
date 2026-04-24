# Release & version bump

This app uses **one semver** for the product: the **`version` field in the root `package.json`**. The `backend` and `frontend` workspace packages are aligned with **`npm run version:sync`** (run it after you bump the root `version` — e.g. after `npm version patch` — then commit the workspace `package.json` files together in the same release commit).

## SDLC (lightweight)

| Phase | What to do for versioning |
| --- | --- |
| **Plan** | Optional: name a target version or GitHub milestone. |
| **Implement** | Add a one-line entry under `## [Unreleased]` in `CHANGELOG.md` if the change is user-visible. |
| **Review** | PR description should mention impact for operators/users (Helps with release notes). |
| **Test** | `npm test`, `npm run build`; after deploy, hit `GET /version` and confirm the UI footer. |
| **Release** | Bump semver, tag `vX.Y.Z`, copy `[Unreleased]` into a dated `## [X.Y.Z]` section, deploy. |
| **Hotfix** | `npm version patch` (or `minor` / `major`), tag, deploy; note in `CHANGELOG.md`. |

## How to release

1. **Changelog** — Move “Unreleased” items into a new `## [X.Y.Z] — YYYY-MM-DD` section in [CHANGELOG.md](../CHANGELOG.md).
2. **Bump** — from the repository root (not inside `backend` / `frontend`):
   ```bash
   npm version patch   # or minor | major — updates root package.json + git tag (if a git repo)
   npm run version:sync
   git add backend/package.json frontend/package.json
   git commit -m "chore: sync workspace versions"  # or amend if you are still on the same release commit
   ```
   If you edit the root `version` by hand instead of `npm version`, run `npm run version:sync` and commit the three `package.json` files.
3. **Git tag** (only if you are not using `npm version` which created the tag already; otherwise skip):
   ```bash
   git tag vX.Y.Z
   git push && git push --tags
   ```
4. **Build images** (optional but recommended for traceability) — set `APP_VERSION` to match `package.json` and set `GIT_SHA` from the commit you are building:
   ```bash
   source scripts/build-env.sh
   docker compose --env-file backend/.env up --build -d
   ```
5. **Verify** — `GET http://<host>:3000/version` and check the app footer for `vX.Y.Z`.

## Semver

- **MAJOR** — breaking API or data contract to clients / operators.
- **MINOR** — new behaviour, backward compatible.
- **PATCH** — fixes and internal changes without a public contract change.

## File reference

- Root: `package.json` (`version`)
- Workspaces: `backend/package.json`, `frontend/package.json` (synced)
- [CHANGELOG.md](../CHANGELOG.md)
- [docker-compose.yml](../docker-compose.yml) — `APP_VERSION` / `GIT_SHA` build args
- [scripts/build-env.sh](../scripts/build-env.sh) — load version + git from the repo for Docker builds
- [scripts/sync-version.mjs](../scripts/sync-version.mjs) — copy root `version` to workspaces
