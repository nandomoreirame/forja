import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileTreeSidebar } from "../file-tree-sidebar";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  open: vi.fn(),
}));

describe("FileTreeSidebar", () => {
  it("renders nothing when closed", async () => {
    const { useFileTreeStore } = await import("@/stores/file-tree");
    useFileTreeStore.setState({ isOpen: false });

    const { container } = render(<FileTreeSidebar />);

    expect(container.innerHTML).toBe("");
  });

  it("renders as a fixed-width sidebar when open", async () => {
    const { useFileTreeStore } = await import("@/stores/file-tree");
    useFileTreeStore.setState({ isOpen: true, tree: null });

    render(<FileTreeSidebar />);

    const sidebar = screen.getByTestId("file-tree-sidebar");
    expect(sidebar).toBeInTheDocument();
    expect(sidebar.className).toMatch(/w-80/);
    expect(sidebar.className).toMatch(/shrink-0/);
  });

  it("shows 'No project loaded' when tree is null", async () => {
    const { useFileTreeStore } = await import("@/stores/file-tree");
    useFileTreeStore.setState({ isOpen: true, tree: null });

    render(<FileTreeSidebar />);

    expect(screen.getByText("No project loaded")).toBeInTheDocument();
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
});
