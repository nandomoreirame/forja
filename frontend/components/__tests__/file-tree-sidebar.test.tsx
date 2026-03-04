import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileTreeSidebar } from "../file-tree-sidebar";
import { useWorkspaceStore } from "@/stores/workspace";
import { useAppDialogsStore } from "@/stores/app-dialogs";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  open: vi.fn(),
}));

describe("FileTreeSidebar", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: null,
      loading: false,
    });
    useAppDialogsStore.setState({
      shortcutsOpen: false,
      aboutOpen: false,
      createWorkspaceOpen: false,
      createWorkspacePendingPath: null,
      createWorkspaceEditId: null,
      createWorkspaceInitialName: null,
    });
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

  it("allows collapsing the single project root directory", async () => {
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
    const toggleButton = screen.getByRole("button", { name: "Collapse my-project" });
    await user.click(toggleButton);
    expect(screen.getByRole("button", { name: "Expand my-project" })).toBeInTheDocument();
  });
});

const stubTree = {
  root: { name: "stub", path: "/stub", isDir: true, children: [] },
};

describe("WorkspaceHeader dropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders active workspace name as dropdown trigger", async () => {
    const { useFileTreeStore } = await import("@/stores/file-tree");
    useFileTreeStore.setState({ isOpen: true, tree: stubTree });
    useWorkspaceStore.setState({
      workspaces: [
        { id: "ws-1", name: "My Workspace", projects: [], createdAt: "", lastUsedAt: "" },
      ],
      activeWorkspaceId: "ws-1",
    });

    render(<FileTreeSidebar />);

    const trigger = screen.getByRole("button", { name: /workspace switcher/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toContain("My Workspace");
  });

  it("shows chevron icon on workspace trigger", async () => {
    const { useFileTreeStore } = await import("@/stores/file-tree");
    useFileTreeStore.setState({ isOpen: true, tree: stubTree });
    useWorkspaceStore.setState({
      workspaces: [
        { id: "ws-1", name: "Dev", projects: [], createdAt: "", lastUsedAt: "" },
      ],
      activeWorkspaceId: "ws-1",
    });

    render(<FileTreeSidebar />);

    const trigger = screen.getByRole("button", { name: /workspace switcher/i });
    expect(trigger.querySelector("svg")).toBeTruthy();
  });

  it("opens dropdown with workspace list on click", async () => {
    const user = userEvent.setup();
    const { useFileTreeStore } = await import("@/stores/file-tree");
    useFileTreeStore.setState({ isOpen: true, tree: stubTree });
    useWorkspaceStore.setState({
      workspaces: [
        { id: "ws-1", name: "Workspace A", projects: [], createdAt: "", lastUsedAt: "" },
        { id: "ws-2", name: "Workspace B", projects: ["/p1"], createdAt: "", lastUsedAt: "" },
      ],
      activeWorkspaceId: "ws-1",
    });

    render(<FileTreeSidebar />);

    const trigger = screen.getByRole("button", { name: /workspace switcher/i });
    await user.click(trigger);

    const itemA = await screen.findByRole("menuitemradio", { name: /Workspace A/i });
    const itemB = await screen.findByRole("menuitemradio", { name: /Workspace B/i });
    expect(itemA).toBeInTheDocument();
    expect(itemB).toBeInTheDocument();
  });

  it("shows check mark on active workspace in dropdown", async () => {
    const user = userEvent.setup();
    const { useFileTreeStore } = await import("@/stores/file-tree");
    useFileTreeStore.setState({ isOpen: true, tree: stubTree });
    useWorkspaceStore.setState({
      workspaces: [
        { id: "ws-1", name: "Active WS", projects: [], createdAt: "", lastUsedAt: "" },
        { id: "ws-2", name: "Other WS", projects: [], createdAt: "", lastUsedAt: "" },
      ],
      activeWorkspaceId: "ws-1",
    });

    render(<FileTreeSidebar />);

    await user.click(screen.getByRole("button", { name: /workspace switcher/i }));

    const activeItem = await screen.findByRole("menuitemradio", { name: /Active WS/i });
    expect(activeItem).toHaveAttribute("data-state", "checked");
  });

  it("shows create workspace option in dropdown", async () => {
    const user = userEvent.setup();
    const { useFileTreeStore } = await import("@/stores/file-tree");
    useFileTreeStore.setState({ isOpen: true, tree: stubTree });
    useWorkspaceStore.setState({
      workspaces: [
        { id: "ws-1", name: "WS", projects: [], createdAt: "", lastUsedAt: "" },
      ],
      activeWorkspaceId: "ws-1",
    });

    render(<FileTreeSidebar />);

    await user.click(screen.getByRole("button", { name: /workspace switcher/i }));

    expect(await screen.findByText("Create workspace")).toBeInTheDocument();
  });

  it("opens workspace modal in rename mode from pencil button", async () => {
    const user = userEvent.setup();
    const { useFileTreeStore } = await import("@/stores/file-tree");
    useFileTreeStore.setState({ isOpen: true, tree: stubTree });
    useWorkspaceStore.setState({
      workspaces: [
        { id: "ws-1", name: "Workspace A", projects: [], createdAt: "", lastUsedAt: "" },
      ],
      activeWorkspaceId: "ws-1",
    });

    render(<FileTreeSidebar />);
    await user.click(screen.getByRole("button", { name: /rename workspace/i }));

    const dialogs = useAppDialogsStore.getState();
    expect(dialogs.createWorkspaceOpen).toBe(true);
    expect(dialogs.createWorkspaceEditId).toBe("ws-1");
    expect(dialogs.createWorkspaceInitialName).toBe("Workspace A");
  });
});
