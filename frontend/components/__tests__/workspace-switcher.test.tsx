import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInvoke = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock("@/stores/file-tree", () => ({
  useFileTreeStore: Object.assign(
    vi.fn(() => ({})),
    {
      getState: () => ({ trees: {} }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    }
  ),
}));

// Mock workspace store
const mockLoadWorkspaces = vi.fn();
const mockActivateWorkspace = vi.fn();
const mockUpdateWorkspaceDetails = vi.fn();
const mockDeleteWorkspace = vi.fn();
const mockCreateWorkspace = vi.fn();

let mockWorkspaces = [
  {
    id: "ws-1",
    name: "My Workspace",
    icon: "layers" as const,
    projects: [],
    createdAt: "2024-01-01",
    lastUsedAt: "2024-01-01",
  },
  {
    id: "ws-2",
    name: "Second Workspace",
    icon: "rocket" as const,
    projects: [],
    createdAt: "2024-01-01",
    lastUsedAt: "2024-01-01",
  },
];
let mockActiveWorkspaceId: string | null = "ws-1";

vi.mock("@/stores/workspace", () => ({
  useWorkspaceStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = {
        workspaces: mockWorkspaces,
        activeWorkspaceId: mockActiveWorkspaceId,
        loading: false,
        loadWorkspaces: mockLoadWorkspaces,
        activateWorkspace: mockActivateWorkspace,
        updateWorkspaceDetails: mockUpdateWorkspaceDetails,
        deleteWorkspace: mockDeleteWorkspace,
        createWorkspace: mockCreateWorkspace,
        renameWorkspace: vi.fn(),
        addProject: vi.fn(),
        removeProject: vi.fn(),
        setActiveWorkspace: vi.fn(),
        openWorkspaceInNewWindow: vi.fn(),
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        workspaces: mockWorkspaces,
        activeWorkspaceId: mockActiveWorkspaceId,
        loading: false,
        loadWorkspaces: mockLoadWorkspaces,
        activateWorkspace: mockActivateWorkspace,
        updateWorkspaceDetails: mockUpdateWorkspaceDetails,
        deleteWorkspace: mockDeleteWorkspace,
        createWorkspace: mockCreateWorkspace,
        setActiveWorkspace: vi.fn(),
        addProject: vi.fn(),
      }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    }
  ),
}));

describe("WorkspaceSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaces = [
      {
        id: "ws-1",
        name: "My Workspace",
        icon: "layers" as const,
        projects: [],
        createdAt: "2024-01-01",
        lastUsedAt: "2024-01-01",
      },
      {
        id: "ws-2",
        name: "Second Workspace",
        icon: "rocket" as const,
        projects: [],
        createdAt: "2024-01-01",
        lastUsedAt: "2024-01-01",
      },
    ];
    mockActiveWorkspaceId = "ws-1";
  });

  describe("empty state (no workspaces)", () => {
    beforeEach(() => {
      mockWorkspaces = [];
      mockActiveWorkspaceId = null;
    });

    it("renders trigger with generic Workspace label", async () => {
      const { WorkspaceSwitcher } = await import("../workspace-switcher");
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByRole("button", { name: /workspace/i });
      expect(trigger).toBeInTheDocument();
    });

    it("shows 'Open workspace' and 'Save workspace' buttons", async () => {
      const user = userEvent.setup();
      const { WorkspaceSwitcher } = await import("../workspace-switcher");
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByRole("button", { name: /workspace/i });
      await user.click(trigger);

      expect(screen.getByText("Open workspace")).toBeInTheDocument();
      expect(screen.getByText("Save workspace")).toBeInTheDocument();
    });

    it("does NOT show 'Switch workspace' or 'Create new workspace'", async () => {
      const user = userEvent.setup();
      const { WorkspaceSwitcher } = await import("../workspace-switcher");
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByRole("button", { name: /workspace/i });
      await user.click(trigger);

      expect(screen.queryByText("Switch workspace")).not.toBeInTheDocument();
      expect(
        screen.queryByText(/create new workspace/i)
      ).not.toBeInTheDocument();
    });

    it("clicking 'Save workspace' calls createWorkspace", async () => {
      const user = userEvent.setup();
      mockCreateWorkspace.mockResolvedValue({
        id: "new-ws",
        name: "New Workspace",
      });
      const { WorkspaceSwitcher } = await import("../workspace-switcher");
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByRole("button", { name: /workspace/i });
      await user.click(trigger);

      const saveBtn = screen.getByText("Save workspace");
      await user.click(saveBtn);

      expect(mockCreateWorkspace).toHaveBeenCalled();
    });
  });

  describe("with workspaces", () => {
    it("renders trigger with active workspace name", async () => {
      const { WorkspaceSwitcher } = await import("../workspace-switcher");
      render(<WorkspaceSwitcher />);

      expect(screen.getByText("My Workspace")).toBeInTheDocument();
    });

    it("opens popover and shows 'Switch workspace' title", async () => {
      const user = userEvent.setup();
      const { WorkspaceSwitcher } = await import("../workspace-switcher");
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByRole("button", {
        name: /workspace: my workspace/i,
      });
      await user.click(trigger);

      expect(screen.getByText("Switch workspace")).toBeInTheDocument();
    });

    it("renders all workspace names in the list", async () => {
      const user = userEvent.setup();
      const { WorkspaceSwitcher } = await import("../workspace-switcher");
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByRole("button", {
        name: /workspace: my workspace/i,
      });
      await user.click(trigger);

      expect(screen.getAllByText("My Workspace").length).toBeGreaterThanOrEqual(
        1
      );
      expect(screen.getByText("Second Workspace")).toBeInTheDocument();
    });

    it("active workspace shows edit (pencil) button", async () => {
      const user = userEvent.setup();
      const { WorkspaceSwitcher } = await import("../workspace-switcher");
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByRole("button", {
        name: /workspace: my workspace/i,
      });
      await user.click(trigger);

      const editButton = screen.getByRole("button", {
        name: /edit workspace/i,
      });
      expect(editButton).toBeInTheDocument();
    });

    it("clicking edit enters edit mode with name input", async () => {
      const user = userEvent.setup();
      const { WorkspaceSwitcher } = await import("../workspace-switcher");
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByRole("button", {
        name: /workspace: my workspace/i,
      });
      await user.click(trigger);

      const editButton = screen.getByRole("button", {
        name: /edit workspace/i,
      });
      await user.click(editButton);

      const nameInput = screen.getByRole("textbox");
      expect(nameInput).toBeInTheDocument();
      expect((nameInput as HTMLInputElement).value).toBe("My Workspace");
    });

    it("edit mode shows icon picker with 14 icons (no color picker)", async () => {
      const user = userEvent.setup();
      const { WorkspaceSwitcher } = await import("../workspace-switcher");
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByRole("button", {
        name: /workspace: my workspace/i,
      });
      await user.click(trigger);

      const editButton = screen.getByRole("button", {
        name: /edit workspace/i,
      });
      await user.click(editButton);

      // Icon picker should have all 14 icons
      for (const icon of [
        "waves",
        "mountain",
        "star",
        "heart",
        "bolt",
        "cloud",
        "moon",
        "layers",
        "rocket",
        "beaker",
        "link",
        "trending",
        "graduation",
        "coffee",
      ]) {
        expect(screen.getByRole("button", { name: icon })).toBeInTheDocument();
      }

      // No color circles should be present
      for (const color of ["green", "teal", "blue", "red", "peach", "yellow"]) {
        expect(
          screen.queryByRole("button", { name: color })
        ).not.toBeInTheDocument();
      }
    });

    it("'+ Create new workspace' creates and activates workspace in same window", async () => {
      const user = userEvent.setup();
      mockCreateWorkspace.mockResolvedValue({
        id: "ws-new",
        name: "New Workspace",
      });
      const { WorkspaceSwitcher } = await import("../workspace-switcher");
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByRole("button", {
        name: /workspace: my workspace/i,
      });
      await user.click(trigger);

      const createBtn = screen.getByText(/create new workspace/i);
      await user.click(createBtn);

      expect(mockCreateWorkspace).toHaveBeenCalled();
      expect(mockActivateWorkspace).toHaveBeenCalledWith("ws-new");
      // Must NOT open a new window
      expect(mockInvoke).not.toHaveBeenCalledWith("create_and_open_workspace");
    });

    it("clicking inactive workspace activates it in the same window", async () => {
      const user = userEvent.setup();
      const { WorkspaceSwitcher } = await import("../workspace-switcher");
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByRole("button", {
        name: /workspace: my workspace/i,
      });
      await user.click(trigger);

      const secondWs = screen.getByRole("button", {
        name: "Second Workspace",
      });
      await user.click(secondWs);

      // Must activate directly, no multi-window IPC
      expect(mockActivateWorkspace).toHaveBeenCalledWith("ws-2");
      expect(mockInvoke).not.toHaveBeenCalledWith("focus_workspace_window", expect.anything());
    });

    it("confirm button calls updateWorkspaceDetails without color", async () => {
      const user = userEvent.setup();
      mockUpdateWorkspaceDetails.mockResolvedValue(undefined);

      const { WorkspaceSwitcher } = await import("../workspace-switcher");
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByRole("button", {
        name: /workspace: my workspace/i,
      });
      await user.click(trigger);

      const editButton = screen.getByRole("button", {
        name: /edit workspace/i,
      });
      await user.click(editButton);

      const confirmBtn = screen.getByRole("button", { name: /confirm/i });
      await user.click(confirmBtn);

      expect(mockUpdateWorkspaceDetails).toHaveBeenCalledWith("ws-1", {
        name: "My Workspace",
        icon: "layers",
      });
    });
  });
});
