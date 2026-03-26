import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFileTreeStore } from "@/stores/file-tree";

// Mock IPC layer
vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  open: vi.fn(),
}));

function resetStore() {
  useFileTreeStore.setState({
    isOpen: false,
    currentPath: "/project",
    tree: {
      root: {
        name: "project",
        path: "/project",
        isDir: true,
        children: [
          { name: "src", path: "/project/src", isDir: true, children: [] },
          { name: "README.md", path: "/project/README.md", isDir: false },
        ],
      },
    },
    expandedPaths: { "/project": true },
    trees: {},
    activeProjectPath: "/project",
    focusedPath: null,
    selectedPaths: {},
    renamingPath: null,
    clipboard: null,
  });
}

describe("useFileTreeStore - clipboard", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  describe("copyToClipboard", () => {
    it("should set clipboard with focused path when no selection", () => {
      useFileTreeStore.setState({ focusedPath: "/project/README.md" });
      useFileTreeStore.getState().copyToClipboard();
      expect(useFileTreeStore.getState().clipboard).toEqual({
        paths: ["/project/README.md"],
        operation: "copy",
      });
    });

    it("should set clipboard with selected paths when selection exists", () => {
      useFileTreeStore.setState({
        focusedPath: "/project/README.md",
        selectedPaths: {
          "/project/src": true,
          "/project/README.md": true,
        },
      });
      useFileTreeStore.getState().copyToClipboard();
      const clipboard = useFileTreeStore.getState().clipboard;
      expect(clipboard?.operation).toBe("copy");
      expect(clipboard?.paths).toContain("/project/src");
      expect(clipboard?.paths).toContain("/project/README.md");
    });

    it("should not set clipboard when no selection and no focused path", () => {
      useFileTreeStore.setState({ focusedPath: null, selectedPaths: {} });
      useFileTreeStore.getState().copyToClipboard();
      expect(useFileTreeStore.getState().clipboard).toBeNull();
    });

    it("should not modify clipboard on cut operation", () => {
      useFileTreeStore.setState({ focusedPath: "/project/README.md" });
      useFileTreeStore.getState().copyToClipboard();
      expect(useFileTreeStore.getState().clipboard?.operation).toBe("copy");
    });
  });

  describe("cutToClipboard", () => {
    it("should set clipboard with focused path when no selection", () => {
      useFileTreeStore.setState({ focusedPath: "/project/src" });
      useFileTreeStore.getState().cutToClipboard();
      expect(useFileTreeStore.getState().clipboard).toEqual({
        paths: ["/project/src"],
        operation: "cut",
      });
    });

    it("should set clipboard with selected paths when selection exists", () => {
      useFileTreeStore.setState({
        focusedPath: null,
        selectedPaths: { "/project/README.md": true },
      });
      useFileTreeStore.getState().cutToClipboard();
      expect(useFileTreeStore.getState().clipboard).toEqual({
        paths: ["/project/README.md"],
        operation: "cut",
      });
    });

    it("should not set clipboard when no selection and no focused path", () => {
      useFileTreeStore.setState({ focusedPath: null, selectedPaths: {} });
      useFileTreeStore.getState().cutToClipboard();
      expect(useFileTreeStore.getState().clipboard).toBeNull();
    });
  });

  describe("pasteFromClipboard", () => {
    it("should invoke copy_file_or_dir for copy operation", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockResolvedValue(undefined);

      useFileTreeStore.setState({
        clipboard: { paths: ["/project/README.md"], operation: "copy" },
        currentPath: "/project",
      });

      await useFileTreeStore.getState().pasteFromClipboard("/project/src");

      expect(invoke).toHaveBeenCalledWith("copy_file_or_dir", {
        projectPath: "/project",
        sourcePath: "/project/README.md",
        targetDir: "/project/src",
      });
    });

    it("should invoke move_file_or_dir for cut operation", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockResolvedValue(undefined);

      useFileTreeStore.setState({
        clipboard: { paths: ["/project/README.md"], operation: "cut" },
        currentPath: "/project",
      });

      await useFileTreeStore.getState().pasteFromClipboard("/project/src");

      expect(invoke).toHaveBeenCalledWith("move_file_or_dir", {
        projectPath: "/project",
        sourcePath: "/project/README.md",
        targetDir: "/project/src",
      });
    });

    it("should clear clipboard and selection after cut paste", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockResolvedValue(undefined);

      useFileTreeStore.setState({
        clipboard: { paths: ["/project/README.md"], operation: "cut" },
        selectedPaths: { "/project/README.md": true },
        currentPath: "/project",
      });

      await useFileTreeStore.getState().pasteFromClipboard("/project/src");

      const state = useFileTreeStore.getState();
      expect(state.clipboard).toBeNull();
      expect(state.selectedPaths).toEqual({});
    });

    it("should not clear clipboard after copy paste", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockResolvedValue(undefined);

      useFileTreeStore.setState({
        clipboard: { paths: ["/project/README.md"], operation: "copy" },
        currentPath: "/project",
      });

      await useFileTreeStore.getState().pasteFromClipboard("/project/src");

      expect(useFileTreeStore.getState().clipboard).toEqual({
        paths: ["/project/README.md"],
        operation: "copy",
      });
    });

    it("should do nothing when clipboard is null", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockResolvedValue(undefined);

      useFileTreeStore.setState({ clipboard: null, currentPath: "/project" });

      await useFileTreeStore.getState().pasteFromClipboard("/project/src");

      expect(invoke).not.toHaveBeenCalledWith(
        expect.stringMatching(/copy_file_or_dir|move_file_or_dir/),
        expect.anything(),
      );
    });

    it("should do nothing when currentPath is null", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockResolvedValue(undefined);

      useFileTreeStore.setState({
        clipboard: { paths: ["/project/README.md"], operation: "copy" },
        currentPath: null,
      });

      await useFileTreeStore.getState().pasteFromClipboard("/project/src");

      expect(invoke).not.toHaveBeenCalledWith(
        expect.stringMatching(/copy_file_or_dir|move_file_or_dir/),
        expect.anything(),
      );
    });

    it("should handle multiple paths in clipboard", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockResolvedValue(undefined);

      useFileTreeStore.setState({
        clipboard: {
          paths: ["/project/README.md", "/project/src"],
          operation: "copy",
        },
        currentPath: "/project",
      });

      await useFileTreeStore.getState().pasteFromClipboard("/project/docs");

      expect(invoke).toHaveBeenCalledWith("copy_file_or_dir", {
        projectPath: "/project",
        sourcePath: "/project/README.md",
        targetDir: "/project/docs",
      });
      expect(invoke).toHaveBeenCalledWith("copy_file_or_dir", {
        projectPath: "/project",
        sourcePath: "/project/src",
        targetDir: "/project/docs",
      });
    });
  });
});
