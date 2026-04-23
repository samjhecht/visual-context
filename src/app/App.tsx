import { ChevronDown, ChevronRight, MoonStar, RefreshCw, SunMedium, Upload } from "lucide-react";
import * as React from "react";
import { ContextDocument, type ContextSection, type ContextStat } from "../core";

type BuiltinSource = {
  id: string;
  label: string;
  path: string;
};

const BUILTIN_SOURCE_CANDIDATES: BuiltinSource[] = [
  {
    id: "generated-claude",
    label: "Generated Claude scan",
    path: "/generated/context.json",
  },
  {
    id: "generated-codex",
    label: "Generated Codex snapshot",
    path: "/generated/codex-context.md",
  },
  {
    id: "sample-claude",
    label: "Claude sample scan",
    path: "/samples/context-test.json",
  },
];

async function sourceExists(path: string) {
  try {
    const headResponse = await fetch(path, { method: "HEAD" });
    if (headResponse.ok) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function statValue(value: ContextStat["value"]) {
  return typeof value === "number" ? value.toLocaleString() : value;
}

function sectionTone(kind: ContextSection["kind"]) {
  switch (kind) {
    case "system":
      return "border-[var(--accent)]/50 bg-[var(--accent-soft)]";
    case "developer":
    case "memory":
    case "project":
    case "style":
      return "border-white/10 bg-white/[0.02]";
    case "tools":
      return "border-sky-500/25 bg-sky-500/10";
    case "permissions":
      return "border-amber-500/25 bg-amber-500/10";
    case "plugins":
      return "border-emerald-500/25 bg-emerald-500/10";
    default:
      return "border-white/10 bg-[var(--panel-muted)]";
  }
}

function triggerTone(triggerType: ContextSection["triggerType"]) {
  switch (triggerType) {
    case "system-layer":
      return "bg-[var(--accent-soft)] text-[var(--accent)]";
    case "developer-layer":
      return "bg-white/8 text-[var(--foreground)]";
    case "tool-definition":
      return "bg-sky-500/15 text-sky-300";
    case "sandbox-policy":
      return "bg-amber-500/15 text-amber-300";
    case "skill-trigger":
      return "bg-fuchsia-500/15 text-fuchsia-300";
    case "plugin-trigger":
      return "bg-emerald-500/15 text-emerald-300";
    case "runtime-environment":
      return "bg-cyan-500/15 text-cyan-300";
    case "collaboration-mode":
      return "bg-violet-500/15 text-violet-300";
    default:
      return "bg-white/8 text-[var(--foreground-secondary)]";
  }
}

function CodeBlock({ content, isJson }: { content: string; isJson: boolean }) {
  const lines = React.useMemo(() => content.split("\n"), [content]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-black/30">
      <div className="grid">
        {lines.map((line, index) => (
          <div
            className="grid grid-cols-[48px_1fr] border-t border-white/4 first:border-t-0"
            key={`${index}-${line.slice(0, 24)}`}
          >
            <div className="select-none border-r border-white/4 px-3 py-2 text-right text-[11px] text-[var(--foreground-secondary)]">
              {index + 1}
            </div>
            <pre className="overflow-x-auto px-4 py-2 text-sm leading-6 text-[var(--foreground)]">
              <code className={isJson ? "text-sky-100" : ""}>{line || " "}</code>
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionCard({
  section,
  collapsed,
  onToggle,
}: {
  section: ContextSection;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <article
      className={`overflow-hidden rounded-3xl border ${sectionTone(section.kind)}`}
      data-testid={`section-${section.id}`}
    >
      <button
        className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left"
        onClick={onToggle}
        type="button"
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold tracking-[-0.02em]">{section.title}</span>
            <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-secondary)]">
              {section.badge}
            </span>
            <span
              className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${triggerTone(section.triggerType)}`}
            >
              {section.triggerType.replace(/-/g, " ")}
            </span>
          </div>
          <div className="text-sm text-[var(--foreground-secondary)]">{section.subtitle}</div>
          <div className="text-sm text-[var(--foreground)]/90">{section.effect}</div>
        </div>
        <span className="mt-1 rounded-full border border-white/10 p-2 text-[var(--foreground-secondary)]">
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </button>
      {!collapsed && (
        <div className="space-y-4 border-t border-white/8 px-5 py-5">
          <div className="flex flex-wrap gap-2 text-xs text-[var(--foreground-secondary)]">
            {section.path ? (
              <span className="rounded-full border border-white/10 px-3 py-1">{section.path}</span>
            ) : null}
            <span className="rounded-full border border-white/10 px-3 py-1">
              {section.stats.lines} lines
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1">
              {section.stats.words} words
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1">
              {section.stats.chars} chars
            </span>
          </div>

          {section.metadata ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Object.entries(section.metadata).map(([key, value]) => (
                <div
                  className="rounded-2xl border border-white/8 bg-white/4 px-3 py-3"
                  key={key}
                >
                  <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-secondary)]">
                    {key.replace(/-/g, " ")}
                  </div>
                  <div className="mt-1 text-sm text-[var(--foreground)]">{String(value)}</div>
                </div>
              ))}
            </div>
          ) : null}

          {section.fileRefs.length > 0 ? (
            <div className="flex flex-wrap gap-2 text-xs text-[var(--foreground-secondary)]">
              {section.fileRefs.map((ref) => (
                <span className="rounded-full bg-white/6 px-3 py-1" key={ref}>
                  {ref}
                </span>
              ))}
            </div>
          ) : null}

          <CodeBlock content={section.content} isJson={section.isJson} />
        </div>
      )}
    </article>
  );
}

export function App() {
  const [builtinSources, setBuiltinSources] = React.useState<BuiltinSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = React.useState("");
  const [contextDocument, setContextDocument] = React.useState<ContextDocument | null>(null);
  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [theme, setTheme] = React.useState<"dark" | "light">("dark");
  const [isPending, startTransition] = React.useTransition();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const loadDocument = React.useCallback((nextDocument: ContextDocument | null) => {
    setContextDocument(nextDocument);
    setCollapsedSections(
      new Set(nextDocument?.model.sections.filter((section) => section.defaultCollapsed).map((section) => section.id) ?? []),
    );
  }, []);

  const fetchAndLoadSource = React.useCallback(
    async (source: BuiltinSource) => {
      setError(null);
      const response = await fetch(source.path);
      if (!response.ok) {
        throw new Error(`Failed to load ${source.label}`);
      }
      const text = await response.text();
      startTransition(() => {
        loadDocument(ContextDocument.fromText(text, source.label));
      });
    },
    [loadDocument],
  );

  React.useEffect(() => {
    window.document.documentElement.dataset.theme = theme;
  }, [theme]);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all(
      BUILTIN_SOURCE_CANDIDATES.map(async (source) => ((await sourceExists(source.path)) ? source : null)),
    )
      .then((results) => results.filter((source): source is BuiltinSource => Boolean(source)))
      .then((sources) => {
        if (cancelled) {
          return;
        }
        setBuiltinSources(sources);
        const initialSource = sources[0];
        if (initialSource) {
          setSelectedSourceId(initialSource.id);
          void fetchAndLoadSource(initialSource).catch((loadError) => {
            setError(loadError instanceof Error ? loadError.message : String(loadError));
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchAndLoadSource]);

  const selectedBuiltinSource = builtinSources.find((source) => source.id === selectedSourceId) ?? null;

  const onBuiltinSourceChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = event.target.value;
    setSelectedSourceId(nextId);
    const nextSource = builtinSources.find((source) => source.id === nextId);
    if (!nextSource) {
      return;
    }
    try {
      await fetchAndLoadSource(nextSource);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    }
  };

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    startTransition(() => {
      setSelectedSourceId("");
      setError(null);
      loadDocument(ContextDocument.fromText(text, file.name));
    });
  };

  const onOutputStyleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!contextDocument) {
      return;
    }
    const nextStyle = event.target.value;
    startTransition(() => {
      loadDocument(contextDocument.setOutputStyle(nextStyle));
    });
  };

  const refreshCurrentSource = async () => {
    if (!selectedBuiltinSource) {
      return;
    }
    try {
      await fetchAndLoadSource(selectedBuiltinSource);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    }
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const setAllSections = (collapsed: boolean) => {
    const sectionIds = contextDocument?.model.sections.map((section) => section.id) ?? [];
    setCollapsedSections(new Set(collapsed ? sectionIds : []));
  };

  const outputStyles = contextDocument?.getAvailableOutputStyles() ?? [];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-8 px-5 py-6 md:px-8 xl:px-10">
        <header className="rounded-[32px] border border-white/8 bg-[var(--panel)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
          <div className="grid gap-8 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.32em] text-[var(--foreground-secondary)]">
                  Startup Prompt Visualizer
                </div>
                <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
                  Visual Context
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[var(--foreground-secondary)]">
                  Explore exactly how Claude Code or Codex startup context is assembled, with the
                  same low-noise shell and token language used in the desktop app.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-[var(--foreground-secondary)]">
                <span className="rounded-full border border-white/10 px-3 py-2">
                  {contextDocument?.model.agent.name ?? "No source loaded"}
                </span>
                <span className="rounded-full border border-white/10 px-3 py-2">
                  {contextDocument?.model.source.label ?? "Select a source"}
                </span>
                <span className="rounded-full border border-white/10 px-3 py-2">
                  {isPending ? "Refreshing" : "Ready"}
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {contextDocument?.model.overview.stats.map((stat) => (
                <div className="rounded-3xl border border-white/8 bg-[var(--panel-muted)] px-4 py-4" key={stat.label}>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-secondary)]">
                    {stat.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    {statValue(stat.value)}
                  </div>
                </div>
              )) ?? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-[var(--panel-muted)] px-4 py-4 text-sm text-[var(--foreground-secondary)] sm:col-span-2">
                  Generated sources appear here after the app loads a Claude scan or Codex startup
                  snapshot.
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="rounded-[32px] border border-white/8 bg-[var(--panel)] p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto_auto]">
            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-secondary)]">
                Source
              </span>
              <select
                className="vc-select"
                data-testid="source-select"
                onChange={onBuiltinSourceChange}
                value={selectedSourceId}
              >
                <option value="">Select a generated source</option>
                {builtinSources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-secondary)]">
                Claude Output Style
              </span>
              <select
                className="vc-select"
                data-testid="output-style-select"
                disabled={contextDocument?.mode !== "claude"}
                onChange={onOutputStyleChange}
                value={contextDocument?.getActiveOutputStyleName() ?? ""}
              >
                <option value="">Base Prompt Only</option>
                {outputStyles.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-2">
              <button className="vc-button" onClick={() => fileInputRef.current?.click()} type="button">
                <Upload className="size-4" />
                Load Local File
              </button>
              <input
                accept=".json,.md,.markdown,.txt"
                className="hidden"
                onChange={onUpload}
                ref={fileInputRef}
                type="file"
              />
            </div>

            <div className="flex items-end justify-end gap-2">
              <button
                className="vc-icon-button"
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
                type="button"
              >
                {theme === "dark" ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
              </button>
              <button className="vc-icon-button" onClick={refreshCurrentSource} type="button">
                <RefreshCw className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="vc-button vc-button--ghost" onClick={() => setAllSections(false)} type="button">
              Expand All
            </button>
            <button className="vc-button vc-button--ghost" onClick={() => setAllSections(true)} type="button">
              Collapse All
            </button>
          </div>
        </section>

        {error ? (
          <section className="rounded-3xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-100">
            {error}
          </section>
        ) : null}

        {contextDocument ? (
          <>
            <section className="rounded-[32px] border border-white/8 bg-[var(--panel)] p-5">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-secondary)]">
                    Assembly Order
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    How the startup context is composed
                  </h2>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {contextDocument.model.assembly.map((step, index) => (
                  <div
                    className="rounded-3xl border border-white/8 bg-[var(--panel-muted)] p-4"
                    key={step.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{index + 1}. {step.title}</span>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${triggerTone(step.triggerType ?? "supporting")}`}
                      >
                        {step.badge}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-[var(--foreground-secondary)]">{step.subtitle}</div>
                    <div className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--foreground-secondary)]">
                      {step.effect}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-secondary)]">
                  Detailed Sources
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                  Source blocks in readable form
                </h2>
              </div>
              <div className="space-y-4">
                {contextDocument.model.sections.map((section) => (
                  <SectionCard
                    collapsed={collapsedSections.has(section.id)}
                    key={section.id}
                    onToggle={() => toggleSection(section.id)}
                    section={section}
                  />
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-[32px] border border-dashed border-white/12 bg-[var(--panel)] px-8 py-16 text-center text-[var(--foreground-secondary)]">
            Choose a generated source or upload a local snapshot to inspect the startup context.
          </section>
        )}
      </div>
    </div>
  );
}
