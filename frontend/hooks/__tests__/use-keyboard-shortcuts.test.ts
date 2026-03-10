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

vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: {
    getState: () => ({
      setActiveTab: vi.fn(),
      toggleTerminalPane: vi.fn(),
    }),
  },
}));

vi.mock("@/stores/file-tree", () => ({
  useFileTreeStore: {
    getState: () => ({ currentPath: "/project", tree: null, trees: {} }),
  },
}));

vi.mock("@/stores/app-dialogs", () => ({
  useAppDialogsStore: { getState: () => ({ setSettingsOpen: vi.fn() }) },
}));

vi.mock("@/stores/command-palette", () => ({
  useCommandPaletteStore: { getState: () => ({ open: vi.fn() }) },
}));

vi.mock("@/stores/file-preview", () => ({
  useFilePreviewStore: { getState: () => ({ openPreview: vi.fn(), togglePreview: vi.fn(), isOpen: false }) },
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

describe("useKeyboardShortcuts split", () => {
  beforeEach(() => {
    splitActions.openSplit.mockReset();
    splitActions.closeSplit.mockReset();
    splitActions.setFocusedPane.mockReset();
    splitActions.orientation = "none";
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
