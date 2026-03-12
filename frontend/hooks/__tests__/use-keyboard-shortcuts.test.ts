import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useKeyboardShortcuts } from "../use-keyboard-shortcuts";

const splitActions = {
  openSplit: vi.fn(),
  closeSplit: vi.fn(),
  setFocusedPane: vi.fn(),
  orientation: "none" as "none" | "horizontal" | "vertical",
};

vi.mock("@/stores/terminal-split-layout", () => ({
  useTerminalSplitLayoutStore: {
    getState: () => splitActions,
  },
}));

const tabStoreActions = {
  setActiveTab: vi.fn(),
  toggleTerminalFullscreen: vi.fn(),
  nextTabId: vi.fn(() => "new-tab-1"),
  addTab: vi.fn(),
  getTabsForProject: vi.fn(() => []),
};

const rightPanelActions = {
  togglePanel: vi.fn(),
};

const fileTreeActions = {
  currentPath: "/project",
  tree: null,
  trees: {} as Record<string, unknown>,
  openProject: vi.fn(),
  toggleSidebar: vi.fn(),
};

vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: {
    getState: () => tabStoreActions,
  },
}));

vi.mock("@/stores/right-panel", () => ({
  useRightPanelStore: {
    getState: () => rightPanelActions,
  },
}));

vi.mock("@/stores/file-tree", () => ({
  useFileTreeStore: {
    getState: () => fileTreeActions,
  },
}));

vi.mock("@/stores/app-dialogs", () => ({
  useAppDialogsStore: { getState: () => ({ setSettingsOpen: vi.fn() }) },
}));

const commandPaletteActions = {
  open: vi.fn(),
};

vi.mock("@/stores/command-palette", () => ({
  useCommandPaletteStore: { getState: () => commandPaletteActions },
}));

const filePreviewActions = {
  openPreview: vi.fn(),
  togglePreview: vi.fn(),
  closePreview: vi.fn(),
  isOpen: false,
};

vi.mock("@/stores/file-preview", () => ({
  useFilePreviewStore: { getState: () => filePreviewActions },
}));

vi.mock("@/stores/git-diff", () => ({
  useGitDiffStore: {
    getState: () => ({
      changedFilesByProject: {},
      selectedProjectPath: null,
      selectedPath: null,
      selectChangedFile: vi.fn(),
    }),
  },
}));

vi.mock("@/stores/projects", () => ({
  useProjectsStore: { getState: () => ({ projects: [], switchToProject: vi.fn() }) },
}));

vi.mock("@/stores/terminal-zoom", () => ({
  useTerminalZoomStore: { getState: () => ({ zoomIn: vi.fn(), zoomOut: vi.fn(), resetZoom: vi.fn() }) },
}));

vi.mock("@/stores/user-settings", () => ({
  useUserSettingsStore: {
    getState: () => ({
      editorOpen: false,
      editorDirty: false,
      saveEditorContent: vi.fn(),
    }),
  },
}));

const browserPaneActions = {
  toggleOpen: vi.fn(),
};

vi.mock("@/stores/browser-pane", () => ({
  useBrowserPaneStore: { getState: () => browserPaneActions },
}));

function setupHook() {
  const tabsRef = { current: [{ id: "tab-1", sessionType: "claude" }] as any[] };
  const activeTabIdRef = { current: "tab-1" };
  const closeTab = vi.fn();
  renderHook(() => useKeyboardShortcuts({ tabsRef, activeTabIdRef, closeTab }));
  return { tabsRef, activeTabIdRef, closeTab };
}

describe("useKeyboardShortcuts split", () => {
  beforeEach(() => {
    splitActions.openSplit.mockReset();
    splitActions.closeSplit.mockReset();
    splitActions.setFocusedPane.mockReset();
    splitActions.orientation = "none";
    fileTreeActions.openProject.mockReset();
    fileTreeActions.toggleSidebar.mockReset();
    fileTreeActions.tree = null;
    fileTreeActions.trees = {};
  });

  it("creates vertical split with sessionType from active tab (no addTab)", () => {
    const tabsRef = { current: [{ id: "tab-1", sessionType: "claude" }] };
    const activeTabIdRef = { current: "tab-1" };
    const closeTab = vi.fn();
    renderHook(() => useKeyboardShortcuts({ tabsRef, activeTabIdRef, closeTab }));

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "v",
        metaKey: true,
        altKey: true,
      }),
    );

    expect(splitActions.openSplit).toHaveBeenCalledWith("vertical", "tab-1", "claude");
    expect(splitActions.setFocusedPane).toHaveBeenCalledWith("secondary");
  });

  it("creates horizontal split inheriting terminal sessionType", () => {
    const tabsRef = { current: [{ id: "tab-1", sessionType: "terminal" }] };
    const activeTabIdRef = { current: "tab-1" };
    const closeTab = vi.fn();
    renderHook(() => useKeyboardShortcuts({ tabsRef, activeTabIdRef, closeTab }));

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "h",
        metaKey: true,
        altKey: true,
      }),
    );

    expect(splitActions.openSplit).toHaveBeenCalledWith("horizontal", "tab-1", "terminal");
  });

  it("inherits gemini sessionType when splitting a gemini tab", () => {
    const tabsRef = { current: [{ id: "tab-1", sessionType: "gemini" }] };
    const activeTabIdRef = { current: "tab-1" };
    const closeTab = vi.fn();
    renderHook(() => useKeyboardShortcuts({ tabsRef, activeTabIdRef, closeTab }));

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "v",
        metaKey: true,
        altKey: true,
      }),
    );

    expect(splitActions.openSplit).toHaveBeenCalledWith("vertical", "tab-1", "gemini");
  });

  it("defaults to terminal when active tab not found in tabsRef", () => {
    const tabsRef = { current: [{ id: "tab-99", sessionType: "claude" }] };
    const activeTabIdRef = { current: "tab-1" };
    const closeTab = vi.fn();
    renderHook(() => useKeyboardShortcuts({ tabsRef, activeTabIdRef, closeTab }));

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "v",
        metaKey: true,
        altKey: true,
      }),
    );

    expect(splitActions.openSplit).toHaveBeenCalledWith("vertical", "tab-1", "terminal");
  });

  it("does NOT open split when split is already active", () => {
    splitActions.orientation = "vertical";
    const tabsRef = { current: [{ id: "tab-1", sessionType: "terminal" }] };
    const activeTabIdRef = { current: "tab-1" };
    const closeTab = vi.fn();
    renderHook(() => useKeyboardShortcuts({ tabsRef, activeTabIdRef, closeTab }));

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "v",
        metaKey: true,
        altKey: true,
      }),
    );

    expect(splitActions.openSplit).not.toHaveBeenCalled();
  });

  it("does NOT open horizontal split when split is already active", () => {
    splitActions.orientation = "horizontal";
    const tabsRef = { current: [{ id: "tab-1", sessionType: "terminal" }] };
    const activeTabIdRef = { current: "tab-1" };
    const closeTab = vi.fn();
    renderHook(() => useKeyboardShortcuts({ tabsRef, activeTabIdRef, closeTab }));

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "h",
        metaKey: true,
        altKey: true,
      }),
    );

    expect(splitActions.openSplit).not.toHaveBeenCalled();
  });

  it("closes split with Mod+Alt+W when split is active", () => {
    splitActions.orientation = "horizontal";
    const tabsRef = { current: [{ id: "tab-1" }] };
    const activeTabIdRef = { current: "tab-1" };
    const closeTab = vi.fn();
    renderHook(() => useKeyboardShortcuts({ tabsRef, activeTabIdRef, closeTab }));

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "w",
        metaKey: true,
        altKey: true,
      }),
    );

    expect(splitActions.closeSplit).toHaveBeenCalledTimes(1);
  });
});

describe("useKeyboardShortcuts tab management", () => {
  beforeEach(() => {
    splitActions.orientation = "none";
    splitActions.closeSplit.mockReset();
    tabStoreActions.setActiveTab.mockReset();
    tabStoreActions.nextTabId.mockReset().mockReturnValue("new-tab-1");
    tabStoreActions.addTab.mockReset();
    tabStoreActions.getTabsForProject.mockReset().mockReturnValue([]);
    filePreviewActions.closePreview.mockReset();
    filePreviewActions.isOpen = false;
  });

  it("Ctrl+Shift+T opens command palette in sessions mode", () => {
    commandPaletteActions.open.mockReset();
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "T",
        ctrlKey: true,
        shiftKey: true,
      }),
    );

    expect(commandPaletteActions.open).toHaveBeenCalledWith("sessions");
    expect(tabStoreActions.addTab).not.toHaveBeenCalled();
  });

  it("Ctrl+T (without shift) does NOT create a new tab", () => {
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "t",
        ctrlKey: true,
      }),
    );

    expect(tabStoreActions.addTab).not.toHaveBeenCalled();
  });

  it("Ctrl+Shift+W closes the active terminal tab", () => {
    const { closeTab } = setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "W",
        ctrlKey: true,
        shiftKey: true,
      }),
    );

    expect(closeTab).toHaveBeenCalledWith("tab-1");
  });

  it("Ctrl+W closes preview when preview is open", () => {
    filePreviewActions.isOpen = true;
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "w",
        ctrlKey: true,
      }),
    );

    expect(filePreviewActions.closePreview).toHaveBeenCalled();
  });

  it("Ctrl+W does NOT close a terminal tab", () => {
    const { closeTab } = setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "w",
        ctrlKey: true,
      }),
    );

    expect(closeTab).not.toHaveBeenCalled();
  });
});

describe("useKeyboardShortcuts fullscreen toggle", () => {
  beforeEach(() => {
    tabStoreActions.toggleTerminalFullscreen.mockReset();
  });

  it("Ctrl+Shift+F toggles terminal fullscreen", () => {
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "F",
        ctrlKey: true,
        shiftKey: true,
      }),
    );

    expect(tabStoreActions.toggleTerminalFullscreen).toHaveBeenCalledTimes(1);
  });
});

describe("useKeyboardShortcuts right panel toggle", () => {
  beforeEach(() => {
    rightPanelActions.togglePanel.mockReset();
  });

  it("Ctrl+J toggles right panel", () => {
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "j",
        ctrlKey: true,
      }),
    );

    expect(rightPanelActions.togglePanel).toHaveBeenCalledTimes(1);
  });
});

describe("useKeyboardShortcuts browser pane toggle", () => {
  beforeEach(() => {
    browserPaneActions.toggleOpen.mockReset();
  });

  it("Ctrl+Alt+B toggles browser pane", () => {
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "B",
        ctrlKey: true,
        altKey: true,
      }),
    );

    expect(browserPaneActions.toggleOpen).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+Shift+B does NOT toggle browser pane", () => {
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "B",
        ctrlKey: true,
        shiftKey: true,
      }),
    );

    expect(browserPaneActions.toggleOpen).not.toHaveBeenCalled();
  });
});

describe("useKeyboardShortcuts project and sidebar shortcuts", () => {
  beforeEach(() => {
    fileTreeActions.openProject.mockReset();
    fileTreeActions.toggleSidebar.mockReset();
    fileTreeActions.tree = null;
    fileTreeActions.trees = {};
    browserPaneActions.toggleOpen.mockReset();
  });

  it("Ctrl+Shift+O opens project picker", () => {
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "O",
        ctrlKey: true,
        shiftKey: true,
      }),
    );

    expect(fileTreeActions.openProject).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+O (without shift) does NOT open project picker", () => {
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "o",
        ctrlKey: true,
      }),
    );

    expect(fileTreeActions.openProject).not.toHaveBeenCalled();
  });

  it("Ctrl+Shift+B toggles sidebar when a tree is loaded", () => {
    fileTreeActions.tree = { root: {} };
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "B",
        ctrlKey: true,
        shiftKey: true,
      }),
    );

    expect(fileTreeActions.toggleSidebar).toHaveBeenCalledTimes(1);
    expect(browserPaneActions.toggleOpen).not.toHaveBeenCalled();
  });

  it("Ctrl+B (without shift) does NOT toggle sidebar", () => {
    fileTreeActions.tree = { root: {} };
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "b",
        ctrlKey: true,
      }),
    );

    expect(fileTreeActions.toggleSidebar).not.toHaveBeenCalled();
  });
});

describe("useKeyboardShortcuts tab switching with Ctrl+number", () => {
  beforeEach(() => {
    splitActions.orientation = "none";
    tabStoreActions.setActiveTab.mockReset();
    tabStoreActions.getTabsForProject.mockReset();
  });

  it("Ctrl+2 navigates to the second tab of the project", () => {
    const projectTabs = [
      { id: "tab-1", path: "/project", sessionType: "claude" },
      { id: "tab-2", path: "/project", sessionType: "terminal" },
      { id: "tab-3", path: "/project", sessionType: "gemini" },
    ];
    tabStoreActions.getTabsForProject.mockReturnValue(projectTabs);

    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "2",
        ctrlKey: true,
      }),
    );

    expect(tabStoreActions.setActiveTab).toHaveBeenCalledWith("tab-2");
  });

  it("Ctrl+1 navigates to the first tab", () => {
    const projectTabs = [
      { id: "tab-1", path: "/project", sessionType: "claude" },
      { id: "tab-2", path: "/project", sessionType: "terminal" },
    ];
    tabStoreActions.getTabsForProject.mockReturnValue(projectTabs);

    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "1",
        ctrlKey: true,
      }),
    );

    expect(tabStoreActions.setActiveTab).toHaveBeenCalledWith("tab-1");
  });

  it("Ctrl+9 does nothing when fewer than 9 tabs exist", () => {
    const projectTabs = [
      { id: "tab-1", path: "/project", sessionType: "claude" },
      { id: "tab-2", path: "/project", sessionType: "terminal" },
    ];
    tabStoreActions.getTabsForProject.mockReturnValue(projectTabs);

    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "9",
        ctrlKey: true,
      }),
    );

    expect(tabStoreActions.setActiveTab).not.toHaveBeenCalled();
  });
});
