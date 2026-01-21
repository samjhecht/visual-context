#!/bin/bash
# extract-from-binary.sh - Extract Claude Code config from binary
# Usage: ./scripts/extract-from-binary.sh <output_dir>
# This is faster and more reliable than asking Claude to dump its own config

set -e

OUTPUT_DIR="${1:-./.claude-config}"
CLAUDE_BIN=$(which claude)

if [ ! -f "$CLAUDE_BIN" ]; then
    echo "Error: claude binary not found" >&2
    exit 1
fi

echo "Extracting Claude Code configuration from binary..." >&2
echo "Binary: $CLAUDE_BIN" >&2

mkdir -p "$OUTPUT_DIR"

# Extract strings and find the system prompt
# The system prompt starts with "You are Claude Code"
echo "Extracting system prompt..." >&2
strings "$CLAUDE_BIN" | \
    awk '/^You are Claude Code, Anthropic/{found=1} found{print} /^# Working with This Project$/{if(found) exit}' | \
    sed 's/\\n/\n/g' | \
    grep -v '^$' > "$OUTPUT_DIR/system_prompt_raw.txt"

if [ -s "$OUTPUT_DIR/system_prompt_raw.txt" ]; then
    {
        echo "# Claude Code System Prompt"
        echo ""
        echo "This is the system prompt that Claude Code sends to the model at the start of each session."
        echo ""
        echo "---"
        echo ""
        cat "$OUTPUT_DIR/system_prompt_raw.txt"
    } > "$OUTPUT_DIR/system_prompt.md"
    rm "$OUTPUT_DIR/system_prompt_raw.txt"
    echo "✓ Extracted system_prompt.md ($(wc -l < "$OUTPUT_DIR/system_prompt.md" | tr -d ' ') lines)" >&2
else
    echo "✗ Failed to extract system prompt from binary" >&2
    echo "  Trying alternative method..." >&2

    # Alternative: extract larger section and manually parse
    strings "$CLAUDE_BIN" | \
        awk '/You are Claude Code/{found=1} found{print; count++} count>1000{exit}' \
        > "$OUTPUT_DIR/system_prompt_raw.txt"

    if [ -s "$OUTPUT_DIR/system_prompt_raw.txt" ]; then
        mv "$OUTPUT_DIR/system_prompt_raw.txt" "$OUTPUT_DIR/system_prompt.md"
        echo "⚠ Extracted partial system prompt, may need manual cleanup" >&2
    else
        echo "✗ Failed to extract system prompt" >&2
        rm -f "$OUTPUT_DIR/system_prompt_raw.txt"
    fi
fi

# Extract tools array (it's embedded as JSON)
echo "Extracting tools array..." >&2
strings "$CLAUDE_BIN" | \
    grep -o '\[{[^]]*"name":"Task"[^]]*}\]' | \
    head -1 > "$OUTPUT_DIR/tools_raw.json" || true

# If that didn't work, try a broader search
if [ ! -s "$OUTPUT_DIR/tools_raw.json" ]; then
    # Look for tool definitions
    strings "$CLAUDE_BIN" | \
        python3 -c "
import sys
import json
import re

# Read all strings
content = sys.stdin.read()

# Try to find JSON tool arrays
# Look for patterns like [{'name': 'Tool', ...}]
tool_patterns = [
    r'\[{[^}]*\"name\"\s*:\s*\"Task\"[^]]*}\]',
    r'\[{[^}]*\"name\"\s*:\s*\"Bash\"[^]]*}\]',
]

for pattern in tool_patterns:
    matches = re.findall(pattern, content, re.DOTALL)
    if matches:
        # Try to parse as JSON
        for match in matches:
            try:
                data = json.loads(match)
                if isinstance(data, list) and len(data) > 0:
                    print(json.dumps(data, indent=2))
                    sys.exit(0)
            except:
                continue

# If no valid JSON found, output empty array
print('[]')
" > "$OUTPUT_DIR/tools.json"
else
    # Format the raw JSON
    python3 -m json.tool "$OUTPUT_DIR/tools_raw.json" > "$OUTPUT_DIR/tools.json" 2>/dev/null || \
        cp "$OUTPUT_DIR/tools_raw.json" "$OUTPUT_DIR/tools.json"
    rm "$OUTPUT_DIR/tools_raw.json"
fi

if [ -s "$OUTPUT_DIR/tools.json" ]; then
    TOOL_COUNT=$(python3 -c "import json; print(len(json.load(open('$OUTPUT_DIR/tools.json'))))" 2>/dev/null || echo "unknown")
    echo "✓ Extracted tools.json ($TOOL_COUNT tools)" >&2
else
    echo "⚠ Could not extract tools array from binary" >&2
    echo "  Creating placeholder..." >&2
    echo '[]' > "$OUTPUT_DIR/tools.json"
fi

# Get Claude Code version
CLAUDE_VERSION=$(claude --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)

# Create metadata
cat > "$OUTPUT_DIR/metadata.json" <<EOF
{
  "extracted_at": "$(date -u +%Y-%m-%dT%H:%M:%S)Z",
  "claude_version": "${CLAUDE_VERSION}",
  "extraction_method": "binary_strings",
  "binary_path": "$CLAUDE_BIN",
  "note": "System prompt and tools array extracted from Claude Code binary"
}
EOF
echo "✓ Created metadata.json" >&2

# Create README
cat > "$OUTPUT_DIR/README.md" <<EOF
# Claude Code Configuration Reference

Automatically extracted from Claude Code binary.

## Files

- \`system_prompt.md\` - Complete system prompt sent to the model
- \`tools.json\` - Full tools array with all tool definitions
- \`metadata.json\` - Extraction metadata

## Version

Claude Code: ${CLAUDE_VERSION}
Extracted: $(date -u +%Y-%m-%d\ %H:%M:%S) UTC

## Extraction Method

These files were extracted from the Claude Code binary using string analysis.
This ensures we capture exactly what's embedded in the current installation.

## Updating

To refresh this configuration:

\`\`\`bash
./scripts/extract-from-binary.sh .claude-config
\`\`\`
EOF
echo "✓ Created README.md" >&2

echo "" >&2
echo "Configuration extracted successfully to: $OUTPUT_DIR" >&2
if [ -f "$OUTPUT_DIR/system_prompt.md" ]; then
    echo "  - system_prompt.md ($(wc -l < "$OUTPUT_DIR/system_prompt.md" | tr -d ' ') lines)" >&2
fi
if [ -f "$OUTPUT_DIR/tools.json" ]; then
    echo "  - tools.json" >&2
fi
echo "  - metadata.json" >&2
echo "  - README.md" >&2
