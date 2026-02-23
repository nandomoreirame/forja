import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFileTreeStore } from "@/stores/file-tree";
import { useFilePreviewStore } from "@/stores/file-preview";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

describe("useFileTreeStore - selectFile", () => {
  beforeEach(() => {
    // Reset both stores
    useFileTreeStore.setState({
      isOpen: false,
      currentPath: null,
      tree: null,
      expandedPaths: {},
    });

    useFilePreviewStore.setState({
      isOpen: false,
      currentFile: null,
      content: null,
      isLoading: false,
      error: null,
    });

    vi.clearAllMocks();
  });

  it("should call loadFile on the preview store with the given path", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const mockContent = {
      path: "/test/file.ts",
      content: "test content",
      size: 100,
    };
    vi.mocked(invoke).mockResolvedValue(mockContent);

    const { selectFile } = useFileTreeStore.getState();
    await selectFile("/test/file.ts");

    const previewState = useFilePreviewStore.getState();
    expect(previewState.currentFile).toBe("/test/file.ts");
    expect(previewState.content).toEqual(mockContent);

    expect(invoke).toHaveBeenCalledWith("read_file_command", {
      path: "/test/file.ts",
      maxSizeMb: 10,
    });
  });

  it("should propagate errors from loadFile", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValue(new Error("File not found"));

    const { selectFile } = useFileTreeStore.getState();
    await selectFile("/test/nonexistent.ts");

    const previewState = useFilePreviewStore.getState();
    expect(previewState.error).toBe("File not found");
    expect(previewState.content).toBeNull();
  });
});
