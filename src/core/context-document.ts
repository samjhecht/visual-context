import type {
  AgentKind,
  ClaudeScanData,
  ContextDocumentState,
  ContextModel,
  ContextSection,
  ContextStat,
  OutputStyleRecord,
  SectionKind,
  TriggerType,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeTextContent(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function createStat(label: string, value: number | string): ContextStat {
  return { label, value };
}

function computeContentStats(content: string) {
  const trimmed = content.trim();
  return {
    lines: content ? content.split("\n").length : 0,
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    chars: content.length,
  };
}

function createPreview(content: string) {
  if (!content) {
    return "No content available.";
  }

  return content.replace(/\s+/g, " ").trim().slice(0, 180);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function extractFileRefs(content: string) {
  if (!content) {
    return [];
  }

  const refs = new Set<string>();
  const atMatches =
    content.match(/@([A-Za-z0-9_\-./]+\.(?:md|txt|json|yaml|yml))/g) ?? [];
  for (const match of atMatches) {
    refs.add(match.slice(1));
  }

  const tickMatches =
    content.match(/`([A-Za-z0-9_\-./]+\.(?:md|txt|json|yaml|yml))`/g) ?? [];
  for (const match of tickMatches) {
    refs.add(match.slice(1, -1));
  }

  return [...refs];
}

function extractOutputStyleName(content: string) {
  const match = content.match(/^---\s*\n.*?name:\s*(.+?)\s*\n/m);
  return match ? match[1].trim() : null;
}

function extractOutputStyleBody(content: string) {
  const parts = content.split(/^---\s*$/m);
  if (parts.length >= 3) {
    return parts.slice(2).join("---").trim();
  }

  return content;
}

function extractOutputStyleMetadata(content: string) {
  const yamlMatch = content.match(/^---\s*\n(.*?)\n---/s);
  if (!yamlMatch) {
    return {} as Record<string, string | boolean>;
  }

  const metadata: Record<string, string | boolean> = {};
  for (const line of yamlMatch[1].split("\n")) {
    const match = line.match(/^\s*(\w[\w-]*)\s*:\s*(.+?)\s*$/);
    if (!match) {
      continue;
    }

    const [, key, value] = match;
    if (value === "true") {
      metadata[key] = true;
    } else if (value === "false") {
      metadata[key] = false;
    } else {
      metadata[key] = value;
    }
  }

  return metadata;
}

function formatPluginInfo(
  installedPlugins: ClaudeScanData["installedPlugins"],
  enabledList: string[],
) {
  if (!installedPlugins?.plugins) {
    return JSON.stringify({ enabled: enabledList }, null, 2);
  }

  const info: Record<string, unknown> = {};
  for (const name of enabledList) {
    const pluginData = installedPlugins.plugins[name];
    if (!pluginData || pluginData.length === 0) {
      continue;
    }

    const latest = pluginData[0];
    info[name] = {
      version: latest.version,
      installedAt: latest.installedAt,
      path: latest.installPath,
    };
  }

  return JSON.stringify(info, null, 2);
}

function formatToolsArray(tools: ClaudeScanData["toolsArray"]) {
  if (!Array.isArray(tools) || tools.length === 0) {
    return "No tools available";
  }

  let content = "# Available Tools\n\n";

  for (const [index, tool] of tools.entries()) {
    const toolName = tool.name ?? `Tool ${index + 1}`;
    content += `## ${index + 1}. ${toolName}\n\n`;

    if (tool.description) {
      const firstParagraph = tool.description.split("\n\n")[0];
      content += `${firstParagraph}\n\n`;
    }

    const properties = tool.input_schema?.properties;
    if (properties) {
      const params = Object.keys(properties);
      const required = tool.input_schema?.required ?? [];
      content += `Parameters: ${params
        .map((param) => (required.includes(param) ? `${param}*` : param))
        .join(", ")}\n\n`;
    }

    content += "---\n\n";
  }

  return content;
}

function findOutputStyle(
  allStyles: Record<string, OutputStyleRecord> | undefined,
  selectedStyleId: string | null,
) {
  if (!selectedStyleId || !allStyles) {
    return null;
  }

  const styleKey = Object.keys(allStyles).find(
    (key) => key.toLowerCase() === selectedStyleId.toLowerCase(),
  );

  return styleKey ? allStyles[styleKey] : null;
}

type ParsedDocument = {
  mode: AgentKind;
  rawData: unknown;
  model: ContextModel;
};

function createSection(input: {
  id: string;
  kind: SectionKind;
  title: string;
  subtitle: string;
  badge: string;
  effect: string;
  content: string;
  triggerType: TriggerType;
  path?: string | null;
  metadata?: Record<string, string | number | boolean> | null;
  fileRefs?: string[];
  isJson?: boolean;
  defaultCollapsed?: boolean;
}): ContextSection {
  const content = input.content ?? "";
  return {
    ...input,
    path: input.path ?? null,
    metadata: input.metadata ?? null,
    fileRefs: input.fileRefs ?? [],
    isJson: input.isJson ?? false,
    preview: createPreview(content),
    stats: computeContentStats(content),
    content,
  };
}

function findTopLevelMarkdownSections(markdown: string) {
  const matches: Array<{ index: number; title: string; contentStart: number }> = [];
  const lines = markdown.split("\n");
  let offset = 0;
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
    }

    if (!inFence && line.startsWith("## ")) {
      matches.push({
        index: offset,
        title: line.slice(3).trim(),
        contentStart: offset + line.length + 1,
      });
    }

    offset += line.length + 1;
  }

  return matches;
}

function describeCodexKind(kind: SectionKind) {
  const descriptions: Partial<Record<SectionKind, string>> = {
    persisted: "Recovered startup state",
    system: "Base system instruction block",
    developer: "Developer policy layer",
    tools: "Tool schema definitions",
    permissions: "Execution and sandbox policy",
    policy: "Collaboration mode rules",
    skills: "Skill activation rules",
    plugins: "Plugin capabilities",
    environment: "Runtime metadata",
    generic: "Supporting startup section",
  };

  return descriptions[kind] ?? descriptions.generic ?? "Supporting startup section";
}

function classifyCodexSection(title: string, content: string): SectionKind {
  const combined = `${title}\n${content}`.toLowerCase();

  if (combined.includes("persisted session meta")) return "persisted";
  if (combined.includes("live injected system message")) return "system";
  if (combined.includes("developer message") || combined.includes("developer")) {
    return "developer";
  }
  if (
    combined.includes("tool definitions") ||
    combined.includes("namespace:") ||
    combined.includes("tool definitions")
  ) {
    return "tools";
  }
  if (combined.includes("permissions") || combined.includes("sandbox")) {
    return "permissions";
  }
  if (combined.includes("skills")) return "skills";
  if (combined.includes("plugins")) return "plugins";
  if (combined.includes("collaboration")) return "policy";
  if (combined.includes("environment")) return "environment";
  return "generic";
}

function codexTriggerType(kind: SectionKind): TriggerType {
  switch (kind) {
    case "persisted":
      return "boot";
    case "system":
      return "system-layer";
    case "developer":
      return "developer-layer";
    case "tools":
      return "tool-definition";
    case "permissions":
      return "sandbox-policy";
    case "policy":
      return "collaboration-mode";
    case "skills":
      return "skill-trigger";
    case "plugins":
      return "plugin-trigger";
    case "environment":
      return "runtime-environment";
    default:
      return "supporting";
  }
}

function codexBadge(kind: SectionKind) {
  const badges: Partial<Record<SectionKind, string>> = {
    persisted: "Recovered",
    system: "System",
    developer: "Developer",
    tools: "Tools",
    permissions: "Policy",
    policy: "Mode",
    skills: "Skills",
    plugins: "Plugins",
    environment: "Env",
    generic: "Section",
  };

  return badges[kind] ?? "Section";
}

function codexSectionEffect(kind: SectionKind) {
  const effects: Partial<Record<SectionKind, string>> = {
    persisted: "Recovered from prior session state",
    system: "Injected as top-level system behavior",
    developer: "Injected as implementation and collaboration policy",
    tools: "Defines callable tools and interfaces",
    permissions: "Constrains filesystem, shell, and approvals",
    policy: "Sets collaboration and orchestration mode",
    skills: "Adds skill-triggered workflows",
    plugins: "Adds plugin-specific capabilities",
    environment: "Defines runtime and workspace context",
    generic: "Additional startup material",
  };

  return effects[kind] ?? effects.generic ?? "Additional startup material";
}

function codexAssemblyBadge(kind: SectionKind, index: number) {
  if (index === 0) {
    return "Boot";
  }

  const badges: Partial<Record<SectionKind, string>> = {
    persisted: "Recover",
    system: "Inject",
    developer: "Layer",
    tools: "Expose",
    permissions: "Scope",
    policy: "Mode",
    skills: "Trigger",
    plugins: "Plugin",
    environment: "Context",
    generic: "Add",
  };

  return badges[kind] ?? "Add";
}

function codexAssemblyEffect(kind: SectionKind) {
  const effects: Partial<Record<SectionKind, string>> = {
    persisted: "Session state",
    system: "Core rules",
    developer: "Operator guidance",
    tools: "Capabilities",
    permissions: "Execution limits",
    policy: "Mode selection",
    skills: "Trigger rules",
    plugins: "App integrations",
    environment: "Runtime details",
    generic: "Supporting material",
  };

  return effects[kind] ?? effects.generic ?? "Supporting material";
}

function cleanCodexTitle(title: string) {
  return title.replace(/`([^`]+)`/g, "$1").trim();
}

function codexSubtitle(title: string, kind: SectionKind) {
  const backtickMatch = title.match(/`([^`]+)`/);
  if (backtickMatch) {
    return backtickMatch[1];
  }

  return describeCodexKind(kind);
}

function extractCodexMetadata(title: string, body: string, triggerType: TriggerType) {
  const metadata: Record<string, string | number | boolean> = {
    trigger: triggerType,
  };

  const quotedSource = title.match(/`([^`]+)`/);
  if (quotedSource) {
    metadata.source = quotedSource[1];
  }

  const lineCount = body ? body.split("\n").length : 0;
  if (lineCount > 0) {
    metadata.lines = lineCount;
  }

  return metadata;
}

function normalizeClaudeData(
  data: ClaudeScanData,
  sourceName: string,
  selectedOutputStyle: string | null,
): ContextModel {
  const sections: ContextSection[] = [];
  const assembly: ContextModel["assembly"] = [];
  const effectiveStyleId =
    selectedOutputStyle === null ? (data.outputStyles?.activeName ?? null) : selectedOutputStyle || null;
  const activeStyle = findOutputStyle(data.outputStyles?.all, effectiveStyleId);

  if (data.systemPrompt?.exists) {
    sections.push(
      createSection({
        id: "claude-base-system-prompt",
        kind: "system",
        title: "Base System Prompt",
        subtitle: "Claude Code built-in instructions",
        badge: "Base",
        effect: "Starts the startup prompt",
        content: normalizeTextContent(data.systemPrompt.content),
        path: data.systemPrompt.path,
        triggerType: "system-layer",
      }),
    );

    assembly.push({
      id: "assembly-base-system",
      kind: "system",
      title: "Base Prompt",
      subtitle: "Claude Code core identity and operating rules",
      badge: "Base",
      effect: "Initial",
      triggerType: "system-layer",
    });
  }

  if (activeStyle) {
    const styleMetadata = extractOutputStyleMetadata(activeStyle.content);
    const styleName = extractOutputStyleName(activeStyle.content) ?? activeStyle.id;
    const keepCodingInstructions = Boolean(styleMetadata["keep-coding-instructions"]);

    sections.push(
      createSection({
        id: "claude-output-style",
        kind: "style",
        title: "Output Style",
        subtitle: activeStyle.path || styleName,
        badge: keepCodingInstructions ? "Prepends" : "Replaces",
        effect: keepCodingInstructions
          ? "Prepended ahead of the base system prompt"
          : "Replaces the base prompt body",
        content: extractOutputStyleBody(activeStyle.content) || activeStyle.content,
        path: activeStyle.path,
        metadata: {
          name: styleName,
          source: activeStyle.source || "unknown",
          "keep-coding-instructions": keepCodingInstructions,
        },
        triggerType: "developer-layer",
      }),
    );

    assembly.push({
      id: "assembly-output-style",
      kind: "style",
      title: styleName,
      subtitle: keepCodingInstructions
        ? "Output style is prepended"
        : "Output style replaces base prompt",
      badge: keepCodingInstructions ? "Prepend" : "Replace",
      effect: keepCodingInstructions ? "Modifier" : "Override",
      triggerType: "developer-layer",
    });
  }

  if (data.globalMemory?.exists) {
    const content = normalizeTextContent(data.globalMemory.content);
    sections.push(
      createSection({
        id: "claude-global-memory",
        kind: "memory",
        title: "Global Memory",
        subtitle: "~/.claude/CLAUDE.md",
        badge: "Global",
        effect: "Appended as user-level standing instructions",
        content,
        path: data.globalMemory.path,
        fileRefs: extractFileRefs(content),
        triggerType: "developer-layer",
      }),
    );

    assembly.push({
      id: "assembly-global-memory",
      kind: "memory",
      title: "Global Memory",
      subtitle: "User-specific Claude instructions",
      badge: "Append",
      effect: "User",
      triggerType: "developer-layer",
    });
  }

  if (data.projectMemory?.exists) {
    const content = normalizeTextContent(data.projectMemory.content);
    sections.push(
      createSection({
        id: "claude-project-memory",
        kind: "project",
        title: "Project Memory",
        subtitle: "./CLAUDE.md",
        badge: "Project",
        effect: "Appended as project-specific standing instructions",
        content,
        path: data.projectMemory.path,
        fileRefs: extractFileRefs(content),
        triggerType: "developer-layer",
      }),
    );

    assembly.push({
      id: "assembly-project-memory",
      kind: "project",
      title: "Project Memory",
      subtitle: "Repository-local agent guidance",
      badge: "Append",
      effect: "Project",
      triggerType: "developer-layer",
    });
  }

  if (data.settings?.hooks && Object.keys(data.settings.hooks).length > 0) {
    sections.push(
      createSection({
        id: "claude-hooks",
        kind: "hooks",
        title: "Session Hooks",
        subtitle: "~/.claude/settings.json",
        badge: "Hooks",
        effect: "Runtime hook configuration that can inject additional context",
        content: JSON.stringify(data.settings.hooks, null, 2),
        isJson: true,
        triggerType: "supporting",
      }),
    );

    assembly.push({
      id: "assembly-hooks",
      kind: "hooks",
      title: "Hooks",
      subtitle: `${Object.keys(data.settings.hooks).length} hook groups configured`,
      badge: "Inject",
      effect: "Runtime",
      triggerType: "supporting",
    });
  }

  if (data.settings?.enabledPlugins) {
    const enabledList = Object.entries(data.settings.enabledPlugins)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);

    if (enabledList.length > 0) {
      sections.push(
        createSection({
          id: "claude-plugins",
          kind: "plugins",
          title: "Enabled Plugins",
          subtitle: `${enabledList.length} active`,
          badge: "Plugins",
          effect: "Expands prompt and tool surface through installed plugins",
          content: formatPluginInfo(data.installedPlugins, enabledList),
          isJson: true,
          triggerType: "plugin-trigger",
        }),
      );

      assembly.push({
        id: "assembly-plugins",
        kind: "plugins",
        title: "Plugins",
        subtitle: `${enabledList.length} active`,
        badge: "Extend",
        effect: "Capabilities",
        triggerType: "plugin-trigger",
      });
    }
  }

  if (data.settings?.mcpServers && Object.keys(data.settings.mcpServers).length > 0) {
    const count = Object.keys(data.settings.mcpServers).length;
    sections.push(
      createSection({
        id: "claude-mcp",
        kind: "mcp",
        title: "MCP Servers",
        subtitle: `${count} configured`,
        badge: "MCP",
        effect: "Adds external context and tool endpoints",
        content: JSON.stringify(data.settings.mcpServers, null, 2),
        isJson: true,
        triggerType: "runtime-environment",
      }),
    );

    assembly.push({
      id: "assembly-mcp",
      kind: "mcp",
      title: "MCP Servers",
      subtitle: `${count} available connectors`,
      badge: "Attach",
      effect: "External",
      triggerType: "runtime-environment",
    });
  }

  if (data.toolsArray && data.toolsArray.length > 0) {
    sections.push(
      createSection({
        id: "claude-tools",
        kind: "tools",
        title: "Tool Surface",
        subtitle: `${data.toolsArray.length} tools available`,
        badge: "Tools",
        effect: "Exposes callable tools to the agent",
        content: formatToolsArray(data.toolsArray),
        triggerType: "tool-definition",
        defaultCollapsed: true,
      }),
    );

    assembly.push({
      id: "assembly-tools",
      kind: "tools",
      title: "Tools",
      subtitle: `${data.toolsArray.length} callable interfaces`,
      badge: "Expose",
      effect: "Runtime",
      triggerType: "tool-definition",
    });
  }

  return {
    agent: {
      id: "claude",
      name: "Claude Code",
      label: "Claude startup context",
    },
    source: {
      label: sourceName,
      format: "json",
    },
    metadata: data.metadata ?? {},
    overview: {
      eyebrow: "Prompt composition",
      title: "Claude startup assembly",
      description:
        "The startup prompt is composed from a built-in base, optional output-style modifiers, standing memory, and runtime capability surfaces.",
      stats: [
        createStat("Assembly Steps", assembly.length),
        createStat("Visible Sections", sections.length),
        createStat(
          "Active Style",
          activeStyle ? extractOutputStyleName(activeStyle.content) ?? activeStyle.id : "Base Only",
        ),
        createStat("Target CWD", String(data.metadata?.targetCwd ?? "Unknown")),
      ],
    },
    assembly,
    sections,
  };
}

function normalizeCodexMarkdown(markdown: string, sourceName: string): ContextModel {
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const documentTitle = titleMatch ? titleMatch[1].trim() : "Codex Startup Context";
  const blockMatches = findTopLevelMarkdownSections(markdown);
  const sections = blockMatches.map((current, index) => {
    const next = blockMatches[index + 1];
    const start = current.contentStart;
    const end = next ? next.index : markdown.length;
    const body = markdown.slice(start, end).trim();
    const codeBlocks = [...body.matchAll(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g)];
    const extractedContent =
      codeBlocks.length > 0
        ? codeBlocks.map((match) => match[1].trim()).join("\n\n")
        : body;
    const kind = classifyCodexSection(current.title, extractedContent);
    const triggerType = codexTriggerType(kind);

    return createSection({
      id: `codex-${index}-${slugify(current.title)}`,
      kind,
      title: cleanCodexTitle(current.title),
      subtitle: codexSubtitle(current.title, kind),
      badge: codexBadge(kind),
      effect: codexSectionEffect(kind),
      content: extractedContent || body,
      metadata: extractCodexMetadata(current.title, body, triggerType),
      triggerType,
      defaultCollapsed: kind === "tools",
    });
  });

  const assembly = sections.map((section, index) => ({
    id: `assembly-${section.id}`,
    kind: section.kind,
    title: section.title,
    subtitle: section.subtitle || describeCodexKind(section.kind),
    badge: codexAssemblyBadge(section.kind, index),
    effect: codexAssemblyEffect(section.kind),
    triggerType: section.triggerType,
  }));

  const toolSchemaCount = sections.reduce((count, section) => {
    return count + (section.content.match(/type\s+[A-Za-z0-9_.-]+\s*=\s*\(_:/g) ?? []).length;
  }, 0);
  const triggerCount = new Set(sections.map((section) => section.triggerType)).size;

  return {
    agent: {
      id: "codex",
      name: "Codex",
      label: "Codex startup context",
    },
    source: {
      label: sourceName,
      format: "markdown",
    },
    metadata: {
      title: documentTitle,
    },
    overview: {
      eyebrow: "Recovered startup stack",
      title: documentTitle,
      description:
        "This view shows the ordered instruction and capability blocks injected before the agent starts responding.",
      stats: [
        createStat("Startup Blocks", assembly.length),
        createStat("Trigger Types", triggerCount),
        createStat("Developer Blocks", sections.filter((section) => section.kind === "developer").length),
        createStat("Tool Schemas", toolSchemaCount || sections.filter((section) => section.kind === "tools").length),
      ],
    },
    assembly,
    sections,
  };
}

function normalizeGenericObject(data: unknown, sourceName: string): ContextModel {
  const content = JSON.stringify(data, null, 2);

  return {
    agent: {
      id: "generic",
      name: "Unknown Agent",
      label: "Generic context snapshot",
    },
    source: {
      label: sourceName,
      format: "json",
    },
    metadata: {},
    overview: {
      eyebrow: "Raw source",
      title: "Unclassified context snapshot",
      description:
        "This source did not match the Claude or Codex startup formats, so it is shown as a raw payload.",
      stats: [
        createStat("Sections", 1),
        createStat("Format", "JSON"),
        createStat("Bytes", content.length),
      ],
    },
    assembly: [
      {
        id: "assembly-raw",
        kind: "generic",
        title: "Raw Payload",
        subtitle: "No specialized parser matched this source",
        badge: "Raw",
        effect: "Inspect",
        triggerType: "supporting",
      },
    ],
    sections: [
      createSection({
        id: "generic-raw",
        kind: "generic",
        title: "Raw Payload",
        subtitle: sourceName,
        badge: "Raw",
        effect: "Unparsed JSON source",
        content,
        isJson: true,
        triggerType: "supporting",
      }),
    ],
  };
}

function parseTextInput(
  text: string,
  sourceName: string,
  selectedOutputStyle: string | null,
): ParsedDocument {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return parseRawInput(parsed, sourceName, selectedOutputStyle);
    } catch {
      return {
        mode: "codex" as AgentKind,
        rawData: text,
        model: normalizeCodexMarkdown(text, sourceName),
      };
    }
  }

  return {
    mode: "codex" as AgentKind,
    rawData: text,
    model: normalizeCodexMarkdown(text, sourceName),
  };
}

function parseRawInput(
  rawData: unknown,
  sourceName: string,
  selectedOutputStyle: string | null,
): ParsedDocument {
  if (typeof rawData === "string") {
    return parseTextInput(rawData, sourceName, selectedOutputStyle);
  }

  if (
    isRecord(rawData) &&
    ("systemPrompt" in rawData || "globalMemory" in rawData || "projectMemory" in rawData)
  ) {
    return {
      mode: "claude" as AgentKind,
      rawData,
      model: normalizeClaudeData(rawData as ClaudeScanData, sourceName, selectedOutputStyle),
    };
  }

  if (isRecord(rawData) && "sections" in rawData && "assembly" in rawData) {
    const model = rawData as unknown as ContextModel;
    return {
      mode: model.agent.id,
      rawData,
      model,
    };
  }

  return {
    mode: "generic" as AgentKind,
    rawData,
    model: normalizeGenericObject(rawData, sourceName),
  };
}

export class ContextDocument {
  readonly rawData: unknown;
  readonly sourceName: string;
  readonly mode: AgentKind;
  readonly selectedOutputStyle: string | null;
  readonly model: ContextModel;

  private constructor(input: ContextDocumentState & { rawData: unknown }) {
    this.rawData = input.rawData;
    this.sourceName = input.sourceName;
    this.mode = input.mode;
    this.selectedOutputStyle = input.selectedOutputStyle;
    this.model = input.model;
  }

  static fromText(text: string, sourceName = "uploaded-file") {
    const parsed = parseTextInput(text, sourceName, null);
    return new ContextDocument({
      rawData: parsed.rawData,
      sourceName,
      mode: parsed.mode,
      selectedOutputStyle: null,
      model: parsed.model,
    });
  }

  static fromData(data: unknown, sourceName = "inline-data") {
    const parsed = parseRawInput(data, sourceName, null);
    return new ContextDocument({
      rawData: parsed.rawData,
      sourceName,
      mode: parsed.mode,
      selectedOutputStyle: null,
      model: parsed.model,
    });
  }

  setOutputStyle(styleId: string | null) {
    if (this.mode !== "claude") {
      return this;
    }

    const parsed = parseRawInput(this.rawData, this.sourceName, styleId ?? "");
    return new ContextDocument({
      rawData: parsed.rawData,
      sourceName: this.sourceName,
      mode: parsed.mode,
      selectedOutputStyle: styleId ?? "",
      model: parsed.model,
    });
  }

  getAvailableOutputStyles() {
    if (!isRecord(this.rawData) || this.mode !== "claude") {
      return [] as OutputStyleRecord[];
    }

    const scan = this.rawData as ClaudeScanData;
    return Object.values(scan.outputStyles?.all ?? {});
  }

  getActiveOutputStyleName() {
    if (this.mode !== "claude" || !isRecord(this.rawData)) {
      return null;
    }

    const scan = this.rawData as ClaudeScanData;
    if (this.selectedOutputStyle === "") {
      return null;
    }

    return this.selectedOutputStyle ?? scan.outputStyles?.activeName ?? null;
  }
}
