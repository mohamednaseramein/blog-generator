#!/usr/bin/env sh
# Source before `docker compose build` so `APP_VERSION` and `GIT_SHA` match the repo
# (OCI labels, optional `gitSha` in `GET /version` when running the backend image).
#
#   . scripts/build-env.sh
#   docker compose --env-file backend/.env up --build -d
#
# Override when needed: `APP_VERSION=1.2.3 . scripts/build-env.sh`
set -e
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root" || exit 1
export APP_VERSION="${APP_VERSION:-$(node -p "require('./package.json').version")}"
export GIT_SHA="${GIT_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo "")}"
echo "APP_VERSION=$APP_VERSION"
echo "GIT_SHA=$GIT_SHA"
