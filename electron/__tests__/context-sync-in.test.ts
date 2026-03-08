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
  stat: vi.fn(),
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
const mockReaddir = vi.mocked(fs.readdir);
const mockAppendFile = vi.mocked(fs.appendFile);
const mockStat = vi.mocked(fs.stat);

const PROJECT_PATH = "/home/user/project";
const HOME = "/home/user";

function makeIndexJson(items: Array<{ type: string; slug: string; path: string }>) {
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

function makeStat(isDir: boolean) {
  return { isDirectory: () => isDir, isFile: () => !isDir } as unknown as ReturnType<typeof fs.stat>;
}

/**
 * Helper: sets up mockReadFile to return the correct content based on path.
 * The index file always returns the given indexJson, other files return fileContent.
 */
function setupReadFile(indexJson: string, fileContent: string) {
  mockReadFile.mockImplementation(async (p) => {
    const s = String(p);
    if (s.includes(".index.json")) return indexJson as unknown as Buffer;
    return fileContent as unknown as Buffer;
  });
}

describe("context-sync-in", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockAppendFile.mockResolvedValue(undefined);
    // Default: files do NOT exist
    mockAccess.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
    mockReaddir.mockResolvedValue([] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
  });

  describe("syncInbound", () => {
    it("imports agents from claude config dir into hub", async () => {
      const indexJson = makeIndexJson([]);
      setupReadFile(indexJson, "---\nname: code-reviewer\n---\n# Code Reviewer\n");

      mockAccess.mockImplementation(async (p) => {
        const s = String(p);
        if (s === `${HOME}/.claude/agents`) return undefined;
        if (s.includes("code-reviewer.md")) return undefined;
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      });

      mockReaddir.mockImplementation(async (p) => {
        const s = String(p);
        if (s === `${HOME}/.claude/agents`) {
          return ["code-reviewer.md"] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
        }
        return [] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
      });

      mockStat.mockResolvedValue(makeStat(false) as Awaited<ReturnType<typeof fs.stat>>);

      const { syncInbound } = await import("../context/context-sync-in.js");
      const summary = await syncInbound(PROJECT_PATH, {
        toolIds: ["claude"],
        components: ["agents"],
      });

      const result = summary.results.find(
        (r) => r.tool === "claude" && r.component === "agents"
      );
      expect(result).toBeDefined();
      expect(result?.action).toBe("created");
      expect(result?.path).toContain(".forja/context/agents/code-reviewer.md");
    });

    it("imports skills from codex config dir into hub", async () => {
      const indexJson = makeIndexJson([]);
      setupReadFile(indexJson, "---\nname: tdd\n---\n");

      mockAccess.mockImplementation(async (p) => {
        const s = String(p);
        if (s === `${HOME}/.codex/skills`) return undefined;
        if (s.includes("tdd")) return undefined;
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      });

      mockReaddir.mockImplementation(async (p) => {
        const s = String(p);
        if (s === `${HOME}/.codex/skills`) {
          return ["tdd"] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
        }
        return [] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
      });

      mockStat.mockImplementation(async () => {
        return makeStat(true) as Awaited<ReturnType<typeof fs.stat>>;
      });

      const { syncInbound } = await import("../context/context-sync-in.js");
      const summary = await syncInbound(PROJECT_PATH, {
        toolIds: ["codex"],
        components: ["skills"],
      });

      const result = summary.results.find(
        (r) => r.tool === "codex" && r.component === "skills"
      );
      expect(result).toBeDefined();
      expect(result?.action).toBe("created");
      expect(result?.path).toContain(".forja/context/skills/tdd");
    });

    it("skips import when hub already has item with default strategy=skip", async () => {
      const indexJson = makeIndexJson([
        { type: "agent", slug: "code-reviewer", path: "agents/code-reviewer.md" },
      ]);
      setupReadFile(indexJson, "---\nname: code-reviewer\n---\n");

      mockAccess.mockImplementation(async (p) => {
        const s = String(p);
        if (s === `${HOME}/.claude/agents`) return undefined;
        if (s.includes("code-reviewer.md")) return undefined;
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      });

      mockReaddir.mockImplementation(async (p) => {
        const s = String(p);
        if (s === `${HOME}/.claude/agents`) {
          return ["code-reviewer.md"] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
        }
        return [] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
      });

      mockStat.mockResolvedValue(makeStat(false) as Awaited<ReturnType<typeof fs.stat>>);

      const { syncInbound } = await import("../context/context-sync-in.js");
      const summary = await syncInbound(PROJECT_PATH, {
        toolIds: ["claude"],
        components: ["agents"],
      });

      const result = summary.results.find(
        (r) => r.tool === "claude" && r.component === "agents"
      );
      expect(result).toBeDefined();
      expect(result?.action).toBe("skipped");
    });

    it("overwrites existing hub item when strategy=overwrite", async () => {
      const indexJson = makeIndexJson([
        { type: "agent", slug: "code-reviewer", path: "agents/code-reviewer.md" },
      ]);
      setupReadFile(indexJson, "---\nname: code-reviewer\n---\nUpdated content\n");

      mockAccess.mockImplementation(async (p) => {
        const s = String(p);
        if (s === `${HOME}/.claude/agents`) return undefined;
        if (s.includes("code-reviewer")) return undefined;
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      });

      mockReaddir.mockImplementation(async (p) => {
        const s = String(p);
        if (s === `${HOME}/.claude/agents`) {
          return ["code-reviewer.md"] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
        }
        return [] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
      });

      mockStat.mockResolvedValue(makeStat(false) as Awaited<ReturnType<typeof fs.stat>>);

      const { syncInbound } = await import("../context/context-sync-in.js");
      const summary = await syncInbound(PROJECT_PATH, {
        toolIds: ["claude"],
        components: ["agents"],
        strategy: "overwrite",
      });

      const result = summary.results.find(
        (r) => r.tool === "claude" && r.component === "agents"
      );
      expect(result).toBeDefined();
      expect(result?.action).toBe("overwritten");
    });

    it("renames existing hub item when strategy=rename", async () => {
      const indexJson = makeIndexJson([
        { type: "agent", slug: "code-reviewer", path: "agents/code-reviewer.md" },
      ]);
      setupReadFile(indexJson, "---\nname: code-reviewer\n---\nNew\n");

      mockAccess.mockImplementation(async (p) => {
        const s = String(p);
        if (s === `${HOME}/.claude/agents`) return undefined;
        if (s.includes("code-reviewer")) return undefined;
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      });

      mockReaddir.mockImplementation(async (p) => {
        const s = String(p);
        if (s === `${HOME}/.claude/agents`) {
          return ["code-reviewer.md"] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
        }
        return [] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
      });

      mockStat.mockResolvedValue(makeStat(false) as Awaited<ReturnType<typeof fs.stat>>);

      const { syncInbound } = await import("../context/context-sync-in.js");
      const summary = await syncInbound(PROJECT_PATH, {
        toolIds: ["claude"],
        components: ["agents"],
        strategy: "rename",
      });

      const result = summary.results.find(
        (r) => r.tool === "claude" && r.component === "agents"
      );
      expect(result).toBeDefined();
      expect(result?.action).toBe("renamed");
    });

    it("only imports from tools that support the component type", async () => {
      const indexJson = makeIndexJson([]);
      setupReadFile(indexJson, "");

      const { syncInbound } = await import("../context/context-sync-in.js");
      const summary = await syncInbound(PROJECT_PATH, {
        toolIds: ["windsurf", "aider"],
        components: ["agents"],
      });

      // windsurf and aider don't support agents
      expect(summary.results.length).toBe(0);
    });

    it("appends to sync log after import", async () => {
      const indexJson = makeIndexJson([]);
      setupReadFile(indexJson, "");

      mockAccess.mockImplementation(async (p) => {
        const s = String(p);
        if (s === `${HOME}/.claude/agents`) return undefined;
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      });
      mockReaddir.mockResolvedValue([] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      const { syncInbound } = await import("../context/context-sync-in.js");
      await syncInbound(PROJECT_PATH, { toolIds: ["claude"], components: ["agents"] });

      const appendCalls = mockAppendFile.mock.calls;
      const logCall = appendCalls.find((c) => (c[0] as string).includes(".sync-log.jsonl"));
      expect(logCall).toBeDefined();

      const parsed = JSON.parse((logCall![1] as string).trim());
      expect(parsed.direction).toBe("inbound");
      expect(parsed.timestamp).toBeDefined();
    });

    it("returns SyncSummary with direction inbound", async () => {
      const indexJson = makeIndexJson([]);
      setupReadFile(indexJson, "");

      mockReaddir.mockResolvedValue([] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      const { syncInbound } = await import("../context/context-sync-in.js");
      const summary = await syncInbound(PROJECT_PATH, {
        toolIds: ["claude"],
        components: ["agents"],
      });

      expect(summary.direction).toBe("inbound");
      expect(summary.timestamp).toBeDefined();
      expect(Array.isArray(summary.results)).toBe(true);
    });

    it("imports docs from single-file tool (claude CLAUDE.md)", async () => {
      const indexJson = makeIndexJson([]);
      setupReadFile(indexJson, "# Claude Instructions\nSome instructions.\n");

      mockAccess.mockImplementation(async (p) => {
        const s = String(p);
        if (s === `${HOME}/.claude`) return undefined;
        if (s.includes("CLAUDE.md")) return undefined;
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      });

      mockStat.mockResolvedValue(makeStat(false) as Awaited<ReturnType<typeof fs.stat>>);

      const { syncInbound } = await import("../context/context-sync-in.js");
      const summary = await syncInbound(PROJECT_PATH, {
        toolIds: ["claude"],
        components: ["docs"],
      });

      const result = summary.results.find(
        (r) => r.tool === "claude" && r.component === "docs"
      );
      expect(result).toBeDefined();
      expect(result?.action).toBe("created");
    });

    it("imports docs from directory-mode tool (cursor)", async () => {
      const indexJson = makeIndexJson([]);
      setupReadFile(indexJson, "# My Rule\nRule content.\n");

      mockAccess.mockImplementation(async (p) => {
        const s = String(p);
        if (s === `${HOME}/.cursor/rules`) return undefined;
        if (s.includes("my-rule.md")) return undefined;
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      });

      mockReaddir.mockImplementation(async (p) => {
        const s = String(p);
        if (s === `${HOME}/.cursor/rules`) {
          return ["my-rule.md"] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
        }
        return [] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
      });

      mockStat.mockResolvedValue(makeStat(false) as Awaited<ReturnType<typeof fs.stat>>);

      const { syncInbound } = await import("../context/context-sync-in.js");
      const summary = await syncInbound(PROJECT_PATH, {
        toolIds: ["cursor-agent"],
        components: ["docs"],
      });

      const result = summary.results.find(
        (r) => r.tool === "cursor-agent" && r.component === "docs"
      );
      expect(result).toBeDefined();
      expect(result?.action).toBe("created");
    });
  });
});
