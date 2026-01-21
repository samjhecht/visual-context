#!/usr/bin/env bash
# install.sh - Install Visual Context as a shell command
# Usage: ./install.sh

set -e

# Determine the absolute path to the visual-context repo
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_SCRIPT="$SCRIPT_DIR/run.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Visual Context Installer${NC}"
echo "========================"
echo ""

# Check if run.sh exists
if [ ! -f "$RUN_SCRIPT" ]; then
    echo -e "${RED}Error: Cannot find run.sh at $RUN_SCRIPT${NC}" >&2
    exit 1
fi

# Make sure run.sh is executable
chmod +x "$RUN_SCRIPT"

# Detect shell
CURRENT_SHELL="$(basename "$SHELL")"
echo "Detected shell: $CURRENT_SHELL"

# Determine which RC file to use
if [ "$CURRENT_SHELL" = "zsh" ]; then
    RC_FILE="$HOME/.zshrc"
elif [ "$CURRENT_SHELL" = "bash" ]; then
    RC_FILE="$HOME/.bashrc"
    # On macOS, .bash_profile is more commonly used
    if [ "$(uname)" = "Darwin" ] && [ -f "$HOME/.bash_profile" ]; then
        RC_FILE="$HOME/.bash_profile"
    fi
else
    echo -e "${YELLOW}Warning: Unsupported shell '$CURRENT_SHELL'${NC}"
    echo "Please manually add the following alias to your shell configuration:"
    echo ""
    echo "alias visual-context='$RUN_SCRIPT'"
    echo ""
    exit 0
fi

echo "Using RC file: $RC_FILE"
echo ""

# Check if RC file exists, create if not
if [ ! -f "$RC_FILE" ]; then
    echo -e "${YELLOW}Creating $RC_FILE...${NC}"
    touch "$RC_FILE"
fi

# Check if alias already exists
ALIAS_LINE="alias visual-context='$RUN_SCRIPT'"
if grep -q "alias visual-context=" "$RC_FILE" 2>/dev/null; then
    echo -e "${YELLOW}Alias 'visual-context' already exists in $RC_FILE${NC}"
    echo ""
    echo "Checking if it points to the correct location..."

    # Update the alias if it points elsewhere
    if grep -q "$ALIAS_LINE" "$RC_FILE"; then
        echo -e "${GREEN}Alias is already correctly configured${NC}"
    else
        echo -e "${YELLOW}Updating alias to point to: $RUN_SCRIPT${NC}"
        # Use a temporary file for safe editing
        TMP_FILE="$(mktemp)"
        grep -v "alias visual-context=" "$RC_FILE" > "$TMP_FILE"
        echo "$ALIAS_LINE" >> "$TMP_FILE"
        mv "$TMP_FILE" "$RC_FILE"
        echo -e "${GREEN}Alias updated${NC}"
    fi
else
    # Add the alias
    echo -e "${YELLOW}Adding alias to $RC_FILE...${NC}"
    echo "" >> "$RC_FILE"
    echo "# Visual Context - Claude Code context visualizer" >> "$RC_FILE"
    echo "$ALIAS_LINE" >> "$RC_FILE"
    echo -e "${GREEN}Alias added${NC}"
fi

echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo -e "${BLUE}Usage:${NC}"
echo "  1. Restart your terminal or run: source $RC_FILE"
echo "  2. Navigate to any project directory"
echo "  3. Run: visual-context"
echo ""
echo -e "${BLUE}What happens when you run 'visual-context':${NC}"
echo "  - Scans the current directory's Claude Code context"
echo "  - Generates a visual representation"
echo "  - Opens it in your default browser"
echo ""
echo -e "${BLUE}Examples:${NC}"
echo "  cd ~/my-project && visual-context        # Scan current directory"
echo "  visual-context /path/to/project          # Scan specific directory"
echo ""
echo -e "${BLUE}Uninstall:${NC}"
echo "  Remove the 'visual-context' alias from $RC_FILE"
echo ""
