import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileTreeNode } from "../file-tree-node";
import { useFileTreeStore, type FileNode } from "@/stores/file-tree";
import { useFilePreviewStore } from "@/stores/file-preview";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));

describe("FileTreeNode", () => {
  beforeEach(() => {
    useFileTreeStore.setState({
      expandedPaths: new Set<string>(),
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

  it("should call selectFile when a file node is clicked", async () => {
    const user = userEvent.setup();
    const selectFileSpy = vi.spyOn(
      useFileTreeStore.getState(),
      "selectFile",
    );

    const fileNode: FileNode = {
      name: "test.ts",
      path: "/project/test.ts",
      isDir: false,
      extension: "ts",
    };

    render(<FileTreeNode node={fileNode} depth={0} />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(selectFileSpy).toHaveBeenCalledWith("/project/test.ts");
  });

  it("should toggle expanded when a directory node is clicked", async () => {
    const user = userEvent.setup();
    const toggleExpandedSpy = vi.spyOn(
      useFileTreeStore.getState(),
      "toggleExpanded",
    );

    const dirNode: FileNode = {
      name: "src",
      path: "/project/src",
      isDir: true,
      children: [],
    };

    render(<FileTreeNode node={dirNode} depth={0} />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(toggleExpandedSpy).toHaveBeenCalledWith("/project/src");
  });

  it("should not call selectFile when a directory is clicked", async () => {
    const user = userEvent.setup();
    const selectFileSpy = vi.spyOn(
      useFileTreeStore.getState(),
      "selectFile",
    );

    const dirNode: FileNode = {
      name: "src",
      path: "/project/src",
      isDir: true,
      children: [],
    };

    render(<FileTreeNode node={dirNode} depth={0} />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(selectFileSpy).not.toHaveBeenCalled();
  });
});
