#!/usr/bin/env bash
# Rolling-style production deploy: build new images while current containers run, then up -d to swap.
# Optional: up --wait when Compose supports it (2.29+) and healthchecks are defined.
# See docs/zero-downtime-sdlc.md
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"

if [[ -x scripts/verify-deploy-env.sh ]]; then
  scripts/verify-deploy-env.sh .
else
  echo "[deploy] WARN: scripts/verify-deploy-env.sh missing or not executable — skipping env verification" >&2
fi

# shellcheck disable=SC2016
export APP_VERSION="$(grep -m1 '"version"' package.json | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')"
export GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo "")"
echo "[deploy] APP_VERSION=${APP_VERSION} GIT_SHA=${GIT_SHA}"

dc() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo "Neither 'docker compose' nor 'docker-compose' is available." >&2
    return 1
  fi
}

# shellcheck disable=SC2070
if [[ "${DOWN_BEFORE_DEPLOY:-}" == "1" || "${DOWN_BEFORE_DEPLOY:-}" == "true" ]]; then
  echo "[deploy] DOWN_BEFORE_DEPLOY: docker compose down (full stack stop)"
  dc --env-file backend/.env down
fi

if [[ "${DEPLOY_BUILD_NO_CACHE:-1}" == "1" || "${DEPLOY_BUILD_NO_CACHE:-1}" == "true" ]]; then
  echo "[deploy] docker compose build --no-cache"
  dc --env-file backend/.env build --no-cache
else
  echo "[deploy] docker compose build (using cache; DEPLOY_BUILD_NO_CACHE=0)"
  dc --env-file backend/.env build
fi

# Prefer health-aware up when available (Compose 2.29+)
if dc --env-file backend/.env up -d --help 2>&1 | grep -qE '[[:space:]]--wait[[:space:]]'; then
  echo "[deploy] docker compose up -d --wait"
  dc --env-file backend/.env up -d --wait
else
  echo "[deploy] NOTE: this Compose has no 'up -d --wait' — consider upgrading to Docker Compose 2.29+"
  echo "[deploy] docker compose up -d"
  dc --env-file backend/.env up -d
fi

echo "[deploy] docker compose ps"
dc --env-file backend/.env ps
echo "[deploy] Finished successfully"
