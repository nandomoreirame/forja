import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFileTreeStore } from "@/stores/file-tree";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  open: vi.fn(),
}));

describe("useFileTreeStore - focusedPath", () => {
  beforeEach(() => {
    useFileTreeStore.setState({
      isOpen: false,
      currentPath: null,
      tree: null,
      expandedPaths: {},
      trees: {},
      activeProjectPath: null,
      focusedPath: null,
    });
    vi.clearAllMocks();
  });

  it("should initialize focusedPath as null", () => {
    expect(useFileTreeStore.getState().focusedPath).toBeNull();
  });

  it("should set focusedPath via setFocusedPath", () => {
    useFileTreeStore.getState().setFocusedPath("/project/src/index.ts");
    expect(useFileTreeStore.getState().focusedPath).toBe("/project/src/index.ts");
  });

  it("should clear focusedPath when set to null", () => {
    useFileTreeStore.getState().setFocusedPath("/project/src/index.ts");
    useFileTreeStore.getState().setFocusedPath(null);
    expect(useFileTreeStore.getState().focusedPath).toBeNull();
  });

  it("should clear focusedPath when collapseAll is called", () => {
    useFileTreeStore.setState({
      expandedPaths: { "/project/src": true },
      focusedPath: "/project/src/index.ts",
    });

    useFileTreeStore.getState().collapseAll();

    expect(useFileTreeStore.getState().focusedPath).toBeNull();
    expect(useFileTreeStore.getState().expandedPaths).toEqual({});
  });
});
