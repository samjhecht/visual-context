import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../app/App";

const claudeFixture = JSON.stringify({
  metadata: { targetCwd: "/tmp/project" },
  systemPrompt: {
    exists: true,
    path: "/tmp/system_prompt.md",
    content: "Base prompt",
  },
  globalMemory: {
    exists: true,
    path: "/tmp/CLAUDE.md",
    content: "Follow project rules",
  },
  toolsArray: [{ name: "Read" }],
});

describe("App", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method === "HEAD") {
        return new Response(null, {
          status: url.includes("/samples/context-test.json") ? 200 : 404,
        });
      }

      if (url.includes("/samples/context-test.json")) {
        return new Response(claudeFixture, { status: 200 });
      }

      return new Response(null, { status: 404 });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the first available builtin source and toggles section visibility", async () => {
    render(<App />);

    await screen.findByText("How the startup context is composed");
    const sectionButton = screen.getByRole("button", { name: /Base System Prompt/i });
    expect(screen.getByText("Base prompt")).toBeInTheDocument();

    fireEvent.click(sectionButton);
    await waitFor(() => {
      expect(screen.queryByText("Base prompt")).not.toBeInTheDocument();
    });

    fireEvent.click(sectionButton);
    expect(await screen.findByText("Base prompt")).toBeInTheDocument();
  });
});
