import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFilePreviewStore } from "@/stores/file-preview";

// Mock IPC layer
vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
}));

describe("useFilePreviewStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useFilePreviewStore.setState({
      isOpen: false,
      currentFile: null,
      content: null,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe("togglePreview", () => {
    it("should toggle isOpen from false to true", () => {
      const { togglePreview, isOpen: initialIsOpen } =
        useFilePreviewStore.getState();
      expect(initialIsOpen).toBe(false);

      togglePreview();

      const { isOpen: newIsOpen } = useFilePreviewStore.getState();
      expect(newIsOpen).toBe(true);
    });

    it("should toggle isOpen from true to false", () => {
      useFilePreviewStore.setState({ isOpen: true });

      const { togglePreview } = useFilePreviewStore.getState();
      togglePreview();

      const { isOpen } = useFilePreviewStore.getState();
      expect(isOpen).toBe(false);
    });
  });

  describe("openPreview", () => {
    it("should set isOpen to true", () => {
      const { openPreview } = useFilePreviewStore.getState();
      openPreview();

      const { isOpen } = useFilePreviewStore.getState();
      expect(isOpen).toBe(true);
    });
  });

  describe("closePreview", () => {
    it("should clear file content but keep panel open", () => {
      // Set non-default state
      useFilePreviewStore.setState({
        isOpen: true,
        currentFile: "/test/file.ts",
        content: {
          path: "/test/file.ts",
          content: "test content",
          size: 100,
        },
        isLoading: false,
        error: "some error",
      });

      const { closePreview } = useFilePreviewStore.getState();
      closePreview();

      const state = useFilePreviewStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.currentFile).toBeNull();
      expect(state.content).toBeNull();
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe("loadFile", () => {
    it("should set loading state initially", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  path: "/test/file.ts",
                  content: "test content",
                  size: 100,
                }),
              50,
            );
          }),
      );

      const { loadFile } = useFilePreviewStore.getState();
      const promise = loadFile("/test/file.ts");

      // Check loading state immediately
      const { isLoading, currentFile } = useFilePreviewStore.getState();
      expect(isLoading).toBe(true);
      expect(currentFile).toBe("/test/file.ts");

      await promise;
    });

    it("should load file content successfully", async () => {
      const { invoke } = await import("@/lib/ipc");
      const mockContent = {
        path: "/test/file.ts",
        content: "test content",
        size: 100,
      };
      vi.mocked(invoke).mockResolvedValue(mockContent);

      const { loadFile } = useFilePreviewStore.getState();
      await loadFile("/test/file.ts");

      const state = useFilePreviewStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isOpen).toBe(true);
      expect(state.currentFile).toBe("/test/file.ts");
      expect(state.content).toEqual(mockContent);
      expect(state.error).toBeNull();

      expect(invoke).toHaveBeenCalledWith("read_file_command", {
        path: "/test/file.ts",
        maxSizeMb: 10,
      });
    });

    it("should handle errors when loading file", async () => {
      const { invoke } = await import("@/lib/ipc");
      const errorMessage = "File not found";
      vi.mocked(invoke).mockRejectedValue(new Error(errorMessage));

      const { loadFile } = useFilePreviewStore.getState();
      await loadFile("/test/nonexistent.ts");

      const state = useFilePreviewStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.content).toBeNull();
      expect(state.error).toBe(errorMessage);
    });

    it("should handle string errors when loading file", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockRejectedValue("String error message");

      const { loadFile } = useFilePreviewStore.getState();
      await loadFile("/test/file.ts");

      const state = useFilePreviewStore.getState();
      expect(state.error).toBe("String error message");
    });

    it("should handle unknown errors when loading file", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockRejectedValue({ custom: "error object" });

      const { loadFile } = useFilePreviewStore.getState();
      await loadFile("/test/file.ts");

      const state = useFilePreviewStore.getState();
      expect(state.error).toBe("Failed to load file");
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      useFilePreviewStore.setState({ error: "some error" });

      const { clearError } = useFilePreviewStore.getState();
      clearError();

      const { error } = useFilePreviewStore.getState();
      expect(error).toBeNull();
    });
  });

  describe("savePreviewForProject", () => {
    it("saves current open preview state keyed by project path", () => {
      useFilePreviewStore.setState({
        isOpen: true,
        currentFile: "/project-a/src/main.ts",
        content: {
          path: "/project-a/src/main.ts",
          content: "export default {};",
          size: 18,
        },
      });

      useFilePreviewStore.getState().savePreviewForProject("/project-a");

      const { previewByProject } = useFilePreviewStore.getState();
      expect(previewByProject["/project-a"]).toEqual({
        currentFile: "/project-a/src/main.ts",
        content: {
          path: "/project-a/src/main.ts",
          content: "export default {};",
          size: 18,
        },
      });
    });

    it("saves null when preview is closed", () => {
      useFilePreviewStore.setState({
        isOpen: false,
        currentFile: null,
        content: null,
      });

      useFilePreviewStore.getState().savePreviewForProject("/project-a");

      const { previewByProject } = useFilePreviewStore.getState();
      expect(previewByProject["/project-a"]).toBeNull();
    });

    it("saves null when preview is open but has no currentFile", () => {
      useFilePreviewStore.setState({
        isOpen: true,
        currentFile: null,
        content: null,
      });

      useFilePreviewStore.getState().savePreviewForProject("/project-a");

      const { previewByProject } = useFilePreviewStore.getState();
      expect(previewByProject["/project-a"]).toBeNull();
    });

    it("does not overwrite saved state for other projects", () => {
      useFilePreviewStore.setState({
        isOpen: true,
        currentFile: "/project-a/file.ts",
        content: { path: "/project-a/file.ts", content: "a", size: 1 },
        previewByProject: {
          "/project-b": {
            currentFile: "/project-b/file.ts",
            content: { path: "/project-b/file.ts", content: "b", size: 1 },
          },
        },
      });

      useFilePreviewStore.getState().savePreviewForProject("/project-a");

      const { previewByProject } = useFilePreviewStore.getState();
      expect(previewByProject["/project-b"]).toBeDefined();
      expect(previewByProject["/project-b"]?.currentFile).toBe("/project-b/file.ts");
    });
  });

  describe("restorePreviewForProject", () => {
    it("restores saved preview state for a project", () => {
      useFilePreviewStore.setState({
        isOpen: false,
        currentFile: null,
        content: null,
        previewByProject: {
          "/project-a": {
            currentFile: "/project-a/src/main.ts",
            content: {
              path: "/project-a/src/main.ts",
              content: "export default {};",
              size: 18,
            },
          },
        },
      });

      useFilePreviewStore.getState().restorePreviewForProject("/project-a");

      const state = useFilePreviewStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.currentFile).toBe("/project-a/src/main.ts");
      expect(state.content).toEqual({
        path: "/project-a/src/main.ts",
        content: "export default {};",
        size: 18,
      });
    });

    it("keeps panel open but clears file when saved state is null", () => {
      useFilePreviewStore.setState({
        isOpen: true,
        currentFile: "/some/file.ts",
        content: { path: "/some/file.ts", content: "x", size: 1 },
        previewByProject: { "/project-a": null },
      });

      useFilePreviewStore.getState().restorePreviewForProject("/project-a");

      const state = useFilePreviewStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.currentFile).toBeNull();
      expect(state.content).toBeNull();
    });

    it("keeps panel open but clears file when no saved state exists for project", () => {
      useFilePreviewStore.setState({
        isOpen: true,
        currentFile: "/some/file.ts",
        content: { path: "/some/file.ts", content: "x", size: 1 },
        previewByProject: {},
      });

      useFilePreviewStore.getState().restorePreviewForProject("/project-unknown");

      const state = useFilePreviewStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.currentFile).toBeNull();
      expect(state.content).toBeNull();
    });

    it("round-trip: save project A, switch to project B, save B, restore A", () => {
      // Start at project A with a file open
      useFilePreviewStore.setState({
        isOpen: true,
        currentFile: "/project-a/index.ts",
        content: { path: "/project-a/index.ts", content: "A content", size: 9 },
        previewByProject: {},
      });

      // Save project A's state
      useFilePreviewStore.getState().savePreviewForProject("/project-a");

      // Switch to project B - open a different file
      useFilePreviewStore.setState({
        isOpen: true,
        currentFile: "/project-b/main.ts",
        content: { path: "/project-b/main.ts", content: "B content", size: 9 },
      });

      // Save project B's state
      useFilePreviewStore.getState().savePreviewForProject("/project-b");

      // Now restore project A
      useFilePreviewStore.getState().restorePreviewForProject("/project-a");

      const state = useFilePreviewStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.currentFile).toBe("/project-a/index.ts");
      expect(state.content?.content).toBe("A content");
    });
  });
});
