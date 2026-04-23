#!/usr/bin/env bash
# install.sh - Install Visual Context as a shell alias.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_SCRIPT="$SCRIPT_DIR/run.sh"

if [ ! -f "$RUN_SCRIPT" ]; then
  echo "Error: cannot find run.sh at $RUN_SCRIPT" >&2
  exit 1
fi

chmod +x "$RUN_SCRIPT"

CURRENT_SHELL="$(basename "${SHELL:-}")"
case "$CURRENT_SHELL" in
  zsh)
    RC_FILE="$HOME/.zshrc"
    ;;
  bash)
    RC_FILE="$HOME/.bashrc"
    if [ "$(uname)" = "Darwin" ] && [ -f "$HOME/.bash_profile" ]; then
      RC_FILE="$HOME/.bash_profile"
    fi
    ;;
  *)
    echo "Unsupported shell '$CURRENT_SHELL'. Add this alias manually:"
    echo "alias visual-context='$RUN_SCRIPT'"
    exit 0
    ;;
esac

touch "$RC_FILE"
ALIAS_LINE="alias visual-context='$RUN_SCRIPT'"

if grep -q "alias visual-context=" "$RC_FILE" 2>/dev/null; then
  if ! grep -qF "$ALIAS_LINE" "$RC_FILE"; then
    TMP_FILE="$(mktemp)"
    grep -v "alias visual-context=" "$RC_FILE" >"$TMP_FILE"
    {
      printf "\n# Visual Context launcher\n"
      printf "%s\n" "$ALIAS_LINE"
    } >>"$TMP_FILE"
    mv "$TMP_FILE" "$RC_FILE"
  fi
else
  {
    printf "\n# Visual Context launcher\n"
    printf "%s\n" "$ALIAS_LINE"
  } >>"$RC_FILE"
fi

echo "Installed alias in $RC_FILE"
echo "Run: source $RC_FILE"
echo "Then: visual-context"
echo "Codex mode: visual-context --codex /path/to/codex-startup-context.md"
