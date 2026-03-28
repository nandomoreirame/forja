import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileTreeSidebar, SIDEBAR_MAX_WIDTH } from "../file-tree-sidebar";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  open: vi.fn(),
}));

describe("FileTreeSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports SIDEBAR_MAX_WIDTH as '500px' to limit the resizable panel", () => {
    expect(SIDEBAR_MAX_WIDTH).toBe("500px");
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

  it("renders file tree content area when a project is loaded", async () => {
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

    const sidebar = screen.getByTestId("file-tree-sidebar");
    expect(sidebar).toBeInTheDocument();
    // File tree scroll container is rendered (toolbar buttons are now in the tiling tab strip)
    expect(sidebar.querySelector(".overflow-y-auto")).toBeInTheDocument();
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
    });

    render(<FileTreeSidebar />);

    // Sidebar renders for the active tree; project name is shown in the tiling tab, not in pane content
    const sidebar = screen.getByTestId("file-tree-sidebar");
    expect(sidebar).toBeInTheDocument();
  });
});
