import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@/lib/ipc";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

// Must reset the store between tests since Zustand persists state
let useQuickActionsStore: typeof import("@/stores/quick-actions").useQuickActionsStore;

describe("useQuickActionsStore", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import("@/stores/quick-actions");
    useQuickActionsStore = mod.useQuickActionsStore;
  });

  it("starts with empty actions and loaded=false", () => {
    const state = useQuickActionsStore.getState();
    expect(state.actions).toEqual([]);
    expect(state.loaded).toBe(false);
  });

  it("loadActions fetches and sets state with position migration", async () => {
    const mockActions = [{ actionId: "action-1" }, { actionId: "action-2" }];
    vi.mocked(invoke).mockResolvedValue(mockActions);

    await useQuickActionsStore.getState().loadActions();

    expect(invoke).toHaveBeenCalledWith("get_quick_actions");
    // Should migrate actions without position to "left"
    expect(useQuickActionsStore.getState().actions).toEqual([
      { actionId: "action-1", position: "left" },
      { actionId: "action-2", position: "left" },
    ]);
    expect(useQuickActionsStore.getState().loaded).toBe(true);
  });

  it("loadActions uses default actions on error", async () => {
    vi.mocked(invoke).mockRejectedValue(new Error("IPC error"));

    await useQuickActionsStore.getState().loadActions();

    expect(useQuickActionsStore.getState().actions).toEqual([
      { actionId: "open-files", position: "left" },
      { actionId: "open-browser", position: "left" },
      { actionId: "session:terminal", position: "right" },
    ]);
    expect(useQuickActionsStore.getState().loaded).toBe(true);
  });

  it("addAction adds with default left position", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await useQuickActionsStore.getState().addAction("action-1");

    const state = useQuickActionsStore.getState();
    expect(state.actions).toEqual([{ actionId: "action-1", position: "left" }]);
  });

  it("addAction respects explicit position", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await useQuickActionsStore.getState().addAction("action-1", "right");

    const state = useQuickActionsStore.getState();
    expect(state.actions).toEqual([{ actionId: "action-1", position: "right" }]);
  });

  it("addAction skips duplicates", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await useQuickActionsStore.getState().addAction("action-1");
    await useQuickActionsStore.getState().addAction("action-1");

    expect(useQuickActionsStore.getState().actions).toHaveLength(1);
  });

  it("removeAction removes and persists", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await useQuickActionsStore.getState().addAction("action-1");
    await useQuickActionsStore.getState().addAction("action-2");
    await useQuickActionsStore.getState().removeAction("action-1");

    const state = useQuickActionsStore.getState();
    expect(state.actions).toEqual([{ actionId: "action-2", position: "left" }]);
  });

  it("moveAction reorders within position", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await useQuickActionsStore.getState().addAction("action-1");
    await useQuickActionsStore.getState().addAction("action-2");
    await useQuickActionsStore.getState().addAction("action-3");

    await useQuickActionsStore.getState().moveAction(0, 2, "left");

    const ids = useQuickActionsStore.getState().actions.map((a) => a.actionId);
    expect(ids).toEqual(["action-2", "action-3", "action-1"]);
  });

  it("moveToPosition changes action position", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await useQuickActionsStore.getState().addAction("action-1", "left");

    await useQuickActionsStore.getState().moveToPosition("action-1", "right");

    const state = useQuickActionsStore.getState();
    expect(state.actions[0].position).toBe("right");
  });

  it("getActionsForPosition filters correctly", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await useQuickActionsStore.getState().addAction("left-1", "left");
    await useQuickActionsStore.getState().addAction("right-1", "right");
    await useQuickActionsStore.getState().addAction("left-2", "left");

    const left = useQuickActionsStore.getState().getActionsForPosition("left");
    const right = useQuickActionsStore.getState().getActionsForPosition("right");

    expect(left.map((a) => a.actionId)).toEqual(["left-1", "left-2"]);
    expect(right.map((a) => a.actionId)).toEqual(["right-1"]);
  });

  it("isPinned returns true when action exists", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await useQuickActionsStore.getState().addAction("action-1");

    expect(useQuickActionsStore.getState().isPinned("action-1")).toBe(true);
  });

  it("isPinned returns false when action does not exist", () => {
    expect(useQuickActionsStore.getState().isPinned("nonexistent")).toBe(false);
  });
});
