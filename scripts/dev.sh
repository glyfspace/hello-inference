#!/usr/bin/env bash
set -euo pipefail

pids=()

run() {
  local name="$1"
  shift
  echo "[dev] starting ${name}..."
  "$@" &
  local pid=$!
  pids+=("$pid")
}

cleanup() {
  echo "[dev] stopping services..."
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -INT "$pid" 2>/dev/null || true
    fi
  done
  sleep 1
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done
  wait || true
}

trap cleanup INT TERM

run "www" pnpm --filter @interview/www dev
echo "[dev] starting inference..."
cd apps/inference
uv run modal serve src/inference/app.py
status=$?
cd - >/dev/null || true
cleanup
exit "$status"
