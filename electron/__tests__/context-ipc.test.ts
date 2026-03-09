import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all context modules
vi.mock("../context/context-hub.js", () => ({
  ensureContextHub: vi.fn(),
  readIndex: vi.fn(),
  createSkill: vi.fn(),
  createAgent: vi.fn(),
  getContextStatus: vi.fn(),
  listItems: vi.fn(),
  readItem: vi.fn(),
  writeItem: vi.fn(),
  deleteItem: vi.fn(),
  importItem: vi.fn(),
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
const mockListItems = vi.mocked(contextHub.listItems);
const mockReadItem = vi.mocked(contextHub.readItem);
const mockWriteItem = vi.mocked(contextHub.writeItem);
const mockDeleteItem = vi.mocked(contextHub.deleteItem);
const mockImportItem = vi.mocked(contextHub.importItem);

describe("context-ipc", () => {
  let handlers: Record<string, (...args: unknown[]) => unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    const raw = createContextHandlers();
    handlers = Object.fromEntries(raw);
  });

  it("registers all 11 expected handlers", () => {
    const keys = Object.keys(handlers);
    expect(keys).toContain("context:init");
    expect(keys).toContain("context:status");
    expect(keys).toContain("context:sync_out");
    expect(keys).toContain("context:sync_in");
    expect(keys).toContain("context:create_skill");
    expect(keys).toContain("context:create_agent");
    expect(keys).toContain("context:list_items");
    expect(keys).toContain("context:read_item");
    expect(keys).toContain("context:write_item");
    expect(keys).toContain("context:delete_item");
    expect(keys).toContain("context:import_item");
    expect(keys.length).toBe(11);
  });

  describe("context:init", () => {
    it("calls ensureContextHub without projectPath", async () => {
      mockEnsure.mockResolvedValue(undefined);
      await handlers["context:init"]({}, {});
      expect(mockEnsure).toHaveBeenCalledWith();
    });
  });

  describe("context:status", () => {
    it("returns context status", async () => {
      const status = {
        initialized: true,
        counts: { skill: 1, agent: 2, doc: 0, plan: 0 },
        lastUpdated: "2026-01-01T00:00:00Z",
      };
      mockStatus.mockResolvedValue(status);

      const result = await handlers["context:status"]({}, {});
      expect(result).toEqual(status);
      expect(mockStatus).toHaveBeenCalledWith();
    });
  });

  describe("context:sync_out", () => {
    it("calls syncOutbound with options", async () => {
      const summary = {
        timestamp: "2026-01-01T00:00:00Z",
        direction: "outbound" as const,
        results: [],
      };
      mockSyncOut.mockResolvedValue(summary);

      const result = await handlers["context:sync_out"](
        {},
        { strategy: "overwrite", toolIds: ["claude"] }
      );
      expect(result).toEqual(summary);
      expect(mockSyncOut).toHaveBeenCalledWith({
        strategy: "overwrite",
        toolIds: ["claude"],
      });
    });
  });

  describe("context:sync_in", () => {
    it("calls syncInbound with options", async () => {
      const summary = {
        timestamp: "2026-01-01T00:00:00Z",
        direction: "inbound" as const,
        results: [],
      };
      mockSyncIn.mockResolvedValue(summary);

      const result = await handlers["context:sync_in"](
        {},
        { strategy: "merge", toolIds: ["codex"] }
      );
      expect(result).toEqual(summary);
      expect(mockSyncIn).toHaveBeenCalledWith({
        strategy: "merge",
        toolIds: ["codex"],
      });
    });
  });

  describe("context:create_skill", () => {
    it("creates a skill and returns the file path", async () => {
      mockCreateSkill.mockResolvedValue("/home/user/.config/forja/context/skills/tdd/SKILL.md");

      const result = await handlers["context:create_skill"](
        {},
        { slug: "tdd", content: "---\nname: tdd\n---\n" }
      );
      expect(result).toBe("/home/user/.config/forja/context/skills/tdd/SKILL.md");
      expect(mockCreateSkill).toHaveBeenCalledWith("tdd", {
        content: "---\nname: tdd\n---\n",
        force: false,
      });
    });

    it("throws when slug is missing", async () => {
      await expect(
        handlers["context:create_skill"]({}, {})
      ).rejects.toThrow("slug is required");
    });
  });

  describe("context:create_agent", () => {
    it("creates an agent and returns the file path", async () => {
      mockCreateAgent.mockResolvedValue("/home/user/.config/forja/context/agents/code-reviewer.md");

      const result = await handlers["context:create_agent"](
        {},
        { slug: "code-reviewer", content: "---\nname: cr\n---\n" }
      );
      expect(result).toBe("/home/user/.config/forja/context/agents/code-reviewer.md");
      expect(mockCreateAgent).toHaveBeenCalledWith("code-reviewer", {
        content: "---\nname: cr\n---\n",
        force: false,
      });
    });

    it("throws when slug is missing", async () => {
      await expect(
        handlers["context:create_agent"]({}, {})
      ).rejects.toThrow("slug is required");
    });
  });

  describe("context:list_items", () => {
    it("returns items from index", async () => {
      const items = [
        { type: "skill", slug: "tdd", path: "skills/tdd/SKILL.md", fingerprint: "sha256:a", updatedAt: "2026-01-01T00:00:00Z" },
      ];
      mockListItems.mockResolvedValue(items as never);

      const result = await handlers["context:list_items"]({}, {});
      expect(result).toEqual(items);
      expect(mockListItems).toHaveBeenCalledWith(undefined);
    });

    it("filters by type", async () => {
      mockListItems.mockResolvedValue([]);

      await handlers["context:list_items"]({}, { type: "skill" });
      expect(mockListItems).toHaveBeenCalledWith("skill");
    });
  });

  describe("context:read_item", () => {
    it("reads file content", async () => {
      mockReadItem.mockResolvedValue("# TDD Skill\nContent");

      const result = await handlers["context:read_item"]({}, { type: "skill", slug: "tdd" });
      expect(result).toBe("# TDD Skill\nContent");
      expect(mockReadItem).toHaveBeenCalledWith("skill", "tdd");
    });

    it("throws when type or slug missing", async () => {
      await expect(
        handlers["context:read_item"]({}, { slug: "tdd" })
      ).rejects.toThrow("type and slug are required");
    });
  });

  describe("context:write_item", () => {
    it("creates/updates file", async () => {
      mockWriteItem.mockResolvedValue("/home/user/.config/forja/context/skills/tdd/SKILL.md");

      const result = await handlers["context:write_item"](
        {},
        { type: "skill", slug: "tdd", content: "# TDD" }
      );
      expect(result).toBe("/home/user/.config/forja/context/skills/tdd/SKILL.md");
      expect(mockWriteItem).toHaveBeenCalledWith("skill", "tdd", "# TDD");
    });

    it("throws when required args missing", async () => {
      await expect(
        handlers["context:write_item"]({}, { type: "skill" })
      ).rejects.toThrow("type, slug, and content are required");
    });
  });

  describe("context:delete_item", () => {
    it("removes file and index entry", async () => {
      mockDeleteItem.mockResolvedValue(undefined);

      await handlers["context:delete_item"]({}, { type: "skill", slug: "tdd" });
      expect(mockDeleteItem).toHaveBeenCalledWith("skill", "tdd");
    });

    it("throws when type or slug missing", async () => {
      await expect(
        handlers["context:delete_item"]({}, { slug: "tdd" })
      ).rejects.toThrow("type and slug are required");
    });
  });

  describe("context:import_item", () => {
    it("calls importItem with type and filePath", async () => {
      mockImportItem.mockResolvedValue("/path/to/result.md");

      const result = await handlers["context:import_item"]({}, {
        type: "doc",
        filePath: "/tmp/guide.md",
      });

      expect(mockImportItem).toHaveBeenCalledWith("doc", "/tmp/guide.md");
      expect(result).toBe("/path/to/result.md");
    });

    it("throws when type missing", async () => {
      await expect(
        handlers["context:import_item"]({}, { filePath: "/tmp/f.md" })
      ).rejects.toThrow("type and filePath are required");
    });

    it("throws when filePath missing", async () => {
      await expect(
        handlers["context:import_item"]({}, { type: "doc" })
      ).rejects.toThrow("type and filePath are required");
    });
  });
});
