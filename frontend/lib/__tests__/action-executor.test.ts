import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeAction } from "../action-executor";

// Mock all stores
vi.mock("@/stores/file-tree", () => ({
  useFileTreeStore: {
    getState: vi.fn(),
  },
}));

vi.mock("@/stores/command-palette", () => ({
  useCommandPaletteStore: {
    getState: vi.fn(),
  },
}));

vi.mock("@/stores/tiling-layout", () => ({
  useTilingLayoutStore: {
    getState: vi.fn(),
  },
}));

vi.mock("@/stores/app-dialogs", () => ({
  useAppDialogsStore: {
    getState: vi.fn(),
  },
}));

vi.mock("@/stores/terminal-zoom", () => ({
  useTerminalZoomStore: {
    getState: vi.fn(),
  },
}));

vi.mock("@/stores/focus-mode", () => ({
  useFocusModeStore: {
    getState: vi.fn(),
  },
}));

vi.mock("@/stores/user-settings", () => ({
  useUserSettingsStore: {
    getState: vi.fn(),
  },
}));

vi.mock("@/stores/file-preview", () => ({
  useFilePreviewStore: {
    getState: vi.fn(),
  },
}));

vi.mock("@/stores/git-diff", () => ({
  useGitDiffStore: {
    getState: vi.fn(),
  },
}));

vi.mock("@/stores/git-status", () => ({
  useGitStatusStore: {
    getState: vi.fn(),
  },
}));

vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: {
    getState: vi.fn(),
  },
}));

vi.mock("@/stores/plugins", () => ({
  usePluginsStore: {
    getState: vi.fn(),
  },
  getOrderedEnabledPlugins: vi.fn(),
}));

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

import { useFileTreeStore } from "@/stores/file-tree";
import { useCommandPaletteStore } from "@/stores/command-palette";
import { useTilingLayoutStore } from "@/stores/tiling-layout";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import { useTerminalZoomStore } from "@/stores/terminal-zoom";
import { useFocusModeStore } from "@/stores/focus-mode";
import { useUserSettingsStore } from "@/stores/user-settings";
import { useFilePreviewStore } from "@/stores/file-preview";
import { useGitDiffStore } from "@/stores/git-diff";
import { useGitStatusStore } from "@/stores/git-status";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { invoke } from "@/lib/ipc";

// Store state mocks
const mockFileTreeState = {
  currentPath: "/test/project",
  tree: { root: { name: "project" } },
  openProject: vi.fn(),
  collapseAll: vi.fn(),
};

const mockCommandPaletteState = {
  open: vi.fn(),
};

const mockTilingLayoutState = {
  hasBlock: vi.fn().mockReturnValue(false),
  addBlock: vi.fn(),
  removeBlock: vi.fn(),
};

const mockAppDialogsState = {
  setShortcutsOpen: vi.fn(),
  setAboutOpen: vi.fn(),
  setSettingsOpen: vi.fn(),
};

const mockTerminalZoomState = {
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  resetZoom: vi.fn(),
};

const mockFocusModeState = {
  toggleFocusMode: vi.fn(),
};

const mockUserSettingsState = {
  openSettingsEditor: vi.fn(),
};

const mockFilePreviewState = {
  openPreview: vi.fn(),
};

const mockGitDiffState = {
  changedFilesByProject: {
    "/test/project": [{ path: "/test/project/file.ts" }],
  },
  selectedProjectPath: null,
  selectedPath: null,
  diffMode: "split" as const,
  selectChangedFile: vi.fn(),
  setDiffMode: vi.fn(),
};

const mockGitStatusState = {
  forceFetchStatuses: vi.fn(),
};

const mockTerminalTabsState = {
  nextTabId: vi.fn().mockReturnValue("tab-1"),
  addTab: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();

  // Reset store mocks
  (useFileTreeStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(mockFileTreeState);
  (useCommandPaletteStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(mockCommandPaletteState);
  (useTilingLayoutStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(mockTilingLayoutState);
  (useAppDialogsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(mockAppDialogsState);
  (useTerminalZoomStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(mockTerminalZoomState);
  (useFocusModeStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(mockFocusModeState);
  (useUserSettingsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(mockUserSettingsState);
  (useFilePreviewStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(mockFilePreviewState);
  (useGitDiffStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(mockGitDiffState);
  (useGitStatusStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(mockGitStatusState);
  (useTerminalTabsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(mockTerminalTabsState);

  // Reset function mocks
  mockFileTreeState.openProject.mockClear();
  mockFileTreeState.collapseAll.mockClear();
  mockCommandPaletteState.open.mockClear();
  mockTilingLayoutState.hasBlock.mockClear();
  mockTilingLayoutState.addBlock.mockClear();
  mockTilingLayoutState.removeBlock.mockClear();
  mockAppDialogsState.setShortcutsOpen.mockClear();
  mockAppDialogsState.setAboutOpen.mockClear();
  mockAppDialogsState.setSettingsOpen.mockClear();
  mockTerminalZoomState.zoomIn.mockClear();
  mockTerminalZoomState.zoomOut.mockClear();
  mockTerminalZoomState.resetZoom.mockClear();
  mockFocusModeState.toggleFocusMode.mockClear();
  mockUserSettingsState.openSettingsEditor.mockClear();
  mockFilePreviewState.openPreview.mockClear();
  mockGitDiffState.selectChangedFile.mockClear();
  mockGitDiffState.setDiffMode.mockClear();
  mockGitStatusState.forceFetchStatuses.mockClear();
  mockTerminalTabsState.nextTabId.mockClear();
  mockTerminalTabsState.addTab.mockClear();

  // Reset default values
  mockTilingLayoutState.hasBlock.mockReturnValue(false);
  mockGitDiffState.diffMode = "split";
  mockGitDiffState.selectedProjectPath = null;
  mockGitDiffState.selectedPath = null;
  mockGitDiffState.changedFilesByProject = {
    "/test/project": [{ path: "/test/project/file.ts" }],
  };
  mockTerminalTabsState.nextTabId.mockReturnValue("tab-1");
  mockFileTreeState.currentPath = "/test/project";
});

describe("executeAction — return value", () => {
  it("returns true for a known action", () => {
    const result = executeAction("zoom-in");
    expect(result).toBe(true);
  });

  it("returns false for an unknown action", () => {
    const result = executeAction("non-existent-action");
    expect(result).toBe(false);
  });

  it("returns false for empty string", () => {
    const result = executeAction("");
    expect(result).toBe(false);
  });

  it("returns true for all static known actions", () => {
    const knownActions = [
      "go-to-project",
      "open-project",
      "toggle-focus-mode",
      "zoom-in",
      "zoom-out",
      "zoom-reset",
      "change-theme",
      "open-settings",
      "edit-settings-json",
      "keyboard-shortcuts",
      "about",
      "collapse-all",
      "dev-reload",
      "dev-clear-cache",
    ];
    knownActions.forEach((action) => {
      expect(executeAction(action)).toBe(true);
    });
  });
});

describe("executeAction — zoom actions", () => {
  it("executes zoom-in correctly", () => {
    executeAction("zoom-in");
    expect(mockTerminalZoomState.zoomIn).toHaveBeenCalledOnce();
  });

  it("executes zoom-out correctly", () => {
    executeAction("zoom-out");
    expect(mockTerminalZoomState.zoomOut).toHaveBeenCalledOnce();
  });

  it("executes zoom-reset correctly", () => {
    executeAction("zoom-reset");
    expect(mockTerminalZoomState.resetZoom).toHaveBeenCalledOnce();
  });
});

describe("executeAction — open-files (toggle)", () => {
  it("opens file tree when not already present", () => {
    mockTilingLayoutState.hasBlock.mockReturnValue(false);
    executeAction("open-files");
    expect(mockTilingLayoutState.addBlock).toHaveBeenCalledWith(
      { type: "file-tree", projectName: "project" },
      undefined,
      "tab-file-tree",
    );
    expect(mockTilingLayoutState.removeBlock).not.toHaveBeenCalled();
  });

  it("closes file tree when already present", () => {
    mockTilingLayoutState.hasBlock.mockReturnValue(true);
    executeAction("open-files");
    expect(mockTilingLayoutState.removeBlock).toHaveBeenCalledWith("tab-file-tree");
    expect(mockTilingLayoutState.addBlock).not.toHaveBeenCalled();
  });

  it("checks hasBlock with correct blockId", () => {
    executeAction("open-files");
    expect(mockTilingLayoutState.hasBlock).toHaveBeenCalledWith("tab-file-tree");
  });
});

describe("executeAction — toggle-focus-mode", () => {
  it("executes toggle-focus-mode correctly", () => {
    executeAction("toggle-focus-mode");
    expect(mockFocusModeState.toggleFocusMode).toHaveBeenCalledOnce();
  });
});

describe("executeAction — session actions", () => {
  it("new-session: opens sessions palette when currentPath exists", () => {
    mockFileTreeState.currentPath = "/test/project";
    const result = executeAction("new-session");
    expect(mockCommandPaletteState.open).toHaveBeenCalledWith("sessions");
    expect(result).toBe(true);
  });

  it("new-session: returns false when no currentPath", () => {
    mockFileTreeState.currentPath = null as unknown as string;
    (useFileTreeStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockFileTreeState,
      currentPath: null,
    });
    const result = executeAction("new-session");
    expect(mockCommandPaletteState.open).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("go-to-project: opens projects palette", () => {
    executeAction("go-to-project");
    expect(mockCommandPaletteState.open).toHaveBeenCalledWith("projects");
  });
});

describe("executeAction — open-project", () => {
  it("calls openProject on fileTreeStore", () => {
    executeAction("open-project");
    expect(mockFileTreeState.openProject).toHaveBeenCalledOnce();
  });
});

describe("executeAction — open-browser", () => {
  it("calls addBlock with browser type and github url", () => {
    executeAction("open-browser");
    expect(mockTilingLayoutState.addBlock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "browser", url: "https://github.com/nandomoreirame/forja" }),
      undefined,
      expect.stringContaining("browser-"),
    );
  });

  it("generates unique blockId each call", () => {
    executeAction("open-browser");
    executeAction("open-browser");
    const calls = mockTilingLayoutState.addBlock.mock.calls;
    const blockId1 = calls[0][2];
    const blockId2 = calls[1][2];
    expect(blockId1).not.toBe(blockId2);
  });
});

describe("executeAction — git actions", () => {
  it("git-changes: opens preview and selects first file", () => {
    executeAction("git-changes");
    expect(mockFilePreviewState.openPreview).toHaveBeenCalledOnce();
    expect(mockGitDiffState.selectChangedFile).toHaveBeenCalledWith(
      "/test/project",
      "/test/project/file.ts",
    );
  });

  it("git-changes: returns true when files exist", () => {
    const result = executeAction("git-changes");
    expect(result).toBe(true);
  });

  it("git-changes: returns true but does nothing when no changed files", () => {
    mockGitDiffState.changedFilesByProject = {};
    (useGitDiffStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockGitDiffState,
      changedFilesByProject: {},
    });
    const result = executeAction("git-changes");
    expect(result).toBe(true);
    expect(mockFilePreviewState.openPreview).not.toHaveBeenCalled();
  });

  it("toggle-diff-mode: switches from split to unified", () => {
    mockGitDiffState.diffMode = "split";
    executeAction("toggle-diff-mode");
    expect(mockGitDiffState.setDiffMode).toHaveBeenCalledWith("unified");
  });

  it("toggle-diff-mode: switches from unified to split", () => {
    (useGitDiffStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockGitDiffState,
      diffMode: "unified",
    });
    executeAction("toggle-diff-mode");
    expect(mockGitDiffState.setDiffMode).toHaveBeenCalledWith("split");
  });

  it("refresh-git: calls forceFetchStatuses with currentPath", () => {
    executeAction("refresh-git");
    expect(mockGitStatusState.forceFetchStatuses).toHaveBeenCalledWith("/test/project");
  });

  it("refresh-git: does not call forceFetchStatuses when no currentPath", () => {
    (useFileTreeStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockFileTreeState,
      currentPath: null,
    });
    executeAction("refresh-git");
    expect(mockGitStatusState.forceFetchStatuses).not.toHaveBeenCalled();
  });
});

describe("executeAction — settings actions", () => {
  it("change-theme: opens themes palette", () => {
    executeAction("change-theme");
    expect(mockCommandPaletteState.open).toHaveBeenCalledWith("themes");
  });

  it("open-settings: opens settings dialog", () => {
    executeAction("open-settings");
    expect(mockAppDialogsState.setSettingsOpen).toHaveBeenCalledWith(true);
  });

  it("edit-settings-json: invokes get_settings_path", () => {
    executeAction("edit-settings-json");
    expect(invoke).toHaveBeenCalledWith("get_settings_path");
  });

  it("keyboard-shortcuts: opens shortcuts dialog", () => {
    executeAction("keyboard-shortcuts");
    expect(mockAppDialogsState.setShortcutsOpen).toHaveBeenCalledWith(true);
  });

  it("about: opens about dialog", () => {
    executeAction("about");
    expect(mockAppDialogsState.setAboutOpen).toHaveBeenCalledWith(true);
  });
});

describe("executeAction — collapse-all", () => {
  it("calls collapseAll on fileTreeStore", () => {
    executeAction("collapse-all");
    expect(mockFileTreeState.collapseAll).toHaveBeenCalledOnce();
  });
});

describe("executeAction — dev actions", () => {
  it("dev-clear-cache: invokes app:clearCache", () => {
    executeAction("dev-clear-cache");
    expect(invoke).toHaveBeenCalledWith("app:clearCache");
  });
});

describe("executeAction — dynamic plugin prefix", () => {
  it("plugin:<name>: adds plugin block with correct params", () => {
    executeAction("plugin:git-graph");
    expect(mockTilingLayoutState.addBlock).toHaveBeenCalledWith(
      { type: "plugin", pluginName: "git-graph", pluginDisplayName: undefined, pluginIcon: undefined },
      undefined,
      "plugin-git-graph",
    );
  });

  it("plugin:<name>: returns true", () => {
    const result = executeAction("plugin:my-plugin");
    expect(result).toBe(true);
  });
});

describe("executeAction — dynamic session prefix", () => {
  it("session:<type>: creates new tab when currentPath exists", () => {
    executeAction("session:claude");
    expect(mockTerminalTabsState.nextTabId).toHaveBeenCalledOnce();
    expect(mockTerminalTabsState.addTab).toHaveBeenCalledWith("tab-1", "/test/project", "claude");
  });

  it("session:<type>: does not create tab when no currentPath", () => {
    (useFileTreeStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockFileTreeState,
      currentPath: null,
    });
    executeAction("session:claude");
    expect(mockTerminalTabsState.addTab).not.toHaveBeenCalled();
  });

  it("session:<type>: returns true", () => {
    const result = executeAction("session:terminal");
    expect(result).toBe(true);
  });
});
