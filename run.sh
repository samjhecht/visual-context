#!/usr/bin/env bash
# run.sh - Launch Visual Context in Claude or Codex mode using Vite.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR"
GENERATED_DIR="$APP_DIR/public/generated"
CLAUDE_OUTPUT="$GENERATED_DIR/context.json"
CODEX_OUTPUT="$GENERATED_DIR/codex-context.md"

MODE="claude"
TARGET_DIR="$PWD"
CODEX_SOURCE=""
OPEN_BROWSER=1
PORTS=(8080 8081 8082 8083 8084 8085)
PORT=""

usage() {
  cat <<EOF
Usage:
  ./run.sh [target_directory]
  ./run.sh --claude [target_directory]
  ./run.sh --codex <startup-context.md>
  ./run.sh --no-open

Examples:
  ./run.sh
  ./run.sh /path/to/project
  ./run.sh --codex /path/to/codex-startup-context.md
EOF
}

for p in "${PORTS[@]}"; do
  if ! lsof -i ":$p" >/dev/null 2>&1; then
    PORT="$p"
    break
  fi
done

if [ -z "$PORT" ]; then
  echo "Error: no available ports found (${PORTS[*]})" >&2
  exit 1
fi

while [ $# -gt 0 ]; do
  case "$1" in
    --claude)
      MODE="claude"
      if [ $# -gt 1 ] && [[ ! "$2" =~ ^-- ]]; then
        TARGET_DIR="$2"
        shift
      fi
      ;;
    --codex)
      MODE="codex"
      if [ $# -lt 2 ]; then
        echo "Error: --codex requires a file path" >&2
        usage
        exit 1
      fi
      CODEX_SOURCE="$2"
      shift
      ;;
    --no-open)
      OPEN_BROWSER=0
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [ "$MODE" = "codex" ]; then
        echo "Error: unexpected argument in codex mode: $1" >&2
        usage
        exit 1
      fi
      if [ -f "$1" ]; then
        MODE="codex"
        CODEX_SOURCE="$1"
      else
        TARGET_DIR="$1"
      fi
      ;;
  esac
  shift
done

if [ "$MODE" = "claude" ]; then
  if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: target directory does not exist: $TARGET_DIR" >&2
    exit 1
  fi
  TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
else
  if [ ! -f "$CODEX_SOURCE" ]; then
    echo "Error: codex snapshot does not exist: $CODEX_SOURCE" >&2
    exit 1
  fi
  CODEX_SOURCE="$(cd "$(dirname "$CODEX_SOURCE")" && pwd)/$(basename "$CODEX_SOURCE")"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is required." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required." >&2
  exit 1
fi

mkdir -p "$GENERATED_DIR"

if [ ! -d "$APP_DIR/node_modules" ]; then
  echo "Installing dependencies..."
  (cd "$APP_DIR" && npm install)
fi

if [ "$MODE" = "claude" ]; then
  echo "Scanning Claude context from $TARGET_DIR"
  (cd "$APP_DIR" && npm run scan -- "$TARGET_DIR" --output "$CLAUDE_OUTPUT")
else
  echo "Copying Codex snapshot from $CODEX_SOURCE"
  cp "$CODEX_SOURCE" "$CODEX_OUTPUT"
fi

cleanup() {
  if [ -n "${SERVER_PID:-}" ]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting Visual Context at http://127.0.0.1:$PORT"
(cd "$APP_DIR" && npm run dev -- --host 127.0.0.1 --port "$PORT" --strictPort >/tmp/visual-context-vite.log 2>&1) &
SERVER_PID=$!

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORT" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
  echo "Error: Vite failed to start. See /tmp/visual-context-vite.log" >&2
  exit 1
fi

if [ "$OPEN_BROWSER" -eq 1 ] && command -v open >/dev/null 2>&1; then
  open "http://127.0.0.1:$PORT"
else
  echo "Open http://127.0.0.1:$PORT"
fi

echo "Press Ctrl+C to stop the server"
wait "$SERVER_PID"
