# Visual Context

A local web application to visualize the full context composition that Claude Code assembles for each session.

## Overview

Visual Context helps you understand exactly what context goes into your Claude Code sessions by showing all the layers:

1. **System Prompt** (Immutable) - Claude Code's built-in instructions
2. **Global Memory** - Your `~/.claude/CLAUDE.md` instructions
3. **Project Memory** - Project-specific `./CLAUDE.md` instructions
4. **Session Hooks** - Hook-injected context
5. **Enabled Plugins** - Active plugin configurations
6. **MCP Servers** - Model Context Protocol server configurations
7. **Output Styles** - Custom output style modifications

## Usage

### Quick Start

1. Open `index.html` in your browser:
   ```bash
   open index.html
   ```

2. Select a working directory from the dropdown to view its context composition.

### Generate Live Context Data

To scan your actual Claude Code configuration:

```bash
./scripts/scan-context.sh /path/to/your/project > context.json
```

Then refresh the browser to load the new data.

## Project Structure

```
visual-context/
  index.html              # Main entry point
  context.json            # Generated context data
  src/
    styles/
      variables.css       # Design tokens
      base.css            # Base styles
      components.css      # Component styles
    components/
      layer-renderer.js   # Layer card rendering
    data/
      context-loader.js   # Data loading and normalization
  scripts/
    scan-context.sh       # Context scanning script
  reference/
    system-prompt-visualizer-v1.html  # Original v1 prototype
```

## Features

- **Layer Cards** - Each context source displayed as a collapsible card
- **Syntax Highlighting** - JSON and markdown content rendered with highlighting
- **Line Numbers** - Code-like display with line numbers for easy reference
- **File References** - Expandable `@FILE` references in CLAUDE.md files
- **Dark Mode** - Editor-inspired minimal dark theme

## Roadmap

### v0.2.0 (Planned)
- Live file editing capability
- Real-time context updates
- Output style preview

### v0.3.0 (Planned)
- Context diff comparison
- Context size estimation
- Layer reordering simulation

## Development

This is a vanilla HTML/CSS/JS application with no build step required. Simply edit the files and refresh your browser.

### Design Principles
- Minimal dependencies (zero npm packages)
- Editor-like aesthetic
- Dark mode by default
- Accessible and keyboard-navigable

## License

MIT
