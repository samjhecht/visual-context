#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readTextFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return {
      exists: true,
      path: filePath,
      content,
    };
  } catch (error) {
    return {
      exists: false,
      path: filePath,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function readJsonFile(filePath, fallback = {}) {
  if (!(await exists(filePath))) {
    return fallback;
  }

  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

async function listDirEntries(dirPath) {
  if (!(await exists(dirPath))) {
    return [];
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.map((entry) => ({
    name: entry.name,
    path: path.join(dirPath, entry.name),
    isDir: entry.isDirectory(),
  }));
}

async function loadOutputStyles(dirPath, source, allStyles) {
  if (!(await exists(dirPath))) {
    return;
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }

    const styleId = entry.name.replace(/\.md$/, "");
    const stylePath = path.join(dirPath, entry.name);
    try {
      const content = await fs.readFile(stylePath, "utf8");
      allStyles[styleId] = {
        id: styleId,
        name: styleId,
        path: stylePath,
        content,
        source,
      };
    } catch {
      continue;
    }
  }
}

async function resolveClaudeConfig() {
  const candidates = [
    path.resolve(process.cwd(), ".claude-config"),
    path.join(os.homedir(), "medb/projects/wrangler/.claude-config"),
    path.join(os.homedir(), ".claude-config"),
  ];

  for (const candidate of candidates) {
    const systemPromptPath = path.join(candidate, "system_prompt.md");
    if (await exists(systemPromptPath)) {
      return {
        systemPromptPath,
        toolsPath: path.join(candidate, "tools.json"),
      };
    }
  }

  return {
    systemPromptPath: "/dev/null",
    toolsPath: "/dev/null",
  };
}

async function loadKnownProjects(claudeDir) {
  const claudeJsonPath = path.join(os.homedir(), ".claude.json");
  const projectsDir = path.join(claudeDir, "projects");
  const projects = [];

  const claudeData = await readJsonFile(claudeJsonPath, {});
  const projectData =
    typeof claudeData === "object" && claudeData !== null && "projects" in claudeData
      ? claudeData.projects
      : {};

  if (projectData && typeof projectData === "object") {
    for (const [projectPath, info] of Object.entries(projectData)) {
      const details = typeof info === "object" && info !== null ? info : {};
      projects.push({
        path: projectPath,
        lastUsed:
          typeof details.exampleFilesGeneratedAt === "number"
            ? details.exampleFilesGeneratedAt
            : 0,
        lastCost: typeof details.lastCost === "number" ? details.lastCost : 0,
        hasClaudeMd: await exists(path.join(projectPath, "CLAUDE.md")),
      });
    }
  }

  if (await exists(projectsDir)) {
    const seen = new Set(projects.map((project) => project.path));
    const entries = await fs.readdir(projectsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      const decodedPath = `/${entry.name.replace(/^-/, "").replace(/-/g, "/")}`;
      if (seen.has(decodedPath)) {
        continue;
      }
      projects.push({
        path: decodedPath,
        lastUsed: 0,
        lastCost: 0,
        hasClaudeMd: await exists(path.join(decodedPath, "CLAUDE.md")),
      });
    }
  }

  projects.sort((left, right) => right.lastUsed - left.lastUsed);
  return projects;
}

async function buildContext(targetDir) {
  const claudeDir = path.join(os.homedir(), ".claude");
  const localSettingsPath = path.join(targetDir, ".claude", "settings.local.json");
  const outputStyles = {};
  const claudeConfig = await resolveClaudeConfig();

  await loadOutputStyles(path.join(claudeDir, "output-styles"), "user", outputStyles);
  await loadOutputStyles(
    path.join(targetDir, ".claude", "output-styles"),
    "project",
    outputStyles,
  );

  const localSettings = await readJsonFile(localSettingsPath, {});

  return {
    metadata: {
      scannedAt: new Date().toISOString(),
      targetCwd: targetDir,
      claudeDir,
    },
    systemPrompt: await readTextFile(claudeConfig.systemPromptPath),
    toolsArray: await readJsonFile(claudeConfig.toolsPath, []),
    globalMemory: await readTextFile(path.join(claudeDir, "CLAUDE.md")),
    projectMemory: await readTextFile(path.join(targetDir, "CLAUDE.md")),
    settings: await readJsonFile(path.join(claudeDir, "settings.json"), {}),
    localSettings: await readTextFile(localSettingsPath),
    outputStyles: {
      user: await listDirEntries(path.join(claudeDir, "output-styles")),
      project: await listDirEntries(path.join(targetDir, ".claude", "output-styles")),
      activeName:
        typeof localSettings === "object" && localSettings !== null
          ? localSettings.outputStyle ?? null
          : null,
      all: outputStyles,
    },
    installedPlugins: await readJsonFile(
      path.join(claudeDir, "plugins", "installed_plugins.json"),
      {},
    ),
    agents: {
      user: await listDirEntries(path.join(claudeDir, "agents")),
      project: await listDirEntries(path.join(targetDir, ".claude", "agents")),
    },
    knownProjects: await loadKnownProjects(claudeDir),
  };
}

function parseArguments(argv) {
  const args = [...argv];
  let targetDir = process.cwd();
  let outputPath = "";

  while (args.length > 0) {
    const current = args.shift();
    if (!current) {
      continue;
    }

    if (current === "--output") {
      outputPath = args.shift() ?? "";
      continue;
    }

    targetDir = current;
  }

  return { targetDir: path.resolve(targetDir), outputPath };
}

const { targetDir, outputPath } = parseArguments(process.argv.slice(2));
const payload = await buildContext(targetDir);
const serialized = `${JSON.stringify(payload, null, 2)}\n`;

if (outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, serialized, "utf8");
} else {
  process.stdout.write(serialized);
}
