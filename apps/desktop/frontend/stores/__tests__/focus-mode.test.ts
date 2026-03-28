import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFocusModeStore } from "../focus-mode";

// Mock tiling-layout store
const mockHasBlock = vi.fn();
const mockRemoveBlock = vi.fn();
const mockAddBlock = vi.fn();

vi.mock("../tiling-layout", () => ({
  useTilingLayoutStore: {
    getState: () => ({
      hasBlock: mockHasBlock,
      removeBlock: mockRemoveBlock,
      addBlock: mockAddBlock,
    }),
  },
}));

// Mock file-preview store
const mockClosePreview = vi.fn();
const mockOpenPreview = vi.fn();
vi.mock("../file-preview", () => ({
  useFilePreviewStore: {
    getState: () => ({
      isOpen: true,
      currentFile: "/some/file.ts",
      closePreview: mockClosePreview,
      openPreview: mockOpenPreview,
    }),
  },
}));

// Mock agent-chat store
const mockTogglePanel = vi.fn();
vi.mock("../agent-chat", () => ({
  useAgentChatStore: {
    getState: () => ({
      isPanelOpen: true,
      togglePanel: mockTogglePanel,
    }),
  },
}));

describe("useFocusModeStore", () => {
  beforeEach(() => {
    useFocusModeStore.setState({
      isActive: false,
      snapshot: null,
    });
    vi.clearAllMocks();
    mockHasBlock.mockReturnValue(false);
  });

  it("starts with isActive as false", () => {
    const state = useFocusModeStore.getState();
    expect(state.isActive).toBe(false);
  });

  it("starts with snapshot as null", () => {
    const state = useFocusModeStore.getState();
    expect(state.snapshot).toBeNull();
  });

  describe("enterFocusMode", () => {
    it("sets isActive to true", () => {
      mockHasBlock.mockReturnValue(true);
      useFocusModeStore.getState().enterFocusMode();
      expect(useFocusModeStore.getState().isActive).toBe(true);
    });

    it("captures snapshot of current panel state", () => {
      mockHasBlock.mockImplementation((id: string) => {
        if (id === "tab-file-tree") return true;
        if (id === "block-file-preview") return true;
        if (id === "block-agent-chat") return false;
        return false;
      });

      useFocusModeStore.getState().enterFocusMode();

      const { snapshot } = useFocusModeStore.getState();
      expect(snapshot).not.toBeNull();
      expect(snapshot!.fileTreeOpen).toBe(true);
      expect(snapshot!.filePreviewOpen).toBe(true);
      expect(snapshot!.agentChatOpen).toBe(false);
    });

    it("removes side panels from tiling layout", () => {
      mockHasBlock.mockImplementation((id: string) => {
        if (id === "tab-file-tree") return true;
        if (id === "block-file-preview") return true;
        if (id === "block-agent-chat") return true;
        return false;
      });

      useFocusModeStore.getState().enterFocusMode();

      expect(mockRemoveBlock).toHaveBeenCalledWith("tab-file-tree");
      expect(mockRemoveBlock).toHaveBeenCalledWith("block-file-preview");
      expect(mockRemoveBlock).toHaveBeenCalledWith("block-agent-chat");
    });

    it("does not remove panels that are already closed", () => {
      mockHasBlock.mockReturnValue(false);

      useFocusModeStore.getState().enterFocusMode();

      expect(mockRemoveBlock).not.toHaveBeenCalled();
    });

    it("is a no-op if already active", () => {
      mockHasBlock.mockReturnValue(true);
      useFocusModeStore.getState().enterFocusMode();
      vi.clearAllMocks();

      useFocusModeStore.getState().enterFocusMode();

      expect(mockRemoveBlock).not.toHaveBeenCalled();
    });
  });

  describe("exitFocusMode", () => {
    it("sets isActive to false", () => {
      mockHasBlock.mockReturnValue(true);
      useFocusModeStore.getState().enterFocusMode();

      useFocusModeStore.getState().exitFocusMode();

      expect(useFocusModeStore.getState().isActive).toBe(false);
    });

    it("clears snapshot after exit", () => {
      mockHasBlock.mockReturnValue(true);
      useFocusModeStore.getState().enterFocusMode();

      useFocusModeStore.getState().exitFocusMode();

      expect(useFocusModeStore.getState().snapshot).toBeNull();
    });

    it("restores file-tree from snapshot", () => {
      mockHasBlock.mockImplementation((id: string) => id === "tab-file-tree");
      useFocusModeStore.getState().enterFocusMode();
      // After enter, hasBlock should return false (removed)
      mockHasBlock.mockReturnValue(false);

      useFocusModeStore.getState().exitFocusMode();

      expect(mockAddBlock).toHaveBeenCalledWith(
        { type: "file-tree" },
        undefined,
        "tab-file-tree",
      );
    });

    it("restores file-preview from snapshot", () => {
      mockHasBlock.mockImplementation((id: string) => id === "block-file-preview");
      useFocusModeStore.getState().enterFocusMode();
      mockHasBlock.mockReturnValue(false);

      useFocusModeStore.getState().exitFocusMode();

      expect(mockOpenPreview).toHaveBeenCalled();
    });

    it("restores agent-chat from snapshot", () => {
      mockHasBlock.mockImplementation((id: string) => id === "block-agent-chat");
      useFocusModeStore.getState().enterFocusMode();
      mockHasBlock.mockReturnValue(false);

      useFocusModeStore.getState().exitFocusMode();

      expect(mockTogglePanel).toHaveBeenCalled();
    });

    it("does not restore panels that were closed before entering", () => {
      mockHasBlock.mockReturnValue(false);
      useFocusModeStore.getState().enterFocusMode();

      useFocusModeStore.getState().exitFocusMode();

      expect(mockAddBlock).not.toHaveBeenCalled();
      expect(mockOpenPreview).not.toHaveBeenCalled();
      expect(mockTogglePanel).not.toHaveBeenCalled();
    });

    it("is a no-op if not active", () => {
      useFocusModeStore.getState().exitFocusMode();

      expect(useFocusModeStore.getState().isActive).toBe(false);
      expect(mockAddBlock).not.toHaveBeenCalled();
    });
  });

  describe("toggleFocusMode", () => {
    it("enters focus mode when inactive", () => {
      mockHasBlock.mockReturnValue(true);
      useFocusModeStore.getState().toggleFocusMode();
      expect(useFocusModeStore.getState().isActive).toBe(true);
    });

    it("exits focus mode when active", () => {
      mockHasBlock.mockReturnValue(true);
      useFocusModeStore.getState().enterFocusMode();

      useFocusModeStore.getState().toggleFocusMode();

      expect(useFocusModeStore.getState().isActive).toBe(false);
    });
  });
});
