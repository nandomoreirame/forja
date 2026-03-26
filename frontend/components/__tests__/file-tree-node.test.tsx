import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileTreeNode } from "../file-tree-node";
import { useFileTreeStore, type FileNode } from "@/stores/file-tree";
import { useFilePreviewStore } from "@/stores/file-preview";

vi.mock("@/lib/ipc", () => ({ invoke: vi.fn(), open: vi.fn() }));

describe("FileTreeNode", () => {
  beforeEach(() => {
    vi.useFakeTimers();
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should call selectFile when a file node is single-clicked (after 200ms delay)", async () => {
    const selectFileSpy = vi.spyOn(useFileTreeStore.getState(), "selectFile");

    const fileNode: FileNode = {
      name: "test.ts",
      path: "/project/test.ts",
      isDir: false,
      extension: "ts",
    };

    render(<FileTreeNode node={fileNode} depth={0} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    // Before the delay, selectFile should not have been called yet
    expect(selectFileSpy).not.toHaveBeenCalled();

    // After 200ms, selectFile should be called
    act(() => { vi.advanceTimersByTime(200); });
    expect(selectFileSpy).toHaveBeenCalledWith("/project/test.ts");
  });

  it("should call pinFile when a file node is double-clicked", async () => {
    const pinFileSpy = vi.spyOn(useFileTreeStore.getState(), "pinFile");
    const selectFileSpy = vi.spyOn(useFileTreeStore.getState(), "selectFile");

    const fileNode: FileNode = {
      name: "test.ts",
      path: "/project/test.ts",
      isDir: false,
      extension: "ts",
    };

    render(<FileTreeNode node={fileNode} depth={0} />);

    const button = screen.getByRole("button");
    // Simulate double-click: two clicks + dblclick event
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.doubleClick(button);

    // pinFile should be called
    expect(pinFileSpy).toHaveBeenCalledWith("/project/test.ts");

    // selectFile should NOT be called (double-click cancels the single-click timeout)
    act(() => { vi.advanceTimersByTime(200); });
    expect(selectFileSpy).not.toHaveBeenCalled();
  });

  it("should toggle expanded when a directory node is clicked", async () => {
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
    fireEvent.click(button);

    expect(toggleExpandedSpy).toHaveBeenCalledWith("/project/src");
  });

  it("should not call selectFile when a directory is clicked", async () => {
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
    fireEvent.click(button);

    act(() => { vi.advanceTimersByTime(200); });
    expect(selectFileSpy).not.toHaveBeenCalled();
  });

  it("should not call pinFile when a directory is double-clicked", async () => {
    const pinFileSpy = vi.spyOn(useFileTreeStore.getState(), "pinFile");

    const dirNode: FileNode = {
      name: "src",
      path: "/project/src",
      isDir: true,
      children: [],
    };

    render(<FileTreeNode node={dirNode} depth={0} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.doubleClick(button);

    act(() => { vi.advanceTimersByTime(200); });
    expect(pinFileSpy).not.toHaveBeenCalled();
  });

  it("should call loadSubdirectory when expanding a directory with empty children", async () => {
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
    fireEvent.click(button);

    expect(loadSubdirectorySpy).toHaveBeenCalledWith(
      "/project/src/components",
      "/project",
    );
  });

  it("should NOT call loadSubdirectory when expanding a directory that already has children", async () => {
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
    fireEvent.click(button);

    expect(loadSubdirectorySpy).not.toHaveBeenCalled();
  });

  it("should NOT call loadSubdirectory when collapsing a directory", async () => {
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
    fireEvent.click(button);

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

  it("should apply selection highlight when node path is in selectedPaths", () => {
    const fileNode: FileNode = {
      name: "selected.ts",
      path: "/project/selected.ts",
      isDir: false,
      extension: "ts",
    };

    useFileTreeStore.setState({
      selectedPaths: { "/project/selected.ts": true },
    });

    render(<FileTreeNode node={fileNode} depth={0} />);

    expect(screen.getByRole("button")).toHaveClass("bg-ctp-surface0/50");
  });

  it("should not apply selection highlight when node path is not in selectedPaths", () => {
    const fileNode: FileNode = {
      name: "unselected.ts",
      path: "/project/unselected.ts",
      isDir: false,
      extension: "ts",
    };

    useFileTreeStore.setState({
      selectedPaths: {},
    });

    render(<FileTreeNode node={fileNode} depth={0} />);

    const button = screen.getByRole("button");
    // The active highlight bg-ctp-surface0 might be present, but not the selection variant
    expect(button).not.toHaveClass("bg-ctp-surface0/50");
  });
});
