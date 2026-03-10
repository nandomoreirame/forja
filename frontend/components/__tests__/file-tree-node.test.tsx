import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileTreeNode } from "../file-tree-node";
import { useFileTreeStore, type FileNode } from "@/stores/file-tree";
import { useFilePreviewStore } from "@/stores/file-preview";

vi.mock("@/lib/ipc", () => ({ invoke: vi.fn(), open: vi.fn() }));

describe("FileTreeNode", () => {
  beforeEach(() => {
    useFileTreeStore.setState({
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

  it("should call loadSubdirectory when expanding a directory with empty children", async () => {
    const user = userEvent.setup();
    const loadSubdirectorySpy = vi.spyOn(
      useFileTreeStore.getState(),
      "loadSubdirectory",
    );

    // Directory truncated by maxDepth (children is empty array)
    const dirNode: FileNode = {
      name: "components",
      path: "/project/src/components",
      isDir: true,
      children: [],
    };

    useFileTreeStore.setState({
      expandedPaths: {},
      currentPath: "/project",
      activeProjectPath: "/project",
    });

    render(<FileTreeNode node={dirNode} depth={1} projectPath="/project" />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(loadSubdirectorySpy).toHaveBeenCalledWith(
      "/project/src/components",
      "/project",
    );
  });

  it("should NOT call loadSubdirectory when expanding a directory that already has children", async () => {
    const user = userEvent.setup();
    const loadSubdirectorySpy = vi.spyOn(
      useFileTreeStore.getState(),
      "loadSubdirectory",
    );

    const dirNode: FileNode = {
      name: "src",
      path: "/project/src",
      isDir: true,
      children: [
        { name: "index.ts", path: "/project/src/index.ts", isDir: false },
      ],
    };

    useFileTreeStore.setState({
      expandedPaths: {},
      currentPath: "/project",
      activeProjectPath: "/project",
    });

    render(<FileTreeNode node={dirNode} depth={0} projectPath="/project" />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(loadSubdirectorySpy).not.toHaveBeenCalled();
  });

  it("should NOT call loadSubdirectory when collapsing a directory", async () => {
    const user = userEvent.setup();
    const loadSubdirectorySpy = vi.spyOn(
      useFileTreeStore.getState(),
      "loadSubdirectory",
    );

    const dirNode: FileNode = {
      name: "components",
      path: "/project/src/components",
      isDir: true,
      children: [],
    };

    // Directory is already expanded
    useFileTreeStore.setState({
      expandedPaths: { "/project/src/components": true },
      currentPath: "/project",
      activeProjectPath: "/project",
    });

    render(<FileTreeNode node={dirNode} depth={1} projectPath="/project" />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(loadSubdirectorySpy).not.toHaveBeenCalled();
  });

  it("should apply reduced opacity for ignored files", () => {
    const ignoredNode: FileNode = {
      name: "ignored.log",
      path: "/project/ignored.log",
      isDir: false,
      extension: "log",
      ignored: true,
    };

    render(<FileTreeNode node={ignoredNode} depth={0} />);

    expect(screen.getByRole("button")).toHaveClass("opacity-50");
  });
});
