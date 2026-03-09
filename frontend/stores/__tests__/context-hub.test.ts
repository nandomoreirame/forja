import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@/lib/ipc";
import { useContextHubStore } from "../context-hub";

const mockInvoke = vi.mocked(invoke);

describe("useContextHubStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useContextHubStore.setState({
      status: null,
      syncSummary: null,
      items: [],
      currentItem: null,
      loading: false,
      error: null,
    });
  });

  describe("initHub", () => {
    it("calls context:init IPC without projectPath", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await useContextHubStore.getState().initHub();

      expect(mockInvoke).toHaveBeenCalledWith("context:init", {});
    });

    it("sets loading state during init", async () => {
      let resolvePromise: () => void;
      const pending = new Promise<void>((r) => { resolvePromise = r; });
      mockInvoke.mockReturnValue(pending);

      const promise = useContextHubStore.getState().initHub();
      expect(useContextHubStore.getState().loading).toBe(true);

      resolvePromise!();
      await promise;
      expect(useContextHubStore.getState().loading).toBe(false);
    });

    it("sets error on failure", async () => {
      mockInvoke.mockRejectedValue(new Error("init failed"));

      await useContextHubStore.getState().initHub();

      expect(useContextHubStore.getState().error).toBe("init failed");
      expect(useContextHubStore.getState().loading).toBe(false);
    });
  });

  describe("loadStatus", () => {
    it("fetches and stores context status", async () => {
      const status = {
        initialized: true,
        counts: { skill: 2, agent: 1, doc: 0, plan: 0 },
        lastUpdated: "2026-01-01T00:00:00Z",
      };
      mockInvoke.mockResolvedValue(status);

      await useContextHubStore.getState().loadStatus();

      expect(mockInvoke).toHaveBeenCalledWith("context:status", {});
      expect(useContextHubStore.getState().status).toEqual(status);
    });
  });

  describe("syncOut", () => {
    it("calls context:sync_out and stores summary", async () => {
      const summary = {
        timestamp: "2026-01-01T00:00:00Z",
        direction: "outbound",
        results: [{ tool: "claude", component: "agents", action: "created", path: "/p" }],
      };
      mockInvoke.mockResolvedValue(summary);

      await useContextHubStore.getState().syncOut();

      expect(mockInvoke).toHaveBeenCalledWith("context:sync_out", {});
      expect(useContextHubStore.getState().syncSummary).toEqual(summary);
    });

    it("passes strategy and toolIds options", async () => {
      mockInvoke.mockResolvedValue({ timestamp: "", direction: "outbound", results: [] });

      await useContextHubStore.getState().syncOut({
        strategy: "overwrite",
        toolIds: ["claude"],
      });

      expect(mockInvoke).toHaveBeenCalledWith("context:sync_out", {
        strategy: "overwrite",
        toolIds: ["claude"],
      });
    });
  });

  describe("syncIn", () => {
    it("calls context:sync_in and stores summary", async () => {
      const summary = {
        timestamp: "2026-01-01T00:00:00Z",
        direction: "inbound",
        results: [],
      };
      mockInvoke.mockResolvedValue(summary);

      await useContextHubStore.getState().syncIn();

      expect(mockInvoke).toHaveBeenCalledWith("context:sync_in", {});
      expect(useContextHubStore.getState().syncSummary).toEqual(summary);
    });
  });

  describe("createSkill", () => {
    it("calls context:create_skill and returns path", async () => {
      mockInvoke.mockResolvedValue("/home/user/.config/forja/context/skills/tdd/SKILL.md");

      const result = await useContextHubStore.getState().createSkill("tdd");

      expect(mockInvoke).toHaveBeenCalledWith("context:create_skill", {
        slug: "tdd",
      });
      expect(result).toBe("/home/user/.config/forja/context/skills/tdd/SKILL.md");
    });

    it("passes content option when provided", async () => {
      mockInvoke.mockResolvedValue("/home/user/.config/forja/context/skills/tdd/SKILL.md");

      await useContextHubStore.getState().createSkill("tdd", {
        content: "---\nname: tdd\n---\n",
      });

      expect(mockInvoke).toHaveBeenCalledWith("context:create_skill", {
        slug: "tdd",
        content: "---\nname: tdd\n---\n",
      });
    });
  });

  describe("createAgent", () => {
    it("calls context:create_agent and returns path", async () => {
      mockInvoke.mockResolvedValue("/home/user/.config/forja/context/agents/code-reviewer.md");

      const result = await useContextHubStore.getState().createAgent("code-reviewer");

      expect(mockInvoke).toHaveBeenCalledWith("context:create_agent", {
        slug: "code-reviewer",
      });
      expect(result).toBe("/home/user/.config/forja/context/agents/code-reviewer.md");
    });
  });

  describe("listItems", () => {
    it("fetches all items and stores in state", async () => {
      const items = [
        { type: "skill", slug: "tdd", path: "/p/skills/tdd/SKILL.md", fingerprint: "abc", lastSyncAt: null },
        { type: "agent", slug: "reviewer", path: "/p/agents/reviewer.md", fingerprint: "def", lastSyncAt: null },
      ];
      mockInvoke.mockResolvedValue(items);

      await useContextHubStore.getState().listItems();

      expect(mockInvoke).toHaveBeenCalledWith("context:list_items", {});
      expect(useContextHubStore.getState().items).toEqual(items);
    });

    it("filters by type when provided", async () => {
      mockInvoke.mockResolvedValue([]);

      await useContextHubStore.getState().listItems("skill");

      expect(mockInvoke).toHaveBeenCalledWith("context:list_items", { type: "skill" });
    });

    it("sets error on failure", async () => {
      mockInvoke.mockRejectedValue(new Error("list failed"));

      await useContextHubStore.getState().listItems();

      expect(useContextHubStore.getState().error).toBe("list failed");
    });
  });

  describe("readItem", () => {
    it("reads item content and stores as currentItem", async () => {
      mockInvoke.mockResolvedValue("# TDD Skill\nContent here");

      await useContextHubStore.getState().readItem("skill", "tdd");

      expect(mockInvoke).toHaveBeenCalledWith("context:read_item", {
        type: "skill",
        slug: "tdd",
      });
      expect(useContextHubStore.getState().currentItem).toEqual({
        type: "skill",
        slug: "tdd",
        content: "# TDD Skill\nContent here",
      });
    });

    it("sets error on failure", async () => {
      mockInvoke.mockRejectedValue(new Error("not found"));

      await useContextHubStore.getState().readItem("skill", "missing");

      expect(useContextHubStore.getState().error).toBe("not found");
      expect(useContextHubStore.getState().currentItem).toBeNull();
    });
  });

  describe("writeItem", () => {
    it("writes item content via IPC", async () => {
      mockInvoke.mockResolvedValue("/path/to/file.md");

      await useContextHubStore.getState().writeItem("skill", "tdd", "# Updated");

      expect(mockInvoke).toHaveBeenCalledWith("context:write_item", {
        type: "skill",
        slug: "tdd",
        content: "# Updated",
      });
    });

    it("sets error on failure", async () => {
      mockInvoke.mockRejectedValue(new Error("write failed"));

      await useContextHubStore.getState().writeItem("skill", "tdd", "content");

      expect(useContextHubStore.getState().error).toBe("write failed");
    });
  });

  describe("deleteItem", () => {
    it("deletes item via IPC", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await useContextHubStore.getState().deleteItem("skill", "tdd");

      expect(mockInvoke).toHaveBeenCalledWith("context:delete_item", {
        type: "skill",
        slug: "tdd",
      });
    });

    it("sets error on failure", async () => {
      mockInvoke.mockRejectedValue(new Error("delete failed"));

      await useContextHubStore.getState().deleteItem("skill", "tdd");

      expect(useContextHubStore.getState().error).toBe("delete failed");
    });
  });

  describe("importItem", () => {
    it("calls context:import_item IPC with type and filePath", async () => {
      mockInvoke.mockResolvedValue("/path/to/result.md");

      await useContextHubStore.getState().importItem("doc", "/tmp/guide.md");

      expect(mockInvoke).toHaveBeenCalledWith("context:import_item", {
        type: "doc",
        filePath: "/tmp/guide.md",
      });
    });

    it("sets error on failure", async () => {
      mockInvoke.mockRejectedValue(new Error("import failed"));

      await useContextHubStore.getState().importItem("doc", "/bad/path.md");

      expect(useContextHubStore.getState().error).toBe("import failed");
      expect(useContextHubStore.getState().loading).toBe(false);
    });
  });

  describe("error handling", () => {
    it("clears previous error on successful operation", async () => {
      useContextHubStore.setState({ error: "previous error" });

      mockInvoke.mockResolvedValue(undefined);
      await useContextHubStore.getState().initHub();

      expect(useContextHubStore.getState().error).toBeNull();
    });
  });
});
