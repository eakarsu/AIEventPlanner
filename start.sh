#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"; [ -f .env ] || { echo 'Missing .env; copy .env.example.' >&2; exit 1; }
[ -d backend/node_modules ] && [ -d frontend/node_modules ] || { echo 'Run ./scripts/bootstrap.sh first.' >&2; exit 1; }
set -a; . ./.env; set +a
for port in "${BACKEND_PORT:-3001}" "${FRONTEND_PORT:-3000}"; do
  ! lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 || { echo "Port $port is already in use; refusing to terminate its owner." >&2; exit 1; }
done
if [ "${MIGRATE_ON_START:-false}" = "true" ]; then
  (cd backend && node scripts/runtime-init.js)
fi
npm --prefix backend start & backend_pid=$!; BROWSER=none PORT="${FRONTEND_PORT:-3000}" npm --prefix frontend start & frontend_pid=$!
cleanup(){ kill "$backend_pid" "$frontend_pid" 2>/dev/null || true; }; trap cleanup EXIT INT TERM; wait "$backend_pid" "$frontend_pid"
