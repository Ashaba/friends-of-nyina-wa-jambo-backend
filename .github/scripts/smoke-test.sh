#!/usr/bin/env bash
#
# Boots the built Strapi server against the CI database and verifies it
# actually serves traffic. A successful `strapi build` does not prove the
# server starts: schema sync, plugin bootstrap and middleware config all run
# at boot, and failures there only surface at runtime.
#
set -euo pipefail

PORT="${PORT:-1337}"
BASE_URL="http://127.0.0.1:${PORT}"
BOOT_TIMEOUT_SECONDS=90
LOG_FILE="$(mktemp)"

# Throwaway secrets. Strapi refuses to boot without them, and nothing here
# outlives the job.
export APP_KEYS="$(openssl rand -base64 32),$(openssl rand -base64 32)"
export API_TOKEN_SALT="$(openssl rand -base64 32)"
export ADMIN_JWT_SECRET="$(openssl rand -base64 32)"
export TRANSFER_TOKEN_SALT="$(openssl rand -base64 32)"
export JWT_SECRET="$(openssl rand -base64 32)"
export ENCRYPTION_KEY="$(openssl rand -base64 32)"
export NODE_ENV=production
export HOST=127.0.0.1
export PORT

cleanup() {
  if [[ -n "${STRAPI_PID:-}" ]] && kill -0 "$STRAPI_PID" 2>/dev/null; then
    kill "$STRAPI_PID" 2>/dev/null || true
    wait "$STRAPI_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "Starting Strapi on ${BASE_URL}"
pnpm run start >"$LOG_FILE" 2>&1 &
STRAPI_PID=$!

for _ in $(seq 1 "$BOOT_TIMEOUT_SECONDS"); do
  if curl -sf -o /dev/null "${BASE_URL}/_health"; then
    booted=1
    break
  fi
  if ! kill -0 "$STRAPI_PID" 2>/dev/null; then
    echo "Strapi exited during boot:"
    cat "$LOG_FILE"
    exit 1
  fi
  sleep 1
done

if [[ -z "${booted:-}" ]]; then
  echo "Strapi did not become healthy within ${BOOT_TIMEOUT_SECONDS}s:"
  cat "$LOG_FILE"
  exit 1
fi

# The admin panel is served from the build output, so a 200 here confirms the
# build artifact was produced and is being served rather than just compiled.
for path in /_health /admin /api/daily-messages; do
  status="$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")"
  if [[ ! "$status" =~ ^(200|204)$ ]]; then
    echo "GET ${path} returned ${status}, expected 200 or 204"
    cat "$LOG_FILE"
    exit 1
  fi
  echo "GET ${path} -> ${status}"
done

echo "Smoke test passed"
