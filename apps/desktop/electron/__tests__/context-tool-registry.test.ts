import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";

// Mock os module to control homedir
vi.mock("os", () => ({
  homedir: vi.fn(() => "/home/user"),
}));

describe("context/tool-registry", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("getToolById", () => {
    it("returns the full ToolDefinition for Claude Code", async () => {
      const { getToolById } = await import("../context/tool-registry.js");
      const tool = getToolById("claude");
      expect(tool).toBeDefined();
      expect(tool?.id).toBe("claude");
      expect(tool?.displayName).toBe("Claude Code");
      expect(tool?.capabilities.docs).toBe(true);
      expect(tool?.capabilities.agents).toBe(true);
      expect(tool?.capabilities.skills).toBe(true);
      expect(tool?.paths.docs).toBe(".claude");
      expect(tool?.paths.agents).toBe(".claude/agents");
      expect(tool?.paths.skills).toBe(".claude/skills");
      expect(tool?.docsMode).toBe("single-file");
      expect(tool?.docsFilename).toBe("CLAUDE.md");
    });

    it("returns the full ToolDefinition for Codex", async () => {
      const { getToolById } = await import("../context/tool-registry.js");
      const tool = getToolById("codex");
      expect(tool).toBeDefined();
      expect(tool?.id).toBe("codex");
      expect(tool?.displayName).toBe("Codex CLI");
      expect(tool?.capabilities.docs).toBe(true);
      expect(tool?.capabilities.agents).toBe(false);
      expect(tool?.capabilities.skills).toBe(true);
      expect(tool?.paths.docs).toBe(".codex/instructions");
      expect(tool?.paths.skills).toBe(".codex/skills");
      expect(tool?.docsMode).toBe("directory");
    });

    it("returns the full ToolDefinition for Gemini", async () => {
      const { getToolById } = await import("../context/tool-registry.js");
      const tool = getToolById("gemini");
      expect(tool).toBeDefined();
      expect(tool?.id).toBe("gemini");
      expect(tool?.displayName).toBe("Gemini CLI");
      expect(tool?.capabilities.docs).toBe(false);
      expect(tool?.capabilities.agents).toBe(true);
      expect(tool?.capabilities.skills).toBe(true);
      expect(tool?.paths.agents).toBe(".gemini/agents");
      expect(tool?.paths.skills).toBe(".gemini/skills");
    });

    it("returns undefined for unknown tool id", async () => {
      const { getToolById } = await import("../context/tool-registry.js");
      const tool = getToolById("unknown");
      expect(tool).toBeUndefined();
    });
  });

  describe("getToolsWithCapability", () => {
    it("returns tools that support agents (claude, gemini, cursor-agent, gh-copilot)", async () => {
      const { getToolsWithCapability } = await import("../context/tool-registry.js");
      const tools = getToolsWithCapability("agents");
      const ids = tools.map((t) => t.id);
      expect(ids).toContain("claude");
      expect(ids).toContain("gemini");
      expect(ids).toContain("cursor-agent");
      expect(ids).toContain("gh-copilot");
      // codex, windsurf, aider should NOT support agents
      expect(ids).not.toContain("codex");
      expect(ids).not.toContain("windsurf");
      expect(ids).not.toContain("aider");
    });

    it("returns tools that support skills (claude, codex, gemini)", async () => {
      const { getToolsWithCapability } = await import("../context/tool-registry.js");
      const tools = getToolsWithCapability("skills");
      const ids = tools.map((t) => t.id);
      expect(ids).toContain("claude");
      expect(ids).toContain("codex");
      expect(ids).toContain("gemini");
      // cursor-agent, gh-copilot, windsurf, aider should NOT support skills
      expect(ids).not.toContain("cursor-agent");
      expect(ids).not.toContain("gh-copilot");
      expect(ids).not.toContain("windsurf");
      expect(ids).not.toContain("aider");
    });

    it("returns tools that support docs/rules", async () => {
      const { getToolsWithCapability } = await import("../context/tool-registry.js");
      const tools = getToolsWithCapability("docs");
      const ids = tools.map((t) => t.id);
      expect(ids).toContain("claude");
      expect(ids).toContain("codex");
      expect(ids).toContain("cursor-agent");
      expect(ids).toContain("gh-copilot");
      expect(ids).toContain("windsurf");
      expect(ids).toContain("aider");
      // gemini does NOT support docs
      expect(ids).not.toContain("gemini");
    });
  });

  describe("resolveExportTarget", () => {
    it("resolves claude + agents to ~/.claude/agents", async () => {
      const { resolveExportTarget } = await import("../context/tool-registry.js");
      const result = resolveExportTarget("claude", "agents", "/home/user");
      expect(result).toBe(path.join("/home/user", ".claude/agents"));
    });

    it("resolves claude + skills to ~/.claude/skills", async () => {
      const { resolveExportTarget } = await import("../context/tool-registry.js");
      const result = resolveExportTarget("claude", "skills", "/home/user");
      expect(result).toBe(path.join("/home/user", ".claude/skills"));
    });

    it("returns null for codex + agents (codex doesn't support agents)", async () => {
      const { resolveExportTarget } = await import("../context/tool-registry.js");
      const result = resolveExportTarget("codex", "agents", "/home/user");
      expect(result).toBeNull();
    });

    it("resolves gemini + skills to ~/.gemini/skills", async () => {
      const { resolveExportTarget } = await import("../context/tool-registry.js");
      const result = resolveExportTarget("gemini", "skills", "/home/user");
      expect(result).toBe(path.join("/home/user", ".gemini/skills"));
    });

    it("resolves codex + docs to ~/.codex/instructions", async () => {
      const { resolveExportTarget } = await import("../context/tool-registry.js");
      const result = resolveExportTarget("codex", "docs", "/home/user");
      expect(result).toBe(path.join("/home/user", ".codex/instructions"));
    });

    it("returns null for plans component (no tool supports plans externally)", async () => {
      const { resolveExportTarget } = await import("../context/tool-registry.js");
      const result = resolveExportTarget("claude", "plans", "/home/user");
      expect(result).toBeNull();
    });

    it("returns null for unknown tool id", async () => {
      const { resolveExportTarget } = await import("../context/tool-registry.js");
      const result = resolveExportTarget("unknown-tool", "docs", "/home/user");
      expect(result).toBeNull();
    });
  });
});
