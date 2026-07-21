#!/usr/bin/env bash
set -euo pipefail
[ "${CONFIRM_DEMO_SEED:-}" = 'yes' ] || { echo 'Set CONFIRM_DEMO_SEED=yes for disposable data.' >&2; exit 2; }; cd "$(dirname "$0")/../backend"; node seed.js
