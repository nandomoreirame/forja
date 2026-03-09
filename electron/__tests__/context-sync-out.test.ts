import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fs/promises before any imports
vi.mock("fs/promises", () => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
  readdir: vi.fn(),
  appendFile: vi.fn(),
  cp: vi.fn(),
}));

// Mock os module
vi.mock("os", () => ({
  default: { homedir: vi.fn(() => "/home/user") },
  homedir: vi.fn(() => "/home/user"),
}));

import * as fs from "fs/promises";

const mockMkdir = vi.mocked(fs.mkdir);
const mockReadFile = vi.mocked(fs.readFile);
const mockWriteFile = vi.mocked(fs.writeFile);
const mockAccess = vi.mocked(fs.access);
const mockAppendFile = vi.mocked(fs.appendFile);
const mockCp = vi.mocked(fs.cp);

const HOME = "/home/user";
const HUB_ROOT = `${HOME}/.config/forja/context`;

function makeIndex(items: Array<{ type: string; slug: string; path: string }>) {
  return JSON.stringify({
    version: 1,
    items: items.map((i) => ({
      ...i,
      fingerprint: "sha256:abc",
      updatedAt: "2026-01-01T00:00:00Z",
    })),
    updatedAt: "2026-01-01T00:00:00Z",
  });
}

describe("context-sync-out", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    // Default mocks — no side effects unless overridden
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockAppendFile.mockResolvedValue(undefined);
    mockCp.mockResolvedValue(undefined);
    // Default: target file does NOT exist
    mockAccess.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
  });

  describe("syncOutbound", () => {
    it("exports agents from hub to claude config dir", async () => {
      // Hub index has one agent
      mockReadFile.mockResolvedValue(
        makeIndex([{ type: "agent", slug: "code-reviewer", path: "agents/code-reviewer.md" }])
      );
      // Agent source file content
      mockReadFile.mockResolvedValueOnce(
        makeIndex([{ type: "agent", slug: "code-reviewer", path: "agents/code-reviewer.md" }])
      );
      mockReadFile.mockResolvedValue("---\nname: code-reviewer\n---\n# Code Reviewer\n");

      const { syncOutbound } = await import("../context/context-sync-out.js");
      const summary = await syncOutbound({ toolIds: ["claude"], components: ["agents"] });

      // Should have at least one result for claude agents
      const claudeResult = summary.results.find(
        (r) => r.tool === "claude" && r.component === "agents"
      );
      expect(claudeResult).toBeDefined();
      expect(claudeResult?.action).toBe("created");
      expect(claudeResult?.path).toContain(`${HOME}/.claude/agents/code-reviewer.md`);
    });

    it("exports skills from hub to claude and codex config dirs", async () => {
      mockReadFile.mockResolvedValue(
        makeIndex([{ type: "skill", slug: "tdd", path: "skills/tdd/SKILL.md" }])
      );

      const { syncOutbound } = await import("../context/context-sync-out.js");
      const summary = await syncOutbound({
        toolIds: ["claude", "codex"],
        components: ["skills"],
      });

      const claudeSkill = summary.results.find(
        (r) => r.tool === "claude" && r.component === "skills"
      );
      const codexSkill = summary.results.find(
        (r) => r.tool === "codex" && r.component === "skills"
      );

      expect(claudeSkill).toBeDefined();
      expect(claudeSkill?.action).toBe("created");
      expect(claudeSkill?.path).toContain(`${HOME}/.claude/skills/tdd`);

      expect(codexSkill).toBeDefined();
      expect(codexSkill?.action).toBe("created");
      expect(codexSkill?.path).toContain(`${HOME}/.codex/skills/tdd`);
    });

    it("skips export when target file already exists (default strategy=skip)", async () => {
      mockReadFile.mockResolvedValue(
        makeIndex([{ type: "agent", slug: "code-reviewer", path: "agents/code-reviewer.md" }])
      );
      // Target file EXISTS
      mockAccess.mockResolvedValue(undefined);

      const { syncOutbound } = await import("../context/context-sync-out.js");
      const summary = await syncOutbound({
        toolIds: ["claude"],
        components: ["agents"],
        // strategy defaults to "skip"
      });

      const result = summary.results.find((r) => r.tool === "claude" && r.component === "agents");
      expect(result).toBeDefined();
      expect(result?.action).toBe("skipped");
    });

    it("overwrites when strategy=overwrite", async () => {
      mockReadFile.mockResolvedValue(
        makeIndex([{ type: "agent", slug: "code-reviewer", path: "agents/code-reviewer.md" }])
      );
      mockReadFile.mockResolvedValueOnce(
        makeIndex([{ type: "agent", slug: "code-reviewer", path: "agents/code-reviewer.md" }])
      );
      mockReadFile.mockResolvedValue("---\nname: code-reviewer\n---\n");

      // Target file EXISTS but strategy is overwrite
      mockAccess.mockResolvedValue(undefined);

      const { syncOutbound } = await import("../context/context-sync-out.js");
      const summary = await syncOutbound({
        toolIds: ["claude"],
        components: ["agents"],
        strategy: "overwrite",
      });

      const result = summary.results.find((r) => r.tool === "claude" && r.component === "agents");
      expect(result).toBeDefined();
      expect(result?.action).toBe("overwritten");
    });

    it("only exports to tools that support the component type", async () => {
      mockReadFile.mockResolvedValue(
        makeIndex([{ type: "agent", slug: "code-reviewer", path: "agents/code-reviewer.md" }])
      );

      const { syncOutbound } = await import("../context/context-sync-out.js");
      const summary = await syncOutbound({
        // Export agents to all tools — codex and windsurf don't support agents
        toolIds: ["claude", "codex", "windsurf"],
        components: ["agents"],
      });

      const toolsWithResults = summary.results.map((r) => r.tool);
      // codex does NOT support agents
      expect(toolsWithResults).not.toContain("codex");
      // windsurf does NOT support agents
      expect(toolsWithResults).not.toContain("windsurf");
      // claude DOES support agents
      expect(toolsWithResults).toContain("claude");
    });

    it("exports docs differently based on docsMode — single-file for claude", async () => {
      mockReadFile.mockResolvedValue(
        makeIndex([{ type: "doc", slug: "readme", path: "docs/readme.md" }])
      );
      // Content of the doc file
      mockReadFile.mockResolvedValueOnce(
        makeIndex([{ type: "doc", slug: "readme", path: "docs/readme.md" }])
      );
      mockReadFile.mockResolvedValue("# README\nThis is the readme.\n");

      const { syncOutbound } = await import("../context/context-sync-out.js");
      const summary = await syncOutbound({
        toolIds: ["claude"],
        components: ["docs"],
      });

      // For claude (single-file mode), result path should include CLAUDE.md
      const docResult = summary.results.find((r) => r.tool === "claude" && r.component === "docs");
      expect(docResult).toBeDefined();
      expect(docResult?.path).toContain("CLAUDE.md");
    });

    it("exports docs to cursor as individual directory files", async () => {
      mockReadFile.mockResolvedValue(
        makeIndex([{ type: "doc", slug: "readme", path: "docs/readme.md" }])
      );
      mockReadFile.mockResolvedValueOnce(
        makeIndex([{ type: "doc", slug: "readme", path: "docs/readme.md" }])
      );
      mockReadFile.mockResolvedValue("# README\nThis is the readme.\n");

      const { syncOutbound } = await import("../context/context-sync-out.js");
      const summary = await syncOutbound({
        toolIds: ["cursor-agent"],
        components: ["docs"],
      });

      // For cursor-agent (directory mode), result path should be inside .cursor/rules/
      const docResult = summary.results.find(
        (r) => r.tool === "cursor-agent" && r.component === "docs"
      );
      expect(docResult).toBeDefined();
      expect(docResult?.path).toContain(".cursor/rules");
    });

    it("appends to sync log after sync", async () => {
      mockReadFile.mockResolvedValue(
        makeIndex([{ type: "agent", slug: "code-reviewer", path: "agents/code-reviewer.md" }])
      );

      const { syncOutbound } = await import("../context/context-sync-out.js");
      await syncOutbound({ toolIds: ["claude"], components: ["agents"] });

      // Append file should have been called with the sync log path
      const appendCalls = mockAppendFile.mock.calls;
      const logCall = appendCalls.find((c) => (c[0] as string).includes(".sync-log.jsonl"));
      expect(logCall).toBeDefined();

      // Content should be a valid JSON line
      const logLine = logCall![1] as string;
      const parsed = JSON.parse(logLine.trim());
      expect(parsed.direction).toBe("outbound");
      expect(parsed.timestamp).toBeDefined();
      expect(Array.isArray(parsed.results)).toBe(true);
    });

    it("returns SyncSummary with all results", async () => {
      mockReadFile.mockResolvedValue(
        makeIndex([
          { type: "agent", slug: "code-reviewer", path: "agents/code-reviewer.md" },
          { type: "skill", slug: "tdd", path: "skills/tdd/SKILL.md" },
        ])
      );

      const { syncOutbound } = await import("../context/context-sync-out.js");
      const summary = await syncOutbound({
        toolIds: ["claude"],
        components: ["agents", "skills"],
      });

      expect(summary).toBeDefined();
      expect(summary.direction).toBe("outbound");
      expect(summary.timestamp).toBeDefined();
      expect(Array.isArray(summary.results)).toBe(true);
      expect(summary.results.length).toBeGreaterThan(0);
    });

    it("limits export to specific tools when toolIds parameter provided", async () => {
      mockReadFile.mockResolvedValue(
        makeIndex([{ type: "agent", slug: "code-reviewer", path: "agents/code-reviewer.md" }])
      );

      const { syncOutbound } = await import("../context/context-sync-out.js");
      const summary = await syncOutbound({
        toolIds: ["claude"],
        components: ["agents"],
      });

      const toolsWithResults = [...new Set(summary.results.map((r) => r.tool))];
      // Only claude should appear — not gemini, cursor-agent, etc.
      expect(toolsWithResults).toEqual(["claude"]);
    });

    it("limits export to specific components when components parameter provided", async () => {
      mockReadFile.mockResolvedValue(
        makeIndex([
          { type: "agent", slug: "code-reviewer", path: "agents/code-reviewer.md" },
          { type: "skill", slug: "tdd", path: "skills/tdd/SKILL.md" },
          { type: "doc", slug: "readme", path: "docs/readme.md" },
        ])
      );

      const { syncOutbound } = await import("../context/context-sync-out.js");
      const summary = await syncOutbound({
        toolIds: ["claude"],
        components: ["agents"], // only agents
      });

      const componentTypes = [...new Set(summary.results.map((r) => r.component))];
      // Only agents — no skills or docs
      expect(componentTypes).toEqual(["agents"]);
    });
  });
});
