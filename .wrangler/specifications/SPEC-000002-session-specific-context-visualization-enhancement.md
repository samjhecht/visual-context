---
id: SPEC-000002
title: Session-Specific Context Visualization Enhancement
type: specification
status: open
priority: high
labels:
  - specification
  - ui
  - session-context
  - enhancement
  - visual-context
createdAt: '2026-01-21T20:49:50.375Z'
updatedAt: '2026-01-21T20:49:50.375Z'
project: visual-context
wranglerContext:
  agentId: spec-writer-session-context
  estimatedEffort: 4 weeks
---
# Specification: Session-Specific Context Visualization Enhancement

## Executive Summary

**What:** Enhance the Visual Context UI to visualize session-specific context window contents, including conversation history, tool calls, and compaction boundaries. Add a session selector dropdown that appears after project selection, enabling users to drill down into what's currently loaded in Claude's context window for a specific session.

**Why:** Users struggle to understand what's accumulated in their context window over the course of a conversation. The `/context` command in Claude Code shows token breakdowns but doesn't provide human-readable exploration of the actual content. Users need visibility into how their memory files, system prompt, and conversation history combine to create their current Claude experience, and where they can make adjustments to tune prompts.

**Scope:**
- **Included:**
  - Session selector dropdown (appears after project selection)
  - Session-specific context visualization layer
  - Conversation history display (messages in active context)
  - Compaction boundary visualization
  - Token breakdown by context type
  - File access tracking from tool calls
  - Real-time session data updates via file watching
  
- **Excluded:**
  - Editing session files directly in the UI
  - Session management (create/delete/rename sessions)
  - Cross-session analytics or comparisons
  - Streaming conversation view (file watching provides near-real-time)
  - Direct API integration (using file-based access)

**Status:** Draft

---

## Goals and Non-Goals

### Goals

1. **Enable deep context exploration**: Allow users to drill down from high-level token breakdowns to actual message content
2. **Reflect actual context window state**: Show what's currently in Claude's context window, including effects of compaction
3. **Surface memory accumulation**: Help users see what's built up in CLAUDE.md files and how it affects their sessions
4. **Identify tuning opportunities**: Make it clear where users can add/remove/modify context to improve their experience
5. **Visualize session flow**: Show conversation history, tool usage, and context evolution over time
6. **Support workflow integration**: Make it easy to pop open context visualization while working in Claude Code

### Non-Goals

1. **Replace `/context` command**: This is a complementary GUI, not a replacement for CLI tools
2. **Modify session data**: Read-only visualization, no editing capabilities
3. **Real-time streaming**: File watching provides near-real-time (~100-500ms delay) which is sufficient
4. **Session recording/management**: Not building session lifecycle tools
5. **Multi-session comparison**: Focus on single-session deep dive
6. **Official API dependency**: Build on file system access, don't wait for official APIs

---

## Background & Context

### Problem Statement

Users working with Claude Code often experience:
- **Memory blindness**: Forgetting what's accumulated in global/project CLAUDE.md files
- **Context confusion**: Unclear how system prompt, memory, and conversation combine
- **Compaction opacity**: `/compact` command runs but users can't see what changed
- **Tuning friction**: Hard to identify where to adjust prompts for better results
- **System prompt evolution**: Each Claude release may change system prompt, creating uncertainty

The `/context` command provides a token breakdown diagram but doesn't allow drilling into the actual content:
```
System Prompt: ████████░░ 8.2K tokens
User Memory:   ███░░░░░░░ 2.1K tokens
Project:       █████░░░░░ 4.5K tokens
Conversation:  ████████████████ 15.3K tokens
```

Users need to **see the actual text** behind these numbers.

### Current State

Visual Context currently displays:
1. System Prompt layer (immutable built-in)
2. Global Memory layer (`~/.claude/CLAUDE.md`)
3. Project Memory layer (`./CLAUDE.md`)
4. Hooks, Plugins, MCP Servers layers

Missing:
- Session-specific data (conversation history, tool calls)
- Compaction visualization
- Token breakdown per layer
- Dynamic session selection

### Proposed State

Visual Context will add:
1. **Session selector dropdown** (appears when project selected)
2. **Session Context layer** showing:
   - Conversation history (messages currently in context window)
   - Compaction boundaries (visual separator)
   - Tool execution summary
   - Token breakdown by message
   - Files accessed during session

---

## Requirements

### Functional Requirements

**FR-001: Session Selection**
- System MUST display a session selector dropdown when a project is selected
- Dropdown MUST be hidden/disabled when no project is selected
- Dropdown MUST default to null/unselected state (showing placeholder text)
- Session list MUST be populated from `~/.claude/projects/<encoded-path>/` directory

**FR-002: Session Display Metadata**
- Each session option MUST display metadata matching Claude Code's `/resume` UI format:
  - Session name (if set) OR first prompt snippet (truncated to ~50 chars)
  - Timestamp (human-readable format like "2 hours ago" or "Jan 21, 2:30 PM")
  - Message count (optional indicator like "[42 msgs]")
- Sessions MUST be sorted by most recent first
- Active/current session SHOULD be indicated with special styling (if detectable)

**FR-003: Session Context Visualization**
- When no session is selected, session-specific layers MUST display placeholder message: "Select a session to visualize conversation context"
- When session is selected, system MUST render new layers below existing layers:
  - **Conversation History layer**: Messages currently in active context window
  - **Tool Activity layer**: Summary of tool calls (Read/Write/Edit with file paths)
  - **Token Breakdown layer**: Token distribution across message types

**FR-004: Conversation History Display**
- System MUST display only messages in the active context window (after most recent compaction boundary)
- Each message MUST show:
  - Message type (user/assistant)
  - Timestamp
  - Token usage (input/output/cache read)
  - Content (collapsible for long messages)
- Thinking blocks SHOULD be shown if present (collapsible)
- Tool calls SHOULD be shown inline with assistant messages (collapsible)

**FR-005: Compaction Boundary Visualization**
- System MUST detect `compact_boundary` entries in session JSONL
- System MUST render visual separator showing:
  - Compaction timestamp
  - Trigger type (manual/auto)
  - Token count before compaction (`preTokens`)
  - Token savings (calculated as preTokens - current active tokens)
  - Custom instructions (if provided to `/compact`)
- Messages before compaction boundary SHOULD be displayed in collapsed/archived section
- User MUST be able to expand archived section to view compacted messages

**FR-006: Token Breakdown**
- System MUST calculate and display token distribution:
  - System prompt tokens (from known system prompt size)
  - User memory tokens (from `~/.claude/CLAUDE.md`)
  - Project memory tokens (from `./CLAUDE.md`)
  - Conversation tokens (sum of message tokens in active context)
  - Tool definitions tokens (estimated from MCP servers/tools)
- Token breakdown SHOULD match `/context` command output where possible
- Breakdown SHOULD include visual progress bars showing proportion of 200K context window

**FR-007: File Access Tracking**
- System MUST parse `tool_use` entries for Read/Write/Edit/Glob tools
- System MUST extract file paths from tool inputs
- System MUST display "Files in Context" list showing:
  - File paths accessed during session
  - Last access timestamp
  - Access type (read/write/edit)
  - Frequency of access (if accessed multiple times)

**FR-008: Real-time Updates**
- System SHOULD watch session JSONL file for changes (via file watching or polling)
- When new entries are detected, system SHOULD automatically update display
- Update latency SHOULD be < 1 second from file write to UI update
- User SHOULD see visual indicator when session is active vs. inactive

**FR-009: Session File Location Detection**
- System MUST encode project path using Claude Code's encoding scheme:
  - `/Users/sam/project` → `-Users-sam-project`
- System MUST locate session files at: `~/.claude/projects/<encoded-path>/<session-id>.jsonl`
- System MUST handle missing/moved files gracefully with error message

**FR-010: Empty State Handling**
- If project has no sessions, dropdown MUST show "No sessions found"
- If session file is empty, display MUST show "Empty session (no messages yet)"
- If session file is malformed, display MUST show error with file path for debugging

### Non-Functional Requirements

**Performance**
- **NFR-001:** Session list population MUST complete within 500ms for projects with <100 sessions
- **NFR-002:** Session data parsing MUST complete within 1s for session files <10MB
- **NFR-003:** File watching update latency SHOULD be <500ms from file write to UI update
- **NFR-004:** UI SHOULD remain responsive during large session file parsing (use web workers if needed)

**Usability**
- **NFR-005:** Session selector MUST have clear visual affordance (dropdown icon, border)
- **NFR-006:** Long messages MUST be collapsible to prevent excessive scrolling
- **NFR-007:** Token breakdown MUST use color coding consistent with existing layer types
- **NFR-008:** Compaction boundary MUST be visually distinct (border, icon, different background)

**Reliability**
- **NFR-009:** File watching MUST gracefully handle file deletions, renames, permission errors
- **NFR-010:** JSONL parsing MUST handle partial lines (file written mid-line)
- **NFR-011:** System MUST validate session file format before attempting to parse
- **NFR-012:** Errors MUST be logged to browser console with actionable error messages

**Security**
- **NFR-013:** Session content MAY contain sensitive data - MUST run locally only
- **NFR-014:** No session data MUST be sent to external servers
- **NFR-015:** API keys in tool results SHOULD be redacted/masked in display
- **NFR-016:** User SHOULD be warned about sensitive data in session files

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Visual Context UI                       │
├─────────────────────────────────────────────────────────────┤
│  Header (Project + Session Selectors)                       │
│  ┌────────────────┐  ┌──────────────────────────┐          │
│  │ Project: medb  │  │ Session: Jan 21, 2:30 PM │          │
│  └────────────────┘  └──────────────────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  Existing Layers                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ System Prompt (8.2K tokens)                          │  │
│  │ User Memory (2.1K tokens)                            │  │
│  │ Project Memory (4.5K tokens)                         │  │
│  │ Hooks, Plugins, MCP                                  │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  NEW: Session-Specific Layers                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Token Breakdown (visual chart)                       │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Files in Context (from tool calls)                   │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ [Compacted Messages - Click to expand]              │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ══════════════════════════════════════════════       │  │
│  │ Compaction Boundary (Jan 21, 2:15 PM)               │  │
│  │ Manual compact | 14.2K → 1.8K tokens | Saved 12.4K  │  │
│  │ ══════════════════════════════════════════════       │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Active Conversation (15.3K tokens)                   │  │
│  │  User [14:32]: "Add file watching..."               │  │
│  │  Assistant [14:33]: "I'll add file watching..."     │  │
│  │    → Task tool: Create spec (collapsed)             │  │
│  │  User [14:45]: "Spec it up"                         │  │
│  │  Assistant [14:46]: Using writing-specs skill...    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

Data Flow:
┌──────────────────┐
│ User selects     │
│ Project          │
└────────┬─────────┘
         │
         v
┌──────────────────┐      ┌─────────────────────────┐
│ Scan ~/.claude/  │─────→│ Populate session list   │
│ projects/<proj>/ │      │ (from .jsonl files)     │
└──────────────────┘      └────────┬────────────────┘
                                   │
                                   v
                          ┌──────────────────┐
                          │ User selects     │
                          │ Session          │
                          └────────┬─────────┘
                                   │
                                   v
                          ┌──────────────────────────┐
                          │ Read session JSONL file  │
                          │ ~/.claude/projects/...   │
                          └────────┬─────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    v                             v
         ┌────────────────────┐        ┌──────────────────┐
         │ Parse JSONL        │        │ Watch file for   │
         │ - Messages         │        │ changes          │
         │ - Tool calls       │        │ (fs.watch)       │
         │ - Compact boundary │        └────────┬─────────┘
         │ - Token counts     │                 │
         └────────┬───────────┘                 │
                  │                             v
                  │                    ┌─────────────────┐
                  └───────────────────→│ Update UI       │
                                       │ (new messages)  │
                                       └─────────────────┘
```

### Components

#### Component 1: SessionSelector

**Responsibility:** Manage session dropdown, populate with available sessions

**Location:** `src/components/session-selector.js`

**Interfaces:**
- Input: Project path, Claude home directory path
- Output: Selected session ID, session metadata
- Events: `onSessionChange(sessionId)`

**Dependencies:**
- File system access to `~/.claude/projects/`
- Path encoding utility (matches Claude Code's encoding)

**Key behaviors:**
- Scan project directory for `.jsonl` files
- Parse first user message for snippet (or session name if set)
- Sort by modification time (most recent first)
- Render dropdown with metadata (timestamp, message count)
- Emit change event when selection changes

**Implementation notes:**
```javascript
class SessionSelector {
  constructor(containerElement, onSessionChange) {
    this.container = containerElement;
    this.onSessionChange = onSessionChange;
    this.sessions = [];
  }

  async loadSessions(projectPath) {
    const encodedPath = this.encodeProjectPath(projectPath);
    const sessionDir = `${HOME}/.claude/projects/${encodedPath}/`;
    
    // Read directory for .jsonl files
    const files = await fs.readdir(sessionDir);
    const sessionFiles = files.filter(f => f.endsWith('.jsonl'));
    
    // Load metadata for each session
    this.sessions = await Promise.all(
      sessionFiles.map(f => this.loadSessionMetadata(sessionDir + f))
    );
    
    // Sort by timestamp descending
    this.sessions.sort((a, b) => b.timestamp - a.timestamp);
    
    this.render();
  }

  async loadSessionMetadata(filePath) {
    // Read first user message for snippet
    const firstLine = await this.readFirstUserMessage(filePath);
    // Get file stats for timestamp
    const stats = await fs.stat(filePath);
    
    return {
      id: path.basename(filePath, '.jsonl'),
      snippet: firstLine?.substring(0, 50) + '...',
      timestamp: stats.mtime,
      messageCount: await this.countMessages(filePath)
    };
  }

  render() {
    // Render dropdown with session options
  }
}
```

#### Component 2: SessionDataLoader

**Responsibility:** Load and parse session JSONL files, extract context data

**Location:** `src/data/session-loader.js`

**Interfaces:**
- Input: Session file path
- Output: Parsed session data structure
  ```typescript
  {
    messages: Message[],
    compactBoundaries: CompactBoundary[],
    toolCalls: ToolCall[],
    tokenUsage: TokenUsage,
    fileAccesses: FileAccess[]
  }
  ```

**Dependencies:**
- File system access
- JSONL parser

**Key behaviors:**
- Read session file line-by-line (JSONL format)
- Parse each JSON entry
- Identify message types (user/assistant/tool_use/tool_result)
- Extract compaction boundaries
- Calculate token totals
- Track file accesses from Read/Write/Edit tools

**Implementation notes:**
```javascript
class SessionDataLoader {
  async loadSession(sessionFilePath) {
    const lines = (await fs.readFile(sessionFilePath, 'utf-8'))
      .split('\n')
      .filter(Boolean);
    
    const entries = lines.map(line => JSON.parse(line));
    
    return {
      messages: this.extractMessages(entries),
      compactBoundaries: this.extractCompactBoundaries(entries),
      toolCalls: this.extractToolCalls(entries),
      tokenUsage: this.calculateTokens(entries),
      fileAccesses: this.extractFileAccesses(entries)
    };
  }

  extractMessages(entries) {
    return entries
      .filter(e => e.type === 'user' || e.type === 'assistant')
      .map(e => ({
        id: e.uuid,
        type: e.type,
        timestamp: e.timestamp,
        content: e.message?.content || e.content,
        tokens: e.message?.usage || {},
        parentId: e.parentUuid
      }));
  }

  extractCompactBoundaries(entries) {
    return entries
      .filter(e => e.type === 'system' && e.subtype === 'compact_boundary')
      .map(e => ({
        timestamp: e.timestamp,
        trigger: e.compactMetadata?.trigger,
        preTokens: e.compactMetadata?.preTokens,
        customInstructions: e.compactMetadata?.customInstructions
      }));
  }

  extractFileAccesses(entries) {
    const accesses = [];
    
    entries
      .filter(e => e.type === 'tool_use')
      .forEach(e => {
        const toolName = e.name;
        const input = e.input;
        
        if (['Read', 'Write', 'Edit', 'Glob'].includes(toolName)) {
          accesses.push({
            file: input.file_path || input.pattern,
            tool: toolName,
            timestamp: e.timestamp
          });
        }
      });
    
    return accesses;
  }
}
```

#### Component 3: SessionContextRenderer

**Responsibility:** Render session-specific context layers (conversation, tokens, files)

**Location:** `src/components/session-renderer.js`

**Interfaces:**
- Input: Session data (from SessionDataLoader)
- Output: Rendered DOM elements for session layers

**Dependencies:**
- LayerRenderer (existing component for layer styling)
- Token calculation utilities

**Key behaviors:**
- Render token breakdown chart
- Render files-in-context list
- Render compaction boundaries with metadata
- Render conversation history (active context only)
- Render archived/compacted messages (collapsible)
- Handle message collapsing for long content

**Implementation notes:**
```javascript
class SessionContextRenderer {
  constructor(container) {
    this.container = container;
  }

  render(sessionData) {
    this.container.innerHTML = '';
    
    // Render layers in order
    this.renderTokenBreakdown(sessionData.tokenUsage);
    this.renderFilesInContext(sessionData.fileAccesses);
    this.renderCompactedMessages(sessionData, beforeBoundary=true);
    this.renderCompactBoundaries(sessionData.compactBoundaries);
    this.renderActiveConversation(sessionData, afterBoundary=true);
  }

  renderTokenBreakdown(tokenUsage) {
    const layer = {
      id: 'token-breakdown',
      type: 'session',
      title: 'Token Breakdown',
      subtitle: `${tokenUsage.total.toLocaleString()} / 200,000 tokens`,
      badge: 'Context',
      content: this.buildTokenChart(tokenUsage)
    };
    
    this.appendLayer(layer);
  }

  buildTokenChart(tokenUsage) {
    // Generate visual chart showing token distribution
    // Similar to /context command output
  }

  renderCompactBoundaries(boundaries) {
    boundaries.forEach(boundary => {
      const html = `
        <div class="compact-boundary">
          <div class="boundary-line"></div>
          <div class="boundary-info">
            <strong>Compacted</strong> ${new Date(boundary.timestamp).toLocaleString()}
            <br>
            Trigger: ${boundary.trigger} | 
            Pre-tokens: ${boundary.preTokens.toLocaleString()} |
            Savings: ~${(boundary.preTokens * 0.85).toLocaleString()} tokens
            ${boundary.customInstructions ? `<br>Instructions: "${boundary.customInstructions}"` : ''}
          </div>
          <div class="boundary-line"></div>
        </div>
      `;
      
      this.container.insertAdjacentHTML('beforeend', html);
    });
  }
}
```

#### Component 4: SessionFileWatcher

**Responsibility:** Watch session JSONL file for changes, trigger UI updates

**Location:** `src/data/session-watcher.js`

**Interfaces:**
- Input: Session file path
- Output: Events on file change
- Events: `onNewEntries(entries[])`

**Dependencies:**
- File system watching (browser-compatible solution or polling)

**Key behaviors:**
- Watch file for size changes
- Read new lines when file grows
- Parse new JSONL entries
- Emit events for new entries
- Handle file deletions/errors gracefully

**Implementation notes:**
```javascript
class SessionFileWatcher {
  constructor(filePath, onNewEntries) {
    this.filePath = filePath;
    this.onNewEntries = onNewEntries;
    this.lastSize = 0;
    this.polling = null;
  }

  start() {
    // Browser doesn't have fs.watch, use polling
    this.polling = setInterval(() => this.checkForChanges(), 500);
  }

  async checkForChanges() {
    try {
      const stats = await fs.stat(this.filePath);
      
      if (stats.size > this.lastSize) {
        const newEntries = await this.readNewEntries();
        if (newEntries.length > 0) {
          this.onNewEntries(newEntries);
        }
        this.lastSize = stats.size;
      }
    } catch (err) {
      console.error('File watch error:', err);
      this.stop();
    }
  }

  async readNewEntries() {
    const content = await fs.readFile(this.filePath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    const newLines = lines.slice(this.lastLineCount);
    
    this.lastLineCount = lines.length;
    
    return newLines.map(line => JSON.parse(line));
  }

  stop() {
    clearInterval(this.polling);
  }
}
```

### Data Model

#### Session Metadata
```typescript
interface SessionMetadata {
  id: string;              // UUID from filename
  projectPath: string;     // Original project path
  snippet: string;         // First 50 chars of first user message
  timestamp: Date;         // Last modified time
  messageCount: number;    // Total messages in session
  isActive: boolean;       // Currently active session (if detectable)
}
```

#### Session Data
```typescript
interface SessionData {
  messages: Message[];
  compactBoundaries: CompactBoundary[];
  toolCalls: ToolCall[];
  tokenUsage: TokenUsage;
  fileAccesses: FileAccess[];
}

interface Message {
  id: string;                    // UUID
  type: 'user' | 'assistant';
  timestamp: string;
  content: string | ContentBlock[];
  tokens: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
  };
  parentId?: string;
}

interface CompactBoundary {
  timestamp: string;
  trigger: 'manual' | 'auto';
  preTokens: number;
  customInstructions?: string;
}

interface ToolCall {
  id: string;
  name: string;
  input: any;
  result?: any;
  timestamp: string;
}

interface TokenUsage {
  systemPrompt: number;
  userMemory: number;
  projectMemory: number;
  conversation: number;
  tools: number;
  total: number;
}

interface FileAccess {
  file: string;
  tool: 'Read' | 'Write' | 'Edit' | 'Glob';
  timestamp: string;
  count?: number;  // If accessed multiple times
}
```

---

## Implementation Details

### Technology Stack

- **Frontend:** Vanilla JavaScript (matching existing implementation)
- **Styling:** CSS (existing variables.css, components.css)
- **File Access:** 
  - Browser: File System Access API (if available) or file input
  - Local server: Standard fetch() to read files served by http.server
- **File Watching:** 
  - Polling (500ms interval) - cross-platform compatible
  - Future: fs.watch() if running in Electron or native wrapper

### File Structure

```
src/
├── components/
│   ├── layer-renderer.js          # Existing
│   ├── session-selector.js        # NEW: Session dropdown
│   ├── session-renderer.js        # NEW: Session context layers
│   └── compact-boundary.js        # NEW: Compaction UI component
├── data/
│   ├── context-loader.js          # Existing
│   ├── session-loader.js          # NEW: Load/parse session JSONL
│   └── session-watcher.js         # NEW: File watching/polling
├── utils/
│   ├── path-encoder.js            # NEW: Claude path encoding
│   ├── token-calculator.js        # NEW: Token breakdown logic
│   └── jsonl-parser.js            # NEW: JSONL parsing utilities
└── styles/
    ├── variables.css              # Existing
    ├── components.css             # Existing (extend for session layers)
    └── session-context.css        # NEW: Session-specific styles
```

### Key Algorithms

#### Path Encoding (Claude Code Format)
```javascript
function encodeProjectPath(path) {
  // Claude Code encodes paths by replacing / with -
  // /Users/sam/project → -Users-sam-project
  return path.replace(/\//g, '-');
}

function decodeProjectPath(encoded) {
  // Reverse: -Users-sam-project → /Users/sam/project
  return encoded.replace(/^-/, '/').replace(/-/g, '/');
}
```

#### Token Calculation
```javascript
function calculateTokenBreakdown(sessionData, globalMemory, projectMemory, systemPrompt) {
  // System prompt: known size from system prompt layer
  const systemPromptTokens = estimateTokens(systemPrompt);
  
  // User memory: from ~/.claude/CLAUDE.md
  const userMemoryTokens = estimateTokens(globalMemory);
  
  // Project memory: from ./CLAUDE.md
  const projectMemoryTokens = estimateTokens(projectMemory);
  
  // Conversation: sum of active messages (after compaction)
  const conversationTokens = sessionData.messages
    .filter(m => m.afterLastCompaction)
    .reduce((sum, m) => sum + (m.tokens.input_tokens || 0), 0);
  
  // Tools: estimated from MCP server count and tool definitions
  const toolTokens = estimateMcpToolTokens(sessionData.mcpServers);
  
  return {
    systemPrompt: systemPromptTokens,
    userMemory: userMemoryTokens,
    projectMemory: projectMemoryTokens,
    conversation: conversationTokens,
    tools: toolTokens,
    total: systemPromptTokens + userMemoryTokens + projectMemoryTokens + conversationTokens + toolTokens
  };
}

function estimateTokens(text) {
  // Rough approximation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}
```

#### Active Context Detection
```javascript
function getActiveMessages(messages, compactBoundaries) {
  if (compactBoundaries.length === 0) {
    // No compaction, all messages are active
    return messages;
  }
  
  // Get most recent compaction boundary
  const lastBoundary = compactBoundaries[compactBoundaries.length - 1];
  const boundaryTime = new Date(lastBoundary.timestamp);
  
  // Return only messages after the boundary
  return messages.filter(m => new Date(m.timestamp) > boundaryTime);
}
```

### Configuration

No new configuration files needed. Uses existing:
- `~/.claude/settings.json` for Claude home directory path
- Browser localStorage for UI preferences (collapsed/expanded state)

---

## Security Considerations

### Authentication & Authorization

- **No authentication required**: Local file access only
- **File permissions**: Respects OS-level file permissions
- **No remote access**: All data stays on user's machine

### Data Protection

- **Sensitive data warning**: Session files may contain:
  - API keys in tool results
  - Proprietary code snippets
  - Private conversation history
  - Personal information
- **Redaction**: System SHOULD redact patterns like `sk-ant-*`, `API_KEY=*` in display
- **Local-only**: No session data transmitted over network
- **No logging**: Don't log session contents to external services

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| **Sensitive data exposure** | Redact API keys, warn users about sensitive content |
| **File system traversal** | Validate paths, restrict to `~/.claude/` directory |
| **Malformed JSONL parsing** | Validate JSON before parsing, catch parse errors |
| **Large file DoS** | Set file size limits, parse streaming/chunked |
| **XSS via message content** | Escape HTML in message display, use textContent |

### Compliance

- **GDPR**: User's own data on their machine, no data processing
- **Privacy**: No telemetry, no analytics, no external requests
- **Licensing**: MIT license (matching Claude Code), open source

---

## Error Handling

### Error Categories

1. **File Not Found Errors**
   - Session file deleted/moved
   - Project directory doesn't exist
   - Display: "Session file not found at [path]. Session may have been deleted."

2. **Parse Errors**
   - Malformed JSONL
   - Invalid JSON in line
   - Display: "Failed to parse session file. File may be corrupted. Line: [N]"

3. **Permission Errors**
   - Cannot read `~/.claude/` directory
   - Display: "Permission denied reading Claude directory. Check file permissions."

4. **File Watch Errors**
   - File deleted while watching
   - Permission changed during watch
   - Behavior: Stop watching, show "Session file no longer accessible"

### Error Recovery Strategies

```javascript
try {
  const sessionData = await loadSession(sessionPath);
  renderSession(sessionData);
} catch (err) {
  if (err.code === 'ENOENT') {
    showError('Session file not found. It may have been deleted.');
  } else if (err instanceof SyntaxError) {
    showError(`Invalid session file format. ${err.message}`);
  } else {
    showError(`Failed to load session: ${err.message}`);
    console.error('Full error:', err);
  }
}
```

---

## Testing Strategy

### Unit Tests

**Target Coverage: >80%**

- **session-loader.js**
  - Parse valid JSONL files
  - Handle malformed JSON lines
  - Extract messages correctly
  - Detect compact boundaries
  - Calculate token totals accurately

- **path-encoder.js**
  - Encode paths matching Claude Code format
  - Decode paths correctly
  - Handle edge cases (root, trailing slash)

- **token-calculator.js**
  - Estimate tokens from text
  - Calculate breakdown correctly
  - Sum total tokens accurately

### Integration Tests

- **Session selection flow**
  - Load project → populate sessions → select session → render context
  - Verify correct session file loaded
  - Verify layers rendered in correct order

- **File watching**
  - Append to session file → UI updates
  - Delete session file → error shown
  - Large append (many messages) → UI handles gracefully

- **Compaction visualization**
  - Session with no compaction → no boundary shown
  - Session with 1 compaction → boundary rendered with metadata
  - Session with multiple compactions → all boundaries shown

### End-to-End Tests

1. **Typical workflow**
   - Open Visual Context
   - Select project "medb"
   - Select session "Jan 21, 2:30 PM"
   - Verify all layers rendered
   - Expand/collapse messages
   - Verify token breakdown matches `/context` output

2. **Compaction workflow**
   - Load session before compaction
   - Run `/compact` in Claude Code
   - Verify UI updates to show boundary
   - Verify active messages updated
   - Verify token savings displayed

3. **Real-time updates**
   - Load active session
   - Send message in Claude Code
   - Verify new message appears in UI within 1s
   - Verify token count updates

### Performance Tests

- **Large session files** (>10MB, >1000 messages)
  - Load time <3s
  - UI remains responsive during parsing
  - Memory usage reasonable (<200MB)

- **Many sessions** (>100 sessions for project)
  - Session list loads <1s
  - Dropdown remains responsive
  - Search/filter works smoothly

---

## Success Criteria

### Launch Criteria

- [ ] Session selector dropdown implemented and functional
- [ ] Session list populated with correct metadata (name/snippet + timestamp)
- [ ] Conversation history displays messages from active context window
- [ ] Compaction boundaries rendered with metadata (timestamp, tokens saved, trigger)
- [ ] Token breakdown chart shows distribution across context types
- [ ] Files-in-context list shows files accessed via tool calls
- [ ] File watching/polling updates UI when session file changes
- [ ] Archived/compacted messages collapsible and expandable
- [ ] Error handling for missing/malformed session files
- [ ] UI responsive for sessions up to 10MB
- [ ] Documentation updated with session visualization features
- [ ] All functional requirements (FR-001 through FR-010) implemented
- [ ] All non-functional requirements met (performance, usability, reliability)

### Success Metrics (Post-Launch)

**User Engagement:**
- 60% of Visual Context users select a session within first use
- 40% of users expand compacted messages to view history
- 30% of users keep Visual Context open while working in Claude Code

**Usability:**
- Users can identify which memory files affect their session within 30 seconds
- Users can locate specific conversation messages within 1 minute
- Token breakdown matches `/context` output within 5% margin of error

**Performance:**
- p95 session load time <2s for sessions <5MB
- File watch update latency <1s (p95)
- UI frame rate >30fps during scrolling/expanding

**Quality:**
- <5% error rate on session file parsing
- Zero XSS vulnerabilities in message display
- Zero sensitive data leaks in UI

---

## Open Questions & Decisions

### Resolved Decisions

**Q: How should sessions be displayed in dropdown?**
**A:** Match Claude Code's `/resume` UI format: session name (if set) or first prompt snippet, plus timestamp and message count. Most recent first.

**Q: Should most recent session auto-select?**
**A:** No for v1. Dropdown defaults to null/unselected, with placeholder text in session layers prompting user to select.

**Q: What level of detail for conversation history?**
**A:** Show whatever is actually in the context window (after compaction). Display messages, tool calls (collapsible), and thinking blocks. Match what Claude actually sees.

**Q: How to visualize compaction?**
**A:** Render visual boundary showing timestamp, trigger, pre-tokens, savings. Compacted messages go in collapsed section above boundary. Active messages below boundary.

### Open Questions

**Q: How to handle sessions with >10,000 messages?**
- **Options:**
  - Virtual scrolling for performance
  - Pagination (show 100 messages at a time)
  - Only load visible messages initially
- **Decision:** TBD based on performance testing

**Q: Should we show thinking blocks by default or collapsed?**
- **Options:**
  - Default expanded (full transparency)
  - Default collapsed (cleaner UI, expand on demand)
- **Decision:** Default collapsed, with expand button and indicator that thinking is available

**Q: How to detect which session is currently active?**
- **Options:**
  - Check process list for active Claude Code instance (unreliable)
  - Parse debug logs for active session ID
  - Let user manually indicate "this is active" (extra click)
  - Don't distinguish active vs inactive (simpler)
- **Decision:** TBD - may defer to future version

**Q: Should we support session search/filter?**
- **Options:**
  - Search across all sessions for keyword (powerful but complex)
  - Filter sessions by date range (simpler)
  - No search for v1 (defer to v2)
- **Decision:** No search for v1, add in future iteration if users request

---

## Timeline & Milestones

**Phase 1: Core Session Selection (Week 1)**
- Implement SessionSelector component
- Path encoding utilities
- Session file discovery and metadata loading
- Dropdown UI integration

**Phase 2: Session Data Loading (Week 1-2)**
- Implement SessionDataLoader
- JSONL parsing
- Message extraction
- Compaction boundary detection
- Token calculation

**Phase 3: Session Rendering (Week 2-3)**
- Implement SessionContextRenderer
- Token breakdown chart
- Files-in-context list
- Conversation history display
- Compaction boundary UI
- Message collapse/expand

**Phase 4: Real-time Updates (Week 3)**
- Implement SessionFileWatcher
- File polling mechanism
- Update UI on new entries
- Handle file errors gracefully

**Phase 5: Testing & Polish (Week 4)**
- Unit tests for all components
- Integration tests for workflows
- Performance testing with large files
- UI polish (animations, transitions)
- Documentation

**Total Estimated Effort:** 4 weeks (1 developer)

---

## References

### Related Specifications
- SPEC-000001: File Watching and Auto-Refresh System (dependency for real-time updates)

### Related Issues
- (To be created) Issue for Session Selection Implementation
- (To be created) Issue for Session Rendering Implementation
- (To be created) Issue for File Watching Integration

### External Resources
- [Claude Code Session Data Research Memo](.wrangler/memos/2026-01-21-claude-code-session-data-research.md)
- [Claude Code Interactive Mode Documentation](https://code.claude.com/docs/en/interactive-mode.md)
- [Claude Code Compaction Documentation](https://code.claude.com/docs/en/checkpointing.md)
- GitHub Issue #6577 - Context data access limitations
- `/context` command output format (reference implementation)

---

## Appendix

### Glossary

- **Session:** A single conversation thread in Claude Code, stored as `.jsonl` file
- **Context window:** The 200K token limit for Claude's active prompt
- **Compaction:** Process of summarizing older messages to free context space
- **Compact boundary:** Marker in session file indicating where compaction occurred
- **Active context:** Messages and content currently in Claude's context window (after compaction)
- **Archived context:** Messages before compaction boundary, not in active window
- **JSONL:** JSON Lines format - one JSON object per line

### Assumptions

- Users run Claude Code version 2.0+
- Session files follow documented JSONL format
- `~/.claude/` directory exists and is readable
- Users run local http.server or have file system access
- Token estimation (4 chars/token) is acceptable approximation

### Constraints

- No official API for real-time context window access
- File watching limited by browser/OS capabilities (polling fallback)
- Token calculations are estimates (no official token counter for non-API text)
- Session file format may change in future Claude Code versions
- Large session files (>100MB) may cause performance issues

### Future Enhancements (Out of Scope for v1)

- Session search across all conversations
- Session comparison (diff two sessions)
- Export session transcript as markdown
- Session analytics (token usage over time, tool usage patterns)
- Integration with Claude Code via IPC/socket for true real-time updates
- Session editing (delete messages, recompact, etc.)
- Multi-project session browsing
- Session tagging and organization
