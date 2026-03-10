import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFileTreeStore, type DirectoryTree } from "@/stores/file-tree";

const mockInvoke = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  open: vi.fn(),
}));

const mockTree: DirectoryTree = {
  root: {
    name: "project",
    path: "/project",
    isDir: true,
    children: [
      {
        name: "src",
        path: "/project/src",
        isDir: true,
        children: [
          { name: "index.ts", path: "/project/src/index.ts", isDir: false },
        ],
      },
      { name: "README.md", path: "/project/README.md", isDir: false },
    ],
  },
};

const updatedTree: DirectoryTree = {
  root: {
    name: "project",
    path: "/project",
    isDir: true,
    children: [
      {
        name: "src",
        path: "/project/src",
        isDir: true,
        children: [
          { name: "index.ts", path: "/project/src/index.ts", isDir: false },
          { name: "new-file.ts", path: "/project/src/new-file.ts", isDir: false },
        ],
      },
      { name: "README.md", path: "/project/README.md", isDir: false },
    ],
  },
};

describe("useFileTreeStore - refreshTree", () => {
  beforeEach(() => {
    useFileTreeStore.setState({
      isOpen: true,
      currentPath: "/project",
      tree: mockTree,
      expandedPaths: {
        "/project": true,
        "/project/src": true,
      },
      trees: { "/project": mockTree },
      activeProjectPath: "/project",
    });
    mockInvoke.mockReset();
  });

  it("calls loadProjectTree and updates tree for active project", async () => {
    mockInvoke.mockResolvedValue(updatedTree);

    await useFileTreeStore.getState().refreshTree();

    expect(mockInvoke).toHaveBeenCalledWith("read_directory_tree_command", {
      path: "/project",
      maxDepth: 2,
    });

    const state = useFileTreeStore.getState();
    expect(state.trees["/project"]).toEqual(updatedTree);
    expect(state.tree).toEqual(updatedTree);
  });

  it("uses currentPath when no projectPath argument is provided", async () => {
    mockInvoke.mockResolvedValue(updatedTree);

    await useFileTreeStore.getState().refreshTree();

    expect(mockInvoke).toHaveBeenCalledWith("read_directory_tree_command", {
      path: "/project",
      maxDepth: 2,
    });
  });

  it("uses provided projectPath when given", async () => {
    const otherTree: DirectoryTree = {
      root: { name: "other", path: "/other", isDir: true, children: [] },
    };
    useFileTreeStore.setState({
      trees: {
        "/project": mockTree,
        "/other": otherTree,
      },
    });
    mockInvoke.mockResolvedValue(otherTree);

    await useFileTreeStore.getState().refreshTree("/other");

    expect(mockInvoke).toHaveBeenCalledWith("read_directory_tree_command", {
      path: "/other",
      maxDepth: 2,
    });
  });

  it("preserves non-root expandedPaths after refresh", async () => {
    mockInvoke.mockResolvedValue(updatedTree);

    await useFileTreeStore.getState().refreshTree();

    const state = useFileTreeStore.getState();
    // /project/src was expanded before and should still be expanded
    expect(state.expandedPaths["/project/src"]).toBe(true);
    // /project root is always auto-expanded by loadProjectTree
    expect(state.expandedPaths["/project"]).toBe(true);
  });

  it("does nothing when currentPath is null and no projectPath given", async () => {
    useFileTreeStore.setState({ currentPath: null });

    await useFileTreeStore.getState().refreshTree();

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("updates tree state when refreshing the active project", async () => {
    mockInvoke.mockResolvedValue(updatedTree);

    await useFileTreeStore.getState().refreshTree("/project");

    const state = useFileTreeStore.getState();
    expect(state.tree).toEqual(updatedTree);
  });

  it("does not update tree when refreshing a non-active project", async () => {
    const otherTree: DirectoryTree = {
      root: { name: "other", path: "/other", isDir: true, children: [] },
    };
    mockInvoke.mockResolvedValue(otherTree);

    await useFileTreeStore.getState().refreshTree("/other");

    const state = useFileTreeStore.getState();
    // tree should still point to /project (active), not /other
    expect(state.tree).toEqual(mockTree);
  });
});
