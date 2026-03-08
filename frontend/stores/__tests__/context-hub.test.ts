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
    // Reset store state
    useContextHubStore.setState({
      status: null,
      syncSummary: null,
      loading: false,
      error: null,
    });
  });

  describe("initHub", () => {
    it("calls context:init IPC with project path", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await useContextHubStore.getState().initHub("/project");

      expect(mockInvoke).toHaveBeenCalledWith("context:init", {
        projectPath: "/project",
      });
    });

    it("sets loading state during init", async () => {
      let resolvePromise: () => void;
      const pending = new Promise<void>((r) => { resolvePromise = r; });
      mockInvoke.mockReturnValue(pending);

      const promise = useContextHubStore.getState().initHub("/project");
      expect(useContextHubStore.getState().loading).toBe(true);

      resolvePromise!();
      await promise;
      expect(useContextHubStore.getState().loading).toBe(false);
    });

    it("sets error on failure", async () => {
      mockInvoke.mockRejectedValue(new Error("init failed"));

      await useContextHubStore.getState().initHub("/project");

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

      await useContextHubStore.getState().loadStatus("/project");

      expect(mockInvoke).toHaveBeenCalledWith("context:status", {
        projectPath: "/project",
      });
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

      await useContextHubStore.getState().syncOut("/project");

      expect(mockInvoke).toHaveBeenCalledWith("context:sync_out", {
        projectPath: "/project",
      });
      expect(useContextHubStore.getState().syncSummary).toEqual(summary);
    });

    it("passes strategy and toolIds options", async () => {
      mockInvoke.mockResolvedValue({ timestamp: "", direction: "outbound", results: [] });

      await useContextHubStore.getState().syncOut("/project", {
        strategy: "overwrite",
        toolIds: ["claude"],
      });

      expect(mockInvoke).toHaveBeenCalledWith("context:sync_out", {
        projectPath: "/project",
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

      await useContextHubStore.getState().syncIn("/project");

      expect(mockInvoke).toHaveBeenCalledWith("context:sync_in", {
        projectPath: "/project",
      });
      expect(useContextHubStore.getState().syncSummary).toEqual(summary);
    });
  });

  describe("createSkill", () => {
    it("calls context:create_skill and returns path", async () => {
      mockInvoke.mockResolvedValue("/project/.forja/context/skills/tdd/SKILL.md");

      const result = await useContextHubStore.getState().createSkill("/project", "tdd");

      expect(mockInvoke).toHaveBeenCalledWith("context:create_skill", {
        projectPath: "/project",
        slug: "tdd",
      });
      expect(result).toBe("/project/.forja/context/skills/tdd/SKILL.md");
    });

    it("passes content option when provided", async () => {
      mockInvoke.mockResolvedValue("/project/.forja/context/skills/tdd/SKILL.md");

      await useContextHubStore.getState().createSkill("/project", "tdd", {
        content: "---\nname: tdd\n---\n",
      });

      expect(mockInvoke).toHaveBeenCalledWith("context:create_skill", {
        projectPath: "/project",
        slug: "tdd",
        content: "---\nname: tdd\n---\n",
      });
    });
  });

  describe("createAgent", () => {
    it("calls context:create_agent and returns path", async () => {
      mockInvoke.mockResolvedValue("/project/.forja/context/agents/code-reviewer.md");

      const result = await useContextHubStore.getState().createAgent("/project", "code-reviewer");

      expect(mockInvoke).toHaveBeenCalledWith("context:create_agent", {
        projectPath: "/project",
        slug: "code-reviewer",
      });
      expect(result).toBe("/project/.forja/context/agents/code-reviewer.md");
    });
  });

  describe("error handling", () => {
    it("clears previous error on successful operation", async () => {
      // Set an existing error
      useContextHubStore.setState({ error: "previous error" });

      mockInvoke.mockResolvedValue(undefined);
      await useContextHubStore.getState().initHub("/project");

      expect(useContextHubStore.getState().error).toBeNull();
    });
  });
});
