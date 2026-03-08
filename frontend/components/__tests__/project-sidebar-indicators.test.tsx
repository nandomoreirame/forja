import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProjectSidebar } from "../project-sidebar";
import { useProjectsStore } from "@/stores/projects";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock("@/stores/projects");

const mockUseProjectsStore = vi.mocked(useProjectsStore);

function makeStore(overrides = {}) {
  return {
    projects: [
      { path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null },
      { path: "/b/other", name: "other", lastOpened: "", iconPath: null },
    ],
    activeProjectPath: "/a/my-app",
    loading: false,
    sessionStates: {},
    unreadProjects: new Set<string>(),
    loadProjects: vi.fn(),
    addProject: vi.fn(),
    removeProject: vi.fn(),
    setActiveProject: vi.fn(),
    switchToProject: vi.fn(),
    getProjectInitial: (n: string) => n[0].toUpperCase(),
    getProjectColor: () => "#cba6f7",
    setProjectSessionState: vi.fn(),
    markProjectAsRead: vi.fn(),
    loadProjectIcon: vi.fn(),
    ...overrides,
  } as never;
}

describe("ProjectSidebar — session indicators", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows spinner for background project with running session", () => {
    mockUseProjectsStore.mockReturnValue(makeStore({
      sessionStates: { "/b/other": "running" },
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    expect(screen.getByTestId("session-spinner-/b/other")).toBeTruthy();
  });

  it("shows notification badge for background project with exited session", () => {
    mockUseProjectsStore.mockReturnValue(makeStore({
      sessionStates: { "/b/other": "exited" },
      unreadProjects: new Set(["/b/other"]),
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    expect(screen.getByTestId("session-badge-/b/other")).toBeTruthy();
  });

  it("does not show spinner for active project", () => {
    mockUseProjectsStore.mockReturnValue(makeStore({
      sessionStates: { "/a/my-app": "running" },
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    expect(screen.queryByTestId("session-spinner-/a/my-app")).toBeNull();
  });

  it("does not show badge when project has no unread", () => {
    mockUseProjectsStore.mockReturnValue(makeStore({
      sessionStates: { "/b/other": "exited" },
      unreadProjects: new Set<string>(),
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    expect(screen.queryByTestId("session-badge-/b/other")).toBeNull();
  });
});
