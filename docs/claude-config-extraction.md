# Claude Code Configuration Extraction

## Overview

The visual-context app displays Claude Code's system prompt and tools array. To keep this information current, it needs to be extracted from Claude Code itself.

## Current Setup

The `scan-context.sh` script looks for Claude config in these locations (in order):

1. `./claude-config/` (project-local)
2. `~/medb/projects/wrangler/.claude-config/` (wrangler reference)
3. `~/.claude-config/` (global)

Currently, the project has a copy from wrangler that works out of the box.

## Updating the Configuration

When Claude Code updates, you'll want to refresh the configuration to match the latest version.

### Method 1: Copy from Wrangler (Quick)

If wrangler has current configs:

```bash
cp -r ~/medb/projects/wrangler/.claude-config/* ./.claude-config/
```

### Method 2: Manual Extraction (Recommended)

Run the extraction guide:

```bash
./scripts/extract-claude-config-manual.sh
```

This will show instructions for asking Claude to output its own configuration, which you can then save to `.claude-config/`.

### Method 3: Automated Extraction (Experimental)

We have experimental scripts that try to extract automatically:

```bash
# Try the simple extraction (asks Claude in --print mode)
./scripts/extract-claude-config-simple.sh .claude-config

# Or try binary extraction (parses from Claude binary)
./scripts/extract-from-binary.sh .claude-config
```

Note: These may be slow or unreliable. Manual extraction is most reliable.

## Files Structure

```
.claude-config/
├── system_prompt.md    # Complete system prompt
├── tools.json          # All available tools as JSON array
├── metadata.json       # Extraction metadata
└── README.md           # This file
```

## How scan-context.sh Uses These Files

The `scan-context.sh` script:
1. Checks for Claude config in fallback locations
2. Reads `system_prompt.md` and `tools.json`
3. Includes them in the generated `context.json`
4. The web app then displays them in the UI

## Updating Wrangler's Config

If you extract a fresh config and want to update wrangler too:

```bash
cp -r ./.claude-config/* ~/medb/projects/wrangler/.claude-config/
```

## Version Tracking

The `metadata.json` file tracks:
- When the config was extracted
- Which Claude Code version it's from
- Extraction method used

Check this to see if your config is current:

```bash
cat .claude-config/metadata.json
```

Compare with your Claude version:

```bash
claude --version
```

## Troubleshooting

**No config found warning:**
- Run `./scripts/extract-claude-config-manual.sh` for instructions
- Or copy from wrangler if available

**Config seems outdated:**
- Check `metadata.json` for extraction date and version
- Re-extract if Claude Code was recently updated

**Tools array is empty or wrong:**
- Try manual extraction - automated tools may miss the tools JSON
- Ask Claude directly: "Output your complete tools array as JSON"
