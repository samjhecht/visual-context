export type AgentKind = "claude" | "codex" | "generic";
export type SourceFormat = "json" | "markdown" | "text";
export type SectionKind =
  | "system"
  | "style"
  | "memory"
  | "project"
  | "hooks"
  | "plugins"
  | "mcp"
  | "tools"
  | "persisted"
  | "developer"
  | "permissions"
  | "policy"
  | "skills"
  | "environment"
  | "generic";
export type TriggerType =
  | "boot"
  | "system-layer"
  | "developer-layer"
  | "tool-definition"
  | "sandbox-policy"
  | "collaboration-mode"
  | "skill-trigger"
  | "plugin-trigger"
  | "runtime-environment"
  | "supporting";

export interface ContextStat {
  label: string;
  value: number | string;
}

export interface ContextSection {
  id: string;
  kind: SectionKind;
  title: string;
  subtitle: string;
  badge: string;
  effect: string;
  content: string;
  path?: string | null;
  metadata?: Record<string, string | number | boolean> | null;
  fileRefs: string[];
  isJson: boolean;
  preview: string;
  stats: {
    lines: number;
    words: number;
    chars: number;
  };
  triggerType: TriggerType;
  defaultCollapsed?: boolean;
}

export interface AssemblyStep {
  id: string;
  kind: SectionKind;
  title: string;
  subtitle: string;
  badge: string;
  effect: string;
  triggerType?: TriggerType;
}

export interface ContextModel {
  agent: {
    id: AgentKind;
    name: string;
    label: string;
  };
  source: {
    label: string;
    format: SourceFormat;
  };
  metadata: Record<string, unknown>;
  overview: {
    eyebrow: string;
    title: string;
    description: string;
    stats: ContextStat[];
  };
  assembly: AssemblyStep[];
  sections: ContextSection[];
}

export interface OutputStyleRecord {
  id: string;
  name: string;
  path: string;
  content: string;
  source: string;
}

export interface ClaudeScanData {
  metadata?: Record<string, unknown>;
  systemPrompt?: { exists?: boolean; path?: string; content?: string };
  globalMemory?: { exists?: boolean; path?: string; content?: string };
  projectMemory?: { exists?: boolean; path?: string; content?: string };
  settings?: {
    hooks?: Record<string, unknown>;
    enabledPlugins?: Record<string, boolean>;
    mcpServers?: Record<string, unknown>;
  };
  outputStyles?: {
    activeName?: string | null;
    all?: Record<string, OutputStyleRecord>;
  };
  installedPlugins?: {
    plugins?: Record<
      string,
      Array<{
        version?: string;
        installedAt?: string;
        installPath?: string;
      }>
    >;
  };
  toolsArray?: Array<{
    name?: string;
    description?: string;
    input_schema?: {
      properties?: Record<string, unknown>;
      required?: string[];
    };
  }>;
}

export interface ContextDocumentState {
  mode: AgentKind;
  sourceName: string;
  selectedOutputStyle: string | null;
  model: ContextModel;
}
