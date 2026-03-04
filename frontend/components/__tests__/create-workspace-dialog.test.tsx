import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateWorkspaceDialog } from "../create-workspace-dialog";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import { useWorkspaceStore } from "@/stores/workspace";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
}));

describe("CreateWorkspaceDialog", () => {
  beforeEach(() => {
    useAppDialogsStore.setState({
      shortcutsOpen: false,
      aboutOpen: false,
      newSessionOpen: false,
      createWorkspaceOpen: false,
      createWorkspacePendingPath: null,
    });
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: null,
      loading: false,
    });
    vi.clearAllMocks();
  });

  it("does not render when closed", () => {
    useAppDialogsStore.setState({ createWorkspaceOpen: false });
    render(<CreateWorkspaceDialog />);
    expect(screen.queryByText("Create Workspace")).not.toBeInTheDocument();
  });

  it("renders dialog when open", () => {
    useAppDialogsStore.setState({ createWorkspaceOpen: true });
    render(<CreateWorkspaceDialog />);
    expect(screen.getByText("Create Workspace")).toBeInTheDocument();
    expect(screen.getByLabelText("Workspace name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("shows pending path in description", () => {
    useAppDialogsStore.setState({
      createWorkspaceOpen: true,
      createWorkspacePendingPath: "/home/user/my-project",
    });
    render(<CreateWorkspaceDialog />);
    expect(
      screen.getByText(/Create a workspace with "my-project"/i)
    ).toBeInTheDocument();
  });

  it("shows default description when no pending path", () => {
    useAppDialogsStore.setState({
      createWorkspaceOpen: true,
      createWorkspacePendingPath: null,
    });
    render(<CreateWorkspaceDialog />);
    expect(
      screen.getByText("Create a new workspace to group projects")
    ).toBeInTheDocument();
  });

  it("create button disabled when name is empty", () => {
    useAppDialogsStore.setState({ createWorkspaceOpen: true });
    render(<CreateWorkspaceDialog />);
    const createButton = screen.getByRole("button", { name: /^create$/i });
    expect(createButton).toBeDisabled();
  });

  it("create button enabled when name is not empty", () => {
    useAppDialogsStore.setState({ createWorkspaceOpen: true });
    render(<CreateWorkspaceDialog />);

    const input = screen.getByLabelText("Workspace name");
    fireEvent.change(input, { target: { value: "My New Workspace" } });

    const createButton = screen.getByRole("button", { name: /^create$/i });
    expect(createButton).not.toBeDisabled();
  });

  it("calls createWorkspace on submit", async () => {
    const mockCreateWorkspace = vi.fn().mockResolvedValue({ id: "ws-1", name: "Test WS" });
    useWorkspaceStore.setState({ createWorkspace: mockCreateWorkspace } as Parameters<typeof useWorkspaceStore.setState>[0]);
    useAppDialogsStore.setState({ createWorkspaceOpen: true, createWorkspacePendingPath: null });

    render(<CreateWorkspaceDialog />);

    const input = screen.getByLabelText("Workspace name");
    fireEvent.change(input, { target: { value: "My Workspace" } });

    const createButton = screen.getByRole("button", { name: /^create$/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockCreateWorkspace).toHaveBeenCalledWith("My Workspace", undefined);
    });
  });

  it("closes dialog after creation", async () => {
    const mockCreateWorkspace = vi.fn().mockResolvedValue({ id: "ws-1", name: "Test WS" });
    useWorkspaceStore.setState({ createWorkspace: mockCreateWorkspace } as Parameters<typeof useWorkspaceStore.setState>[0]);
    useAppDialogsStore.setState({ createWorkspaceOpen: true });

    render(<CreateWorkspaceDialog />);

    const input = screen.getByLabelText("Workspace name");
    fireEvent.change(input, { target: { value: "My Workspace" } });

    const createButton = screen.getByRole("button", { name: /^create$/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(useAppDialogsStore.getState().createWorkspaceOpen).toBe(false);
    });
  });

  it("submits on Enter key", async () => {
    const mockCreateWorkspace = vi.fn().mockResolvedValue({ id: "ws-1", name: "Test WS" });
    useWorkspaceStore.setState({ createWorkspace: mockCreateWorkspace } as Parameters<typeof useWorkspaceStore.setState>[0]);
    useAppDialogsStore.setState({ createWorkspaceOpen: true, createWorkspacePendingPath: null });

    render(<CreateWorkspaceDialog />);

    const input = screen.getByLabelText("Workspace name");
    fireEvent.change(input, { target: { value: "My Workspace" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(mockCreateWorkspace).toHaveBeenCalledWith("My Workspace", undefined);
    });
  });

  it("cancel button closes dialog", () => {
    useAppDialogsStore.setState({ createWorkspaceOpen: true });
    render(<CreateWorkspaceDialog />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(useAppDialogsStore.getState().createWorkspaceOpen).toBe(false);
  });
});
