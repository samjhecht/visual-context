---
id: SPEC-000001
title: File Watching and Auto-Refresh System for Visual Context
type: specification
status: open
priority: high
labels:
  - specification
  - design
  - file-watching
  - auto-refresh
  - v0.2.0
createdAt: '2026-01-21T20:05:12.909Z'
updatedAt: '2026-01-21T20:05:12.909Z'
project: Visual Context
wranglerContext:
  agentId: spec-writer
  estimatedEffort: 2-3 weeks implementation
---
# Specification: File Watching and Auto-Refresh System

## Executive Summary

**What:** A real-time file watching and auto-refresh system that monitors Claude Code configuration files (both global `~/.claude/` and project-level) and automatically regenerates `context.json` and refreshes the Visual Context webapp when changes are detected.

**Why:** Currently, users must manually run `scan-context.sh` and refresh the browser to see updated context. This creates friction when iterating on CLAUDE.md files, settings, or plugins. A file watcher eliminates this manual step, providing instant visual feedback when configuration changes.

**Scope:**
- **Included:**
  - File watching for `~/.claude/CLAUDE.md`
  - File watching for `~/.claude/settings.json`
  - File watching for `~/.claude/agents/` directory
  - File watching for project-level `CLAUDE.md` (selected project)
  - File watching for project-level `.claude/` directory
  - Auto-regeneration of `context.json` on file changes
  - Auto-refresh of webapp view (with user preference toggle)
  - Debouncing/throttling for rapid successive changes
  - Visual feedback for file watch status and updates
  - Error handling for watch failures and permission issues

- **Excluded:**
  - Editing files directly within the Visual Context UI (deferred to v0.2.0)
  - Watching system prompt changes (immutable, not user-editable)
  - Watching all projects simultaneously (only selected project)
  - Real-time collaborative editing
  - Version control integration
  - File change history/undo

**Status:** Open

## Goals and Non-Goals

### Goals

- Eliminate manual refresh workflow for configuration changes
- Provide instant visual feedback when CLAUDE.md or settings change
- Support both global and project-level file watching
- Handle rapid successive changes gracefully (debouncing)
- Maintain webapp responsiveness during regeneration
- Provide clear status indicators for file watch state
- Handle edge cases (file deletion, permission issues, concurrent changes)
- Work across different operating systems (macOS, Linux, Windows)

### Non-Goals

- Real-time collaborative editing (multiple users editing simultaneously)
- File editing within Visual Context UI (separate feature)
- Watching all projects in `~/.claude/projects/` simultaneously
- Conflict resolution for concurrent file changes
- File versioning or change history
- Integration with git or other VCS systems
- Watching Claude Code binary or plugin installations

## Background & Context

### Problem Statement

The current Visual Context workflow requires manual intervention:

1. User edits `~/.claude/CLAUDE.md` or project `CLAUDE.md`
2. User must run `./scripts/scan-context.sh /path/to/project > context.json`
3. User must manually refresh browser
4. User repeats for each change

This friction slows down the iterative process of refining Claude Code context configuration. Users often forget to regenerate, leading to confusion when the UI shows stale data.

### Current State

- Visual Context is a static HTML/CSS/JS webapp
- `scan-context.sh` is a Bash script that generates `context.json`
- Browser displays data from `context.json` on page load
- Manual "Refresh" button re-fetches `context.json`
- No awareness of file system changes

### Proposed State

- File watcher runs in background (Node.js process or browser-based)
- Monitors relevant files in `~/.claude/` and selected project directory
- On file change: automatically runs scan script, regenerates `context.json`
- Webapp detects new `context.json` and auto-refreshes display
- Visual indicators show watch status and update activity
- Debouncing prevents excessive regenerations during rapid edits

## Requirements

### Functional Requirements

- **FR-001:** System MUST watch `~/.claude/CLAUDE.md` for changes
- **FR-002:** System MUST watch `~/.claude/settings.json` for changes
- **FR-003:** System MUST watch `~/.claude/agents/` directory for file additions/deletions/changes
- **FR-004:** System MUST watch project-level `CLAUDE.md` for selected project
- **FR-005:** System MUST watch project-level `.claude/` directory for selected project
- **FR-006:** System MUST automatically regenerate `context.json` when watched files change
- **FR-007:** System MUST debounce file changes with configurable delay (default: 500ms)
- **FR-008:** System MUST provide visual indicator showing file watch status (watching, updating, error)
- **FR-009:** System MUST allow user to enable/disable auto-refresh of webapp view
- **FR-010:** System MUST handle file deletion events gracefully
- **FR-011:** System MUST handle permission errors and notify user
- **FR-012:** System MUST switch watched project directories when user selects different project
- **FR-013:** System MUST persist auto-refresh preference in browser localStorage
- **FR-014:** System MUST show notification when context.json is regenerated
- **FR-015:** System MUST handle concurrent file changes without data corruption

### Non-Functional Requirements

- **Performance:** Context regeneration MUST complete within 2 seconds for typical configurations
- **Performance:** Debounced file change detection MUST trigger within 100ms after edit stops
- **Performance:** UI MUST remain responsive during regeneration (non-blocking)
- **Reliability:** File watcher MUST recover automatically from temporary file system errors
- **Reliability:** System MUST handle file watcher crashes gracefully and notify user
- **Security:** File watcher MUST only access files within `~/.claude/` and selected project directory
- **Security:** System MUST validate file paths to prevent directory traversal
- **Compatibility:** MUST work on macOS, Linux, and Windows
- **Compatibility:** MUST work with file:// protocol (no server required)
- **Resource Usage:** File watcher MUST use < 50MB memory at idle
- **Resource Usage:** CPU usage MUST be < 5% during idle watching

### User Experience Requirements

- **Accessibility:** File watch status indicator MUST be screen-reader accessible
- **Accessibility:** Notifications MUST be announced to assistive technologies
- **Usability:** Auto-refresh toggle MUST be discoverable in UI
- **Usability:** Error messages MUST be actionable (explain what went wrong and how to fix)
- **Responsiveness:** Status indicators MUST update within 200ms of state change
- **Visual Feedback:** Updates MUST be visually distinct (animation, badge, color change)

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User's File System                     │
│                                                               │
│  ~/.claude/                    /project/                     │
│  ├── CLAUDE.md                ├── CLAUDE.md                 │
│  ├── settings.json            └── .claude/                  │
│  └── agents/                                                 │
└───────────┬────────────────────────────┬────────────────────┘
            │                            │
            │ (file change events)       │
            │                            │
     ┌──────▼────────────────────────────▼──────┐
     │      File Watcher Service                │
     │      (Node.js or Browser-based)          │
     │                                           │
     │  - Monitors file system events           │
     │  - Debounces rapid changes               │
     │  - Triggers regeneration                 │
     └──────────────────┬────────────────────────┘
                        │
                        │ (invoke on change)
                        │
                 ┌──────▼────────┐
                 │ scan-context.sh│
                 │                │
                 │ Regenerates    │
                 │ context.json   │
                 └──────┬─────────┘
                        │
                        │ (writes)
                        │
                  ┌─────▼──────┐
                  │context.json│
                  └─────┬──────┘
                        │
                        │ (polls or file watch)
                        │
            ┌───────────▼───────────────┐
            │   Visual Context Webapp   │
            │                           │
            │  - Detects context.json   │
            │    changes                │
            │  - Auto-refreshes display │
            │  - Shows status indicators│
            └───────────────────────────┘
```

### Components

#### Component 1: File Watcher Service

**Responsibility:** Monitor file system for changes to Claude configuration files and trigger regeneration.

**Interfaces:**
- Input: File system events (create, modify, delete) from OS
- Output: Trigger signals to Context Regenerator

**Dependencies:**
- Native file system watch API (Node.js `fs.watch` or `chokidar`)
- OR Browser File System Access API (if browser-based)

**Key behaviors:**
- Watch multiple file paths and directories simultaneously
- Debounce rapid successive changes (500ms default)
- Detect project directory switches and update watches
- Handle watch errors (permission denied, file not found)
- Emit events when watched files change

**Implementation Options:**

**Option A: Node.js Background Process**
- Pros: Full fs.watch support, reliable, cross-platform with `chokidar`
- Cons: Requires Node.js installation, separate process to manage

**Option B: Browser File System Access API**
- Pros: No external dependencies, works with file:// protocol
- Cons: Limited browser support, requires user permission grants

**Option C: Server-Sent Events (SSE) from Local Server**
- Pros: Works well with browser architecture
- Cons: Requires running a local server (breaks "zero dependencies" design)

**Recommended:** Option A (Node.js with chokidar) with graceful fallback to manual refresh if not available.

#### Component 2: Context Regenerator

**Responsibility:** Execute `scan-context.sh` script and write updated `context.json`.

**Interfaces:**
- Input: Trigger signal from File Watcher, target project path
- Output: Updated `context.json` file, completion/error events

**Dependencies:**
- Bash shell (for scan-context.sh)
- Python 3 (required by scan-context.sh)
- File system write access to Visual Context directory

**Key behaviors:**
- Execute scan-context.sh with correct project path
- Capture stdout and write to context.json atomically
- Handle script errors (missing dependencies, invalid paths)
- Emit completion event when regeneration finishes
- Queue regenerations if changes occur during active regeneration

#### Component 3: Change Detector (Browser)

**Responsibility:** Detect when `context.json` has changed and notify UI.

**Interfaces:**
- Input: Periodic polling or file system events
- Output: Reload trigger to UI layer

**Dependencies:**
- File system read access to context.json
- Browser localStorage for preferences

**Key behaviors:**
- Poll context.json for modifications (if no native file watch available)
- OR use File System Access API to watch context.json directly
- Check file modification timestamp or content hash
- Respect user's auto-refresh preference
- Emit reload event when new content detected

**Implementation:**

**Option A: Polling** (500ms interval)
```javascript
async function pollContextJson() {
  const response = await fetch('context.json?' + Date.now());
  const lastModified = response.headers.get('Last-Modified');
  if (lastModified !== this.lastKnownModified) {
    this.lastKnownModified = lastModified;
    this.emit('contextUpdated');
  }
}
```

**Option B: File System Access API**
```javascript
const fileHandle = await window.showOpenFilePicker({
  types: [{ accept: { 'application/json': ['.json'] } }]
});
// Watch for changes (if supported)
```

**Option C: Long-polling from watcher service**
- Watcher service provides HTTP endpoint
- Browser long-polls for updates

#### Component 4: UI Status Indicator

**Responsibility:** Show file watch status and update notifications.

**Interfaces:**
- Input: Events from File Watcher and Change Detector
- Output: Visual indicators, toast notifications

**Dependencies:**
- DOM manipulation APIs
- CSS animations

**Key behaviors:**
- Show "watching" state with file count
- Show "updating" state during regeneration
- Show "error" state with error message
- Show temporary notification on successful update
- Provide toggle for auto-refresh preference

### Data Model

#### Entity 1: WatcherStatus

**Attributes:**
- `state`: enum ['idle', 'watching', 'updating', 'error'] - Current watcher state
- `watchedPaths`: string[] - List of currently watched file paths
- `lastUpdate`: timestamp - When context.json was last regenerated
- `error`: string | null - Error message if in error state
- `autoRefreshEnabled`: boolean - User preference for auto-refresh

**Relationships:**
- None (single instance state object)

**Constraints:**
- `state` must be one of defined enum values
- `watchedPaths` must be valid absolute file paths
- `error` only populated when `state` is 'error'

#### Entity 2: FileChangeEvent

**Attributes:**
- `path`: string - Absolute path to changed file
- `eventType`: enum ['add', 'change', 'unlink'] - Type of file system event
- `timestamp`: timestamp - When the event occurred
- `projectPath`: string | null - Project directory (if project file)

**Relationships:**
- Triggers regeneration workflow

**Constraints:**
- `path` must be within watched directories
- `eventType` must be one of defined enum values

### APIs / Interfaces

#### API 1: FileWatcher Interface

**Method:** Event Emitter Pattern

**Events:**

**Event: `fileChanged`**

```javascript
{
  path: string,           // Absolute path to changed file
  eventType: 'add' | 'change' | 'unlink',
  isGlobal: boolean,      // true if ~/.claude/, false if project
  projectPath?: string    // Project path if not global
}
```

**Event: `watchError`**

```javascript
{
  error: Error,
  path: string,           // Path that failed to watch
  recoverable: boolean    // Whether watcher can recover
}
```

**Event: `regenerationStarted`**

```javascript
{
  projectPath: string,
  triggeredBy: string[]   // List of files that triggered regeneration
}
```

**Event: `regenerationCompleted`**

```javascript
{
  projectPath: string,
  duration: number,       // Milliseconds
  success: boolean,
  error?: string
}
```

#### API 2: Change Detector Interface

**Method:** Event Emitter Pattern

**Events:**

**Event: `contextUpdated`**

```javascript
{
  previousHash: string,   // Hash of previous context.json
  newHash: string,        // Hash of new context.json
  timestamp: number
}
```

#### API 3: Configuration API

**Method:** Browser localStorage

**Storage:**

```javascript
// Key: 'visualContext.preferences'
{
  autoRefresh: boolean,         // Default: true
  debounceDuration: number,     // Default: 500ms
  pollInterval: number,         // Default: 500ms (if using polling)
  notificationsEnabled: boolean // Default: true
}
```

## Implementation Details

### Technology Stack

- **File Watcher:** Node.js 18+ with `chokidar` library (or native `fs.watch`)
- **Shell Scripting:** Bash (existing scan-context.sh)
- **Browser:** Vanilla JavaScript (ES6+ modules)
- **IPC:** File system (write/read context.json) or optional HTTP for status
- **No Build Step:** Maintain zero-dependency browser architecture

### File Structure

```
visual-context/
├── index.html
├── context.json
├── watcher/
│   ├── file-watcher.js       # Node.js file watcher service
│   ├── package.json          # Dependencies (chokidar, etc.)
│   └── start-watcher.sh      # Launch script
├── src/
│   ├── components/
│   │   ├── layer-renderer.js
│   │   ├── watch-status.js   # NEW: Status indicator component
│   │   └── notification.js   # NEW: Toast notification component
│   ├── data/
│   │   ├── context-loader.js
│   │   └── change-detector.js # NEW: Detect context.json changes
│   ├── services/
│   │   └── preferences.js    # NEW: localStorage preferences
│   └── styles/
│       ├── variables.css
│       ├── base.css
│       └── components.css
└── scripts/
    └── scan-context.sh
```

### Key Algorithms

**Algorithm 1: Debounced File Change Detection**

Purpose: Prevent excessive regenerations when files change rapidly (e.g., auto-save every keystroke).

Approach:
1. On file change event, clear any existing debounce timer
2. Start new timer with configured delay (default 500ms)
3. If another change occurs before timer fires, clear and restart
4. When timer fires with no interruptions, trigger regeneration
5. Maintain queue of pending changes to batch multiple file changes

```javascript
class DebouncedWatcher {
  constructor(delay = 500) {
    this.delay = delay;
    this.timer = null;
    this.pendingChanges = new Set();
  }
  
  onFileChange(path, eventType) {
    this.pendingChanges.add({ path, eventType });
    
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.triggerRegeneration([...this.pendingChanges]);
      this.pendingChanges.clear();
    }, this.delay);
  }
  
  triggerRegeneration(changes) {
    // Execute scan-context.sh
  }
}
```

Complexity: O(1) time per file change, O(n) space where n = pending changes during debounce window.

**Algorithm 2: Atomic Context File Update**

Purpose: Prevent race conditions where browser reads partially-written context.json.

Approach:
1. Write regenerated context to temporary file `context.json.tmp`
2. Verify JSON is valid (parse check)
3. Atomically rename `context.json.tmp` to `context.json` (atomic operation on most filesystems)
4. Emit completion event

```javascript
async function writeContextAtomic(data) {
  const tmpPath = 'context.json.tmp';
  const finalPath = 'context.json';
  
  // Write to temp file
  await fs.promises.writeFile(tmpPath, JSON.stringify(data, null, 2));
  
  // Validate JSON
  const content = await fs.promises.readFile(tmpPath, 'utf-8');
  JSON.parse(content); // Throws if invalid
  
  // Atomic rename
  await fs.promises.rename(tmpPath, finalPath);
}
```

Complexity: O(n) where n = size of context.json data.

**Algorithm 3: Change Detection (Browser)**

Purpose: Detect when context.json has been updated by file watcher.

Approach (Polling):
1. Fetch context.json with cache-busting query param
2. Check Last-Modified header or compute content hash
3. Compare with last known value
4. If different, emit update event
5. Repeat every 500ms (configurable)

Approach (File System Access API):
```javascript
class ContextChangeDetector {
  async init() {
    // Request permission to access context.json
    [this.fileHandle] = await window.showOpenFilePicker({
      types: [{ accept: { 'application/json': ['.json'] } }],
      multiple: false
    });
    
    // Poll file for changes (browsers don't support native watch yet)
    this.pollForChanges();
  }
  
  async pollForChanges() {
    setInterval(async () => {
      const file = await this.fileHandle.getFile();
      const newModified = file.lastModified;
      
      if (newModified !== this.lastModified) {
        this.lastModified = newModified;
        this.emit('contextUpdated');
      }
    }, 500);
  }
}
```

Complexity: O(1) per poll, O(n) for content hash where n = file size.

### Configuration

**Environment Variables (Node.js Watcher):**

- `CLAUDE_DIR`: Path to ~/.claude directory (default: `$HOME/.claude`)
- `WATCH_DEBOUNCE_MS`: Debounce delay in milliseconds (default: 500)
- `LOG_LEVEL`: Logging verbosity (default: 'info')

**Browser Configuration (localStorage):**

```javascript
// visualContext.preferences
{
  autoRefresh: true,              // Auto-reload UI on context.json change
  debounceDuration: 500,          // File change debounce (ms)
  pollInterval: 500,              // Context.json polling interval (ms)
  notificationsEnabled: true,     // Show toast notifications
  showWatchStatus: true           // Show status indicator in UI
}
```

**Config Files:**

```json
// watcher/config.json
{
  "watchPaths": {
    "global": [
      "~/.claude/CLAUDE.md",
      "~/.claude/settings.json",
      "~/.claude/agents"
    ],
    "projectRelative": [
      "CLAUDE.md",
      ".claude"
    ]
  },
  "ignorePatterns": [
    "**/*.swp",
    "**/*.tmp",
    "**/.git/**",
    "**/node_modules/**"
  ],
  "regeneration": {
    "debounceMs": 500,
    "maxQueuedChanges": 100,
    "timeoutMs": 10000
  }
}
```

## Security Considerations

### Authentication & Authorization

- No authentication required (local-only application)
- File watcher runs with user's file system permissions
- Cannot access files outside user's home directory

### Data Protection

- All data remains local (no network transmission)
- File watcher only reads files user already has access to
- No encryption needed (local filesystem security applies)

### Security Threats & Mitigations

| Threat                  | Impact | Mitigation                                               |
| ----------------------- | ------ | -------------------------------------------------------- |
| Path Traversal          | Medium | Validate all paths, restrict to ~/.claude/ and project  |
| Symlink Attack          | Low    | Resolve symlinks, validate final path is within allowed |
| Resource Exhaustion     | Medium | Limit max watched files, debounce rapid changes          |
| Malicious File Content  | Low    | JSON validation before write, error handling             |
| Race Condition in Write | Medium | Atomic file writes with temp file + rename               |

### Audit & Compliance

- File watcher logs all regeneration events with timestamps
- Error events logged with full context for debugging
- No PII collected or transmitted
- Complies with local filesystem permissions

## Error Handling

### Error Categories

1. **User Errors:**
   - Invalid project directory selected
   - **Handling:** Show clear error message, suggest corrective action
   
2. **System Errors:**
   - Permission denied on watched files
   - scan-context.sh execution failure
   - Disk full preventing context.json write
   - **Handling:** Log error, show notification, attempt recovery or disable watcher
   
3. **External Errors:**
   - Missing dependencies (Python, Bash)
   - File system unavailable (network drive disconnected)
   - **Handling:** Graceful degradation to manual refresh mode

### Recovery Strategies

- **Retry Logic:**
  - File watch errors: Retry watch setup 3 times with exponential backoff (1s, 2s, 4s)
  - Regeneration failures: Retry once after 5 seconds
  - If all retries fail, disable watcher and show manual refresh option

- **Fallback Behavior:**
  - If file watcher fails to initialize, fall back to manual refresh mode
  - If context.json regeneration fails, keep showing previous data
  - If browser change detection fails, fall back to manual refresh button

- **Circuit Breakers:**
  - If >5 consecutive regeneration failures occur within 1 minute, disable auto-regeneration
  - Require user to manually re-enable after fixing underlying issue
  - Prevents infinite error loops

### Error Messages

**Examples of actionable error messages:**

```
❌ File Watcher Error: Permission Denied

Cannot watch ~/.claude/CLAUDE.md

Fix: Check file permissions with `ls -la ~/.claude/CLAUDE.md`
Ensure the file is readable by your user account.

[Switch to Manual Refresh] [Retry]
```

```
❌ Regeneration Failed

scan-context.sh exited with error code 1
Error: Python 3 not found in PATH

Fix: Install Python 3 or ensure it's in your PATH
Run: `python3 --version` to verify installation

[View Full Log] [Disable Auto-Refresh]
```

## Observability

### Logging

**Log Levels:**

- **ERROR:** File watch failures, regeneration errors, permission issues
- **WARN:** Debounce queue overflow, slow regeneration (>3s), retry attempts
- **INFO:** Watch initialized, regeneration started/completed, project switched
- **DEBUG:** Individual file change events, debounce triggers, poll cycles

**Structured Logging (Node.js Watcher):**

```json
{
  "level": "info",
  "timestamp": "2025-01-21T12:00:00.000Z",
  "component": "file-watcher",
  "message": "Regeneration completed",
  "context": {
    "projectPath": "/Users/sam/medb",
    "duration": 1234,
    "triggeredBy": ["~/.claude/CLAUDE.md"],
    "success": true
  }
}
```

**Browser Console Logging:**

```javascript
console.log('[ChangeDetector] Context updated', {
  timestamp: Date.now(),
  previousHash: 'abc123',
  newHash: 'def456',
  autoRefreshEnabled: true
});
```

### Metrics

**Key Metrics:**

- **Regeneration Duration:** p50, p95, p99 latency for scan-context.sh execution
- **Target:** p95 < 2s, p99 < 5s
  
- **Watch Reliability:** Percentage of successful file change detections
- **Target:** >99.9% of file changes detected within 1 second
  
- **Error Rate:** Regeneration failures per 100 attempts
- **Target:** <1% failure rate
  
- **Resource Usage:** Memory and CPU usage of file watcher process
- **Target:** <50MB memory, <5% CPU at idle

### Monitoring & Alerts

- **Alert 1: High Regeneration Failure Rate**
  - Condition: >5% of regenerations fail within 5-minute window
  - Severity: Warning
  - Response: Log detailed error information, notify user in UI

- **Alert 2: File Watcher Crashed**
  - Condition: Watcher process exits unexpectedly
  - Severity: Error
  - Response: Show prominent UI notification, offer restart or manual mode

- **Alert 3: Slow Regeneration**
  - Condition: Regeneration takes >5 seconds
  - Severity: Warning
  - Response: Log warning, investigate scan-context.sh performance

### Tracing

- Each regeneration assigned unique ID (timestamp + random)
- File change events linked to regeneration ID
- Browser reload events linked to regeneration ID
- Full trace logged for debugging purposes

Example trace:
```
[regen-1234567890-abc]
  - FileChange: ~/.claude/CLAUDE.md at 12:00:00.100
  - FileChange: ~/.claude/settings.json at 12:00:00.250
  - Debounce: Waiting 500ms
  - RegenerationStarted: at 12:00:00.750
  - ScriptExecution: scan-context.sh completed in 1.2s
  - FileWrite: context.json written at 12:00:01.950
  - RegenerationCompleted: Success at 12:00:01.960
  - BrowserDetected: Change detected at 12:00:02.450
  - UIRefreshed: Display updated at 12:00:02.500
```

## Testing Strategy

### Test Coverage

- **Unit Tests:**
  - Debounce logic: Verify single regeneration for multiple rapid changes
  - Path validation: Ensure only allowed directories watched
  - Atomic writes: Verify no partial file writes
  - Error recovery: Test retry logic and fallback behavior
  - **Target:** >85% code coverage

- **Integration Tests:**
  - File watcher + regenerator: Verify end-to-end file change → context.json update
  - Browser change detector + UI: Verify context.json change → UI refresh
  - Project switching: Verify correct paths watched after project change
  - **Target:** Cover all major workflows

- **E2E Tests:**
  - User edits CLAUDE.md → sees updated context in browser within 2s
  - User switches projects → watcher updates to new project paths
  - User disables auto-refresh → UI doesn't reload on changes
  - **Target:** Cover 3 primary user journeys

- **Performance Tests:**
  - Rapid file changes: 100 edits in 10 seconds → single regeneration
  - Large context.json: 10MB file → reload within 2s
  - Long-running: 24-hour stability test with periodic changes
  - **Target:** Meet all NFRs under stress

- **Error Scenario Tests:**
  - Permission denied on watch path
  - scan-context.sh not executable
  - Disk full during write
  - Concurrent writes to context.json
  - **Target:** Graceful handling of all error categories

### Test Scenarios

1. **Happy Path:**
   - Start watcher with valid configuration
   - Edit ~/.claude/CLAUDE.md
   - Observe auto-regeneration within 2s
   - Browser auto-refreshes and shows new content
   - Status indicator shows "Updated just now"

2. **Error Cases:**
   - **Test:** Start watcher with invalid project path
   - **Expected:** Error notification, fallback to manual mode
   
   - **Test:** Delete CLAUDE.md while being watched
   - **Expected:** Regeneration succeeds (file shown as non-existent), no crash
   
   - **Test:** Make file read-only after watcher starts
   - **Expected:** Permission error notification, watcher disabled

3. **Edge Cases:**
   - **Rapid Edits:** Edit CLAUDE.md 50 times in 5 seconds
   - **Expected:** Single regeneration after 500ms of no changes
   
   - **Concurrent Changes:** Edit both global and project CLAUDE.md simultaneously
   - **Expected:** Single regeneration including both changes
   
   - **Project Switch During Regeneration:** Switch projects while regeneration in progress
   - **Expected:** Ongoing regeneration completes, new project watches start, no data corruption

4. **Load Testing:**
   - **Test:** Watch 20 files, change all simultaneously
   - **Expected:** Single regeneration, completes within 3s
   
   - **Test:** 1000 file change events over 1 hour
   - **Expected:** All detected, memory usage remains <50MB

## Deployment

### Deployment Strategy

- **Approach:** Progressive enhancement - feature enabled only if dependencies available
- **Rollback Plan:** Users can disable file watcher via UI toggle, reverting to manual refresh

### Migration Path

**From:** Manual refresh workflow (v0.1.0)

**To:** Auto-refresh workflow (v0.2.0)

**Steps:**

1. Add watcher/ directory with Node.js file watcher service
2. Add browser components for change detection and status UI
3. Update documentation with setup instructions
4. Detect if Node.js available on startup
5. Auto-enable watcher if dependencies present
6. Show onboarding tooltip explaining auto-refresh feature
7. Provide toggle to disable if user prefers manual control

**Data Migration:**

- No data migration required (context.json format unchanged)
- User preferences stored in new localStorage key
- Backward compatible: v0.2.0 works without watcher enabled

### Dependencies

**Required before deployment:**

- [x] Node.js 18+ installed (optional, graceful fallback)
- [x] Python 3 (already required by scan-context.sh)
- [x] Bash shell (already required by scan-context.sh)

**Optional dependencies:**

- [ ] `chokidar` npm package (recommended, fallback to fs.watch)

**Downstream impacts:**

- None - feature is additive, doesn't break existing workflows
- Users without Node.js continue using manual refresh

## Performance Characteristics

### Expected Performance

- **Latency:**
  - File change detection: p50 < 50ms, p95 < 100ms, p99 < 200ms
  - Regeneration: p50 < 1s, p95 < 2s, p99 < 5s
  - Browser reload: p50 < 200ms, p95 < 500ms, p99 < 1s
  - **Total latency (edit to UI update):** p95 < 3s

- **Throughput:**
  - File change events: Handle up to 100 events/second (debounced)
  - Regenerations: Max 1 per debounce window (500ms) = ~2/second practical max

- **Resource Usage:**
  - File watcher process: <50MB memory, <5% CPU idle, <20% CPU active
  - Browser: +5MB memory for change detector and UI components

### Scalability

- **Horizontal Scaling:** N/A (single-user local application)

- **Vertical Scaling:**
  - Handles up to 100 watched files efficiently
  - Tested with context.json up to 10MB
  - Debounce window prevents resource exhaustion from rapid changes

- **Bottlenecks:**
  - scan-context.sh execution time (Bash + Python overhead)
  - File system performance (SSD vs HDD)
  - Large context.json parsing in browser

### Optimization Strategies

- Use `chokidar` library for efficient cross-platform file watching (vs. native fs.watch)
- Debounce file changes to batch multiple edits into single regeneration
- Atomic file writes prevent browser from reading partial data
- Incremental reload: Only update changed layers in UI (future optimization)
- Use web workers for JSON parsing if context.json >5MB (future optimization)

## Open Questions & Decisions

### Resolved Decisions

| Decision                    | Options Considered                               | Chosen                   | Rationale                                                                             | Date       |
| --------------------------- | ------------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------- | ---------- |
| File Watcher Implementation | Browser-based, Node.js, Local Server            | Node.js with fallback    | Best reliability, graceful degradation maintains zero-dependency browser architecture | 2025-01-21 |
| Change Detection Method     | Polling, File System Access API, WebSocket       | Polling (500ms)          | Universal browser support, simple implementation, acceptable latency                  | 2025-01-21 |
| Debounce Duration           | 100ms, 300ms, 500ms, 1000ms                      | 500ms (configurable)     | Balances responsiveness with avoiding excessive regenerations                         | 2025-01-21 |
| Auto-refresh Default        | Enabled, Disabled, Ask on first run              | Enabled with toggle      | Most users want instant feedback, power users can disable                             | 2025-01-21 |
| Atomic Write Strategy       | Temp file + rename, Write-ahead log, Lock files | Temp file + rename       | Simplest, filesystem-level atomicity guarantee                                        | 2025-01-21 |
| Error Handling              | Silent fail, Notifications, Disable on error     | Notifications + fallback | Users need to know about errors, but app shouldn't become unusable                    | 2025-01-21 |

### Open Questions

- [ ] **Question 1: Should we watch plugin cache directories for plugin updates?**

  - **Impact:** Users wouldn't see plugin changes reflected immediately
  - **Options:**
    - A) Watch `~/.claude/plugins/cache/` for all plugin changes
    - B) Only watch `~/.claude/plugins/installed_plugins.json`
    - C) Don't watch plugins (out of scope for v0.2.0)
  - **Recommendation:** Option B - watch installed_plugins.json only, avoids high-frequency changes
  - **Owner:** Feature implementer

- [ ] **Question 2: Should file watcher run as daemon or start on webapp launch?**

  - **Impact:** Affects UX - daemon always running vs. manual start
  - **Options:**
    - A) Background daemon (launchd/systemd) - always running
    - B) Start when webapp opens, stop when closed
    - C) Manual start script, runs independently
  - **Recommendation:** Option B - simplest UX, matches webapp lifecycle
  - **Owner:** Feature implementer

- [ ] **Question 3: How to handle multiple Visual Context instances open simultaneously?**
  - **Impact:** Multiple browser tabs could trigger duplicate regenerations
  - **Options:**
    - A) Lock file prevents concurrent regenerations
    - B) Allow concurrent, last write wins
    - C) Use broadcast channel to coordinate browser tabs
  - **Recommendation:** Option C - coordinate tabs, single regeneration shared by all
  - **Owner:** Feature implementer

## Risks & Mitigations

| Risk                                    | Probability | Impact | Mitigation                                                               | Owner |
| --------------------------------------- | ----------- | ------ | ------------------------------------------------------------------------ | ----- |
| Node.js not installed on user's system  | Medium      | Medium | Graceful fallback to manual refresh, clear documentation                 | Dev   |
| File watcher breaks on specific OS/FS   | Low         | High   | Use battle-tested `chokidar` library, extensive cross-platform testing   | Dev   |
| Excessive regenerations impact UX       | Medium      | Medium | Debouncing, rate limiting, user-configurable settings                    | Dev   |
| Race condition corrupts context.json    | Low         | High   | Atomic writes with temp file + rename                                    | Dev   |
| Large context.json causes browser lag   | Low         | Medium | Test with large files, implement incremental updates if needed           | Dev   |
| Permission errors confuse users         | Medium      | Low    | Clear, actionable error messages with fix suggestions                    | Dev   |
| Memory leak in long-running watcher     | Low         | Medium | Proper event listener cleanup, periodic memory profiling                 | Dev   |
| Scan script execution time unpredictable | Medium      | Medium | Timeout (10s), show progress indicator, log slow executions for analysis | Dev   |

## Success Criteria

### Launch Criteria

- [ ] All functional requirements (FR-001 to FR-015) implemented
- [ ] File watcher works on macOS, Linux, Windows
- [ ] Unit test coverage >85%
- [ ] Integration tests pass for all major workflows
- [ ] E2E test: Edit CLAUDE.md → see update in browser within 3s (p95)
- [ ] Graceful fallback when Node.js not available
- [ ] Error handling tested for all error categories
- [ ] Documentation updated with setup instructions
- [ ] UI/UX reviewed: status indicator clear, notifications non-intrusive
- [ ] Performance validated: <50MB memory, <5% CPU idle

### Success Metrics (Post-Launch)

- **User Adoption:** >60% of users enable file watcher within first week (tracked via localStorage)
- **Reliability:** <2% regeneration failure rate in production usage (telemetry if added)
- **Performance:** p95 latency (edit to UI update) remains <3 seconds
- **User Satisfaction:** Collect feedback via GitHub issues, aim for positive sentiment
- **Reduced Friction:** Users report faster iteration on CLAUDE.md configurations (qualitative)

## Timeline & Milestones

| Milestone                      | Target Date | Status      | Dependencies                  |
| ------------------------------ | ----------- | ----------- | ----------------------------- |
| Specification Complete         | 2025-01-21  | In Progress | -                             |
| Prototype File Watcher (Node)  | 2025-01-24  | Pending     | Specification Complete        |
| Prototype Change Detector (UI) | 2025-01-25  | Pending     | File Watcher Prototype        |
| Integration Testing            | 2025-01-27  | Pending     | Both Prototypes               |
| Cross-platform Testing         | 2025-01-29  | Pending     | Integration Testing           |
| Documentation & Polish         | 2025-01-30  | Pending     | Cross-platform Testing        |
| v0.2.0 Release                 | 2025-02-01  | Pending     | Documentation Complete        |
| Post-launch Monitoring         | 2025-02-15  | Pending     | 2 weeks after release         |

Note: Timeline assumes single developer working part-time. Adjust based on actual availability.

## References

### Related Specifications

- None (first major specification for Visual Context project)

### Related Issues

- Visual Context Roadmap (README.md): v0.2.0 planned features include "Live file editing capability" and "Real-time context updates"

### External Resources

- [Chokidar Documentation](https://github.com/paulmillr/chokidar) - Cross-platform file watching library
- [Node.js fs.watch API](https://nodejs.org/api/fs.html#fswatchfilename-options-listener) - Native file watching
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) - Browser file access
- [Atomic File Writes](https://rcrowley.org/2010/01/06/things-unix-can-do-atomically.html) - Understanding atomic rename operations
- [Debounce/Throttle Patterns](https://css-tricks.com/debouncing-throttling-explained-examples/) - Performance optimization patterns

### Prior Art

- **VS Code File Watcher:** Uses chokidar for cross-platform file watching
- **Webpack Dev Server:** Hot module reloading with file watching and auto-refresh
- **Browsersync:** Auto-reload browser on file changes (uses Chokidar + WebSocket)
- **Nodemon:** Auto-restart Node.js on file changes (similar debouncing strategy)

## Appendix

### Glossary

- **Debouncing:** Delay executing a function until after a period of inactivity, preventing excessive calls during rapid successive events
- **Throttling:** Limit function execution to at most once per time period, regardless of event frequency
- **Atomic Operation:** Operation that completes entirely or not at all, no partial states visible
- **File System Watch:** OS-level notification mechanism for file/directory changes
- **Polling:** Repeatedly checking for changes at fixed intervals (alternative to file watching)
- **Race Condition:** Undesired behavior when timing/order of events affects correctness
- **Graceful Degradation:** System continues functioning with reduced capability when dependencies unavailable

### Assumptions

- Users have read/write access to their `~/.claude/` directory
- Users have read access to project directories they select
- Visual Context directory has write permissions for context.json
- scan-context.sh remains the canonical context generation mechanism
- Users running on standard desktop/laptop (not embedded systems)
- File system supports atomic rename operations (all modern OSes do)

### Constraints

- Must maintain "zero build step" browser architecture (vanilla JS)
- Cannot require paid/licensed software dependencies
- Must work offline (no network required)
- Cannot modify Claude Code internals (Visual Context is external tool)
- File watcher is optional enhancement, not hard requirement
- Context.json format must remain compatible with v0.1.0
