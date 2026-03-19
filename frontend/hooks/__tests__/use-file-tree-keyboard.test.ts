import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFileTreeStore, type FileNode } from "@/stores/file-tree";
import { handleFileTreeKeyDown } from "../use-file-tree-keyboard";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  open: vi.fn(),
}));

function makeTree(): FileNode {
  return {
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
          { name: "utils.ts", path: "/project/src/utils.ts", isDir: false },
        ],
      },
      { name: "README.md", path: "/project/README.md", isDir: false },
      {
        name: "docs",
        path: "/project/docs",
        isDir: true,
        children: [],
      },
    ],
  };
}

function fireKey(
  handler: (e: React.KeyboardEvent) => void,
  key: string,
) {
  const prevented = { value: false };
  const stopped = { value: false };
  handler({
    key,
    preventDefault: () => { prevented.value = true; },
    stopPropagation: () => { stopped.value = true; },
  } as unknown as React.KeyboardEvent);
  return { prevented: prevented.value, stopped: stopped.value };
}

function setupStore(opts?: { focusedPath?: string | null; expandedPaths?: Record<string, boolean> }) {
  const tree = makeTree();
  useFileTreeStore.setState({
    tree: { root: tree },
    activeProjectPath: "/project",
    currentPath: "/project",
    expandedPaths: {
      "/project": true,
      ...(opts?.expandedPaths ?? {}),
    },
    focusedPath: opts?.focusedPath ?? null,
  });
}

describe("useFileTreeKeyboard", () => {
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

  describe("ArrowDown", () => {
    it("should focus first item when focusedPath is null", () => {
      setupStore();
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "ArrowDown");
      // With /project expanded, first visible child is src dir
      expect(useFileTreeStore.getState().focusedPath).toBe("/project/src");
    });

    it("should move focus to next item", () => {
      setupStore({ focusedPath: "/project/src" });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "ArrowDown");
      // src is collapsed, so next is README.md
      expect(useFileTreeStore.getState().focusedPath).toBe("/project/README.md");
    });

    it("should not move past last item", () => {
      setupStore({ focusedPath: "/project/docs" });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "ArrowDown");
      expect(useFileTreeStore.getState().focusedPath).toBe("/project/docs");
    });

    it("should call preventDefault and stopPropagation", () => {
      setupStore();
      const handler = handleFileTreeKeyDown;
      const { prevented, stopped } = fireKey(handler, "ArrowDown");
      expect(prevented).toBe(true);
      expect(stopped).toBe(true);
    });
  });

  describe("ArrowUp", () => {
    it("should focus first item when focusedPath is null", () => {
      setupStore();
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "ArrowUp");
      expect(useFileTreeStore.getState().focusedPath).toBe("/project/src");
    });

    it("should move focus to previous item", () => {
      setupStore({ focusedPath: "/project/README.md" });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "ArrowUp");
      expect(useFileTreeStore.getState().focusedPath).toBe("/project/src");
    });

    it("should not move before first item", () => {
      setupStore({ focusedPath: "/project/src" });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "ArrowUp");
      expect(useFileTreeStore.getState().focusedPath).toBe("/project/src");
    });
  });

  describe("Enter", () => {
    it("should toggle directory expand when focused on a directory", () => {
      setupStore({ focusedPath: "/project/src" });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "Enter");
      // src was collapsed, now should be expanded
      expect(useFileTreeStore.getState().expandedPaths["/project/src"]).toBe(true);
    });

    it("should select file when focused on a file", () => {
      setupStore({
        focusedPath: "/project/README.md",
        expandedPaths: {},
      });
      const selectFileSpy = vi.spyOn(useFileTreeStore.getState(), "selectFile");
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "Enter");
      expect(selectFileSpy).toHaveBeenCalledWith("/project/README.md");
    });

    it("should do nothing when focusedPath is null", () => {
      setupStore();
      const handler = handleFileTreeKeyDown;
      const { prevented } = fireKey(handler, "Enter");
      expect(prevented).toBe(false);
    });
  });

  describe("ArrowRight", () => {
    it("should expand collapsed directory", () => {
      setupStore({ focusedPath: "/project/src" });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "ArrowRight");
      expect(useFileTreeStore.getState().expandedPaths["/project/src"]).toBe(true);
    });

    it("should focus first child when directory is already expanded", () => {
      setupStore({
        focusedPath: "/project/src",
        expandedPaths: { "/project/src": true },
      });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "ArrowRight");
      expect(useFileTreeStore.getState().focusedPath).toBe("/project/src/index.ts");
    });

    it("should do nothing on a file", () => {
      setupStore({ focusedPath: "/project/README.md" });
      const handler = handleFileTreeKeyDown;
      const { prevented } = fireKey(handler, "ArrowRight");
      expect(prevented).toBe(false);
    });
  });

  describe("ArrowLeft", () => {
    it("should collapse expanded directory", () => {
      setupStore({
        focusedPath: "/project/src",
        expandedPaths: { "/project/src": true },
      });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "ArrowLeft");
      expect(useFileTreeStore.getState().expandedPaths["/project/src"]).toBe(false);
    });

    it("should focus parent directory when on collapsed directory", () => {
      setupStore({
        focusedPath: "/project/src/index.ts",
        expandedPaths: { "/project/src": true },
      });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "ArrowLeft");
      expect(useFileTreeStore.getState().focusedPath).toBe("/project/src");
    });

    it("should focus parent directory when on a file", () => {
      setupStore({
        focusedPath: "/project/src/index.ts",
        expandedPaths: { "/project/src": true },
      });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "ArrowLeft");
      expect(useFileTreeStore.getState().focusedPath).toBe("/project/src");
    });
  });

  describe("Home / End", () => {
    it("Home should focus first item", () => {
      setupStore({ focusedPath: "/project/docs" });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "Home");
      expect(useFileTreeStore.getState().focusedPath).toBe("/project/src");
    });

    it("End should focus last item", () => {
      setupStore({ focusedPath: "/project/src" });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "End");
      expect(useFileTreeStore.getState().focusedPath).toBe("/project/docs");
    });
  });

  describe("unhandled keys", () => {
    it("should not call preventDefault for unhandled keys", () => {
      setupStore({ focusedPath: "/project/src" });
      const handler = handleFileTreeKeyDown;
      const { prevented, stopped } = fireKey(handler, "a");
      expect(prevented).toBe(false);
      expect(stopped).toBe(false);
    });
  });
});
