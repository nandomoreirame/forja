import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProjectSidebar } from "../project-sidebar";
import { useProjectsStore } from "@/stores/projects";

const mockOpen = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
  open: (...args: unknown[]) => mockOpen(...args),
}));

vi.mock("@/stores/projects");
vi.mock("@/stores/file-tree", () => ({
  useFileTreeStore: {
    getState: vi.fn(() => ({
      removeProjectTree: vi.fn(),
    })),
  },
}));

const mockTogglePanel = vi.fn();
vi.mock("@/stores/agent-chat", () => ({
  useAgentChatStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = { isPanelOpen: false, togglePanel: mockTogglePanel };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ isPanelOpen: false, togglePanel: mockTogglePanel }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    }
  ),
}));

const mockUseProjectsStore = vi.mocked(useProjectsStore);

function createMockStore(overrides = {}) {
  return {
    projects: [],
    activeProjectPath: null,
    loading: false,
    loadProjects: vi.fn(),
    addProject: vi.fn(),
    removeProject: vi.fn(),
    updateProject: vi.fn(),
    reorderProjects: vi.fn(),
    setActiveProject: vi.fn(),
    switchToProject: vi.fn(),
    getProjectInitial: (n: string) => (n[0] ?? "?").toUpperCase(),
    getProjectColor: () => "#cba6f7",
    sessionStates: {},
    unreadProjects: new Set<string>(),
    ...overrides,
  } as never;
}

describe("ProjectSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders project icons for each project", () => {
    mockUseProjectsStore.mockReturnValue(createMockStore({
      projects: [
        { path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null },
        { path: "/b/other", name: "other", lastOpened: "", iconPath: null },
      ],
      activeProjectPath: "/a/my-app",
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    expect(screen.getByLabelText("Switch to project: my-app")).toBeTruthy();
    expect(screen.getByLabelText("Switch to project: other")).toBeTruthy();
    expect(screen.getByText("M")).toBeTruthy();
    expect(screen.getByText("O")).toBeTruthy();
  });

  it("renders + button to add a project", () => {
    mockUseProjectsStore.mockReturnValue(createMockStore());

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    expect(screen.getByLabelText("Add project")).toBeTruthy();
  });

  it("calls onOpenProject when + button is clicked", () => {
    const onOpenProject = vi.fn();
    mockUseProjectsStore.mockReturnValue(createMockStore());

    render(<ProjectSidebar onOpenProject={onOpenProject} />);

    fireEvent.click(screen.getByLabelText("Add project"));
    expect(onOpenProject).toHaveBeenCalledOnce();
  });

  it("marks the active project with aria-pressed", () => {
    mockUseProjectsStore.mockReturnValue(createMockStore({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
      activeProjectPath: "/a/my-app",
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const btn = screen.getByLabelText("Switch to project: my-app");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("displays empty state when no projects exist", () => {
    mockUseProjectsStore.mockReturnValue(createMockStore());

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    // + button + 3 bottom icons = 4 buttons
    expect(screen.getByLabelText("Add project")).toBeTruthy();
  });

  it("renders Settings, Chat, and Help placeholder icons", () => {
    mockUseProjectsStore.mockReturnValue(createMockStore());

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    expect(screen.getByLabelText("Settings")).toBeTruthy();
    expect(screen.getByLabelText("Chat")).toBeTruthy();
    expect(screen.getByLabelText("Help")).toBeTruthy();
  });

  it("shows context menu on right-click of a project icon", async () => {
    const user = userEvent.setup();
    mockUseProjectsStore.mockReturnValue(createMockStore({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
      activeProjectPath: "/a/my-app",
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const btn = screen.getByLabelText("Switch to project: my-app");
    await user.pointer({ target: btn, keys: "[MouseRight]" });

    expect(await screen.findByText("Edit Project...")).toBeInTheDocument();
    expect(await screen.findByText("Remove Project")).toBeInTheDocument();
  });

  it("opens edit dialog when Edit Project is clicked", async () => {
    const user = userEvent.setup();
    mockUseProjectsStore.mockReturnValue(createMockStore({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
      activeProjectPath: "/a/my-app",
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const btn = screen.getByLabelText("Switch to project: my-app");
    await user.pointer({ target: btn, keys: "[MouseRight]" });

    const editOption = await screen.findByText("Edit Project...");
    await user.click(editOption);

    expect(await screen.findByText("Edit Project")).toBeInTheDocument();
    expect(screen.getByDisplayValue("my-app")).toBeInTheDocument();
  });

  it("opens remove confirmation dialog when Remove Project is clicked", async () => {
    const user = userEvent.setup();
    const mockRemoveProject = vi.fn();
    mockUseProjectsStore.mockReturnValue(createMockStore({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
      activeProjectPath: "/a/my-app",
      removeProject: mockRemoveProject,
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const btn = screen.getByLabelText("Switch to project: my-app");
    await user.pointer({ target: btn, keys: "[MouseRight]" });

    const removeOption = await screen.findByText("Remove Project");
    await user.click(removeOption);

    expect(await screen.findByText(/Remove project/)).toBeInTheDocument();
    expect(screen.getByText(/will not delete any files/i)).toBeInTheDocument();
  });

  it("calls removeProject when remove is confirmed", async () => {
    const user = userEvent.setup();
    const mockRemoveProject = vi.fn();
    mockUseProjectsStore.mockReturnValue(createMockStore({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
      activeProjectPath: "/a/my-app",
      removeProject: mockRemoveProject,
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const btn = screen.getByLabelText("Switch to project: my-app");
    await user.pointer({ target: btn, keys: "[MouseRight]" });

    const removeOption = await screen.findByText("Remove Project");
    await user.click(removeOption);

    const confirmBtn = await screen.findByRole("button", { name: /^Remove$/i });
    await user.click(confirmBtn);

    expect(mockRemoveProject).toHaveBeenCalledWith("/a/my-app");
  });

  it("shows letter fallback when project icon image fails to load", () => {
    mockUseProjectsStore.mockReturnValue(createMockStore({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: "file:///bad/path.svg" }],
      activeProjectPath: "/a/my-app",
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const img = screen.getByAltText("my-app");
    fireEvent.error(img);

    // After error, the letter fallback should be visible
    expect(screen.getByText("M")).toBeTruthy();
  });

  it("shows icon preview in edit dialog when project has an icon", async () => {
    const user = userEvent.setup();
    mockUseProjectsStore.mockReturnValue(createMockStore({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: "file:///some/icon.svg" }],
      activeProjectPath: "/a/my-app",
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const btn = screen.getByLabelText("Switch to project: my-app");
    await user.pointer({ target: btn, keys: "[MouseRight]" });

    const editOption = await screen.findByText("Edit Project...");
    await user.click(editOption);

    // Icon preview should be visible in the dialog
    expect(await screen.findByAltText("Icon preview")).toBeInTheDocument();
  });

  it("shows Browse button in edit dialog", async () => {
    const user = userEvent.setup();
    mockUseProjectsStore.mockReturnValue(createMockStore({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
      activeProjectPath: "/a/my-app",
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const btn = screen.getByLabelText("Switch to project: my-app");
    await user.pointer({ target: btn, keys: "[MouseRight]" });

    const editOption = await screen.findByText("Edit Project...");
    await user.click(editOption);

    expect(await screen.findByRole("button", { name: /browse/i })).toBeInTheDocument();
  });

  it("toggles chat panel on Chat button click", () => {
    mockUseProjectsStore.mockReturnValue(createMockStore());

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const chatBtn = screen.getByLabelText("Chat");
    fireEvent.click(chatBtn);
    expect(mockTogglePanel).toHaveBeenCalledOnce();
  });

  it("renders projects in correct order after reorder store call", () => {
    const mockReorderProjects = vi.fn();
    mockUseProjectsStore.mockReturnValue(createMockStore({
      projects: [
        { path: "/c/third", name: "third", lastOpened: "", iconPath: null },
        { path: "/a/first", name: "first", lastOpened: "", iconPath: null },
        { path: "/b/second", name: "second", lastOpened: "", iconPath: null },
      ],
      activeProjectPath: "/c/third",
      reorderProjects: mockReorderProjects,
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const buttons = screen.getAllByRole("button", { name: /Switch to project/ });
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveAttribute("aria-label", "Switch to project: third");
    expect(buttons[1]).toHaveAttribute("aria-label", "Switch to project: first");
    expect(buttons[2]).toHaveAttribute("aria-label", "Switch to project: second");
  });

  it("project icons have draggable attributes for DnD", () => {
    mockUseProjectsStore.mockReturnValue(createMockStore({
      projects: [
        { path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null },
      ],
      activeProjectPath: "/a/my-app",
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const btn = screen.getByLabelText("Switch to project: my-app");
    const draggableParent = btn.closest("[data-testid='sortable-project']");
    expect(draggableParent).toBeTruthy();
  });

  it("calls open dialog when Browse is clicked", async () => {
    const user = userEvent.setup();
    mockOpen.mockResolvedValue("/chosen/icon.png");
    mockUseProjectsStore.mockReturnValue(createMockStore({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
      activeProjectPath: "/a/my-app",
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const btn = screen.getByLabelText("Switch to project: my-app");
    await user.pointer({ target: btn, keys: "[MouseRight]" });

    const editOption = await screen.findByText("Edit Project...");
    await user.click(editOption);

    const browseBtn = await screen.findByRole("button", { name: /browse/i });
    await user.click(browseBtn);

    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
        filters: expect.arrayContaining([
          expect.objectContaining({ extensions: expect.arrayContaining(["svg"]) }),
        ]),
      })
    );
  });
});
