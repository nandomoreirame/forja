import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFileTreeStore, type DirectoryTree } from "@/stores/file-tree";

const mockInvoke = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  open: vi.fn(),
}));

const makeTree = (path: string): DirectoryTree => ({
  root: { name: path.split("/").pop()!, path, isDir: true, children: [] },
});

describe("useFileTreeStore - removeProjectTree", () => {
  beforeEach(() => {
    useFileTreeStore.setState({
      isOpen: true,
      currentPath: "/project-a",
      tree: makeTree("/project-a"),
      expandedPaths: {
        "/project-a": true,
        "/project-a/src": true,
        "/project-b": true,
        "/project-b/lib": true,
      },
      trees: {
        "/project-a": makeTree("/project-a"),
        "/project-b": makeTree("/project-b"),
      },
      activeProjectPath: "/project-a",
    });
    mockInvoke.mockResolvedValue(undefined);
    vi.clearAllMocks();
  });

  it("removes the project tree from trees map", () => {
    useFileTreeStore.getState().removeProjectTree("/project-b");

    const state = useFileTreeStore.getState();
    expect(state.trees).not.toHaveProperty("/project-b");
    expect(state.trees).toHaveProperty("/project-a");
  });

  it("removes expanded paths belonging to the removed project", () => {
    useFileTreeStore.getState().removeProjectTree("/project-b");

    const state = useFileTreeStore.getState();
    expect(state.expandedPaths).not.toHaveProperty("/project-b");
    expect(state.expandedPaths).not.toHaveProperty("/project-b/lib");
    expect(state.expandedPaths).toHaveProperty("/project-a");
    expect(state.expandedPaths).toHaveProperty("/project-a/src");
  });

  it("switches to another project if the removed one was active", () => {
    useFileTreeStore.getState().removeProjectTree("/project-a");

    const state = useFileTreeStore.getState();
    expect(state.activeProjectPath).toBe("/project-b");
    expect(state.currentPath).toBe("/project-b");
    expect(state.tree).toEqual(makeTree("/project-b"));
  });

  it("keeps current active project if a different project is removed", () => {
    useFileTreeStore.getState().removeProjectTree("/project-b");

    const state = useFileTreeStore.getState();
    expect(state.activeProjectPath).toBe("/project-a");
    expect(state.currentPath).toBe("/project-a");
  });

  it("clears all project state when the last project is removed", () => {
    useFileTreeStore.setState({
      trees: { "/only-project": makeTree("/only-project") },
      expandedPaths: { "/only-project": true },
      activeProjectPath: "/only-project",
      currentPath: "/only-project",
      tree: makeTree("/only-project"),
    });

    useFileTreeStore.getState().removeProjectTree("/only-project");

    const state = useFileTreeStore.getState();
    expect(state.activeProjectPath).toBeNull();
    expect(state.currentPath).toBeNull();
    expect(state.tree).toBeNull();
    expect(Object.keys(state.trees)).toHaveLength(0);
  });

  it("calls stop_watcher for the removed project", () => {
    useFileTreeStore.getState().removeProjectTree("/project-b");

    expect(mockInvoke).toHaveBeenCalledWith("stop_watcher", {
      path: "/project-b",
    });
  });

  it("is a no-op for a project path not in the trees", () => {
    const stateBefore = useFileTreeStore.getState();

    useFileTreeStore.getState().removeProjectTree("/nonexistent");

    const stateAfter = useFileTreeStore.getState();
    expect(Object.keys(stateAfter.trees)).toHaveLength(2);
    expect(stateAfter.activeProjectPath).toBe(stateBefore.activeProjectPath);
  });
});
