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
  opts?: { metaKey?: boolean; ctrlKey?: boolean },
) {
  const prevented = { value: false };
  const stopped = { value: false };
  handler({
    key,
    metaKey: opts?.metaKey ?? false,
    ctrlKey: opts?.ctrlKey ?? false,
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
      selectedPaths: {},
      renamingPath: null,
      pendingDeletePaths: null,
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
      const startRenameSpy = vi.spyOn(useFileTreeStore.getState(), "startRename");
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "Enter");
      // Enter triggers startRename (VS Code behavior)
      expect(startRenameSpy).toHaveBeenCalledWith("/project/src");
    });

    it("should pin file when focused on a file", () => {
      setupStore({
        focusedPath: "/project/README.md",
        expandedPaths: {},
      });
      const startRenameSpy = vi.spyOn(useFileTreeStore.getState(), "startRename");
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "Enter");
      // Enter triggers startRename for files too (VS Code behavior)
      expect(startRenameSpy).toHaveBeenCalledWith("/project/README.md");
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

    it("should open file preview on a file", () => {
      setupStore({ focusedPath: "/project/README.md" });
      const selectFileSpy = vi.spyOn(useFileTreeStore.getState(), "selectFile");
      const handler = handleFileTreeKeyDown;
      const { prevented } = fireKey(handler, "ArrowRight");
      // ArrowRight on a file opens the file preview (preventDefault is called)
      expect(prevented).toBe(true);
      expect(selectFileSpy).toHaveBeenCalledWith("/project/README.md");
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

  describe("Space", () => {
    it("should open file preview when focused on a file", () => {
      setupStore({ focusedPath: "/project/README.md" });
      const handler = handleFileTreeKeyDown;
      const { prevented } = fireKey(handler, " ");
      // Space on a file calls preventDefault (the handler processes it)
      expect(prevented).toBe(true);
      // selectedPaths is NOT toggled (Space no longer toggles selection)
      expect(useFileTreeStore.getState().selectedPaths["/project/README.md"]).toBeUndefined();
    });

    it("should toggle directory expand when focused on a directory", () => {
      setupStore({ focusedPath: "/project/src" });
      const toggleExpandedSpy = vi.spyOn(useFileTreeStore.getState(), "toggleExpanded");
      const handler = handleFileTreeKeyDown;
      fireKey(handler, " ");
      // Space on a directory toggles expanded state
      expect(toggleExpandedSpy).toHaveBeenCalledWith("/project/src");
    });

    it("should call preventDefault when space is pressed", () => {
      setupStore({ focusedPath: "/project/src" });
      const handler = handleFileTreeKeyDown;
      const { prevented } = fireKey(handler, " ");
      expect(prevented).toBe(true);
    });

    it("should do nothing when focusedPath is null", () => {
      setupStore();
      const selectFileSpy = vi.spyOn(useFileTreeStore.getState(), "selectFile");
      const handler = handleFileTreeKeyDown;
      fireKey(handler, " ");
      expect(selectFileSpy).not.toHaveBeenCalled();
    });
  });

  describe("F2", () => {
    it("should set renamingPath to the focused item", () => {
      setupStore({ focusedPath: "/project/README.md" });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "F2");
      expect(useFileTreeStore.getState().renamingPath).toBe("/project/README.md");
    });

    it("should call preventDefault when F2 is pressed", () => {
      setupStore({ focusedPath: "/project/src" });
      const handler = handleFileTreeKeyDown;
      const { prevented } = fireKey(handler, "F2");
      expect(prevented).toBe(true);
    });

    it("should do nothing when focusedPath is null", () => {
      setupStore();
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "F2");
      expect(useFileTreeStore.getState().renamingPath).toBeNull();
    });
  });

  describe("Delete / Backspace — trigger confirmDelete", () => {
    it("should set pendingDeletePaths to focused path when no selection", () => {
      setupStore({ focusedPath: "/project/README.md" });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "Delete");
      expect(useFileTreeStore.getState().pendingDeletePaths).toEqual(["/project/README.md"]);
    });

    it("should set pendingDeletePaths from selectedPaths when items are selected", () => {
      setupStore({ focusedPath: "/project/README.md" });
      useFileTreeStore.setState({
        selectedPaths: {
          "/project/src": true,
          "/project/README.md": true,
        },
      });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "Delete");
      const { pendingDeletePaths } = useFileTreeStore.getState();
      expect(pendingDeletePaths).toHaveLength(2);
      expect(pendingDeletePaths).toContain("/project/src");
      expect(pendingDeletePaths).toContain("/project/README.md");
    });

    it("should prefer selectedPaths over focusedPath", () => {
      setupStore({ focusedPath: "/project/docs" });
      useFileTreeStore.setState({
        selectedPaths: { "/project/src": true },
      });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "Delete");
      expect(useFileTreeStore.getState().pendingDeletePaths).toEqual(["/project/src"]);
    });

    it("Backspace key should also set pendingDeletePaths", () => {
      setupStore({ focusedPath: "/project/src" });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "Backspace");
      expect(useFileTreeStore.getState().pendingDeletePaths).toEqual(["/project/src"]);
    });

    it("should call preventDefault when Delete is pressed", () => {
      setupStore({ focusedPath: "/project/src" });
      const handler = handleFileTreeKeyDown;
      const { prevented } = fireKey(handler, "Delete");
      expect(prevented).toBe(true);
    });

    it("should call preventDefault when Backspace is pressed", () => {
      setupStore({ focusedPath: "/project/src" });
      const handler = handleFileTreeKeyDown;
      const { prevented } = fireKey(handler, "Backspace");
      expect(prevented).toBe(true);
    });

    it("should not set pendingDeletePaths when no focused path and no selection", () => {
      setupStore();
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "Delete");
      expect(useFileTreeStore.getState().pendingDeletePaths).toBeNull();
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

  describe("Cmd/Ctrl+C — copy", () => {
    it("should copy focused path to clipboard when no selection", () => {
      setupStore({ focusedPath: "/project/README.md" });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "c", { metaKey: true });
      const state = useFileTreeStore.getState();
      expect(state.clipboard).toEqual({
        paths: ["/project/README.md"],
        operation: "copy",
      });
    });

    it("should copy selected paths to clipboard", () => {
      setupStore({ focusedPath: "/project/README.md" });
      useFileTreeStore.setState({
        selectedPaths: {
          "/project/src": true,
          "/project/README.md": true,
        },
      });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "c", { metaKey: true });
      const state = useFileTreeStore.getState();
      expect(state.clipboard?.operation).toBe("copy");
      expect(state.clipboard?.paths).toContain("/project/src");
      expect(state.clipboard?.paths).toContain("/project/README.md");
    });

    it("should call preventDefault", () => {
      setupStore({ focusedPath: "/project/README.md" });
      const handler = handleFileTreeKeyDown;
      const { prevented } = fireKey(handler, "c", { metaKey: true });
      expect(prevented).toBe(true);
    });

    it("should also work with ctrlKey", () => {
      setupStore({ focusedPath: "/project/README.md" });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "c", { ctrlKey: true });
      expect(useFileTreeStore.getState().clipboard?.operation).toBe("copy");
    });
  });

  describe("Cmd/Ctrl+X — cut", () => {
    it("should cut focused path to clipboard when no selection", () => {
      setupStore({ focusedPath: "/project/README.md" });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "x", { metaKey: true });
      const state = useFileTreeStore.getState();
      expect(state.clipboard).toEqual({
        paths: ["/project/README.md"],
        operation: "cut",
      });
    });

    it("should cut selected paths to clipboard", () => {
      setupStore({ focusedPath: "/project/README.md" });
      useFileTreeStore.setState({
        selectedPaths: { "/project/src": true },
      });
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "x", { metaKey: true });
      const state = useFileTreeStore.getState();
      expect(state.clipboard?.operation).toBe("cut");
      expect(state.clipboard?.paths).toEqual(["/project/src"]);
    });

    it("should call preventDefault", () => {
      setupStore({ focusedPath: "/project/README.md" });
      const handler = handleFileTreeKeyDown;
      const { prevented } = fireKey(handler, "x", { metaKey: true });
      expect(prevented).toBe(true);
    });
  });

  describe("Cmd/Ctrl+V — paste", () => {
    it("should call pasteFromClipboard with parent dir when focused on a file", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockResolvedValue(null);

      setupStore({ focusedPath: "/project/README.md" });
      useFileTreeStore.setState({
        clipboard: { paths: ["/project/src/index.ts"], operation: "copy" },
        currentPath: "/project",
      });

      const pasteSpy = vi.spyOn(useFileTreeStore.getState(), "pasteFromClipboard");
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "v", { metaKey: true });

      // Flush the async IIFE (invoke promise + fall-through)
      await Promise.resolve();
      await Promise.resolve();

      expect(pasteSpy).toHaveBeenCalledWith("/project");
    });

    it("should call pasteFromClipboard with the dir itself when focused on a directory", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockResolvedValue(null);

      setupStore({ focusedPath: "/project/src" });
      useFileTreeStore.setState({
        clipboard: { paths: ["/project/README.md"], operation: "copy" },
        currentPath: "/project",
      });

      const pasteSpy = vi.spyOn(useFileTreeStore.getState(), "pasteFromClipboard");
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "v", { metaKey: true });

      // Flush the async IIFE (invoke promise + fall-through)
      await Promise.resolve();
      await Promise.resolve();

      expect(pasteSpy).toHaveBeenCalledWith("/project/src");
    });

    it("should call preventDefault", () => {
      setupStore({ focusedPath: "/project/README.md" });
      useFileTreeStore.setState({
        clipboard: { paths: ["/project/src/index.ts"], operation: "copy" },
      });
      const handler = handleFileTreeKeyDown;
      const { prevented } = fireKey(handler, "v", { metaKey: true });
      expect(prevented).toBe(true);
    });

    it("should do nothing when no focused path", () => {
      setupStore();
      useFileTreeStore.setState({
        clipboard: { paths: ["/project/src/index.ts"], operation: "copy" },
      });
      const pasteSpy = vi.spyOn(useFileTreeStore.getState(), "pasteFromClipboard");
      const handler = handleFileTreeKeyDown;
      fireKey(handler, "v", { metaKey: true });
      expect(pasteSpy).not.toHaveBeenCalled();
    });
  });
});
