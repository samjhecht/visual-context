#!/bin/bash
# scan-context.sh - Gather Claude Code context data for visualization
# Usage: ./scan-context.sh [working_directory]
# Outputs JSON to stdout

set -e

CLAUDE_DIR="$HOME/.claude"
TARGET_CWD="${1:-$(pwd)}"

# Helper to encode path for Claude's project directory naming
encode_path() {
    echo "$1" | sed 's/\//-/g' | sed 's/^-//'
}

# Helper to read file content as JSON string
read_file_json() {
    local file="$1"
    if [ -f "$file" ]; then
        # Read file and escape for JSON
        python3 -c "
import json
import sys
try:
    with open('$file', 'r') as f:
        content = f.read()
    print(json.dumps({'exists': True, 'content': content, 'path': '$file'}))
except Exception as e:
    print(json.dumps({'exists': False, 'error': str(e), 'path': '$file'}))
"
    else
        echo '{"exists": false, "path": "'"$file"'"}'
    fi
}

# Helper to list directory contents as JSON array
list_dir_json() {
    local dir="$1"
    if [ -d "$dir" ]; then
        python3 -c "
import json
import os
items = []
for item in os.listdir('$dir'):
    full_path = os.path.join('$dir', item)
    items.append({
        'name': item,
        'path': full_path,
        'isDir': os.path.isdir(full_path)
    })
print(json.dumps(items))
"
    else
        echo '[]'
    fi
}

# Extract file references from CLAUDE.md content
extract_file_refs() {
    local content="$1"
    python3 -c "
import re
import json
content = '''$content'''
# Match @FILE patterns (common in CLAUDE.md for referencing other files)
refs = re.findall(r'@([A-Za-z0-9_\-./]+\.(?:md|txt|json|yaml|yml))', content)
# Also match backtick references like \`TESTING.md\`
refs += re.findall(r'\\\`([A-Za-z0-9_\-./]+\.(?:md|txt))\\\`', content)
print(json.dumps(list(set(refs))))
"
}

# Main data collection
echo '{'

# 1. Metadata
echo '"metadata": {'
echo "  \"scannedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
echo "  \"targetCwd\": \"$TARGET_CWD\","
echo "  \"claudeDir\": \"$CLAUDE_DIR\""
echo '},'

# 2. System Prompt (from cached extraction or fallback)
# First, try project-local .claude-config
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_CONFIG="$SCRIPT_DIR/../.claude-config"

# Fallback locations to try
CONFIG_LOCATIONS=(
    "$PROJECT_CONFIG"
    "$HOME/medb/projects/wrangler/.claude-config"
    "$HOME/.claude-config"
)

SYSTEM_PROMPT_FILE=""
TOOLS_FILE=""

for config_dir in "${CONFIG_LOCATIONS[@]}"; do
    if [ -f "$config_dir/system_prompt.md" ]; then
        SYSTEM_PROMPT_FILE="$config_dir/system_prompt.md"
        TOOLS_FILE="$config_dir/tools.json"
        break
    fi
done

# If no config found, check if we should extract
if [ -z "$SYSTEM_PROMPT_FILE" ]; then
    echo "Warning: No Claude config found. Run './scripts/extract-claude-config-manual.sh' to create one." >&2
    # Create placeholder
    SYSTEM_PROMPT_FILE="/dev/null"
    TOOLS_FILE="/dev/null"
fi

echo '"systemPrompt": '
read_file_json "$SYSTEM_PROMPT_FILE"
echo ','

# 2b. Tools Array
echo '"toolsArray": '
if [ -f "$TOOLS_FILE" ] && [ -s "$TOOLS_FILE" ]; then
    cat "$TOOLS_FILE"
else
    echo '[]'
fi
echo ','

# 3. Global CLAUDE.md
GLOBAL_CLAUDE="$CLAUDE_DIR/CLAUDE.md"
echo '"globalMemory": '
read_file_json "$GLOBAL_CLAUDE"
echo ','

# 4. Project CLAUDE.md (at target cwd)
PROJECT_CLAUDE="$TARGET_CWD/CLAUDE.md"
echo '"projectMemory": '
read_file_json "$PROJECT_CLAUDE"
echo ','

# 5. Settings (hooks, MCP servers, enabled plugins)
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
echo '"settings": '
if [ -f "$SETTINGS_FILE" ]; then
    cat "$SETTINGS_FILE"
else
    echo '{}'
fi
echo ','

# 6. Local settings (output styles, etc)
LOCAL_SETTINGS="$TARGET_CWD/.claude/settings.local.json"
echo '"localSettings": '
read_file_json "$LOCAL_SETTINGS"
echo ','

# 7. Output styles
echo '"outputStyles": {'
echo '  "user": '
list_dir_json "$CLAUDE_DIR/output-styles"
echo ','
echo '  "project": '
list_dir_json "$TARGET_CWD/.claude/output-styles"
echo ','
# 7b. Active output style name
echo '  "activeName": '
ACTIVE_STYLE=""
if [ -f "$LOCAL_SETTINGS" ]; then
    ACTIVE_STYLE=$(python3 -c "
import json
try:
    with open('$LOCAL_SETTINGS', 'r') as f:
        data = json.load(f)
    style_name = data.get('outputStyle', '')
    print(style_name)
except:
    pass
" 2>/dev/null)
fi

if [ -n "$ACTIVE_STYLE" ]; then
    echo "\"$ACTIVE_STYLE\""
else
    echo 'null'
fi
echo ','

# 7c. All output styles with full content
echo '  "all": '
python3 -c "
import json
import os

user_styles_dir = '$CLAUDE_DIR/output-styles'
project_styles_dir = '$TARGET_CWD/.claude/output-styles'

all_styles = {}

# Load user output styles
if os.path.exists(user_styles_dir):
    for filename in os.listdir(user_styles_dir):
        if filename.endswith('.md'):
            filepath = os.path.join(user_styles_dir, filename)
            try:
                with open(filepath, 'r') as f:
                    content = f.read()
                style_id = filename[:-3]  # Remove .md extension
                all_styles[style_id] = {
                    'id': style_id,
                    'name': style_id,
                    'path': filepath,
                    'content': content,
                    'source': 'user'
                }
            except:
                pass

# Load project output styles (can override user styles)
if os.path.exists(project_styles_dir):
    for filename in os.listdir(project_styles_dir):
        if filename.endswith('.md'):
            filepath = os.path.join(project_styles_dir, filename)
            try:
                with open(filepath, 'r') as f:
                    content = f.read()
                style_id = filename[:-3]  # Remove .md extension
                all_styles[style_id] = {
                    'id': style_id,
                    'name': style_id,
                    'path': filepath,
                    'content': content,
                    'source': 'project'
                }
            except:
                pass

print(json.dumps(all_styles))
"
echo '},'

# 8. Installed plugins
PLUGINS_FILE="$CLAUDE_DIR/plugins/installed_plugins.json"
echo '"installedPlugins": '
if [ -f "$PLUGINS_FILE" ]; then
    cat "$PLUGINS_FILE"
else
    echo '{}'
fi
echo ','

# 9. Available agents
echo '"agents": {'
echo '  "user": '
list_dir_json "$CLAUDE_DIR/agents"
echo ','
echo '  "project": '
list_dir_json "$TARGET_CWD/.claude/agents"
echo '},'

# 10. Known project directories (for CWD picker)
# Read from ~/.claude.json which has richer project data
CLAUDE_JSON="$HOME/.claude.json"
echo '"knownProjects": '
python3 -c "
import json
import os

claude_json_path = '$CLAUDE_JSON'
projects_dir = '$CLAUDE_DIR/projects'
projects = []

# Try to read from ~/.claude.json first (has usage stats)
if os.path.exists(claude_json_path):
    try:
        with open(claude_json_path, 'r') as f:
            data = json.load(f)

        proj_data = data.get('projects', {})
        for path, info in proj_data.items():
            # Get last session timestamp if available
            last_used = info.get('exampleFilesGeneratedAt', 0)
            projects.append({
                'path': path,
                'lastUsed': last_used,
                'lastCost': info.get('lastCost', 0),
                'hasClaudeMd': os.path.exists(os.path.join(path, 'CLAUDE.md'))
            })
    except Exception as e:
        pass

# Fallback: also check ~/.claude/projects/ directory
if os.path.exists(projects_dir):
    existing_paths = {p['path'] for p in projects}
    for item in os.listdir(projects_dir):
        if item.startswith('.'):
            continue
        # The encoding replaces / with - and strips leading -
        # So -Users-foo-bar means /Users/foo/bar
        decoded = '/' + item.lstrip('-').replace('-', '/')
        if decoded not in existing_paths:
            projects.append({
                'path': decoded,
                'lastUsed': 0,
                'lastCost': 0,
                'hasClaudeMd': os.path.exists(os.path.join(decoded, 'CLAUDE.md'))
            })

# Sort by most recently used
projects.sort(key=lambda x: x.get('lastUsed', 0), reverse=True)
print(json.dumps(projects))
"

echo '}'
