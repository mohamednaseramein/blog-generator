# Release & version bump

This app uses **one semver** for the product: the **`version` field in the root `package.json`**. The `backend` and `frontend` workspace packages are aligned with **`npm run version:sync`** (run it after you bump the root `version` — e.g. after `npm version patch` — then commit the workspace `package.json` files together in the same release commit).

## SDLC (lightweight)

| Phase | What to do for versioning |
| --- | --- |
| **Plan** | Optional: name a target version or GitHub milestone. |
| **Implement** | Add a one-line entry under `## [Unreleased]` in `CHANGELOG.md` if the change is user-visible. |
| **Review** | PR description should mention impact for operators/users (Helps with release notes). |
| **Test** | `npm test`, `npm run build`; after deploy, hit `GET /version` and confirm the UI footer. For copy changes, see [content-style-sdlc.md](./content-style-sdlc.md). |
| **Release** | Bump semver (`npm run version:infer` or `npm run version:bump -- patch|minor|major`), tag `vX.Y.Z`, copy `[Unreleased]` into a dated `## [X.Y.Z]` section, merge to `main` (triggers [deploy workflow](../.github/workflows/deploy-ec2.yml)) or deploy manually per [deployment.md](./deployment.md). |
| **Hotfix** | `npm version patch` (or `minor` / `major`), tag, merge to `main` / deploy; note in `CHANGELOG.md`. |

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

## Conventional commits → bump (automation)

Use [**Conventional Commits**](https://www.conventionalcommits.org/) in PR titles / merge commits so tooling can infer the next semver.

### Rules (`npm run version:infer`)

The script inspects **`v<current package.json version>..HEAD`**, or falls back to **`latest v* tag..HEAD`**. If neither anchor exists, it stops and tells you to tag a release or bump manually — so inference never scans the entire project history by accident.

| Commit type (prefix) | Semver impact | Notes |
| --- | --- | --- |
| `feat:` / `feature:` | **MINOR** | User-visible capability. |
| `fix:`, `perf:`, `refactor:`, `revert:` | **PATCH** | Bugs, performance, safe refactors. |
| `feat!:`, `fix!:`, … or `BREAKING CHANGE:` in body | **MAJOR** | Breaking change for API, schema, or operators. |
| `docs:`, `chore:`, `style:`, `test:`, `build:`, `ci:` | **none** | Does not bump the product version **if every** commit in range is only these types. |
| Other / non-conventional | **PATCH** | Conservative default when the prefix is unknown. |

When several commits are in range, the **highest** impact wins (e.g. one `feat` and one `fix` → **minor**).

### Commands

```bash
# Preview inferred bump (no file changes)
npm run version:infer:dry

# Apply inferred bump + sync backend/frontend package.json
npm run version:infer

# Override when you know the level
npm run version:bump -- patch    # or minor | major
npm run version:bump -- patch --dry-run
```

After **`version:infer`** or **`version:bump`**, commit the three `package.json` files, update [CHANGELOG.md](../CHANGELOG.md), and tag **`vX.Y.Z`** (see **How to release** above). **`npm version patch`** (etc.) still works: **`postversion`** runs **`version:sync`** and stages workspace manifests.

### First-time / no tags yet

After the first release line in the changelog, create the anchor tag matching the root version, e.g.:

```bash
git tag v0.1.0 -m "Release 0.1.0"
git push origin v0.1.0
```

Then future `version:infer` runs use `v0.1.0..HEAD` (or the tag that matches `package.json` once you bump).

## File reference

- Root: `package.json` (`version`)
- Workspaces: `backend/package.json`, `frontend/package.json` (synced)
- [CHANGELOG.md](../CHANGELOG.md)
- [docker-compose.yml](../docker-compose.yml) — `APP_VERSION` / `GIT_SHA` build args
- [scripts/build-env.sh](../scripts/build-env.sh) — load version + git from the repo for Docker builds
- [scripts/sync-version.mjs](../scripts/sync-version.mjs) — copy root `version` to workspaces
- [scripts/bump-version.mjs](../scripts/bump-version.mjs) — explicit or `--infer` semver bump + sync
- [deployment.md](./deployment.md) — production EC2 deploy and GitHub Actions secrets
