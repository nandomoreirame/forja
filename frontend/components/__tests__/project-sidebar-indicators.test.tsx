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
    thinkingProjects: new Set<string>(),
    notifiedProjects: new Set<string>(),
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
    setProjectThinking: vi.fn(),
    markProjectNotified: vi.fn(),
    clearProjectNotified: vi.fn(),
    ...overrides,
  } as never;
}

describe("ProjectSidebar — session indicators", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows spinner for background project in thinkingProjects", () => {
    mockUseProjectsStore.mockReturnValue(makeStore({
      thinkingProjects: new Set(["/b/other"]),
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    expect(screen.getByTestId("session-spinner-/b/other")).toBeTruthy();
  });

  it("shows badge for background project in notifiedProjects", () => {
    mockUseProjectsStore.mockReturnValue(makeStore({
      notifiedProjects: new Set(["/b/other"]),
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    expect(screen.getByTestId("session-badge-/b/other")).toBeTruthy();
  });

  it("does NOT show spinner for active project even if thinking", () => {
    mockUseProjectsStore.mockReturnValue(makeStore({
      thinkingProjects: new Set(["/a/my-app"]),
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    expect(screen.queryByTestId("session-spinner-/a/my-app")).toBeNull();
  });

  it("does NOT show badge for active project even if notified", () => {
    mockUseProjectsStore.mockReturnValue(makeStore({
      notifiedProjects: new Set(["/a/my-app"]),
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    expect(screen.queryByTestId("session-badge-/a/my-app")).toBeNull();
  });

  it("does NOT show spinner for running-only (not thinking) project", () => {
    mockUseProjectsStore.mockReturnValue(makeStore({
      sessionStates: { "/b/other": "running" },
      thinkingProjects: new Set<string>(),
    }));

    render(<ProjectSidebar onOpenProject={vi.fn()} />);

    expect(screen.queryByTestId("session-spinner-/b/other")).toBeNull();
  });
});
