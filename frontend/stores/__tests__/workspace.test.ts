import { describe, it, expect, vi, beforeEach } from "vitest";
import { useWorkspaceStore } from "../workspace";
import type { Workspace } from "../workspace";

const mockInvoke = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

const makeWorkspace = (overrides: Partial<Workspace> = {}): Workspace => ({
  id: "ws-1",
  name: "My Workspace",
  projects: [],
  createdAt: "2026-03-03T00:00:00.000Z",
  lastUsedAt: "2026-03-03T00:00:00.000Z",
  ...overrides,
});

describe("useWorkspaceStore", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: null,
      loading: false,
    });
    mockInvoke.mockReset();
  });

  it("starts with empty workspaces and no active workspace", () => {
    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toEqual([]);
    expect(state.activeWorkspaceId).toBeNull();
    expect(state.loading).toBe(false);
  });

  it("loadWorkspaces fetches workspaces and active workspace", async () => {
    const ws1 = makeWorkspace({ id: "ws-1", name: "Workspace 1" });
    const ws2 = makeWorkspace({ id: "ws-2", name: "Workspace 2" });
    const activeWs = makeWorkspace({ id: "ws-1", name: "Workspace 1" });

    mockInvoke
      .mockResolvedValueOnce([ws1, ws2])
      .mockResolvedValueOnce(activeWs);

    await useWorkspaceStore.getState().loadWorkspaces();

    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toEqual([ws1, ws2]);
    expect(state.activeWorkspaceId).toBe("ws-1");
    expect(state.loading).toBe(false);

    expect(mockInvoke).toHaveBeenCalledWith("get_workspaces");
    expect(mockInvoke).toHaveBeenCalledWith("get_active_workspace");
  });

  it("loadWorkspaces sets loading state", async () => {
    let resolveWorkspaces!: (value: Workspace[]) => void;
    let resolveActive!: (value: null) => void;

    mockInvoke
      .mockReturnValueOnce(
        new Promise<Workspace[]>((res) => {
          resolveWorkspaces = res;
        }),
      )
      .mockReturnValueOnce(
        new Promise<null>((res) => {
          resolveActive = res;
        }),
      );

    const promise = useWorkspaceStore.getState().loadWorkspaces();

    expect(useWorkspaceStore.getState().loading).toBe(true);

    resolveWorkspaces([]);
    resolveActive(null);
    await promise;

    expect(useWorkspaceStore.getState().loading).toBe(false);
  });

  it("loadWorkspaces handles error gracefully", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Network error"));

    await useWorkspaceStore.getState().loadWorkspaces();

    const state = useWorkspaceStore.getState();
    expect(state.loading).toBe(false);
    expect(state.workspaces).toEqual([]);
  });

  it("createWorkspace calls IPC and reloads", async () => {
    const newWs = makeWorkspace({ id: "ws-new", name: "New Workspace" });

    mockInvoke
      .mockResolvedValueOnce(newWs) // create_workspace
      .mockResolvedValueOnce([newWs]) // get_workspaces (loadWorkspaces)
      .mockResolvedValueOnce(null); // get_active_workspace (loadWorkspaces)

    const result = await useWorkspaceStore.getState().createWorkspace("New Workspace");

    expect(result).toEqual(newWs);
    expect(mockInvoke).toHaveBeenCalledWith("create_workspace", {
      name: "New Workspace",
      initialProject: undefined,
    });
    expect(mockInvoke).toHaveBeenCalledWith("get_workspaces");
  });

  it("createWorkspace with initialProject passes it through", async () => {
    const newWs = makeWorkspace({ id: "ws-new", name: "New Workspace" });

    mockInvoke
      .mockResolvedValueOnce(newWs)
      .mockResolvedValueOnce([newWs])
      .mockResolvedValueOnce(null);

    await useWorkspaceStore.getState().createWorkspace("New Workspace", "/my/project");

    expect(mockInvoke).toHaveBeenCalledWith("create_workspace", {
      name: "New Workspace",
      initialProject: "/my/project",
    });
  });

  it("deleteWorkspace calls IPC and reloads", async () => {
    mockInvoke
      .mockResolvedValueOnce(undefined) // delete_workspace
      .mockResolvedValueOnce([]) // get_workspaces
      .mockResolvedValueOnce(null); // get_active_workspace

    await useWorkspaceStore.getState().deleteWorkspace("ws-1");

    expect(mockInvoke).toHaveBeenCalledWith("delete_workspace", { id: "ws-1" });
    expect(mockInvoke).toHaveBeenCalledWith("get_workspaces");
  });

  it("renameWorkspace calls IPC and reloads", async () => {
    mockInvoke
      .mockResolvedValueOnce(undefined) // update_workspace
      .mockResolvedValueOnce([]) // get_workspaces
      .mockResolvedValueOnce(null); // get_active_workspace

    await useWorkspaceStore.getState().renameWorkspace("ws-1", "Renamed Workspace");

    expect(mockInvoke).toHaveBeenCalledWith("update_workspace", {
      id: "ws-1",
      name: "Renamed Workspace",
    });
    expect(mockInvoke).toHaveBeenCalledWith("get_workspaces");
  });

  it("addProject calls IPC and reloads", async () => {
    mockInvoke
      .mockResolvedValueOnce(undefined) // add_project_to_workspace
      .mockResolvedValueOnce([]) // get_workspaces
      .mockResolvedValueOnce(null); // get_active_workspace

    await useWorkspaceStore.getState().addProject("ws-1", "/my/new/project");

    expect(mockInvoke).toHaveBeenCalledWith("add_project_to_workspace", {
      workspaceId: "ws-1",
      projectPath: "/my/new/project",
    });
    expect(mockInvoke).toHaveBeenCalledWith("get_workspaces");
  });

  it("removeProject calls IPC and reloads", async () => {
    mockInvoke
      .mockResolvedValueOnce(undefined) // remove_project_from_workspace
      .mockResolvedValueOnce([]) // get_workspaces
      .mockResolvedValueOnce(null); // get_active_workspace

    await useWorkspaceStore.getState().removeProject("ws-1", "/my/project");

    expect(mockInvoke).toHaveBeenCalledWith("remove_project_from_workspace", {
      workspaceId: "ws-1",
      projectPath: "/my/project",
    });
    expect(mockInvoke).toHaveBeenCalledWith("get_workspaces");
  });

  it("setActiveWorkspace calls IPC and updates state", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    await useWorkspaceStore.getState().setActiveWorkspace("ws-1");

    expect(mockInvoke).toHaveBeenCalledWith("set_active_workspace", { id: "ws-1" });
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("ws-1");
  });

  it("openWorkspaceInNewWindow calls IPC", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    await useWorkspaceStore.getState().openWorkspaceInNewWindow("ws-1");

    expect(mockInvoke).toHaveBeenCalledWith("open_workspace_in_new_window", {
      workspaceId: "ws-1",
    });
  });
});
