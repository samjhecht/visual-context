#!/usr/bin/env bash
# run.sh - Launch Visual Context web app for a target project directory
# Usage: ./run.sh [target_directory]
#        visual-context (when installed as alias)

set -e

# Determine the absolute path to the visual-context repo
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VISUAL_CONTEXT_DIR="$SCRIPT_DIR"

# Target project directory (defaults to current working directory)
TARGET_DIR="${1:-$PWD}"

# Check if directory exists first
if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: Target directory does not exist: $TARGET_DIR" >&2
    exit 1
fi

# Resolve to absolute path
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

# Output file location (always in visual-context repo)
CONTEXT_JSON="$VISUAL_CONTEXT_DIR/context.json"

# Port for HTTP server (try multiple ports if first is occupied)
PORTS=(8080 8081 8082 8083 8084 8085)
PORT=""

# Find an available port
for p in "${PORTS[@]}"; do
    if ! lsof -i ":$p" >/dev/null 2>&1; then
        PORT=$p
        break
    fi
done

if [ -z "$PORT" ]; then
    echo "Error: No available ports found (tried ${PORTS[*]})" >&2
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Visual Context Launcher${NC}"
echo "========================"
echo ""
echo "Target directory: $TARGET_DIR"
echo "Output file: $CONTEXT_JSON"
echo ""

# Check if scan-context.sh exists
SCAN_SCRIPT="$VISUAL_CONTEXT_DIR/scripts/scan-context.sh"
if [ ! -f "$SCAN_SCRIPT" ]; then
    echo -e "${RED}Error: Cannot find scan-context.sh at $SCAN_SCRIPT${NC}" >&2
    exit 1
fi

# Run the scanner
echo -e "${YELLOW}Scanning context...${NC}"
if ! "$SCAN_SCRIPT" "$TARGET_DIR" > "$CONTEXT_JSON" 2>&1; then
    echo -e "${RED}Error: Failed to scan context${NC}" >&2
    echo "Check that scan-context.sh is working correctly" >&2
    exit 1
fi

echo -e "${GREEN}Context scan complete${NC}"
echo ""

# Start HTTP server
echo -e "${YELLOW}Starting HTTP server on port $PORT...${NC}"

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down server...${NC}"
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}Server stopped${NC}"
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Start Python HTTP server in the background
cd "$VISUAL_CONTEXT_DIR"
python3 -m http.server $PORT >/dev/null 2>&1 &
SERVER_PID=$!

# Wait a moment for server to start
sleep 1

# Check if server started successfully
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${RED}Error: Failed to start HTTP server${NC}" >&2
    echo "Port $PORT may already be in use" >&2
    exit 1
fi

echo -e "${GREEN}Server running at http://localhost:$PORT${NC}"
echo ""

# Open browser (macOS)
if command -v open >/dev/null 2>&1; then
    echo -e "${YELLOW}Opening browser...${NC}"
    open "http://localhost:$PORT"
else
    echo -e "${YELLOW}Please open http://localhost:$PORT in your browser${NC}"
fi

echo ""
echo -e "${BLUE}Press Ctrl+C to stop the server${NC}"
echo ""

# Wait for the server process
wait $SERVER_PID
