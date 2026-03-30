import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProjectSidebar } from "../project-sidebar";
import { useProjectsStore } from "@/stores/projects";
import { useWsBridgeStore } from "@/stores/ws-bridge";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
  open: vi.fn(),
}));

vi.mock("@/stores/projects");
vi.mock("@/stores/ws-bridge");

vi.mock("@/stores/file-tree", () => ({
  useFileTreeStore: {
    getState: vi.fn(() => ({
      removeProjectTree: vi.fn(),
    })),
  },
}));

vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: {
    getState: vi.fn(() => ({
      cleanupProjectState: vi.fn(),
    })),
  },
}));

vi.mock("@/stores/tiling-layout", () => ({
  useTilingLayoutStore: {
    getState: vi.fn(() => ({})),
    setState: vi.fn(),
  },
}));

vi.mock("@/stores/agent-chat", () => ({
  useAgentChatStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = { isPanelOpen: false, togglePanel: vi.fn() };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ isPanelOpen: false, togglePanel: vi.fn() }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    }
  ),
}));

// Mock WsBridgeDialog to isolate sidebar tests
vi.mock("../ws-bridge-dialog", () => ({
  WsBridgeDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" data-testid="ws-bridge-dialog-mock" /> : null,
}));

const mockUseProjectsStore = vi.mocked(useProjectsStore);
const mockUseWsBridgeStore = vi.mocked(useWsBridgeStore);

function createMockProjectsStore(overrides = {}) {
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
    notificationMessages: {},
    ...overrides,
  } as never;
}

function mockBridgeStore(running: boolean, dialogOpen = false) {
  const state = {
    running,
    port: 9400,
    host: "0.0.0.0",
    clients: 0,
    token: running ? "test-token-uuid" : "",
    dialogOpen,
    start: vi.fn(),
    stop: vi.fn(),
    toggle: vi.fn(),
    refreshStatus: vi.fn(),
    setDialogOpen: vi.fn(),
    openDialog: vi.fn(),
  };
  mockUseWsBridgeStore.mockImplementation((selector?: (s: typeof state) => unknown) => {
    if (selector) return selector(state) as never;
    return state as never;
  });
  mockUseWsBridgeStore.getState = () => state as never;
}

describe("ProjectSidebar - Remote Server Button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProjectsStore.mockReturnValue(createMockProjectsStore());
    mockBridgeStore(false);
  });

  it("renders the Remote Server button in the sidebar", () => {
    render(<ProjectSidebar onOpenProject={vi.fn()} />);
    expect(screen.getByLabelText("Remote Server")).toBeInTheDocument();
  });

  it("Remote Server button has inactive styling when server is stopped", () => {
    mockBridgeStore(false);
    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const btn = screen.getByLabelText("Remote Server");
    expect(btn.className).not.toContain("text-ctp-green");
  });

  it("Remote Server button has active/green styling when server is running", () => {
    mockBridgeStore(true);
    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const btn = screen.getByLabelText("Remote Server");
    expect(btn.className).toContain("text-ctp-green");
  });

  it("opens WsBridgeDialog when Remote Server button is clicked", async () => {
    mockBridgeStore(false, true);
    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    expect(screen.getByTestId("ws-bridge-dialog-mock")).toBeInTheDocument();
  });

  it("calls setDialogOpen(true) when Remote Server button is clicked", async () => {
    mockBridgeStore(false, false);
    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const btn = screen.getByLabelText("Remote Server");
    fireEvent.click(btn);

    const state = mockUseWsBridgeStore.getState();
    expect(state.setDialogOpen).toHaveBeenCalledWith(true);
  });

  it("Remote Server button is positioned below Chat button", () => {
    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const chatBtn = screen.getByLabelText("Chat with AI assistant");
    const remoteBtn = screen.getByLabelText("Remote Server");

    const allBtns = screen.getAllByRole("button");
    const chatIndex = allBtns.indexOf(chatBtn);
    const remoteIndex = allBtns.indexOf(remoteBtn);

    // Remote server button appears after chat button
    expect(remoteIndex).toBeGreaterThan(chatIndex);
  });

  it("aria-pressed is true when server is running", () => {
    mockBridgeStore(true);
    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const btn = screen.getByLabelText("Remote Server");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("aria-pressed is false when server is stopped", () => {
    mockBridgeStore(false);
    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    const btn = screen.getByLabelText("Remote Server");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });
});
