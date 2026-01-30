#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
exec uv run modal serve src/inference/app.py
