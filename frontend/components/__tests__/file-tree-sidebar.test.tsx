import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileTreeSidebar } from "../file-tree-sidebar";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  open: vi.fn(),
}));

describe("FileTreeSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when closed", async () => {
    const { useFileTreeStore } = await import("@/stores/file-tree");
    useFileTreeStore.setState({ isOpen: false });

    const { container } = render(<FileTreeSidebar />);

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when open but no project loaded (no tree, no multi-tree)", async () => {
    const { useFileTreeStore } = await import("@/stores/file-tree");
    useFileTreeStore.setState({ isOpen: true, tree: null, trees: {} });

    const { container } = render(<FileTreeSidebar />);

    expect(container.innerHTML).toBe("");
  });

  it("renders sidebar when open and tree exists", async () => {
    const { useFileTreeStore } = await import("@/stores/file-tree");
    useFileTreeStore.setState({
      isOpen: true,
      tree: {
        root: {
          name: "my-project",
          path: "/path/to/my-project",
          isDir: true,
          children: [],
        },
      },
      trees: {},
    });

    render(<FileTreeSidebar />);

    const sidebar = screen.getByTestId("file-tree-sidebar");
    expect(sidebar).toBeInTheDocument();
    expect(sidebar.className).toMatch(/flex/);
    expect(sidebar.className).toMatch(/h-full/);
  });

  it("renders tree nodes when a project is loaded", async () => {
    const { useFileTreeStore } = await import("@/stores/file-tree");
    useFileTreeStore.setState({
      isOpen: true,
      tree: {
        root: {
          name: "my-project",
          path: "/path/to/my-project",
          isDir: true,
          children: [
            { name: "src", path: "/path/to/my-project/src", isDir: true },
          ],
        },
      },
    });

    render(<FileTreeSidebar />);

    expect(screen.getByText("my-project")).toBeInTheDocument();
  });

  it("allows collapsing all folders via collapse-all button", async () => {
    const user = userEvent.setup();
    const { useFileTreeStore } = await import("@/stores/file-tree");
    useFileTreeStore.setState({
      isOpen: true,
      tree: {
        root: {
          name: "my-project",
          path: "/path/to/my-project",
          isDir: true,
          children: [
            { name: "src", path: "/path/to/my-project/src", isDir: true, children: [] },
          ],
        },
      },
      expandedPaths: {
        "/path/to/my-project": true,
      },
    });

    render(<FileTreeSidebar />);
    const collapseButton = screen.getByRole("button", { name: "Collapse all folders" });
    await user.click(collapseButton);
    expect(useFileTreeStore.getState().expandedPaths).toEqual({});
  });

  it("renders only active tree when multiple trees are cached", async () => {
    const { useFileTreeStore } = await import("@/stores/file-tree");
    const activeTree = {
      root: { name: "project-a", path: "/path/to/project-a", isDir: true, children: [] },
    };
    useFileTreeStore.setState({
      isOpen: true,
      tree: activeTree,
      trees: {
        "/path/to/project-a": activeTree,
        "/path/to/project-b": {
          root: { name: "project-b", path: "/path/to/project-b", isDir: true, children: [] },
        },
      },
      expandedPaths: { "/path/to/project-a": true },
    });

    render(<FileTreeSidebar />);

    expect(screen.getByText("project-a")).toBeInTheDocument();
    expect(screen.queryByText("project-b")).not.toBeInTheDocument();
  });
});
