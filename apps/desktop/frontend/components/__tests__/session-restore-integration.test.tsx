import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App, { restorePersistedTabsAndLayoutFromState } from "../../App";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { useTilingLayoutStore } from "@/stores/tiling-layout";
import { DEFAULT_LAYOUT } from "@/lib/default-layout";
import { loadProjectFromDisk, useProjectsStore } from "@/stores/projects";
import { useWorkspaceStore } from "@/stores/workspace";
import { useFileTreeStore } from "@/stores/file-tree";
import { useRightPanelStore } from "@/stores/right-panel";
import { useFilePreviewStore } from "@/stores/file-preview";
import { usePluginsStore } from "@/stores/plugins";
import { useUserSettingsStore } from "@/stores/user-settings";
import { useQuickActionsStore } from "@/stores/quick-actions";
import { DEFAULT_SETTINGS } from "@/lib/settings-types";

const mockInvoke = vi.fn();
const mockListen = vi.fn().mockResolvedValue(() => {});

vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  listen: (...args: unknown[]) => mockListen(...args),
  getCurrentWindow: vi.fn(() => ({ label: "main" })),
}));

vi.mock("../project-sidebar", () => ({ ProjectSidebar: () => null }));
vi.mock("../right-sidebar", () => ({ RightSidebar: () => null }));
vi.mock("../tiling-layout", () => ({ TilingLayout: () => null }));
vi.mock("../titlebar", () => ({ Titlebar: () => null }));
vi.mock("../plugin-permission-dialog", () => ({ PluginPermissionDialog: () => null }));
vi.mock("../focus-mode-indicator", () => ({ FocusModeIndicator: () => null }));
vi.mock("../../hooks/use-keyboard-shortcuts", () => ({ useKeyboardShortcuts: () => undefined }));
vi.mock("../../hooks/use-modifier-held", () => ({ useModifierHeld: () => undefined }));
vi.mock("../../hooks/use-webview-shortcut-bridge", () => ({ useWebviewShortcutBridge: () => undefined }));
vi.mock("../../hooks/use-panel-preferences", () => ({ usePanelPreferences: () => ({ loaded: true }) }));

describe("session ID save/restore cycle", () => {
  beforeEach(() => {
    mockInvoke.mockReset().mockImplementation(async (channel: string) => {
      if (channel === "get_user_settings") return { ...DEFAULT_SETTINGS };
      if (channel === "get_beta_disclaimer_version") return "1.0";
      return undefined;
    });
    mockListen.mockClear();
    useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });
    useTilingLayoutStore.getState().resetToDefault();
    useWorkspaceStore.setState({
      activeWorkspaceId: null,
      workspaces: [],
      loading: false,
      loadWorkspaces: vi.fn().mockResolvedValue(undefined),
    });
    useProjectsStore.setState({
      activeProjectPath: null,
      isSwitchingProject: false,
      projects: [],
      loadProjects: vi.fn().mockResolvedValue(undefined),
      addProject: vi.fn().mockResolvedValue(undefined),
    });
    useFileTreeStore.setState({
      isOpen: true,
      tree: null,
      trees: {},
      currentPath: null,
    });
    useRightPanelStore.setState({ isOpen: false, activeView: "empty" });
    useFilePreviewStore.setState({ currentFile: null, isOpen: false });
    usePluginsStore.setState({
      activePluginName: null,
      loadPlugins: vi.fn().mockResolvedValue(undefined),
    });
    useUserSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS },
      loaded: true,
      loadSettings: vi.fn().mockResolvedValue(undefined),
    });
    useQuickActionsStore.setState({
      loadActions: vi.fn().mockResolvedValue(undefined),
    });
  });

  const makeLayout = (...tabIds: string[]) => ({
    global: DEFAULT_LAYOUT.global,
    layout: {
      ...DEFAULT_LAYOUT.layout,
      children: [
        {
          type: "tabset",
          id: "tabset-main",
          weight: 100,
          children: tabIds.map((id) => ({
            type: "tab",
            id,
            name: id,
            component: "terminal",
            config: { type: "terminal", sessionType: "claude" },
          })),
        },
      ],
    },
  });

  it("serializeTabsForSave includes deterministic cliSessionId", () => {
    const store = useTerminalTabsStore.getState();
    const tabId = "main-test-tab-1";
    store.addTab(tabId, "/project", "claude", "MY SESSION");
    store.setCliSessionId(tabId, "aaaaaaaa-1111-2222-3333-444444444444");

    const serialized = useTerminalTabsStore.getState().serializeTabsForSave("/project");

    expect(serialized.tabs).toHaveLength(1);
    expect(serialized.tabs[0].id).toBe(tabId);
    expect(serialized.tabs[0].cliSessionId).toBe("aaaaaaaa-1111-2222-3333-444444444444");
    expect(serialized.tabs[0].customName).toBe("MY SESSION");
  });

  it("restored tab preserves exact same cliSessionId for --resume", () => {
    const store = useTerminalTabsStore.getState();
    store.registerTab("main-test-tab-1", "/project", "claude", "MY SESSION");
    store.setCliSessionId("main-test-tab-1", "aaaaaaaa-1111-2222-3333-444444444444");

    const tab = useTerminalTabsStore.getState().tabs.find(t => t.id === "main-test-tab-1");
    expect(tab?.cliSessionId).toBe("aaaaaaaa-1111-2222-3333-444444444444");
    expect(tab?.customName).toBe("MY SESSION");
  });

  it("two Claude tabs get independent session IDs that survive serialize/restore", () => {
    const store = useTerminalTabsStore.getState();

    store.addTab("tab-A", "/project", "claude", "SESSION A");
    store.setCliSessionId("tab-A", "uuid-aaaa");
    store.addTab("tab-B", "/project", "claude", "SESSION B");
    store.setCliSessionId("tab-B", "uuid-bbbb");

    const saved = useTerminalTabsStore.getState().serializeTabsForSave("/project");
    expect(saved.tabs[0].cliSessionId).toBe("uuid-aaaa");
    expect(saved.tabs[1].cliSessionId).toBe("uuid-bbbb");

    // Simulate restore in a fresh store
    useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });
    const freshStore = useTerminalTabsStore.getState();
    for (const tab of saved.tabs) {
      freshStore.registerTab(tab.id, "/project", tab.sessionType as any, tab.customName);
      if (tab.cliSessionId) freshStore.setCliSessionId(tab.id, tab.cliSessionId);
    }

    const restoredTabs = useTerminalTabsStore.getState().tabs;
    expect(restoredTabs[0].cliSessionId).toBe("uuid-aaaa");
    expect(restoredTabs[1].cliSessionId).toBe("uuid-bbbb");
    expect(restoredTabs[0].cliSessionId).not.toBe(restoredTabs[1].cliSessionId);
  });

  it("boot restore preserves exited state, customName, cliSessionId, and exact ids when the layout block exists", async () => {
    const uiState = {
      tabs: [
        {
          id: "tab-preserve-me",
          path: "/project",
          sessionType: "claude",
          cliSessionId: "cli-123",
          exited: true,
          customName: "Renamed session",
        },
      ],
      activeTabIndex: 0,
      layoutJson: makeLayout("tab-preserve-me"),
    };

    await restorePersistedTabsAndLayoutFromState("/project", uiState);

    const tabs = useTerminalTabsStore.getState().tabs;
    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe("tab-preserve-me");
    expect(tabs[0].cliSessionId).toBe("cli-123");
    expect(tabs[0].customName).toBe("Renamed session");
    expect(tabs[0].isRunning).toBe(false);
    expect(useTerminalTabsStore.getState().activeTabId).toBe("tab-preserve-me");
    expect(useTilingLayoutStore.getState().hasBlock("tab-preserve-me")).toBe(true);
  });

  it("boot restore preserves metadata across Claude, Codex, Gemini, and terminal tabs", async () => {
    const uiState = {
      tabs: [
        {
          id: "claude-tab",
          path: "/project",
          sessionType: "claude",
          cliSessionId: "claude-id",
          customName: "Claude build",
        },
        {
          id: "codex-tab",
          path: "/project",
          sessionType: "codex",
          cliSessionId: "codex-id",
          customName: "Codex job",
        },
        {
          id: "gemini-tab",
          path: "/project",
          sessionType: "gemini",
          cliSessionId: "gemini-id",
          exited: true,
        },
        {
          id: "terminal-tab",
          path: "/project",
          sessionType: "terminal",
          exited: true,
        },
      ],
      activeTabIndex: 2,
      layoutJson: makeLayout("claude-tab", "codex-tab", "gemini-tab", "terminal-tab"),
    };

    await restorePersistedTabsAndLayoutFromState("/project", uiState);

    const tabs = useTerminalTabsStore.getState().tabs;
    expect(tabs).toHaveLength(4);
    expect(tabs.map((tab) => tab.id)).toEqual([
      "claude-tab",
      "codex-tab",
      "gemini-tab",
      "terminal-tab",
    ]);
    expect(tabs[0]).toMatchObject({
      sessionType: "claude",
      cliSessionId: "claude-id",
      customName: "Claude build",
      isRunning: true,
    });
    expect(tabs[1]).toMatchObject({
      sessionType: "codex",
      cliSessionId: "codex-id",
      customName: "Codex job",
      isRunning: true,
    });
    expect(tabs[2]).toMatchObject({
      sessionType: "gemini",
      cliSessionId: "gemini-id",
      isRunning: false,
    });
    expect(tabs[3]).toMatchObject({
      sessionType: "terminal",
      isRunning: false,
    });
    expect(useTerminalTabsStore.getState().activeTabId).toBe("gemini-tab");
    expect(useTilingLayoutStore.getState().hasBlock("claude-tab")).toBe(true);
    expect(useTilingLayoutStore.getState().hasBlock("codex-tab")).toBe(true);
    expect(useTilingLayoutStore.getState().hasBlock("gemini-tab")).toBe(true);
    expect(useTilingLayoutStore.getState().hasBlock("terminal-tab")).toBe(true);
  });

  it("boot restore strips foreign terminal blocks and mints a new id when the saved block is missing", async () => {
    const uiState = {
      tabs: [
        {
          id: "ghost-tab",
          path: "/project",
          sessionType: "claude",
          customName: "Recovered",
        },
      ],
      activeTabIndex: 0,
      layoutJson: makeLayout("layout-orphan"),
    };

    await restorePersistedTabsAndLayoutFromState("/project", uiState);

    const tabs = useTerminalTabsStore.getState().tabs;
    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).not.toBe("ghost-tab");
    expect(tabs[0].customName).toBe("Recovered");
    expect(useTilingLayoutStore.getState().hasBlock("layout-orphan")).toBe(false);
    expect(useTilingLayoutStore.getState().hasBlock("ghost-tab")).toBe(false);
  });

  describe("beforeunload persist behavior", () => {
    it("saves project UI state on beforeunload when active project exists", async () => {
      useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });
      useProjectsStore.setState({
        activeProjectPath: "/project/alpha",
        isSwitchingProject: false,
      });
      useTerminalTabsStore.setState({
        tabs: [
          {
            id: "t1",
            name: "Claude",
            path: "/project/alpha",
            isRunning: true,
            sessionType: "claude",
            cliSessionId: "session-x",
          },
        ],
        activeTabId: "t1",
      });

      const view = render(<App initialProjectPath="/project/alpha" />);
      await waitFor(() => expect(mockListen).toHaveBeenCalled());
      mockInvoke.mockClear();

      window.dispatchEvent(new Event("beforeunload"));

      expect(mockInvoke).toHaveBeenCalledWith("save_project_ui_state", expect.objectContaining({
        workspaceId: "ws-test",
        path: "/project/alpha",
        state: expect.objectContaining({
          tabs: expect.arrayContaining([
            expect.objectContaining({ id: "t1", sessionType: "claude", cliSessionId: "session-x" }),
          ]),
        }),
      }));

      view.unmount();
    });

    it("skips save on beforeunload when isSwitchingProject is true", async () => {
      useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });
      useProjectsStore.setState({
        activeProjectPath: "/project/alpha",
        isSwitchingProject: true,
      });

      const view = render(<App initialProjectPath="/project/alpha" />);
      await waitFor(() => expect(mockListen).toHaveBeenCalled());
      mockInvoke.mockClear();

      window.dispatchEvent(new Event("beforeunload"));

      expect(mockInvoke).not.toHaveBeenCalledWith("save_project_ui_state", expect.anything());

      view.unmount();
    });
  });

  describe("loadProjectFromDisk existing tabs guard", () => {
    it("does not overwrite existing in-memory tabs when loading from disk", async () => {
      useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });
      useTerminalTabsStore.setState({
        tabs: [
          {
            id: "existing-1",
            name: "Claude",
            path: "/project/beta",
            isRunning: true,
            sessionType: "claude",
          },
        ],
        activeTabId: "existing-1",
      });

      mockInvoke.mockImplementation(async (channel: string) => {
        if (channel === "get_project_ui_state") {
          return {
            tabs: [
              { id: "disk-tab-1", sessionType: "claude", cliSessionId: "from-disk" },
              { id: "disk-tab-2", sessionType: "terminal" },
            ],
          };
        }
        return undefined;
      });

      await loadProjectFromDisk("/project/beta");

      const tabs = useTerminalTabsStore.getState().tabs;
      expect(tabs).toHaveLength(1);
      expect(tabs[0].id).toBe("existing-1");
    });
  });

});
