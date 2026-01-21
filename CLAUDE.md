# Visual Context - Project Instructions

Visual Context is a web-based tool for visualizing Claude Code's context composition. It displays the layers of context (system prompt, CLAUDE.md files, plugins, MCP servers, etc.) that Claude Code assembles when processing user requests.

## Project Structure

- `/src/data/context-loader.js` - Loads and normalizes context data from JSON
- `/src/components/layer-renderer.js` - Renders context layers as interactive cards
- `/scripts/scan-context.sh` - Bash script that scans Claude Code configuration and outputs JSON
- `index.html` - Main application entry point

## Development Guidelines

- Keep the UI simple and focused on visualization
- All layers should be expandable/collapsible
- Use the existing color scheme and layer type system
- When adding new layer types, update both the loader and renderer

## Layer Types

- `immutable` - System prompt (cannot be edited)
- `global` - Global CLAUDE.md file
- `project` - Project-specific CLAUDE.md and output styles
- `hook` - Session hooks
- `plugin` - Enabled plugins
- `mcp` - MCP servers
- `tools` - Available tools

## Running the App

```bash
# Scan current directory and generate context.json
./run.sh

# Or scan a specific directory
./run.sh /path/to/project

# Then open index.html in a browser (or use a local server)
python3 -m http.server 8080
```
