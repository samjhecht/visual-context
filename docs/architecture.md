# Visual Context Architecture

## Overview

Visual Context is now a Vite, React, and TypeScript app with a typed core boundary and a lightweight standalone host.

The design goal is simple:

1. Keep the startup-context parsing and view-model shaping reusable.
2. Keep the standalone web shell thin so the desktop app can import the same viewer logic later.
3. Remove Python from the runtime path.

## Current Structure

```text
visual-context/
  index.html
  package.json
  run.sh
  install.sh
  public/
    generated/
    samples/
  scripts/
    scan-context.mjs
  src/
    app/
      App.tsx
    core/
      context-document.ts
      types.ts
    test/
      *.test.ts(x)
    main.tsx
    styles.css
```

## Layers

### 1. Typed core

`src/core` owns:

- source parsing
- Claude scan normalization
- Codex markdown normalization
- startup assembly shaping
- trigger-type classification
- typed contracts for sections, assembly steps, and overview stats

The important entrypoint is `ContextDocument`, which can:

- load JSON or markdown sources
- expose a normalized `ContextModel`
- recompile Claude views with a selected output style
- report output-style options for the UI

This is the import boundary intended for future desktop reuse.

### 2. Standalone host

`src/app/App.tsx` owns only web-host concerns:

- discovering generated/sample sources
- fetching source files
- local file upload
- output-style selection wiring
- section expand/collapse state
- light/dark theme toggle

It does not own parsing rules.

### 3. Node scanner

`scripts/scan-context.mjs` replaces the old Python-backed scanner flow.

It reads:

- `~/.claude/CLAUDE.md`
- project `CLAUDE.md`
- `~/.claude/settings.json`
- local `.claude/settings.local.json`
- output-style directories
- installed plugin metadata
- extracted Claude config (`system_prompt.md`, `tools.json`)
- known project data from `~/.claude.json`

It emits a JSON payload that the typed core already understands.

## Runtime Flow

```text
./run.sh --claude /path/to/project
  -> npm run scan -- /path/to/project --output public/generated/context.json
  -> npm run dev
  -> app fetches generated source
  -> ContextDocument normalizes it
  -> React renders overview, assembly, and source sections

./run.sh --codex /path/to/codex-startup-context.md
  -> copy markdown into public/generated/codex-context.md
  -> npm run dev
  -> app fetches generated source
  -> ContextDocument normalizes it
  -> React renders trigger-aware startup sections
```

## Styling Direction

The web shell now mirrors the desktop renderer conventions:

- CSS variable tokens for background, foreground, border, and accent
- restrained shell layout with rounded panels and low-noise chrome
- utility-first composition through Tailwind v4
- light/dark mode via `data-theme`

This keeps the visual language close to desktop without hard-coupling to the desktop package.

## Tests

`src/test` currently covers:

- Claude normalization
- Codex normalization and trigger classification
- generic fallback handling
- app bootstrap with builtin source loading
- section collapse/expand behavior

## Future Desktop Reuse

The preferred next step for desktop integration is:

1. keep `ContextDocument` and related types stable
2. extract `src/core` into a shared package if reuse pressure increases
3. let desktop compose its own shell while importing the same parser/model layer

That keeps the standalone app useful without turning it into a dead-end fork.
