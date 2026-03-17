import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useKeyboardShortcuts } from "../use-keyboard-shortcuts";

const tilingActions = {
  splitActiveTabset: vi.fn(),
  closeActiveTab: vi.fn(),
  hasBlock: vi.fn(() => false),
  addBlock: vi.fn(),
  selectTab: vi.fn(),
};

vi.mock("@/stores/tiling-layout", () => ({
  useTilingLayoutStore: {
    getState: () => tilingActions,
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

const projectStoreActions = {
  projects: [] as { path: string }[],
  switchToProject: vi.fn(),
};

vi.mock("@/stores/projects", () => ({
  useProjectsStore: { getState: () => projectStoreActions },
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

vi.mock("@/stores/browser-pane", () => ({
  useBrowserPaneStore: { getState: () => ({}) },
}));

function setupHook() {
  const tabsRef = { current: [{ id: "tab-1", sessionType: "claude" }] as any[] };
  const activeTabIdRef = { current: "tab-1" };
  const closeTab = vi.fn();
  renderHook(() => useKeyboardShortcuts({ tabsRef, activeTabIdRef, closeTab }));
  return { tabsRef, activeTabIdRef, closeTab };
}

describe("useKeyboardShortcuts split (tiling layout)", () => {
  beforeEach(() => {
    tilingActions.splitActiveTabset.mockReset();
    tilingActions.closeActiveTab.mockReset();
    fileTreeActions.openProject.mockReset();
    fileTreeActions.toggleSidebar.mockReset();
    fileTreeActions.tree = null;
    fileTreeActions.trees = {};
  });

  it("creates vertical split with sessionType from active tab", () => {
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

    expect(tilingActions.splitActiveTabset).toHaveBeenCalledWith("vertical", "claude");
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

    expect(tilingActions.splitActiveTabset).toHaveBeenCalledWith("horizontal", "terminal");
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

    expect(tilingActions.splitActiveTabset).toHaveBeenCalledWith("vertical", "gemini");
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

    expect(tilingActions.splitActiveTabset).toHaveBeenCalledWith("vertical", "terminal");
  });

  it("does not split when no active tab id", () => {
    const tabsRef = { current: [{ id: "tab-1", sessionType: "terminal" }] };
    const activeTabIdRef = { current: null };
    const closeTab = vi.fn();
    renderHook(() => useKeyboardShortcuts({ tabsRef, activeTabIdRef, closeTab }));

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "v",
        metaKey: true,
        altKey: true,
      }),
    );

    expect(tilingActions.splitActiveTabset).not.toHaveBeenCalled();
  });

  it("closes active tab with Mod+Alt+W", () => {
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

    expect(tilingActions.closeActiveTab).toHaveBeenCalledTimes(1);
  });
});

describe("useKeyboardShortcuts tab management", () => {
  beforeEach(() => {
    tilingActions.splitActiveTabset.mockReset();
    tilingActions.closeActiveTab.mockReset();
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

  it("Ctrl+Shift+L opens command palette in projects mode", () => {
    commandPaletteActions.open.mockReset();
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "L",
        ctrlKey: true,
        shiftKey: true,
      }),
    );

    expect(commandPaletteActions.open).toHaveBeenCalledWith("projects");
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

  it("Ctrl+Shift+W closes active tab in tiling layout", () => {
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "W",
        ctrlKey: true,
        shiftKey: true,
      }),
    );

    expect(tilingActions.closeActiveTab).toHaveBeenCalledTimes(1);
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

describe("useKeyboardShortcuts right panel toggle (removed)", () => {
  beforeEach(() => {
    rightPanelActions.togglePanel.mockReset();
  });

  it("Ctrl+J no longer toggles right panel", () => {
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "j",
        ctrlKey: true,
      }),
    );

    expect(rightPanelActions.togglePanel).not.toHaveBeenCalled();
  });
});


describe("useKeyboardShortcuts project shortcuts", () => {
  beforeEach(() => {
    fileTreeActions.openProject.mockReset();
    fileTreeActions.tree = null;
    fileTreeActions.trees = {};
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
});

describe("useKeyboardShortcuts project switching with Ctrl+Shift+number", () => {
  beforeEach(() => {
    projectStoreActions.switchToProject.mockReset();
    projectStoreActions.projects = [];
  });

  it("Ctrl+Shift+1 switches to the first project", () => {
    projectStoreActions.projects = [
      { path: "/project-a" },
      { path: "/project-b" },
    ];

    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "!",
        code: "Digit1",
        ctrlKey: true,
        shiftKey: true,
      }),
    );

    expect(projectStoreActions.switchToProject).toHaveBeenCalledWith("/project-a");
  });

  it("Ctrl+Shift+2 switches to the second project", () => {
    projectStoreActions.projects = [
      { path: "/project-a" },
      { path: "/project-b" },
      { path: "/project-c" },
    ];

    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "@",
        code: "Digit2",
        ctrlKey: true,
        shiftKey: true,
      }),
    );

    expect(projectStoreActions.switchToProject).toHaveBeenCalledWith("/project-b");
  });

  it("Ctrl+Shift+9 does nothing when fewer than 9 projects exist", () => {
    projectStoreActions.projects = [
      { path: "/project-a" },
      { path: "/project-b" },
    ];

    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "(",
        code: "Digit9",
        ctrlKey: true,
        shiftKey: true,
      }),
    );

    expect(projectStoreActions.switchToProject).not.toHaveBeenCalled();
  });
});

describe("useKeyboardShortcuts open files and browser", () => {
  beforeEach(() => {
    tilingActions.hasBlock.mockReset().mockReturnValue(false);
    tilingActions.addBlock.mockReset();
    tilingActions.selectTab.mockReset();
    fileTreeActions.currentPath = "/project";
    fileTreeActions.tree = { root: { name: "my-project" } } as any;
  });

  it("Ctrl+Shift+E opens file-tree block when not already open", () => {
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "E",
        ctrlKey: true,
        shiftKey: true,
      }),
    );

    expect(tilingActions.addBlock).toHaveBeenCalledWith(
      { type: "file-tree", projectName: "my-project" },
      undefined,
      "tab-file-tree",
    );
  });

  it("Ctrl+Shift+E selects existing file-tree block when already open", () => {
    tilingActions.hasBlock.mockReturnValue(true);
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "E",
        ctrlKey: true,
        shiftKey: true,
      }),
    );

    expect(tilingActions.selectTab).toHaveBeenCalledWith("tab-file-tree");
    expect(tilingActions.addBlock).not.toHaveBeenCalled();
  });

  it("Ctrl+E (without shift) does not open files", () => {
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "e",
        ctrlKey: true,
      }),
    );

    expect(tilingActions.addBlock).not.toHaveBeenCalled();
  });

  it("Ctrl+Shift+B opens browser block", () => {
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "B",
        ctrlKey: true,
        shiftKey: true,
      }),
    );

    expect(tilingActions.addBlock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "browser" }),
      undefined,
      expect.stringContaining("browser-"),
    );
  });

  it("Ctrl+J does not toggle right panel anymore", () => {
    rightPanelActions.togglePanel.mockReset();
    setupHook();

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "j",
        ctrlKey: true,
      }),
    );

    expect(rightPanelActions.togglePanel).not.toHaveBeenCalled();
  });
});
