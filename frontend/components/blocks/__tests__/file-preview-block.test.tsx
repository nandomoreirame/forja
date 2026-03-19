import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const mockLoadFile = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

vi.mock("@/stores/file-preview", async () => {
  const { create } = await import("zustand");
  const useFilePreviewStore = create(() => ({
    isOpen: true,
    currentFile: null,
    content: null,
    isLoading: false,
    error: null,
    isEditing: false,
    editContent: null,
    editDirty: false,
    loadFile: mockLoadFile,
    setEditing: vi.fn(),
    setEditContent: vi.fn(),
    saveFile: vi.fn(),
  }));
  return { useFilePreviewStore };
});

vi.mock("@/stores/git-diff", async () => {
  const { create } = await import("zustand");
  const useGitDiffStore = create(() => ({
    selectedDiff: null,
    diffMode: "unified",
    isLoadingDiff: false,
    setDiffMode: vi.fn(),
    reset: vi.fn(),
  }));
  return { useGitDiffStore };
});

vi.mock("@/stores/tiling-layout", () => ({
  useTilingLayoutStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = { hasBlock: () => false, addBlock: vi.fn(), removeBlock: vi.fn() };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ hasBlock: () => false, addBlock: vi.fn(), removeBlock: vi.fn() }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    },
  ),
}));

const { FilePreviewBlock } = await import("../file-preview-block");
const { useFilePreviewStore } = await import("@/stores/file-preview");

describe("FilePreviewBlock", () => {
  beforeEach(() => {
    mockLoadFile.mockReset();
    useFilePreviewStore.setState({
      isOpen: true,
      currentFile: null,
      content: null,
      isLoading: false,
      error: null,
    });
  });

  it("calls loadFile on mount when config has filePath and store has no currentFile", () => {
    render(<FilePreviewBlock config={{ type: "file-preview", filePath: "/test/config.json" }} />);
    expect(mockLoadFile).toHaveBeenCalledWith("/test/config.json");
  });

  it("does not call loadFile when store already has a currentFile", () => {
    useFilePreviewStore.setState({ currentFile: "/existing/file.ts" });
    render(<FilePreviewBlock config={{ type: "file-preview", filePath: "/test/config.json" }} />);
    expect(mockLoadFile).not.toHaveBeenCalled();
  });

  it("does not call loadFile when config has no filePath", () => {
    render(<FilePreviewBlock config={{ type: "file-preview" }} />);
    expect(mockLoadFile).not.toHaveBeenCalled();
  });

  it("does not call loadFile when no config is provided", () => {
    render(<FilePreviewBlock />);
    expect(mockLoadFile).not.toHaveBeenCalled();
  });
});
