# Visual Context

Visual Context is a standalone React and TypeScript web app for inspecting how Claude Code and Codex startup context is assembled.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind v4
- Node-based scan and launch scripts

The app is intentionally structured so the typed parsing and viewer model can be imported into a future desktop shell with minimal divergence.

## Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Standalone Launch

The launcher prepares a generated source and starts the Vite app:

```bash
./run.sh
./run.sh /path/to/project
./run.sh --codex /path/to/codex-startup-context.md
```

Claude mode scans the target directory and writes `public/generated/context.json`.
Codex mode copies the markdown snapshot to `public/generated/codex-context.md`.

## Install Alias

```bash
./install.sh
source ~/.zshrc
visual-context
```

## Manual Scan

```bash
npm run scan -- /path/to/project --output ./public/generated/context.json
```

## Architecture

- `src/core`
  - Typed source parsing and normalization.
- `src/components`
  - Presentation components used by the standalone shell.
- `src/app`
  - Standalone host concerns such as source selection and local-file loading.
- `scripts/scan-context.mjs`
  - Node-based Claude context scan script.

See [docs/architecture.md](./docs/architecture.md) for the migration notes.
