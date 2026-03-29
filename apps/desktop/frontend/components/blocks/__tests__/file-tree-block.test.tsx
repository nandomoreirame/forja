import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/components/file-tree-sidebar", () => ({
  FileTreeSidebar: () => <div data-testid="file-tree-sidebar">sidebar</div>,
}));

vi.mock("@/stores/file-tree", async () => {
  const { create } = await import("zustand");
  const useFileTreeStore = create(() => ({
    isOpen: false,
  }));
  return { useFileTreeStore };
});

const { FileTreeBlock } = await import("../file-tree-block");
const { useFileTreeStore } = await import("@/stores/file-tree");

describe("FileTreeBlock", () => {
  beforeEach(() => {
    useFileTreeStore.setState({ isOpen: false });
  });

  it("sets isOpen to true on mount so FileTreeSidebar renders", () => {
    render(<FileTreeBlock />);
    expect(useFileTreeStore.getState().isOpen).toBe(true);
  });
});
