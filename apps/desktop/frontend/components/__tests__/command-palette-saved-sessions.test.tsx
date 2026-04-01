import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CommandPalette } from "../command-palette";
import { useCommandPaletteStore } from "@/stores/command-palette";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const mockFileTreeState = {
  tree: null as unknown,
  currentPath: "/repo-a",
};

vi.mock("@/stores/file-tree", () => ({
  useFileTreeStore: Object.assign(
    () => mockFileTreeState,
    { getState: () => mockFileTreeState },
  ),
}));

vi.mock("@/stores/user-settings", () => ({
  useUserSettingsStore: Object.assign(() => ({}), {
    getState: () => ({
      settings: { theme: { active: "mocha" } },
      setEditorContent: vi.fn(),
      saveEditorContent: vi.fn(),
    }),
  }),
}));

vi.mock("@/stores/theme", () => ({
  useThemeStore: Object.assign(() => ({ customThemes: [] }), {
    getState: () => ({
      customThemes: [],
      getAllThemes: () => [],
    }),
  }),
}));

vi.mock("@/stores/tiling-layout", () => ({
  useTilingLayoutStore: Object.assign(
    (selector?: (state: { hasBlock: (id: string) => boolean }) => unknown) => {
      const state = { hasBlock: vi.fn(() => false) };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ hasBlock: vi.fn(() => false) }) },
  ),
}));

vi.mock("@/stores/projects", () => ({
  useProjectsStore: Object.assign(() => ({
    projects: [],
    activeProjectPath: "/repo-a",
    getProjectInitial: (value: string) => value[0] ?? "?",
    getProjectColor: () => "#cba6f7",
    switchToProject: vi.fn(),
  }), {
    getState: () => ({
      projects: [],
      activeProjectPath: "/repo-a",
      getProjectInitial: (value: string) => value[0] ?? "?",
      getProjectColor: () => "#cba6f7",
      switchToProject: vi.fn(),
    }),
  }),
}));

vi.mock("@/stores/plugins", () => ({
  usePluginsStore: Object.assign(() => ({ plugins: [], pluginOrder: [] }), {
    getState: () => ({ plugins: [], pluginOrder: [] }),
  }),
  getOrderedEnabledPlugins: () => [],
}));

vi.mock("@/stores/quick-actions", () => ({
  useQuickActionsStore: Object.assign(() => ({ actions: [] }), {
    getState: () => ({ actions: [] }),
  }),
}));

vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: Object.assign(() => ({
    addTab: vi.fn(),
    nextTabId: vi.fn(() => "tab-new"),
  }), {
    getState: () => ({
      addTab: vi.fn(),
      nextTabId: vi.fn(() => "tab-new"),
    }),
  }),
}));

vi.mock("@/hooks/use-installed-clis", () => ({
  useInstalledClis: () => ({ installedClis: [], loading: false }),
}));

const savedSessionsState = {
  sessions: [] as Array<{
    id: string;
    sessionType: "claude" | "gemini" | "codex" | "cursor-agent" | "gh-copilot" | "terminal";
    customName?: string;
    savedAt: string;
  }>,
  restoreSession: vi.fn(async () => true),
};

vi.mock("@/stores/saved-sessions", () => ({
  useSavedSessionsStore: Object.assign(
    (selector?: (state: typeof savedSessionsState) => unknown) =>
      selector ? selector(savedSessionsState) : savedSessionsState,
    {
      getState: () => savedSessionsState,
      subscribe: vi.fn(() => () => {}),
    },
  ),
}));

describe("CommandPalette saved sessions", () => {
  beforeEach(() => {
    useCommandPaletteStore.setState({ isOpen: false, mode: "files" });
    savedSessionsState.sessions = [];
    savedSessionsState.restoreSession.mockReset();
  });

  it("adds a Restore session command when saved sessions exist", () => {
    savedSessionsState.sessions = [
      {
        id: "saved-1",
        sessionType: "claude",
        savedAt: new Date().toISOString(),
      },
    ];

    useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
    render(<CommandPalette />);

    expect(screen.getByText("Restore session")).toBeInTheDocument();
    expect(screen.getByText(/Ctrl\+Shift\+T/i)).toBeInTheDocument();
  });

  it("hides Restore session when no saved sessions exist", () => {
    useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
    render(<CommandPalette />);

    expect(screen.queryByText("Restore session")).not.toBeInTheDocument();
  });

  it("lists saved sessions and restores the selected one", async () => {
    const user = userEvent.setup();
    savedSessionsState.sessions = [
      {
        id: "saved-1",
        sessionType: "claude",
        customName: "Feature work",
        savedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ];

    useCommandPaletteStore.setState({ isOpen: true, mode: "saved-sessions" });
    render(<CommandPalette />);

    expect(screen.getByText("Saved Sessions")).toBeInTheDocument();
    expect(screen.getByText("Claude Code")).toBeInTheDocument();
    expect(screen.getByText('"Feature work"')).toBeInTheDocument();
    expect(screen.getByText(/ago$/i)).toBeInTheDocument();

    await user.click(screen.getByText("Claude Code"));

    expect(savedSessionsState.restoreSession).toHaveBeenCalledWith("saved-1");
    expect(useCommandPaletteStore.getState().isOpen).toBe(false);
  });

  it("shows the most recent relative time label for multiple entries", () => {
    savedSessionsState.sessions = [
      {
        id: "older",
        sessionType: "claude",
        savedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "newer",
        sessionType: "codex",
        savedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
    ];

    useCommandPaletteStore.setState({ isOpen: true, mode: "saved-sessions" });
    render(<CommandPalette />);

    const items = screen.getAllByRole("option");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText(/ago$/i)).toBeInTheDocument();
    expect(within(items[1]).getByText(/ago$/i)).toBeInTheDocument();
  });
});
