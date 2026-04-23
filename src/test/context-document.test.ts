import { describe, expect, it } from "vitest";
import { ContextDocument } from "../core";

describe("ContextDocument", () => {
  it("normalizes Claude scans and supports output-style recompilation", () => {
    const document = ContextDocument.fromData(
      {
        metadata: { targetCwd: "/tmp/project" },
        systemPrompt: {
          exists: true,
          path: "/tmp/system_prompt.md",
          content: "Base system prompt",
        },
        globalMemory: {
          exists: true,
          path: "/tmp/global.md",
          content: "Use @TESTING.md.",
        },
        outputStyles: {
          activeName: "Concise",
          all: {
            Concise: {
              id: "Concise",
              name: "Concise",
              path: "/tmp/concise.md",
              source: "user",
              content: "---\nname: Concise\nkeep-coding-instructions: true\n---\nBe direct.",
            },
          },
        },
        toolsArray: [{ name: "Read" }, { name: "Edit" }],
      },
      "scan.json",
    );

    expect(document.mode).toBe("claude");
    expect(document.model.assembly.map((item) => item.title)).toContain("Concise");
    expect(document.model.sections[1]?.title).toBe("Output Style");
    expect(document.model.sections[2]?.fileRefs).toEqual(["TESTING.md"]);

    const updated = document.setOutputStyle("");
    expect(updated.getActiveOutputStyleName()).toBeNull();
    expect(updated.model.assembly.map((item) => item.title)).not.toContain("Concise");
  });

  it("normalizes Codex markdown and classifies trigger types", () => {
    const markdown = `# Codex Startup\n\n## Live injected system message\n\n\`\`\`text\nSystem block\n\`\`\`\n\n## Developer instructions\n\n\`\`\`text\nDeveloper rules\n\`\`\`\n\n## Tool definitions\n\n\`\`\`ts\ntype run = (_: { foo: string }) => any;\n\`\`\`\n\n## Skills instructions\n\nSkill triggers here`;

    const document = ContextDocument.fromText(markdown, "codex-startup.md");

    expect(document.mode).toBe("codex");
    expect(document.model.sections.map((section) => section.triggerType)).toEqual([
      "system-layer",
      "developer-layer",
      "tool-definition",
      "skill-trigger",
    ]);
    expect(document.model.overview.stats[1]?.value).toBe(4);
  });

  it("falls back to a generic raw payload for unknown JSON", () => {
    const document = ContextDocument.fromData({ foo: "bar" }, "raw.json");
    expect(document.mode).toBe("generic");
    expect(document.model.sections[0]?.title).toBe("Raw Payload");
  });
});
