import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(),
}));

import { useFilePreviewStore } from "../file-preview";
import { invoke } from "@/lib/ipc";

describe("file-preview store - edit mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFilePreviewStore.setState({
      isOpen: true,
      currentFile: "/project/test.ts",
      content: {
        path: "/project/test.ts",
        content: "const x = 1;",
        size: 12,
      },
      isLoading: false,
      error: null,
      isEditing: false,
      editContent: null,
      editDirty: false,
    });
  });

  it("should toggle edit mode on", () => {
    useFilePreviewStore.getState().setEditing(true);
    const state = useFilePreviewStore.getState();
    expect(state.isEditing).toBe(true);
    expect(state.editContent).toBe("const x = 1;");
  });

  it("should toggle edit mode off", () => {
    useFilePreviewStore.getState().setEditing(true);
    useFilePreviewStore.getState().setEditing(false);
    const state = useFilePreviewStore.getState();
    expect(state.isEditing).toBe(false);
    expect(state.editContent).toBeNull();
  });

  it("should track edit content changes", () => {
    useFilePreviewStore.getState().setEditing(true);
    useFilePreviewStore.getState().setEditContent("const x = 2;");
    const state = useFilePreviewStore.getState();
    expect(state.editContent).toBe("const x = 2;");
    expect(state.editDirty).toBe(true);
  });

  it("should save file via IPC", async () => {
    vi.mocked(invoke).mockResolvedValue({ success: true });
    useFilePreviewStore.getState().setEditing(true);
    useFilePreviewStore.getState().setEditContent("const x = 2;");
    await useFilePreviewStore.getState().saveFile();
    expect(invoke).toHaveBeenCalledWith("write_file", {
      path: "/project/test.ts",
      content: "const x = 2;",
    });
    const state = useFilePreviewStore.getState();
    expect(state.editDirty).toBe(false);
    expect(state.content?.content).toBe("const x = 2;");
  });

  it("should not save when no file is selected", async () => {
    useFilePreviewStore.setState({ currentFile: null });
    await useFilePreviewStore.getState().saveFile();
    expect(invoke).not.toHaveBeenCalled();
  });
});
