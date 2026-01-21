/**
 * Context Loader - Handles loading and parsing context data
 */

export class ContextLoader {
  constructor() {
    this.cache = new Map();
    this.rawData = null;
    this.selectedOutputStyle = null; // Track selected output style
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
      this.rawData = data;
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
    this.rawData = data;
    return this.normalizeData(data);
  }

  /**
   * Recompile with a different output style
   */
  recompileWithOutputStyle(outputStyleId) {
    if (!this.rawData) {
      console.error('No raw data available for recompilation');
      return null;
    }
    this.selectedOutputStyle = outputStyleId;
    return this.normalizeData(this.rawData);
  }

  /**
   * Get all available output styles
   */
  getAvailableOutputStyles() {
    if (!this.rawData?.outputStyles?.all) {
      return [];
    }
    return Object.values(this.rawData.outputStyles.all);
  }

  /**
   * Get currently active output style name
   */
  getActiveOutputStyleName() {
    return this.selectedOutputStyle || this.rawData?.outputStyles?.activeName || null;
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
      let systemPromptContent = data.systemPrompt.content;
      let subtitle = 'Claude Code Built-in';

      // Determine which output style to use
      // Priority: manually selected > active from settings > none
      const selectedStyleId = this.selectedOutputStyle || data.outputStyles?.activeName;

      if (selectedStyleId && data.outputStyles?.all) {
        // Try to find the style by ID (case-insensitive lookup)
        const styleKey = Object.keys(data.outputStyles.all).find(
          key => key.toLowerCase() === selectedStyleId.toLowerCase()
        );

        if (styleKey) {
          const activeStyle = data.outputStyles.all[styleKey];
          const styleMetadata = this.extractOutputStyleMetadata(activeStyle.content);
          const styleName = this.extractOutputStyleName(activeStyle.content) || selectedStyleId;

          if (styleMetadata['keep-coding-instructions']) {
            // Output style is PREPENDED to the base system prompt
            subtitle = `Modified by ${styleName}`;
            const styleBody = this.extractOutputStyleBody(activeStyle.content);
            systemPromptContent = `${styleBody}\n\n${data.systemPrompt.content}`;
          } else {
            // Output style REPLACES the base system prompt entirely
            subtitle = `Replaced by ${styleName}`;
            systemPromptContent = this.extractOutputStyleBody(activeStyle.content) || activeStyle.content;
          }
        }
      }

      layers.push({
        id: 'system-prompt',
        type: 'immutable',
        title: 'System Prompt',
        subtitle: subtitle,
        badge: 'Immutable',
        path: data.systemPrompt.path,
        content: systemPromptContent,
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

    // 7. Tools Array (available tools from Claude Code)
    if (data.toolsArray && Array.isArray(data.toolsArray) && data.toolsArray.length > 0) {
      layers.push({
        id: 'tools-array',
        type: 'tools',
        title: 'Tools Array',
        subtitle: `${data.toolsArray.length} available tools`,
        badge: 'Tools',
        content: this.formatToolsArray(data.toolsArray),
        editable: false,
        collapsed: true
      });
    }

    // Note: Output styles are now integrated into the System Prompt display above
    // No separate output style layer is created

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

  /**
   * Format tools array for display
   */
  formatToolsArray(tools) {
    if (!Array.isArray(tools) || tools.length === 0) {
      return 'No tools available';
    }

    // Create a formatted list of tools with their descriptions
    let content = '# Available Tools\n\n';

    tools.forEach((tool, index) => {
      content += `## ${index + 1}. ${tool.name}\n\n`;

      if (tool.description) {
        // Truncate long descriptions to first paragraph for overview
        const firstParagraph = tool.description.split('\n\n')[0];
        content += `${firstParagraph}\n\n`;
      }

      if (tool.input_schema?.properties) {
        const params = Object.keys(tool.input_schema.properties);
        const required = tool.input_schema.required || [];
        content += `**Parameters:** ${params.map(p => required.includes(p) ? `${p}*` : p).join(', ')}\n\n`;
      }

      content += '---\n\n';
    });

    return content;
  }

  /**
   * Extract output style name from YAML frontmatter
   */
  extractOutputStyleName(content) {
    if (!content) return null;
    const match = content.match(/^---\s*\n.*?name:\s*(.+?)\s*\n/m);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract output style body (content after YAML frontmatter)
   */
  extractOutputStyleBody(content) {
    if (!content) return null;
    const parts = content.split(/^---\s*$/m);
    if (parts.length >= 3) {
      // Content after second --- delimiter
      return parts.slice(2).join('---').trim();
    }
    return content;
  }

  /**
   * Extract output style metadata from YAML frontmatter
   */
  extractOutputStyleMetadata(content) {
    if (!content) return {};

    const yamlMatch = content.match(/^---\s*\n(.*?)\n---/s);
    if (!yamlMatch) return {};

    const yamlContent = yamlMatch[1];
    const metadata = {};

    // Simple YAML parser for common fields
    const lines = yamlContent.split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*(\w[\w-]*)\s*:\s*(.+?)\s*$/);
      if (match) {
        const [, key, value] = match;
        // Handle boolean values
        if (value === 'true') metadata[key] = true;
        else if (value === 'false') metadata[key] = false;
        else metadata[key] = value;
      }
    });

    return metadata;
  }
}

export default ContextLoader;
