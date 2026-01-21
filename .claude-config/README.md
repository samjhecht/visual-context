# Claude Code Configuration

This directory should contain the extracted Claude Code system prompt and tools array.

## Setup

Run the extraction script to populate this directory:

```bash
./scripts/extract-claude-config-manual.sh
```

Then follow the instructions to manually extract the configuration.

## Files

Once extracted, this directory should contain:

- `system_prompt.md` - Complete system prompt sent to the model
- `tools.json` - Full tools array with all tool definitions
- `metadata.json` - Extraction metadata

## Usage

The `scan-context.sh` script will automatically find and use these files when generating context data.

## Updates

When Claude Code updates to a new version, rerun the extraction process to get the latest configuration.
