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

## Installation

Install Visual Context as a shell command for easy access from any project:

```bash
cd /path/to/visual-context
./install.sh
```

This will add a `visual-context` alias to your shell configuration (~/.zshrc or ~/.bashrc).

After installation, restart your terminal or run:
```bash
source ~/.zshrc  # or ~/.bashrc
```

## Quick Start

Once installed, simply navigate to any project directory and run:

```bash
cd ~/my-project
visual-context
```

This will:
1. Scan the current directory's Claude Code context
2. Generate a visual representation
3. Start a local web server
4. Open the visualization in your default browser

## Usage

### Basic Usage

```bash
# Scan current directory
visual-context

# Scan specific directory
visual-context /path/to/project
```

### Manual Usage (Without Installation)

If you prefer not to install the alias, you can run directly:

```bash
cd /path/to/visual-context
./run.sh /path/to/your/project
```

### Manual Scanning

To scan context without starting the server:

```bash
./scripts/scan-context.sh /path/to/your/project > context.json
```

Then open `index.html` in your browser to view the results.

## Project Structure

```
visual-context/
  run.sh                  # Launcher script (scan + serve + open)
  install.sh              # Installation script (adds shell alias)
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
  docs/
    usage-guide.md        # Detailed usage guide
    architecture.md       # Technical architecture
  reference/
    system-prompt-visualizer-v1.html  # Original v1 prototype
```

## Features

- **Layer Cards** - Each context source displayed as a collapsible card
- **Syntax Highlighting** - JSON and markdown content rendered with highlighting
- **Line Numbers** - Code-like display with line numbers for easy reference
- **File References** - Expandable `@FILE` references in CLAUDE.md files
- **Dark Mode** - Editor-inspired minimal dark theme

## How It Works

Visual Context operates in three stages:

1. **Scanning** - The `scan-context.sh` script collects context data from:
   - Claude Code system configuration
   - Global user settings (`~/.claude/`)
   - Project-specific settings (`./.claude/`)
   - Known projects and usage statistics

2. **Data Generation** - Context data is serialized to JSON format (`context.json`)

3. **Visualization** - A local web server serves the HTML/CSS/JS interface that renders the context layers in an interactive, readable format

The visualization displays each context layer as a collapsible card with syntax highlighting, making it easy to understand exactly what information Claude Code has access to during your sessions.

## Uninstall

To remove the Visual Context command:

1. Open your shell configuration file:
   ```bash
   # For zsh
   nano ~/.zshrc

   # For bash
   nano ~/.bashrc  # or ~/.bash_profile on macOS
   ```

2. Remove the lines:
   ```bash
   # Visual Context - Claude Code context visualizer
   alias visual-context='...'
   ```

3. Restart your terminal or run:
   ```bash
   source ~/.zshrc  # or ~/.bashrc
   ```

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
