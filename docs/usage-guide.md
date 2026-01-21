# Visual Context Usage Guide

## Installation

1. Clone or download the Visual Context repository:
   ```bash
   cd ~/path/to/repos
   git clone https://github.com/yourusername/visual-context.git
   cd visual-context
   ```

2. Run the installer:
   ```bash
   ./install.sh
   ```

3. Reload your shell configuration:
   ```bash
   source ~/.zshrc  # or ~/.bashrc if using bash
   ```

## Basic Usage

### Visualize Current Project

Navigate to any project directory and run:
```bash
cd ~/my-project
visual-context
```

This will:
1. Scan the current directory's Claude Code context
2. Generate a JSON representation of all context layers
3. Start a local HTTP server
4. Open your browser to view the visualization

### Visualize Different Project

You can scan a different project without navigating to it:
```bash
visual-context /path/to/another/project
```

### Stop the Server

Press `Ctrl+C` in the terminal where the server is running.

## What Gets Visualized

Visual Context shows you all the layers of context that Claude Code composes for a session:

1. **System Prompt** - The immutable base instructions that Claude Code uses
2. **Global Memory** - Your personal instructions from `~/.claude/CLAUDE.md`
3. **Project Memory** - Project-specific instructions from `./CLAUDE.md`
4. **Settings** - Global settings including hooks and MCP servers
5. **Local Settings** - Project-specific settings
6. **Output Styles** - Custom output formatting (user and project level)
7. **Installed Plugins** - Active Claude Code plugins
8. **Agents** - Available custom agents
9. **Known Projects** - All projects Claude Code has discovered

## Advanced Usage

### Manual Context Scanning

If you want to generate context data without starting the server:
```bash
cd /path/to/visual-context
./scripts/scan-context.sh /path/to/your/project > custom-output.json
```

### Running Without Installation

If you prefer not to install the alias:
```bash
cd /path/to/visual-context
./run.sh /path/to/your/project
```

### Port Conflicts

If ports 8080-8085 are all in use, the script will fail. You can:
1. Stop services using those ports
2. Edit `run.sh` to add more port options in the `PORTS` array

## Troubleshooting

### Browser Doesn't Open Automatically

If the browser doesn't open automatically, manually navigate to:
```
http://localhost:8081
```

(Or whichever port the script reports using)

### Scan Fails

If the context scan fails:
1. Check that you have Python 3 installed: `python3 --version`
2. Ensure the target directory exists and is readable
3. Check for error messages in the terminal output

### Server Won't Start

If the HTTP server fails to start:
1. Check that ports 8080-8085 are not all occupied: `lsof -i :8080`
2. Ensure you have Python 3 installed
3. Check file permissions in the visual-context directory

## Tips

- Keep the terminal window open to see server logs
- Refresh the browser to reload changes after rescanning
- The visualization auto-expands important context sections
- Use the collapse/expand buttons to navigate large files
- Check the console for detailed debugging information

## Uninstalling

To remove the `visual-context` command:

1. Edit your shell RC file:
   ```bash
   nano ~/.zshrc  # or ~/.bashrc
   ```

2. Remove these lines:
   ```bash
   # Visual Context - Claude Code context visualizer
   alias visual-context='...'
   ```

3. Reload your shell:
   ```bash
   source ~/.zshrc  # or ~/.bashrc
   ```

The visual-context repository itself can be deleted normally.
