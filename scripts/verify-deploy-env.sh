#!/usr/bin/env bash
# Run on the deploy host before docker compose (paths relative to repo root).
# Does not print secret values — only presence and obvious placeholder patterns.
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"

echo "[deploy] Repo root: $(pwd)"

if [[ ! -f package.json ]]; then
  echo "[deploy] ERROR: package.json not found — is this the blog-generator repo?" >&2
  exit 1
fi

ver_line="$(grep -m1 '"version"' package.json || true)"
if [[ -z "$ver_line" ]]; then
  echo "[deploy] ERROR: could not read version from package.json" >&2
  exit 1
fi
echo "[deploy] package.json version line OK (semver present)"

if [[ ! -f backend/.env ]]; then
  echo "[deploy] ERROR: backend/.env missing — create it on the server (see docs/environment-configuration.md)" >&2
  exit 1
fi

env_bytes="$(wc -c < backend/.env | tr -d ' ')"
echo "[deploy] backend/.env present (${env_bytes} bytes)"

required_keys=(
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_ANON_KEY
  ANTHROPIC_API_KEY
  JWT_SECRET
)

for key in "${required_keys[@]}"; do
  line="$(grep -E "^${key}=" backend/.env 2>/dev/null | tail -n1 || true)"
  if [[ -z "$line" ]]; then
    echo "[deploy] ERROR: ${key} is not set in backend/.env" >&2
    exit 1
  fi
  val="${line#*=}"
  val="${val%$'\r'}"
  if [[ -z "$val" ]]; then
    echo "[deploy] ERROR: ${key} is empty in backend/.env" >&2
    exit 1
  fi
  lower="$(printf '%s' "$val" | tr '[:upper:]' '[:lower:]')"
  case "$lower" in
    *your-key-here* | *your-service-role-key* | *your-anon-key* | *your-project-ref*)
      echo "[deploy] ERROR: ${key} still looks like a placeholder — replace with real credentials" >&2
      exit 1
      ;;
  esac
  if [[ "$key" == "SUPABASE_URL" ]]; then
    if [[ ! "$val" =~ ^https?:// ]]; then
      echo "[deploy] ERROR: SUPABASE_URL must start with http:// or https://" >&2
      exit 1
    fi
  fi
  if [[ "$key" == "ANTHROPIC_API_KEY" ]]; then
    if [[ ! "$val" =~ ^sk-ant- ]]; then
      echo "[deploy] ERROR: ANTHROPIC_API_KEY must start with sk-ant-" >&2
      exit 1
    fi
  fi
  if [[ "$key" == "JWT_SECRET" ]]; then
    if [[ "${#val}" -lt 32 ]]; then
      echo "[deploy] ERROR: JWT_SECRET must be at least 32 characters" >&2
      exit 1
    fi
    if [[ "$val" == "a-long-random-secret-min-32-chars" ]]; then
      echo "[deploy] ERROR: JWT_SECRET must not use the example value from .env.example" >&2
      exit 1
    fi
  fi
  if [[ "$key" == SUPABASE_SERVICE_ROLE_KEY || "$key" == SUPABASE_ANON_KEY ]]; then
    if [[ ! "$val" =~ ^eyJ ]]; then
      echo "[deploy] ERROR: ${key} should be a Supabase JWT (starts with eyJ)" >&2
      exit 1
    fi
    if [[ "${#val}" -lt 80 ]]; then
      echo "[deploy] ERROR: ${key} looks too short for a Supabase key" >&2
      exit 1
    fi
  fi
done

echo "[deploy] backend/.env keys validated (formats and non-placeholder)"
