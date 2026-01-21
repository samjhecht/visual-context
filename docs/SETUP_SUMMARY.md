# Visual Context - Claude Config Extraction Setup

## What Changed

The `scan-context.sh` script now dynamically loads Claude Code's system prompt and tools array instead of using a hardcoded path.

## Key Files Added/Modified

### New Files

1. **scripts/extract-claude-config-manual.sh** - Guide for manually extracting Claude config
   - Shows how to ask Claude to dump its own prompt and tools
   - Provides copy/paste commands for saving the output

2. **scripts/extract-claude-config-simple.sh** - Automated extraction (experimental)
   - Uses `claude --print` to ask Claude for its config
   - May be slow (spawns nested Claude session)

3. **scripts/extract-from-binary.sh** - Binary parsing extraction (experimental)
   - Extracts from Claude Code binary using `strings`
   - Fast but may capture too much/too little

4. **.claude-config/** - Local cached configuration
   - `system_prompt.md` - Full Claude Code system prompt
   - `tools.json` - Complete tools array (17 tools)
   - `metadata.json` - Extraction metadata
   - `README.md` - Setup instructions

5. **docs/claude-config-extraction.md** - Complete documentation
   - All extraction methods explained
   - Troubleshooting guide
   - Update procedures

### Modified Files

1. **scripts/scan-context.sh**
   - Now looks for Claude config in multiple locations:
     - `./claude-config/` (project-local, preferred)
     - `~/medb/projects/wrangler/.claude-config/` (wrangler reference)
     - `~/.claude-config/` (global fallback)
   - Loads both system prompt AND tools array
   - Graceful fallback if no config found

## Current State

✓ Ready to use out of the box
- Copied current config from wrangler
- Contains Claude Code 2.0.76 system prompt
- Contains all 17 tools

## Testing

Verified working:

```bash
cd /Users/sam/medb/projects/visual-context
./scripts/scan-context.sh . | python3 -m json.tool > context.json

# Results:
# ✓ System prompt: 13,171 characters
# ✓ Tools array: 17 tools
# ✓ Global CLAUDE.md: found
# ✓ JSON valid and complete
```

## Future Updates

When Claude Code updates to a new version:

### Quick Method (Copy from Wrangler)
```bash
cp -r ~/medb/projects/wrangler/.claude-config/* ./.claude-config/
```

### Manual Extraction (Most Reliable)
```bash
./scripts/extract-claude-config-manual.sh
# Follow the instructions to ask Claude for its config
```

### Check Current Version
```bash
cat .claude-config/metadata.json
claude --version  # Compare versions
```

## Architecture

```
User opens index.html
    ↓
JavaScript loads context.json
    ↓
Context data comes from scan-context.sh
    ↓
scan-context.sh checks for .claude-config/
    ↓
Finds system_prompt.md and tools.json
    ↓
Includes in JSON output
    ↓
Web app displays in UI
```

## Benefits

1. **Always current** - Can update config when Claude Code updates
2. **No hardcoded paths** - Works across different environments
3. **Multiple extraction methods** - Manual, automated, or copy from wrangler
4. **Fallback locations** - Checks project, wrangler, and global
5. **Self-documenting** - Metadata tracks version and extraction date

## Scripts Comparison

| Script | Speed | Reliability | Use Case |
|--------|-------|-------------|----------|
| `extract-claude-config-manual.sh` | N/A | ★★★★★ | Best for first-time setup |
| `extract-claude-config-simple.sh` | Slow | ★★★☆☆ | Experimental automation |
| `extract-from-binary.sh` | Fast | ★★☆☆☆ | May extract too much noise |
| Copy from wrangler | Instant | ★★★★☆ | Quick updates if wrangler is current |

## Recommended Workflow

1. **Initial setup**: Already done (copied from wrangler)
2. **Regular use**: Just run `scan-context.sh`
3. **After Claude updates**: Run `extract-claude-config-manual.sh`
4. **Share with wrangler**: Copy `.claude-config/` to wrangler if needed

## Notes

- The `.claude-config/` directory is project-local (not global)
- Config is cached - doesn't extract on every scan
- Manual extraction is most reliable method
- Experimental scripts may improve over time
