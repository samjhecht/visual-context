/**
 * Context Loader - Handles loading and parsing context data
 */

export class ContextLoader {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Load context data from a JSON file or URL
   */
  async loadFromFile(filePath) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load: ${response.status}`);
      }
      const data = await response.json();
      return this.normalizeData(data);
    } catch (error) {
      console.error('Failed to load context data:', error);
      return null;
    }
  }

  /**
   * Load from pre-generated JSON data (embedded or passed in)
   */
  loadFromData(data) {
    return this.normalizeData(data);
  }

  /**
   * Normalize the context data structure
   */
  normalizeData(data) {
    return {
      metadata: data.metadata || {},
      layers: this.buildLayers(data)
    };
  }

  /**
   * Build layer objects from raw data
   */
  buildLayers(data) {
    const layers = [];

    // 1. System Prompt (Immutable)
    if (data.systemPrompt?.exists) {
      layers.push({
        id: 'system-prompt',
        type: 'immutable',
        title: 'System Prompt',
        subtitle: 'Claude Code Built-in',
        badge: 'Immutable',
        path: data.systemPrompt.path,
        content: data.systemPrompt.content,
        editable: false
      });
    }

    // 2. Global CLAUDE.md
    if (data.globalMemory?.exists) {
      layers.push({
        id: 'global-memory',
        type: 'global',
        title: 'Global Memory',
        subtitle: '~/.claude/CLAUDE.md',
        badge: 'Global',
        path: data.globalMemory.path,
        content: data.globalMemory.content,
        editable: true,
        fileRefs: this.extractFileRefs(data.globalMemory.content)
      });
    }

    // 3. Project CLAUDE.md
    if (data.projectMemory?.exists) {
      layers.push({
        id: 'project-memory',
        type: 'project',
        title: 'Project Memory',
        subtitle: './CLAUDE.md',
        badge: 'Project',
        path: data.projectMemory.path,
        content: data.projectMemory.content,
        editable: true,
        fileRefs: this.extractFileRefs(data.projectMemory.content)
      });
    }

    // 4. Hooks
    if (data.settings?.hooks && Object.keys(data.settings.hooks).length > 0) {
      layers.push({
        id: 'hooks',
        type: 'hook',
        title: 'Session Hooks',
        subtitle: '~/.claude/settings.json',
        badge: 'Hooks',
        content: JSON.stringify(data.settings.hooks, null, 2),
        editable: true,
        isJson: true
      });
    }

    // 5. Enabled Plugins
    if (data.settings?.enabledPlugins) {
      const enabledList = Object.entries(data.settings.enabledPlugins)
        .filter(([_, enabled]) => enabled)
        .map(([name]) => name);

      if (enabledList.length > 0) {
        layers.push({
          id: 'plugins',
          type: 'plugin',
          title: 'Enabled Plugins',
          subtitle: `${enabledList.length} active`,
          badge: 'Plugins',
          content: this.formatPluginInfo(data.installedPlugins, enabledList),
          editable: false,
          isJson: true
        });
      }
    }

    // 6. MCP Servers
    if (data.settings?.mcpServers && Object.keys(data.settings.mcpServers).length > 0) {
      layers.push({
        id: 'mcp-servers',
        type: 'mcp',
        title: 'MCP Servers',
        subtitle: `${Object.keys(data.settings.mcpServers).length} configured`,
        badge: 'MCP',
        content: JSON.stringify(data.settings.mcpServers, null, 2),
        editable: true,
        isJson: true
      });
    }

    // 7. Output Style (if configured)
    if (data.localSettings?.exists) {
      try {
        const localConfig = JSON.parse(data.localSettings.content);
        if (localConfig.outputStyle) {
          layers.push({
            id: 'output-style',
            type: 'project',
            title: 'Output Style',
            subtitle: localConfig.outputStyle,
            badge: 'Style',
            content: `Active output style: ${localConfig.outputStyle}`,
            editable: true
          });
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }

    return layers;
  }

  /**
   * Extract file references from content
   * Matches patterns like @FILE.md or `FILE.md`
   */
  extractFileRefs(content) {
    if (!content) return [];

    const refs = new Set();

    // Match @FILE patterns
    const atMatches = content.match(/@([A-Za-z0-9_\-./]+\.(?:md|txt|json|yaml|yml))/g) || [];
    atMatches.forEach(m => refs.add(m.slice(1)));

    // Match backtick file references
    const tickMatches = content.match(/`([A-Za-z0-9_\-./]+\.(?:md|txt))`/g) || [];
    tickMatches.forEach(m => refs.add(m.slice(1, -1)));

    return Array.from(refs);
  }

  /**
   * Format plugin information
   */
  formatPluginInfo(installedPlugins, enabledList) {
    if (!installedPlugins?.plugins) {
      return JSON.stringify({ enabled: enabledList }, null, 2);
    }

    const info = {};
    enabledList.forEach(name => {
      const pluginData = installedPlugins.plugins[name];
      if (pluginData && pluginData.length > 0) {
        const latest = pluginData[0];
        info[name] = {
          version: latest.version,
          installedAt: latest.installedAt,
          path: latest.installPath
        };
      }
    });

    return JSON.stringify(info, null, 2);
  }
}

export default ContextLoader;
