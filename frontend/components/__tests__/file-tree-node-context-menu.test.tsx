import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileTreeNode } from "../file-tree-node";
import { useFileTreeStore, type FileNode } from "@/stores/file-tree";
import { useFilePreviewStore } from "@/stores/file-preview";
import { useWorkspaceStore } from "@/stores/workspace";

const mockInvoke = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  open: vi.fn(),
}));

const fileNode: FileNode = {
  name: "test.ts",
  path: "/project/src/test.ts",
  isDir: false,
  extension: "ts",
};

const dirNode: FileNode = {
  name: "src",
  path: "/project/src",
  isDir: true,
  children: [],
};

const rootDirNode: FileNode = {
  name: "project",
  path: "/project",
  isDir: true,
  children: [],
};

describe("FileTreeNode - Context Menu", () => {
  beforeEach(() => {
    useFileTreeStore.setState({
      expandedPaths: {},
      currentPath: "/project",
      trees: { "/project": { root: rootDirNode } },
      activeProjectPath: "/project",
    });
    useFilePreviewStore.setState({
      isOpen: false,
      currentFile: null,
      content: null,
      isLoading: false,
      error: null,
    });
    useWorkspaceStore.setState({
      workspaces: [
        {
          id: "ws-1",
          name: "My Workspace",
          projects: [{ path: "/project", name: "project", last_opened: "" }],
          createdAt: "",
          lastUsedAt: "",
        },
      ],
      activeWorkspaceId: "ws-1",
      loading: false,
    });
    mockInvoke.mockResolvedValue(undefined);
    vi.clearAllMocks();
  });

  it("shows context menu on right-click of a file node", async () => {
    const user = userEvent.setup();

    render(
      <FileTreeNode node={fileNode} depth={0} projectPath="/project" />
    );

    const button = screen.getByRole("button");
    await user.pointer({ target: button, keys: "[MouseRight]" });

    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it("shows context menu on right-click of a directory node", async () => {
    const user = userEvent.setup();

    render(
      <FileTreeNode node={dirNode} depth={0} projectPath="/project" />
    );

    const button = screen.getByRole("button");
    await user.pointer({ target: button, keys: "[MouseRight]" });

    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it("shows Rename option in context menu for a file", async () => {
    const user = userEvent.setup();

    render(
      <FileTreeNode node={fileNode} depth={0} projectPath="/project" />
    );

    const button = screen.getByRole("button");
    await user.pointer({ target: button, keys: "[MouseRight]" });

    expect(await screen.findByText("Rename")).toBeInTheDocument();
  });

  it("shows Delete option in context menu for a file", async () => {
    const user = userEvent.setup();

    render(
      <FileTreeNode node={fileNode} depth={0} projectPath="/project" />
    );

    const button = screen.getByRole("button");
    await user.pointer({ target: button, keys: "[MouseRight]" });

    expect(await screen.findByText("Delete")).toBeInTheDocument();
  });

  it("shows Remove from workspace option for project root in multi-project workspace", async () => {
    const user = userEvent.setup();

    // Set up workspace with 2 projects so isInMultiProjectWorkspace = true
    useWorkspaceStore.setState({
      workspaces: [
        {
          id: "ws-1",
          name: "My Workspace",
          projects: [
            { path: "/project", name: "project", last_opened: "" },
            { path: "/other-project", name: "other-project", last_opened: "" },
          ],
          createdAt: "",
          lastUsedAt: "",
        },
      ],
      activeWorkspaceId: "ws-1",
      loading: false,
    });

    // rootDirNode is the project root with projectPath === node.path
    render(
      <FileTreeNode node={rootDirNode} depth={0} projectPath="/project" />
    );

    const button = screen.getByRole("button");
    await user.pointer({ target: button, keys: "[MouseRight]" });

    expect(await screen.findByText("Remove from workspace")).toBeInTheDocument();
  });

  it("shows Rename option as clickable menu item", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValue(undefined);

    render(
      <FileTreeNode node={fileNode} depth={0} projectPath="/project" />
    );

    const button = screen.getByRole("button");
    await user.pointer({ target: button, keys: "[MouseRight]" });

    // Rename option should be present in the context menu
    const renameOption = await screen.findByText("Rename");
    expect(renameOption).toBeInTheDocument();

    // Clicking Rename should be possible (menu item is not disabled)
    const menuItem = renameOption.closest('[role="menuitem"]');
    expect(menuItem).not.toHaveAttribute("data-disabled");
  });

  it("shows delete confirmation dialog when Delete is clicked", async () => {
    const user = userEvent.setup();

    render(
      <FileTreeNode node={fileNode} depth={0} projectPath="/project" />
    );

    const button = screen.getByRole("button");
    await user.pointer({ target: button, keys: "[MouseRight]" });

    const deleteOption = await screen.findByText("Delete");
    await user.click(deleteOption);

    // A confirmation dialog should appear
    expect(await screen.findByText(/Are you sure/i)).toBeInTheDocument();
  });

  it("calls delete_file_or_dir IPC when delete is confirmed", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValue({ success: true });

    render(
      <FileTreeNode node={fileNode} depth={0} projectPath="/project" />
    );

    const button = screen.getByRole("button");
    await user.pointer({ target: button, keys: "[MouseRight]" });

    const deleteOption = await screen.findByText("Delete");
    await user.click(deleteOption);

    // Confirm button in the dialog
    const confirmBtn = await screen.findByRole("button", { name: /delete/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("delete_file_or_dir", {
        projectPath: "/project",
        targetPath: "/project/src/test.ts",
      });
    });
  });
});
