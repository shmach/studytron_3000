#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

BACKEND_PID=""
FRONTEND_PID=""

CLEANED_UP=""
cleanup() {
  [[ -n "$CLEANED_UP" ]] && return
  CLEANED_UP=1
  echo ""
  echo "Shutting down StudyTRON 3000..."
  [[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" 2>/dev/null
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null
  wait 2>/dev/null
}
trap cleanup EXIT

init_backend() {
  echo "local-server starting (http://localhost:8000/docs)..."
  PYTHONUTF8=1 uv run fastapi dev apps/local-server/main.py &
  BACKEND_PID=$!
}

init_frontend() {
  if [[ ! -d apps/web/node_modules ]]; then
    echo "apps/web/node_modules not found — run 'npm install' in apps/web first." >&2
    exit 1
  fi
  echo "web app starting (http://localhost:5173)..."
  (cd apps/web && npm run dev) &
  FRONTEND_PID=$!
}

echo "StudyTRON 3000 starting..."

init_backend
init_frontend

echo "StudyTRON 3000 running. Press Ctrl+C to stop."

wait -n "$BACKEND_PID" "$FRONTEND_PID"
