# Claude Code Session Data Research
**Date:** 2026-01-21
**Purpose:** Document how Claude Code stores session data and what information can be accessed for visualization

## Executive Summary

Claude Code stores extensive session data locally in `~/.claude/` directories. Sessions are tracked per-project with complete conversation history, tool calls, and metadata. While the data is accessible via file system, there is **no official real-time API** for accessing active context window contents. The Analytics API only provides aggregated daily metrics for organizations.

## Storage Locations

### Primary Directories

1. **`~/.claude/history.jsonl`**
   - Global command history across all projects
   - 2,536 lines in current system
   - Simple format: `{"display": "user prompt", "timestamp": <ms>, "project": "/path/to/project"}`
   - Does NOT contain conversation content, only user prompts

2. **`~/.claude/projects/<encoded-path>/`**
   - Per-project session storage
   - Directory names are filesystem-safe encoded paths (e.g., `-Users-sam-medb-projects-visual-context`)
   - Contains subdirectories for each session

3. **`~/.claude/projects/<encoded-path>/<session-id>.jsonl`**
   - Complete session transcript
   - JSONL format (one JSON object per line)
   - Current session: 84 entries, 2.0MB
   - Contains ALL conversation data (see structure below)

4. **`~/.claude/projects/<encoded-path>/<session-id>/subagents/`**
   - Stores parallel agent execution logs
   - Each agent has its own `agent-<id>.jsonl` file
   - Same format as main session file

5. **`~/.claude/debug/<session-id>.txt`**
   - Debug logs for each session
   - Contains startup information, plugin loading, MCP configuration
   - Useful for understanding session initialization

6. **`~/.claude/session-env/<session-id>/`**
   - Session-specific environment variables (currently empty in samples)

7. **`~/.claude/todos/<session-id>-agent-<id>.json`**
   - Todo list state for each session/agent
   - JSON format with task tracking

8. **`~/.claude/.claude.json`**
   - Global metadata including project list
   - Tips history, feature gate flags
   - Not the same as `settings.json`

9. **`~/.claude/settings.json`**
   - User configuration for Claude Code
   - Hooks, status line, enabled plugins, MCP servers
   - The official location for Claude Code configuration

## Session File Structure

### File Format
- **Type:** JSONL (JSON Lines) - one JSON object per line
- **Encoding:** UTF-8
- **Size:** Can grow to multiple MB per session

### Entry Types
From analyzing current session files:
```
256 entries - type: "user"
392 entries - type: "assistant"
260 entries - type: "tool_use"
245 entries - type: "tool_result"
132 entries - type: "text"
 32 entries - type: "progress"
 31 entries - type: "agent_progress"
  9 entries - type: "thinking"
  7 entries - type: "file-history-snapshot"
  6 entries - type: "queue-operation"
  2 entries - type: "system"
  1 entry  - type: "hook_progress"
```

### User Message Structure
```json
{
  "type": "user",
  "uuid": "<unique-id>",
  "parentUuid": "<previous-message-uuid>",
  "sessionId": "<session-id>",
  "timestamp": "2026-01-21T19:56:27.000Z",
  "cwd": "/Users/sam/medb/projects/visual-context",
  "gitBranch": "main",
  "version": "2.1.14",
  "isSidechain": false,
  "userType": "external",
  "message": {
    "role": "user",
    "content": "user prompt text"
  },
  "thinkingMetadata": {
    "level": "high",
    "disabled": false,
    "triggers": []
  },
  "todos": []
}
```

### Assistant Message Structure
```json
{
  "type": "assistant",
  "uuid": "<unique-id>",
  "parentUuid": "<previous-message-uuid>",
  "sessionId": "<session-id>",
  "timestamp": "2026-01-21T19:56:37.094Z",
  "cwd": "/Users/sam/medb/projects/visual-context",
  "gitBranch": "main",
  "version": "2.1.14",
  "requestId": "<anthropic-request-id>",
  "message": {
    "model": "claude-sonnet-4-5-20250929",
    "id": "<message-id>",
    "type": "message",
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "response text"
      },
      {
        "type": "tool_use",
        "id": "<tool-use-id>",
        "name": "tool_name",
        "input": {}
      },
      {
        "type": "thinking",
        "thinking": "internal reasoning...",
        "signature": "<cryptographic-signature>"
      }
    ],
    "stop_reason": "end_turn",
    "usage": {
      "input_tokens": 10,
      "cache_creation_input_tokens": 19156,
      "cache_read_input_tokens": 13541,
      "output_tokens": 1,
      "service_tier": "standard"
    }
  }
}
```

### File History Snapshots
```json
{
  "type": "file-history-snapshot",
  "messageId": "<message-id>",
  "snapshot": {
    "messageId": "<message-id>",
    "trackedFileBackups": {},
    "timestamp": "2026-01-21T19:56:27.075Z"
  },
  "isSnapshotUpdate": false
}
```

## Available Data in Session Files

### What IS Available

1. **Complete Conversation History**
   - All user prompts and assistant responses
   - Full message content with timestamps
   - Parent-child relationships (conversation tree)

2. **Tool Execution**
   - Tool use requests with full input parameters
   - Tool results with output/error data
   - Tool execution timestamps

3. **Thinking/Reasoning**
   - Extended thinking blocks (when enabled)
   - Cryptographically signed for authenticity

4. **Context Metadata**
   - Current working directory per message
   - Git branch information
   - Claude Code version

5. **Token Usage**
   - Input/output tokens per request
   - Cache creation and read tokens
   - Model used for each response

6. **Session Metadata**
   - Session ID and UUID chain
   - Request IDs (for Anthropic API correlation)
   - Timestamps (ISO 8601 format)

7. **Progress Tracking**
   - Agent progress updates
   - Queue operations
   - Hook execution progress

8. **File Changes**
   - File history snapshots
   - Tracked file backups (empty in samples, but structure exists)

### What IS NOT Available

1. **Active Context Window Contents**
   - No direct access to what's currently in the prompt
   - No API showing which files are loaded in context
   - Cannot see prompt caching structure

2. **Real-time Session State**
   - Files must be read from disk (no streaming API)
   - No notification system for new messages
   - Would need file watching to detect updates

3. **Context Window Statistics**
   - No indication of context window usage percentage
   - Cannot determine which cached content is active
   - Token counts are per-request, not cumulative for context

4. **Embedded File Contents**
   - Tool results reference files but don't embed full contents
   - Would need to cross-reference with actual file system

5. **Settings at Message Time**
   - No snapshot of active settings/config per message
   - MCP servers, plugins, hooks not recorded per-message

## Programmatic Access

### File-based Access (Available Now)

**Pros:**
- Complete access to all historical session data
- Can parse JSONL files directly
- No authentication required (local files)
- Can track any project's sessions

**Cons:**
- Must read from disk (no streaming)
- Need to implement file watching for real-time updates
- Must parse JSONL format
- No schema validation or type safety
- No guarantee of format stability across versions

**Example Implementation:**
```typescript
// Read session file
const sessionPath = `${HOME}/.claude/projects/${encodeProjectPath(projectPath)}/${sessionId}.jsonl`;
const lines = fs.readFileSync(sessionPath, 'utf-8').split('\n').filter(Boolean);
const entries = lines.map(line => JSON.parse(line));

// Filter to conversation messages
const messages = entries.filter(e =>
  e.type === 'user' || e.type === 'assistant'
);

// Get latest context state
const latestCwd = messages[messages.length - 1]?.cwd;
const latestBranch = messages[messages.length - 1]?.gitBranch;
```

### Claude Code Analytics API (Organizations Only)

**URL:** `https://api.anthropic.com/v1/organizations/usage_report/claude_code`

**What it provides:**
- Daily aggregated metrics (NOT real-time)
- Per-user productivity stats (sessions, LOC, commits, PRs)
- Tool acceptance/rejection rates
- Token usage and cost by model
- Available with ~1 hour delay

**What it does NOT provide:**
- Individual session contents
- Real-time data
- Context window state
- Message-level detail
- Available for individual accounts (org only)

**Requires:**
- Admin API key (`sk-ant-admin...`)
- Organization account (not individual)
- Admin role in organization

### Headless/Programmatic Claude Code

**Available via:** `claude -p "prompt" --output-format json`

**What it provides:**
```json
{
  "session_id": "unique-session-id",
  "result": "response text",
  "usage": {
    "input_tokens": 100,
    "output_tokens": 50
  },
  "structured_output": {}  // when using --json-schema
}
```

**Limitations:**
- Only returns final result, not intermediate state
- No access to context window contents
- Cannot inspect what files/context are loaded
- Session continuation via `--resume <session-id>` or `--continue`

### Known Limitation: Context Window Visibility

From GitHub Issue #6577:
> "The statusline configuration runs as an external bash script that cannot access Claude Code's internal context state. Users cannot display real-time context usage information."

This means there is **no official API** for accessing:
- Current context window token usage
- What content is actively in the prompt
- Cache hit/miss information in real-time

## Feasibility for Visual Context UI

### What CAN Be Built

1. **Session Transcript Viewer**
   - Read session JSONL files
   - Display conversation history
   - Show tool executions and results
   - Track token usage over time
   - **Feasibility:** HIGH - all data available in files

2. **Project Session Browser**
   - List all sessions for a project
   - Show session metadata (date, message count, tokens)
   - Search across conversations
   - **Feasibility:** HIGH - straightforward file system access

3. **Near Real-time Updates**
   - Use file watching (fs.watch) to detect new entries
   - Tail session JSONL file for new messages
   - Update UI when session file grows
   - **Feasibility:** MEDIUM - requires polling/watching, 100-500ms delay

4. **Context Reconstruction**
   - Parse tool_use entries to see what files were accessed
   - Track which files were read/written during session
   - Show tool usage patterns
   - **Feasibility:** MEDIUM - requires parsing tool inputs/outputs

5. **Settings/Config Display**
   - Read `~/.claude/settings.json` for MCP servers, plugins
   - Read `~/.claude/CLAUDE.md` for custom instructions
   - Show active configuration
   - **Feasibility:** HIGH - files are JSON/markdown

### What CANNOT Be Built (Without Hacks)

1. **True Real-time Context Window View**
   - Cannot see what's actively in Claude's prompt at this moment
   - Cannot determine which content is cached vs. uncached
   - No API for "current prompt tokens used/available"
   - **Alternative:** Show per-message tokens, estimate based on message history

2. **Context Window Percentage/Usage Bar**
   - No direct measurement of 200K context usage
   - **Alternative:** Sum input_tokens from recent messages (approximation only)

3. **Active File List in Context**
   - No explicit "these files are loaded" metadata
   - **Alternative:** Parse Read/Write/Edit tool calls to infer accessed files

4. **Prompt Cache Visualization**
   - Cannot see cache structure or hit rates in real-time
   - **Alternative:** Show `cache_read_input_tokens` per message

## Recommendations for Visual Context Implementation

### Phase 1: Session History Viewer (Fully Feasible)
- Read session JSONL files
- Display conversation tree with parent/child relationships
- Show timestamps, token usage, model used
- Filter by message type (user/assistant/tool/thinking)
- Search within conversation

### Phase 2: Project Context Dashboard (Fully Feasible)
- Show active project settings from `~/.claude/settings.json`
- Display custom instructions from `~/.claude/CLAUDE.md`
- List enabled plugins and MCP servers
- Show project-specific `.claude.json` if exists

### Phase 3: Near Real-time Session Monitoring (Feasible with Polling)
- Watch session JSONL file for changes (fs.watch or polling)
- Update UI when new messages arrive
- Show "session active" indicator
- Tail mode for following along with active session

### Phase 4: Context Approximation (Best Effort)
- Estimate context usage from token counts in message history
- Track file accesses via tool_use parsing
- Show "files likely in context" based on recent Read/Write tools
- Visualize token accumulation over conversation

### Phase 5: Multi-session Analytics (Fully Feasible)
- Aggregate data across sessions
- Token usage trends over time
- Most-used tools and acceptance rates
- Session duration and message counts

## File Watching Strategy

For real-time updates without official API:

```typescript
import { watch } from 'fs';
import { readFileSync } from 'fs';

let lastSize = 0;

const watcher = watch(sessionFilePath, (event) => {
  if (event === 'change') {
    const stats = statSync(sessionFilePath);
    if (stats.size > lastSize) {
      // File grew, read new entries
      const content = readFileSync(sessionFilePath, 'utf-8');
      const lines = content.split('\n');
      const newLines = lines.slice(lastLineCount);

      newLines.forEach(line => {
        if (line.trim()) {
          const entry = JSON.parse(line);
          handleNewEntry(entry);
        }
      });

      lastSize = stats.size;
      lastLineCount = lines.length;
    }
  }
});
```

**Alternative:** Polling every 500ms for lower overhead than fs.watch on macOS

## Security Considerations

1. **Local File Access**
   - Session files contain complete conversation history
   - May include sensitive code, credentials, or private information
   - UI should run locally only, no uploading to external servers

2. **Settings Files**
   - `settings.json` contains API keys for MCP servers
   - Must sanitize/redact sensitive values before display
   - `CLAUDE.md` may contain proprietary instructions

3. **Authentication**
   - No authentication on local files
   - Consider adding basic file-level permissions check
   - Warn users about sensitive data before displaying

## Related Files to Monitor

Beyond session files, these are useful for context:

- `~/.claude/settings.json` - Claude Code configuration
- `~/.claude/CLAUDE.md` - Global custom instructions
- `~/.claude/plugins/installed_plugins.json` - Plugin list
- `~/.claude.json` - Global metadata and project list
- `<project>/.claude.json` - Project-specific overrides
- `~/.claude/stats-cache.json` - Usage statistics cache
- `~/.claude/shell-snapshots/snapshot-*.sh` - Shell environment at session start

## Sample Session File Location

Current session being analyzed:
```
/Users/sam/.claude/projects/-Users-sam-medb-projects-visual-context/f965e20c-cce7-4b10-b2c5-dec66f58bbe1.jsonl
```

Contains:
- 84 entries
- 2.0MB size
- Started: 2026-01-21T19:56:27.000Z
- Session ID: f965e20c-cce7-4b10-b2c5-dec66f58bbe1
- Project: /Users/sam/medb/projects/visual-context
- Git branch: main
- Claude version: 2.1.14

## Conclusion

**For your Visual Context UI, you CAN build:**

1. Complete session history viewer by reading JSONL files
2. Project configuration display from settings files
3. Near real-time updates via file watching (with ~100-500ms delay)
4. Tool usage and file access tracking by parsing tool calls
5. Token usage trends and cost estimation
6. Multi-session analytics and search

**You CANNOT directly access:**

1. The exact current contents of the context window
2. Real-time "what's in the prompt right now" information
3. Prompt cache structure or live cache hit rates
4. Official streaming API for session updates

**Recommendation:** Build the UI based on file system access to session JSONL files. This gives you 95% of what you need. The missing 5% (true real-time context window visibility) is not exposed by Claude Code's architecture and would require reverse engineering or official API changes.

The data is rich and well-structured. A visualization tool can provide tremendous value by making this hidden session data visible and searchable.

## Sources

- [Claude Code Analytics API Documentation](https://platform.claude.com/docs/en/build-with-claude/claude-code-analytics-api)
- [Run Claude Code Programmatically](https://code.claude.com/docs/en/headless)
- [Claude Code Settings Documentation](https://docs.claude.com/en/docs/claude-code/settings)
- [GitHub Issue #6577 - Context data access in statusline hooks](https://github.com/anthropics/claude-code/issues/6577)
- [Programmatic Tool Calling - Claude Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)
- [Context Windows - Claude Docs](https://platform.claude.com/docs/en/build-with-claude/context-windows)
- [Session Management - Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/sessions)
