import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

type ProjectsState = {
  activeProjectPath: string | null;
};

const projectSubscribers = new Set<(state: ProjectsState) => void>();
const projectsState: ProjectsState = {
  activeProjectPath: "/repo-a",
};

function setProjectsState(patch: Partial<ProjectsState>) {
  Object.assign(projectsState, patch);
  for (const subscriber of projectSubscribers) {
    subscriber(projectsState);
  }
}

vi.mock("@/stores/projects", () => ({
  useProjectsStore: {
    getState: () => projectsState,
    subscribe: (listener: (state: ProjectsState) => void) => {
      projectSubscribers.add(listener);
      return () => projectSubscribers.delete(listener);
    },
  },
}));

const terminalTabsState = {
  nextTabId: vi.fn(() => "restored-tab-1"),
  addTab: vi.fn(),
  registerTab: vi.fn(),
  setActiveTab: vi.fn(),
  setCliSessionId: vi.fn(),
};

vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: {
    getState: () => terminalTabsState,
  },
}));

const tilingLayoutState = {
  addBlock: vi.fn(),
};

vi.mock("@/stores/tiling-layout", () => ({
  useTilingLayoutStore: {
    getState: () => tilingLayoutState,
  },
}));

describe("useSavedSessionsStore", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    invokeMock.mockReset();
    projectsState.activeProjectPath = "/repo-a";

    const { useSavedSessionsStore } = await import("../saved-sessions");
    useSavedSessionsStore.setState({ sessions: [], loading: false });
  });

  afterEach(() => {
    invokeMock.mockReset();
  });

  it("loads saved sessions for a project", async () => {
    const { useSavedSessionsStore } = await import("../saved-sessions");
    invokeMock.mockResolvedValueOnce([
      {
        id: "saved-1",
        sessionType: "claude",
        savedAt: "2026-03-31T10:00:00.000Z",
      },
    ]);

    await useSavedSessionsStore.getState().loadSessions("/repo-a");

    expect(invokeMock).toHaveBeenCalledWith("saved_sessions:load", {
      projectPath: "/repo-a",
    });
    expect(useSavedSessionsStore.getState().sessions).toEqual([
      expect.objectContaining({ id: "saved-1" }),
    ]);
  });

  it("saves a tab through IPC and appends it locally", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T12:00:00.000Z"));
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-save-1" });

    const { useSavedSessionsStore } = await import("../saved-sessions");

    await useSavedSessionsStore.getState().saveSession({
      id: "tab-1",
      name: "Claude Code",
      path: "/repo-a",
      isRunning: true,
      sessionType: "claude",
      customName: "Feature work",
      cliSessionId: "cli-123",
    });

    expect(invokeMock).toHaveBeenCalledWith("saved_sessions:save", {
      projectPath: "/repo-a",
      entry: {
        id: "uuid-save-1",
        sessionType: "claude",
        customName: "Feature work",
        cliSessionId: "cli-123",
        savedAt: "2026-03-31T12:00:00.000Z",
      },
    });
    expect(useSavedSessionsStore.getState().sessions).toEqual([
      expect.objectContaining({ id: "uuid-save-1", cliSessionId: "cli-123" }),
    ]);
  });

  it("restores a saved session into a new tab and deletes it from persistence", async () => {
    const { useSavedSessionsStore } = await import("../saved-sessions");
    useSavedSessionsStore.setState({
      sessions: [
        {
          id: "saved-1",
          sessionType: "codex",
          customName: "Restore me",
          cliSessionId: "resume-1",
          savedAt: "2026-03-31T09:00:00.000Z",
        },
      ],
      loading: false,
    });

    const restored = await useSavedSessionsStore.getState().restoreSession("saved-1");

    expect(restored).toBe(true);
    expect(terminalTabsState.nextTabId).toHaveBeenCalled();
    // registerTab is called BEFORE setCliSessionId to avoid race condition
    expect(terminalTabsState.registerTab).toHaveBeenCalledWith(
      "restored-tab-1",
      "/repo-a",
      "codex",
      "Restore me",
    );
    expect(terminalTabsState.setCliSessionId).toHaveBeenCalledWith(
      "restored-tab-1",
      "resume-1",
    );
    expect(terminalTabsState.setActiveTab).toHaveBeenCalledWith("restored-tab-1");
    expect(tilingLayoutState.addBlock).toHaveBeenCalledWith(
      { type: "terminal", tabId: "restored-tab-1", sessionType: "codex" },
      undefined,
      "restored-tab-1",
    );
    expect(invokeMock).toHaveBeenCalledWith("saved_sessions:delete", {
      projectPath: "/repo-a",
      id: "saved-1",
    });
    expect(useSavedSessionsStore.getState().sessions).toEqual([]);
  });

  it("restoreLastSaved picks the most recent saved session", async () => {
    const { useSavedSessionsStore } = await import("../saved-sessions");
    useSavedSessionsStore.setState({
      sessions: [
        {
          id: "older",
          sessionType: "claude",
          savedAt: "2026-03-30T09:00:00.000Z",
        },
        {
          id: "newer",
          sessionType: "gemini",
          savedAt: "2026-03-31T09:00:00.000Z",
        },
      ],
      loading: false,
    });

    const restored = await useSavedSessionsStore.getState().restoreLastSaved();

    expect(restored).toBe(true);
    expect(invokeMock).toHaveBeenCalledWith("saved_sessions:delete", {
      projectPath: "/repo-a",
      id: "newer",
    });
    expect(terminalTabsState.registerTab).toHaveBeenCalledWith(
      "restored-tab-1",
      "/repo-a",
      "gemini",
      undefined,
    );
  });

  it("deletes a saved session from persistence and local state", async () => {
    const { useSavedSessionsStore } = await import("../saved-sessions");
    useSavedSessionsStore.setState({
      sessions: [
        {
          id: "saved-1",
          sessionType: "claude",
          savedAt: "2026-03-31T09:00:00.000Z",
        },
      ],
      loading: false,
    });

    await useSavedSessionsStore.getState().deleteSession("saved-1");

    expect(invokeMock).toHaveBeenCalledWith("saved_sessions:delete", {
      projectPath: "/repo-a",
      id: "saved-1",
    });
    expect(useSavedSessionsStore.getState().sessions).toEqual([]);
  });

  it("auto-reloads when the active project path changes", async () => {
    const { useSavedSessionsStore } = await import("../saved-sessions");
    invokeMock.mockResolvedValueOnce([
      {
        id: "saved-b",
        sessionType: "claude",
        savedAt: "2026-03-31T10:00:00.000Z",
      },
    ]);

    setProjectsState({ activeProjectPath: "/repo-b" });
    await Promise.resolve();

    expect(invokeMock).toHaveBeenCalledWith("saved_sessions:load", {
      projectPath: "/repo-b",
    });
    expect(useSavedSessionsStore.getState().sessions).toEqual([
      expect.objectContaining({ id: "saved-b" }),
    ]);
  });
});
