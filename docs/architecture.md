# Visual Context Architecture

## Overview

Visual Context is a static web application that visualizes Claude Code's context composition system. It consists of three main components:

1. **Context Scanner** (Bash script)
2. **Data Layer** (JSON)
3. **Visualization Layer** (HTML/CSS/JS)

## Component Architecture

### 1. Context Scanner (`scripts/scan-context.sh`)

**Purpose**: Extract and serialize Claude Code configuration data

**Input**:
- Target project directory path (optional, defaults to $PWD)

**Output**:
- JSON structure containing all context layers

**Key Functions**:
- `encode_path()` - Converts filesystem paths to Claude's project directory naming
- `read_file_json()` - Safely reads file contents and escapes for JSON
- `list_dir_json()` - Lists directory contents as JSON array
- `extract_file_refs()` - Parses CLAUDE.md for file references

**Data Sources**:
```
~/.claude/                      # Global user configuration
  ├── CLAUDE.md                # Global memory
  ├── settings.json            # Hooks, MCP servers
  ├── plugins/                 # Installed plugins
  ├── agents/                  # Custom agents
  ├── output-styles/           # Global output styles
  └── projects/                # Known projects

<project>/.claude/              # Project-specific config
  ├── CLAUDE.md                # Project memory
  ├── settings.local.json      # Local settings
  ├── agents/                  # Project agents
  └── output-styles/           # Project output styles

.claude-config/                 # Extracted binary config
  ├── system_prompt.md         # System prompt
  └── tools.json               # Available tools
```

**Flow**:
1. Determine target project directory
2. Locate Claude Code configuration directories
3. Read and serialize each context layer
4. Output complete JSON structure to stdout

### 2. Data Layer (`context.json`)

**Structure**:
```json
{
  "metadata": {
    "scannedAt": "ISO-8601 timestamp",
    "targetCwd": "/absolute/path",
    "claudeDir": "/Users/name/.claude"
  },
  "systemPrompt": {
    "exists": true,
    "content": "...",
    "path": "..."
  },
  "toolsArray": [...],
  "globalMemory": {...},
  "projectMemory": {...},
  "settings": {...},
  "localSettings": {...},
  "outputStyles": {
    "user": [...],
    "project": [...]
  },
  "installedPlugins": {...},
  "agents": {
    "user": [...],
    "project": [...]
  },
  "knownProjects": [...]
}
```

### 3. Visualization Layer

**Entry Point**: `index.html`

**Architecture**:
```
index.html                  # Main entry, layout structure
├── src/styles/
│   ├── variables.css       # Design tokens (colors, spacing)
│   ├── base.css           # Base styles (reset, typography)
│   └── components.css     # Component-specific styles
├── src/components/
│   └── layer-renderer.js  # Renders context layer cards
└── src/data/
    └── context-loader.js  # Loads and normalizes data
```

**Key Classes**:

**`ContextLoader`** (`src/data/context-loader.js`):
- Fetches `context.json`
- Normalizes data structure
- Provides data to components

**`LayerRenderer`** (`src/components/layer-renderer.js`):
- Renders individual context layer cards
- Handles collapsible sections
- Applies syntax highlighting
- Renders line numbers

**UI Components**:
- **Layer Cards**: Collapsible cards for each context source
- **Content Viewers**: Syntax-highlighted code/markdown display
- **Project Selector**: Dropdown to switch between known projects
- **Metadata Panel**: Shows scan timestamp and paths

## Entrypoint System

### Launcher (`run.sh`)

**Purpose**: Single-command workflow from scan to visualization

**Flow**:
1. Validate target directory
2. Resolve to absolute path
3. Execute context scanner
4. Redirect output to `context.json`
5. Find available port (8080-8085)
6. Start Python HTTP server
7. Open default browser
8. Handle cleanup on exit (Ctrl+C)

**Error Handling**:
- Directory validation
- Scanner execution failures
- Port availability checking
- Server startup verification

### Installer (`install.sh`)

**Purpose**: Make visual-context available as a shell command

**Flow**:
1. Detect user's shell (zsh/bash)
2. Determine appropriate RC file
3. Check for existing alias
4. Add/update alias with absolute path
5. Display usage instructions

**Features**:
- Shell detection (zsh, bash)
- RC file selection (.zshrc, .bashrc, .bash_profile)
- Duplicate prevention
- Idempotent updates

## Data Flow

```
User runs: visual-context /path/to/project
                ↓
         run.sh validates path
                ↓
     scan-context.sh reads configs
                ↓
      JSON written to context.json
                ↓
      Python HTTP server starts
                ↓
         Browser opens page
                ↓
     context-loader.js fetches JSON
                ↓
    layer-renderer.js builds UI
                ↓
      User views visualization
```

## Design Principles

### Minimal Dependencies
- No npm packages
- No build step
- Vanilla HTML/CSS/JS
- Python 3 for HTTP server (already installed on macOS)

### Static Architecture
- No server-side logic beyond file serving
- All processing in browser or scanner script
- No database or persistent storage

### Modularity
- Separate concerns: scanning, data, visualization
- Each component can be used independently
- Clear interfaces between layers

### Extensibility
- Easy to add new context sources
- Component-based rendering
- CSS custom properties for theming

## Future Architecture Considerations

### v0.2.0 - Live Editing
- WebSocket server for live updates
- File system watchers for changes
- In-browser editor with save capability

### v0.3.0 - Comparison Tools
- Diff engine for context comparison
- Token counting for size estimation
- Layer precedence simulation

## Technical Requirements

### Runtime
- Bash 3.2+ (macOS default)
- Python 3.6+ (macOS default)
- Modern browser (Chrome, Firefox, Safari)

### Development
- Text editor
- Web browser with dev tools
- Terminal access

## Security Considerations

- Local-only HTTP server (no external access)
- No sensitive data transmission
- Read-only context scanning
- Port range limitation (8080-8085)
