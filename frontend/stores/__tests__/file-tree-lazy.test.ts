import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useFileTreeStore,
  FILE_TREE_MAX_DEPTH,
  mergeSubtree,
  type DirectoryTree,
  type FileNode,
} from "@/stores/file-tree";

const mockInvoke = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  open: vi.fn(),
}));

// Mock data representing a shallow tree (maxDepth: 2)
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
          {
            name: "index.ts",
            path: "/project/src/index.ts",
            isDir: false,
          },
          {
            name: "components",
            path: "/project/src/components",
            isDir: true,
            children: [],
          },
        ],
      },
      {
        name: "README.md",
        path: "/project/README.md",
        isDir: false,
      },
    ],
  },
};

// Mock data returned when loading a subdirectory
const mockSubdirResult: DirectoryTree = {
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

describe("FILE_TREE_MAX_DEPTH constant", () => {
  it("FILE_TREE_MAX_DEPTH is 2", () => {
    expect(FILE_TREE_MAX_DEPTH).toBe(2);
  });
});

describe("mergeSubtree helper", () => {
  it("replaces children of the matching directory node", () => {
    const newChildren: FileNode[] = [
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
    ];

    const result = mergeSubtree(
      mockTree.root,
      "/project/src/components",
      newChildren,
    );

    const srcNode = result.children?.find((c) => c.name === "src");
    const componentsNode = srcNode?.children?.find(
      (c) => c.name === "components",
    );

    expect(componentsNode?.children).toHaveLength(2);
    expect(componentsNode?.children?.[0].name).toBe("Button.tsx");
    expect(componentsNode?.children?.[1].name).toBe("Input.tsx");
  });

  it("preserves sibling nodes when merging", () => {
    const newChildren: FileNode[] = [
      {
        name: "Button.tsx",
        path: "/project/src/components/Button.tsx",
        isDir: false,
      },
    ];

    const result = mergeSubtree(
      mockTree.root,
      "/project/src/components",
      newChildren,
    );

    // index.ts sibling should still be there
    const srcNode = result.children?.find((c) => c.name === "src");
    const indexFile = srcNode?.children?.find((c) => c.name === "index.ts");
    expect(indexFile).toBeDefined();
    expect(indexFile?.path).toBe("/project/src/index.ts");

    // README.md at root should still be there
    const readme = result.children?.find((c) => c.name === "README.md");
    expect(readme).toBeDefined();
  });

  it("returns a new object (immutable update)", () => {
    const newChildren: FileNode[] = [];

    const result = mergeSubtree(
      mockTree.root,
      "/project/src/components",
      newChildren,
    );

    // The returned node should not be the same reference
    expect(result).not.toBe(mockTree.root);
  });

  it("returns the original tree when dirPath is not found", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const newChildren: FileNode[] = [];

    const result = mergeSubtree(
      mockTree.root,
      "/project/nonexistent/path",
      newChildren,
    );

    // Root children should be unchanged
    expect(result.children).toHaveLength(mockTree.root.children!.length);

    consoleSpy.mockRestore();
  });

  it("can update a root-level directory", () => {
    const newChildren: FileNode[] = [
      { name: "new-file.ts", path: "/project/src/new-file.ts", isDir: false },
    ];

    const result = mergeSubtree(mockTree.root, "/project/src", newChildren);

    const srcNode = result.children?.find((c) => c.name === "src");
    expect(srcNode?.children).toHaveLength(1);
    expect(srcNode?.children?.[0].name).toBe("new-file.ts");
  });
});

describe("useFileTreeStore - loadProjectTree with maxDepth 2", () => {
  beforeEach(() => {
    useFileTreeStore.setState({
      isOpen: false,
      currentPath: null,
      tree: null,
      expandedPaths: {},
      trees: {},
      activeProjectPath: null,
    });
    mockInvoke.mockReset();
  });

  it("loadProjectTree uses maxDepth 2", async () => {
    mockInvoke.mockResolvedValue(mockTree);

    await useFileTreeStore.getState().loadProjectTree("/project");

    expect(mockInvoke).toHaveBeenCalledWith("read_directory_tree_command", {
      path: "/project",
      maxDepth: 2,
    });
  });

  it("stores the loaded tree in trees map", async () => {
    mockInvoke.mockResolvedValue(mockTree);

    await useFileTreeStore.getState().loadProjectTree("/project");

    const state = useFileTreeStore.getState();
    expect(state.trees["/project"]).toEqual(mockTree);
  });

  it("auto-expands the project root path", async () => {
    mockInvoke.mockResolvedValue(mockTree);

    await useFileTreeStore.getState().loadProjectTree("/project");

    const state = useFileTreeStore.getState();
    expect(state.expandedPaths["/project"]).toBe(true);
  });
});

describe("useFileTreeStore - loadSubdirectory", () => {
  beforeEach(() => {
    useFileTreeStore.setState({
      isOpen: true,
      currentPath: "/project",
      tree: mockTree,
      expandedPaths: { "/project": true },
      trees: { "/project": mockTree },
      activeProjectPath: "/project",
    });
    mockInvoke.mockReset();
  });

  it("fetches depth-1 for a specific directory", async () => {
    mockInvoke.mockResolvedValue(mockSubdirResult);

    await useFileTreeStore
      .getState()
      .loadSubdirectory("/project/src/components", "/project");

    expect(mockInvoke).toHaveBeenCalledWith("read_directory_tree_command", {
      path: "/project/src/components",
      maxDepth: 1,
    });
  });

  it("merges fetched children into the existing tree", async () => {
    mockInvoke.mockResolvedValue(mockSubdirResult);

    await useFileTreeStore
      .getState()
      .loadSubdirectory("/project/src/components", "/project");

    const state = useFileTreeStore.getState();
    const tree = state.trees["/project"];

    const srcNode = tree?.root.children?.find((c) => c.name === "src");
    const componentsNode = srcNode?.children?.find(
      (c) => c.name === "components",
    );

    expect(componentsNode?.children).toHaveLength(2);
    expect(componentsNode?.children?.[0].name).toBe("Button.tsx");
    expect(componentsNode?.children?.[1].name).toBe("Input.tsx");
  });

  it("preserves other parts of the tree when merging", async () => {
    mockInvoke.mockResolvedValue(mockSubdirResult);

    await useFileTreeStore
      .getState()
      .loadSubdirectory("/project/src/components", "/project");

    const state = useFileTreeStore.getState();
    const tree = state.trees["/project"];

    // README.md at root should still be present
    const readme = tree?.root.children?.find((c) => c.name === "README.md");
    expect(readme).toBeDefined();

    // src/index.ts should still be present
    const srcNode = tree?.root.children?.find((c) => c.name === "src");
    const indexFile = srcNode?.children?.find((c) => c.name === "index.ts");
    expect(indexFile).toBeDefined();
  });

  it("updates the active tree if projectPath matches activeProjectPath", async () => {
    mockInvoke.mockResolvedValue(mockSubdirResult);

    await useFileTreeStore
      .getState()
      .loadSubdirectory("/project/src/components", "/project");

    const state = useFileTreeStore.getState();

    // tree (active) should also be updated
    const componentsNode = state.tree?.root.children
      ?.find((c) => c.name === "src")
      ?.children?.find((c) => c.name === "components");

    expect(componentsNode?.children).toHaveLength(2);
  });

  it("handles nested directory paths (deeply nested node)", async () => {
    // Set up a tree with deeper nesting
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
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    useFileTreeStore.setState({
      trees: { "/project": deepTree },
      tree: deepTree,
      activeProjectPath: "/project",
    });

    const deepSubdirResult: DirectoryTree = {
      root: {
        name: "c",
        path: "/project/a/b/c",
        isDir: true,
        children: [
          {
            name: "deep-file.ts",
            path: "/project/a/b/c/deep-file.ts",
            isDir: false,
          },
        ],
      },
    };

    mockInvoke.mockResolvedValue(deepSubdirResult);

    await useFileTreeStore
      .getState()
      .loadSubdirectory("/project/a/b/c", "/project");

    const state = useFileTreeStore.getState();
    const tree = state.trees["/project"];

    const cNode = tree?.root.children
      ?.find((c) => c.name === "a")
      ?.children?.find((c) => c.name === "b")
      ?.children?.find((c) => c.name === "c");

    expect(cNode?.children).toHaveLength(1);
    expect(cNode?.children?.[0].name).toBe("deep-file.ts");
  });

  it("logs a warning and does not change the tree when directory is not found", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    mockInvoke.mockResolvedValue(mockSubdirResult);

    const stateBefore = useFileTreeStore.getState().trees["/project"];

    await useFileTreeStore
      .getState()
      .loadSubdirectory("/project/nonexistent", "/project");

    const stateAfter = useFileTreeStore.getState().trees["/project"];

    // Tree should be unchanged
    expect(stateAfter).toEqual(stateBefore);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("does nothing when the projectPath has no tree loaded", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await useFileTreeStore
      .getState()
      .loadSubdirectory("/other-project/src", "/other-project");

    // invoke should NOT be called if there's no tree for projectPath
    expect(mockInvoke).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
