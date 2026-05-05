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
  echo "[deploy] WARN: scripts/verify-deploy-env.sh missing or not executable - skipping env verification" >&2
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

docker_df() {
  if command -v docker >/dev/null 2>&1; then
    docker system df || true
  fi
}

docker_prune_safe() {
  # Deploys can fail with ENOSPC during image builds if old images/build cache accumulate.
  # We intentionally do NOT prune volumes here to avoid deleting persistent data.
  if ! command -v docker >/dev/null 2>&1; then
    return 0
  fi

  echo "[deploy] Disk usage before prune (docker system df)"
  docker_df

  # Builder cache is the most common culprit during repeated builds.
  echo "[deploy] Pruning builder cache (docker builder prune -af)"
  docker builder prune -af || true

  echo "[deploy] Pruning unused images (docker image prune -af)"
  docker image prune -af || true

  echo "[deploy] Pruning stopped containers (docker container prune -f)"
  docker container prune -f || true

  echo "[deploy] Disk usage after prune (docker system df)"
  docker_df
}

# Default to pruning to keep deploys resilient on small disks.
if [[ "${DEPLOY_PRUNE_BEFORE_BUILD:-1}" == "1" || "${DEPLOY_PRUNE_BEFORE_BUILD:-1}" == "true" ]]; then
  docker_prune_safe
else
  echo "[deploy] Skipping prune (DEPLOY_PRUNE_BEFORE_BUILD=0)"
  echo "[deploy] Current docker disk usage (docker system df)"
  docker_df
fi

# shellcheck disable=SC2070
if [[ "${DOWN_BEFORE_DEPLOY:-}" == "1" || "${DOWN_BEFORE_DEPLOY:-}" == "true" ]]; then
  echo "[deploy] DOWN_BEFORE_DEPLOY: docker compose down (full stack stop)"
  dc --env-file backend/.env down
fi

if [[ "${DEPLOY_BUILD_NO_CACHE:-1}" == "1" || "${DEPLOY_BUILD_NO_CACHE:-1}" == "true" ]]; then
  echo "[deploy] docker compose build --no-cache --pull"
  dc --env-file backend/.env build --no-cache --pull
else
  echo "[deploy] docker compose build --pull (using cache; DEPLOY_BUILD_NO_CACHE=0)"
  dc --env-file backend/.env build --pull
fi

# Prefer health-aware up when available (Compose 2.29+)
if dc --env-file backend/.env up -d --help 2>&1 | grep -qE '[[:space:]]--wait[[:space:]]'; then
  echo "[deploy] docker compose up -d --wait --force-recreate --remove-orphans"
  dc --env-file backend/.env up -d --wait --force-recreate --remove-orphans
else
  echo "[deploy] NOTE: this Compose has no 'up -d --wait' - consider upgrading to Docker Compose 2.29+"
  echo "[deploy] docker compose up -d --force-recreate --remove-orphans"
  dc --env-file backend/.env up -d --force-recreate --remove-orphans
fi

echo "[deploy] docker compose ps"
dc --env-file backend/.env ps
echo "[deploy] Finished successfully"
