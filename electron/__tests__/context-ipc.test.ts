import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all context modules
vi.mock("../context/context-hub.js", () => ({
  ensureContextHub: vi.fn(),
  readIndex: vi.fn(),
  createSkill: vi.fn(),
  createAgent: vi.fn(),
  getContextStatus: vi.fn(),
}));

vi.mock("../context/context-sync-out.js", () => ({
  syncOutbound: vi.fn(),
}));

vi.mock("../context/context-sync-in.js", () => ({
  syncInbound: vi.fn(),
}));

import * as contextHub from "../context/context-hub.js";
import * as syncOut from "../context/context-sync-out.js";
import * as syncIn from "../context/context-sync-in.js";
import { createContextHandlers } from "../context/context-ipc.js";

const mockEnsure = vi.mocked(contextHub.ensureContextHub);
const mockStatus = vi.mocked(contextHub.getContextStatus);
const mockCreateSkill = vi.mocked(contextHub.createSkill);
const mockCreateAgent = vi.mocked(contextHub.createAgent);
const mockSyncOut = vi.mocked(syncOut.syncOutbound);
const mockSyncIn = vi.mocked(syncIn.syncInbound);

describe("context-ipc", () => {
  let handlers: Record<string, (...args: unknown[]) => unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    const raw = createContextHandlers();
    handlers = Object.fromEntries(raw);
  });

  it("registers all 6 expected handlers", () => {
    const keys = Object.keys(handlers);
    expect(keys).toContain("context:init");
    expect(keys).toContain("context:status");
    expect(keys).toContain("context:sync_out");
    expect(keys).toContain("context:sync_in");
    expect(keys).toContain("context:create_skill");
    expect(keys).toContain("context:create_agent");
    expect(keys.length).toBe(6);
  });

  describe("context:init", () => {
    it("calls ensureContextHub with the project path", async () => {
      mockEnsure.mockResolvedValue(undefined);
      await handlers["context:init"]({}, { projectPath: "/project" });
      expect(mockEnsure).toHaveBeenCalledWith("/project");
    });

    it("throws when projectPath is missing", async () => {
      await expect(handlers["context:init"]({}, {})).rejects.toThrow("projectPath is required");
    });
  });

  describe("context:status", () => {
    it("returns context status for the project", async () => {
      const status = {
        initialized: true,
        counts: { skill: 1, agent: 2, doc: 0, plan: 0 },
        lastUpdated: "2026-01-01T00:00:00Z",
      };
      mockStatus.mockResolvedValue(status);

      const result = await handlers["context:status"]({}, { projectPath: "/project" });
      expect(result).toEqual(status);
      expect(mockStatus).toHaveBeenCalledWith("/project");
    });
  });

  describe("context:sync_out", () => {
    it("calls syncOutbound with project path and options", async () => {
      const summary = {
        timestamp: "2026-01-01T00:00:00Z",
        direction: "outbound" as const,
        results: [],
      };
      mockSyncOut.mockResolvedValue(summary);

      const result = await handlers["context:sync_out"](
        {},
        { projectPath: "/project", strategy: "overwrite", toolIds: ["claude"] }
      );
      expect(result).toEqual(summary);
      expect(mockSyncOut).toHaveBeenCalledWith("/project", {
        strategy: "overwrite",
        toolIds: ["claude"],
      });
    });
  });

  describe("context:sync_in", () => {
    it("calls syncInbound with project path and options", async () => {
      const summary = {
        timestamp: "2026-01-01T00:00:00Z",
        direction: "inbound" as const,
        results: [],
      };
      mockSyncIn.mockResolvedValue(summary);

      const result = await handlers["context:sync_in"](
        {},
        { projectPath: "/project", strategy: "merge", toolIds: ["codex"] }
      );
      expect(result).toEqual(summary);
      expect(mockSyncIn).toHaveBeenCalledWith("/project", {
        strategy: "merge",
        toolIds: ["codex"],
      });
    });
  });

  describe("context:create_skill", () => {
    it("creates a skill and returns the file path", async () => {
      mockCreateSkill.mockResolvedValue("/project/.forja/context/skills/tdd/SKILL.md");

      const result = await handlers["context:create_skill"](
        {},
        { projectPath: "/project", slug: "tdd", content: "---\nname: tdd\n---\n" }
      );
      expect(result).toBe("/project/.forja/context/skills/tdd/SKILL.md");
      expect(mockCreateSkill).toHaveBeenCalledWith("/project", "tdd", {
        content: "---\nname: tdd\n---\n",
        force: false,
      });
    });

    it("throws when slug is missing", async () => {
      await expect(
        handlers["context:create_skill"]({}, { projectPath: "/project" })
      ).rejects.toThrow("slug is required");
    });
  });

  describe("context:create_agent", () => {
    it("creates an agent and returns the file path", async () => {
      mockCreateAgent.mockResolvedValue("/project/.forja/context/agents/code-reviewer.md");

      const result = await handlers["context:create_agent"](
        {},
        { projectPath: "/project", slug: "code-reviewer", content: "---\nname: cr\n---\n" }
      );
      expect(result).toBe("/project/.forja/context/agents/code-reviewer.md");
      expect(mockCreateAgent).toHaveBeenCalledWith("/project", "code-reviewer", {
        content: "---\nname: cr\n---\n",
        force: false,
      });
    });

    it("throws when slug is missing", async () => {
      await expect(
        handlers["context:create_agent"]({}, { projectPath: "/project" })
      ).rejects.toThrow("slug is required");
    });
  });
});
