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
    it("should reset all state to defaults", () => {
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
      expect(state.isOpen).toBe(false);
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
});
