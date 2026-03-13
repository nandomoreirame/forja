import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useFileTreeStore,
  findNode,
  type DirectoryTree,
  type FileNode,
} from "@/stores/file-tree";

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

  it("re-loads expanded subdirectories that were truncated by shallow refresh", async () => {
    // Setup: tree with deep expanded directory (loaded via loadSubdirectory)
    const treeWithDeepChildren: DirectoryTree = {
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
              {
                name: "components",
                path: "/project/src/components",
                isDir: true,
                children: [
                  {
                    name: "Button.tsx",
                    path: "/project/src/components/Button.tsx",
                    isDir: false,
                  },
                  {
                    name: "Input.tsx",
                    path: "/project/src/components/Input.tsx",
                    isDir: false,
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    // Shallow refresh returns tree where components has empty children
    const shallowTree: DirectoryTree = {
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
              {
                name: "components",
                path: "/project/src/components",
                isDir: true,
                children: [],
              },
            ],
          },
        ],
      },
    };

    // Subdirectory reload returns the children
    const subdirResult: DirectoryTree = {
      root: {
        name: "components",
        path: "/project/src/components",
        isDir: true,
        children: [
          {
            name: "Button.tsx",
            path: "/project/src/components/Button.tsx",
            isDir: false,
          },
          {
            name: "Input.tsx",
            path: "/project/src/components/Input.tsx",
            isDir: false,
          },
        ],
      },
    };

    useFileTreeStore.setState({
      currentPath: "/project",
      tree: treeWithDeepChildren,
      trees: { "/project": treeWithDeepChildren },
      activeProjectPath: "/project",
      expandedPaths: {
        "/project": true,
        "/project/src": true,
        "/project/src/components": true,
      },
    });
    mockInvoke.mockReset();

    // First call: loadProjectTree returns shallow tree
    // Second call: loadSubdirectory for components
    mockInvoke
      .mockResolvedValueOnce(shallowTree)
      .mockResolvedValueOnce(subdirResult);

    await useFileTreeStore.getState().refreshTree();

    // Should have called loadProjectTree + loadSubdirectory for the truncated dir
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(mockInvoke).toHaveBeenCalledWith("read_directory_tree_command", {
      path: "/project",
      maxDepth: 2,
    });
    expect(mockInvoke).toHaveBeenCalledWith("read_directory_tree_command", {
      path: "/project/src/components",
      maxDepth: 1,
    });

    // Final tree should have the deep children restored
    const state = useFileTreeStore.getState();
    const componentsNode = state.tree?.root.children
      ?.find((c) => c.name === "src")
      ?.children?.find((c) => c.name === "components");
    expect(componentsNode?.children).toHaveLength(2);
    expect(componentsNode?.children?.[0].name).toBe("Button.tsx");
  });

  it("does not re-load expanded dirs that still have children after refresh", async () => {
    // src is expanded and still has children after shallow refresh (within maxDepth)
    useFileTreeStore.setState({
      currentPath: "/project",
      tree: mockTree,
      trees: { "/project": mockTree },
      activeProjectPath: "/project",
      expandedPaths: {
        "/project": true,
        "/project/src": true,
      },
    });
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue(updatedTree);

    await useFileTreeStore.getState().refreshTree();

    // Only loadProjectTree should be called; src still has children, no re-load needed
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith("read_directory_tree_command", {
      path: "/project",
      maxDepth: 2,
    });
  });

  it("re-loads multiple expanded dirs in depth order", async () => {
    const deepTree: DirectoryTree = {
      root: {
        name: "project",
        path: "/project",
        isDir: true,
        children: [
          {
            name: "a",
            path: "/project/a",
            isDir: true,
            children: [
              {
                name: "b",
                path: "/project/a/b",
                isDir: true,
                children: [
                  {
                    name: "c",
                    path: "/project/a/b/c",
                    isDir: true,
                    children: [
                      {
                        name: "deep.ts",
                        path: "/project/a/b/c/deep.ts",
                        isDir: false,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    // Shallow refresh truncates at depth 2: /project/a/b has empty children
    const shallowDeepTree: DirectoryTree = {
      root: {
        name: "project",
        path: "/project",
        isDir: true,
        children: [
          {
            name: "a",
            path: "/project/a",
            isDir: true,
            children: [
              {
                name: "b",
                path: "/project/a/b",
                isDir: true,
                children: [],
              },
            ],
          },
        ],
      },
    };

    const bSubdirResult: DirectoryTree = {
      root: {
        name: "b",
        path: "/project/a/b",
        isDir: true,
        children: [
          {
            name: "c",
            path: "/project/a/b/c",
            isDir: true,
            children: [],
          },
        ],
      },
    };

    const cSubdirResult: DirectoryTree = {
      root: {
        name: "c",
        path: "/project/a/b/c",
        isDir: true,
        children: [
          {
            name: "deep.ts",
            path: "/project/a/b/c/deep.ts",
            isDir: false,
          },
        ],
      },
    };

    useFileTreeStore.setState({
      currentPath: "/project",
      tree: deepTree,
      trees: { "/project": deepTree },
      activeProjectPath: "/project",
      expandedPaths: {
        "/project": true,
        "/project/a": true,
        "/project/a/b": true,
        "/project/a/b/c": true,
      },
    });
    mockInvoke.mockReset();

    mockInvoke
      .mockResolvedValueOnce(shallowDeepTree) // loadProjectTree
      .mockResolvedValueOnce(bSubdirResult) // loadSubdirectory /project/a/b
      .mockResolvedValueOnce(cSubdirResult); // loadSubdirectory /project/a/b/c

    await useFileTreeStore.getState().refreshTree();

    // loadProjectTree + 2 subdirectory re-loads (b and c, but not a which has children)
    expect(mockInvoke).toHaveBeenCalledTimes(3);

    // Verify depth order: b loaded before c
    const calls = mockInvoke.mock.calls;
    expect(calls[1][1].path).toBe("/project/a/b");
    expect(calls[2][1].path).toBe("/project/a/b/c");

    // Verify final tree has deep children
    const state = useFileTreeStore.getState();
    const cNode = state.tree?.root.children
      ?.find((c) => c.name === "a")
      ?.children?.find((c) => c.name === "b")
      ?.children?.find((c) => c.name === "c");
    expect(cNode?.children).toHaveLength(1);
    expect(cNode?.children?.[0].name).toBe("deep.ts");
  });
});

describe("findNode helper", () => {
  const tree: FileNode = {
    name: "project",
    path: "/project",
    isDir: true,
    children: [
      {
        name: "src",
        path: "/project/src",
        isDir: true,
        children: [
          {
            name: "components",
            path: "/project/src/components",
            isDir: true,
            children: [
              {
                name: "Button.tsx",
                path: "/project/src/components/Button.tsx",
                isDir: false,
              },
            ],
          },
          { name: "index.ts", path: "/project/src/index.ts", isDir: false },
        ],
      },
      { name: "README.md", path: "/project/README.md", isDir: false },
    ],
  };

  it("finds the root node", () => {
    const result = findNode(tree, "/project");
    expect(result).not.toBeNull();
    expect(result?.path).toBe("/project");
  });

  it("finds a nested directory", () => {
    const result = findNode(tree, "/project/src/components");
    expect(result).not.toBeNull();
    expect(result?.path).toBe("/project/src/components");
    expect(result?.children).toHaveLength(1);
  });

  it("finds a direct child directory", () => {
    const result = findNode(tree, "/project/src");
    expect(result).not.toBeNull();
    expect(result?.path).toBe("/project/src");
  });

  it("returns null for non-existent path", () => {
    const result = findNode(tree, "/project/nonexistent");
    expect(result).toBeNull();
  });

  it("returns null when children is undefined", () => {
    const leaf: FileNode = {
      name: "file.ts",
      path: "/file.ts",
      isDir: false,
    };
    const result = findNode(leaf, "/other");
    expect(result).toBeNull();
  });

  it("skips file nodes during traversal", () => {
    const result = findNode(tree, "/project/src/index.ts");
    // index.ts is a file, not a directory — findNode only traverses dirs
    expect(result).toBeNull();
  });
});
