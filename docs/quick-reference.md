# Quick Reference

## Command Overview

### Installation
```bash
./install.sh                    # Install as shell command
```

### Running
```bash
visual-context                  # Scan current directory
visual-context /path/to/project # Scan specific directory
./run.sh /path/to/project       # Direct invocation (no install)
```

### Manual Operations
```bash
# Scan without server
./scripts/scan-context.sh /path > output.json

# Start server only (after scanning)
cd /path/to/visual-context
python3 -m http.server 8080
```

## File Locations

### Scripts
- `/run.sh` - Main launcher
- `/install.sh` - Installation script
- `/scripts/scan-context.sh` - Context scanner

### Data
- `/context.json` - Generated context data
- `~/.claude/` - Global Claude Code config
- `<project>/.claude/` - Project-specific config

### Documentation
- `/docs/usage-guide.md` - Detailed usage instructions
- `/docs/architecture.md` - Technical architecture
- `/docs/quick-reference.md` - This file

## Common Tasks

### Update Context Data
```bash
visual-context /path/to/project  # Regenerates context.json
```

### Change Port Range
Edit `run.sh` and modify the `PORTS` array:
```bash
PORTS=(8080 8081 8082 8083 8084 8085 9000 9001)
```

### Test Scripts
```bash
# Test scanner
./scripts/scan-context.sh . | head -20

# Test launcher with timeout
timeout 3 ./run.sh . || true

# Test with spaces in path
./run.sh "/path/with spaces/to/project"
```

### Uninstall
```bash
# Remove alias from shell config
nano ~/.zshrc  # or ~/.bashrc

# Delete repo
rm -rf /path/to/visual-context
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using a port
lsof -i :8080

# Kill process using port
kill -9 $(lsof -t -i :8080)
```

### Scanner Fails
```bash
# Verify Python 3
python3 --version

# Run scanner with error output
./scripts/scan-context.sh /path 2>&1 | less
```

### Server Won't Start
```bash
# Check Python HTTP server module
python3 -m http.server --help

# Test server manually
cd /path/to/visual-context
python3 -m http.server 8080
```

### Browser Doesn't Open
- Manually navigate to `http://localhost:8081` (or reported port)
- Check if `open` command is available: `which open`

## Key Features

### Path Handling
- Scripts properly handle paths with spaces
- Automatic absolute path resolution
- Validates directory existence before processing

### Port Selection
- Tries ports 8080-8085 in sequence
- Automatically finds first available port
- Reports selected port to user

### Error Handling
- Validates target directory exists
- Checks for scanner script availability
- Verifies server startup success
- Clean shutdown on Ctrl+C

### Shell Compatibility
- Supports zsh and bash
- Detects correct RC file automatically
- Prevents duplicate alias entries
- Idempotent installation

## Environment Requirements

### Minimum
- Bash 3.2+
- Python 3.6+
- macOS or Linux

### Recommended
- zsh or bash
- Modern web browser
- Terminal with ANSI color support

## Development

### Edit and Test Workflow
```bash
# 1. Edit files
nano src/components/layer-renderer.js

# 2. Regenerate context (if needed)
visual-context .

# 3. Refresh browser
# No build step needed!
```

### Add New Context Source
1. Modify `scripts/scan-context.sh`
2. Add data collection logic
3. Update JSON structure
4. Modify `src/data/context-loader.js` if needed
5. Update `src/components/layer-renderer.js` to display

### Debug Mode
```bash
# Run scanner with full output
./scripts/scan-context.sh . 2>&1 | tee debug.log

# Check generated JSON
cat context.json | python3 -m json.tool

# Test with verbose browser console
# Open DevTools in browser
```

## Tips

- Keep one terminal running the server
- Use `Ctrl+C` to stop cleanly
- Rescan automatically updates `context.json`
- Browser refresh picks up changes
- Line numbers aid in navigation
- Dark theme reduces eye strain
