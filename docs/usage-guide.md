# Visual Context Usage Guide

## Install

```bash
npm install
./install.sh
source ~/.zshrc
```

## Run Claude Mode

```bash
visual-context
visual-context /path/to/project
```

This scans the target project, writes `public/generated/context.json`, and starts the Vite app.

## Run Codex Mode

```bash
visual-context --codex /path/to/codex-startup-context.md
```

This copies the markdown snapshot to `public/generated/codex-context.md` and starts the app.

## Manual Development

```bash
npm run dev
npm run scan -- /path/to/project --output ./public/generated/context.json
```

Then open `http://127.0.0.1:5173`.

## Test and Build

```bash
npm test
npm run build
```

## Troubleshooting

### The launcher exits early

Check:

- `node --version`
- `npm --version`
- `/tmp/visual-context-vite.log`

### No generated source appears

Check that one of these files exists:

- `public/generated/context.json`
- `public/generated/codex-context.md`

### I only want to regenerate the Claude scan

```bash
npm run scan -- /path/to/project --output ./public/generated/context.json
```
