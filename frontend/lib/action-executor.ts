/**
 * Action executor — dispatches registered actions to their store/IPC handlers.
 * Used by both the command palette and quick action buttons.
 */

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
import type { SessionType } from "@/lib/cli-registry";

let browserCounter = 0;

/**
 * Execute an action by its ID.
 * Returns true if action was found and executed, false otherwise.
 */
export function executeAction(actionId: string): boolean {
  // Dynamic prefix: plugin:<name>
  if (actionId.startsWith("plugin:")) {
    const pluginName = actionId.slice("plugin:".length);
    const tilingStore = useTilingLayoutStore.getState();
    const blockId = `plugin-${pluginName}`;
    tilingStore.addBlock(
      { type: "plugin", pluginName, pluginDisplayName: undefined, pluginIcon: undefined },
      undefined,
      blockId,
    );
    return true;
  }

  // Dynamic prefix: session:<type>
  if (actionId.startsWith("session:")) {
    const sessionType = actionId.slice("session:".length) as SessionType;
    const cp = useFileTreeStore.getState().currentPath;
    if (cp) {
      const tabStore = useTerminalTabsStore.getState();
      const id = tabStore.nextTabId();
      tabStore.addTab(id, cp, sessionType);
    }
    return true;
  }

  // Static actions
  switch (actionId) {
    case "new-session": {
      const currentPath = useFileTreeStore.getState().currentPath;
      if (!currentPath) return false;
      useCommandPaletteStore.getState().open("sessions");
      return true;
    }

    case "go-to-project":
      useCommandPaletteStore.getState().open("projects");
      return true;

    case "open-project":
      useFileTreeStore.getState().openProject();
      return true;

    case "open-files": {
      const tilingStore = useTilingLayoutStore.getState();
      if (!tilingStore.hasBlock("tab-file-tree")) {
        const tree = useFileTreeStore.getState().tree;
        const projectName = tree?.root.name;
        tilingStore.addBlock(
          { type: "file-tree", projectName },
          undefined,
          "tab-file-tree",
        );
      }
      return true;
    }

    case "open-browser": {
      const tilingStore = useTilingLayoutStore.getState();
      browserCounter += 1;
      const blockId = `browser-${Date.now().toString(36)}-${browserCounter}`;
      tilingStore.addBlock(
        { type: "browser", url: "https://github.com/nandomoreirame/forja" },
        undefined,
        blockId,
      );
      return true;
    }

    case "toggle-focus-mode":
      useFocusModeStore.getState().toggleFocusMode();
      return true;

    case "zoom-in":
      useTerminalZoomStore.getState().zoomIn();
      return true;

    case "zoom-out":
      useTerminalZoomStore.getState().zoomOut();
      return true;

    case "zoom-reset":
      useTerminalZoomStore.getState().resetZoom();
      return true;

    case "git-changes": {
      const projectPath = useFileTreeStore.getState().currentPath;
      if (!projectPath) return true;
      const diffState = useGitDiffStore.getState();
      const files = diffState.changedFilesByProject[projectPath] ?? [];
      if (files.length === 0) return true;
      useFilePreviewStore.getState().openPreview();
      const targetPath =
        diffState.selectedProjectPath === projectPath && diffState.selectedPath
          ? diffState.selectedPath
          : files[0].path;
      diffState.selectChangedFile(projectPath, targetPath);
      return true;
    }

    case "toggle-diff-mode": {
      const diff = useGitDiffStore.getState();
      diff.setDiffMode(diff.diffMode === "split" ? "unified" : "split");
      return true;
    }

    case "refresh-git": {
      const path = useFileTreeStore.getState().currentPath;
      if (path) useGitStatusStore.getState().forceFetchStatuses(path);
      return true;
    }

    case "change-theme":
      useCommandPaletteStore.getState().open("themes");
      return true;

    case "open-settings":
      useAppDialogsStore.getState().setSettingsOpen(true);
      return true;

    case "edit-settings-json": {
      invoke<string>("get_settings_path").then((settingsPath) => {
        if (settingsPath) {
          const filePreview = useFilePreviewStore.getState();
          filePreview.loadFile(settingsPath).then(() => {
            filePreview.setEditing(true);
          });
        }
      }).catch(() => {});
      return true;
    }

    case "keyboard-shortcuts":
      useAppDialogsStore.getState().setShortcutsOpen(true);
      return true;

    case "about":
      useAppDialogsStore.getState().setAboutOpen(true);
      return true;

    case "collapse-all":
      useFileTreeStore.getState().collapseAll();
      return true;

    case "dev-reload":
      window.location.reload();
      return true;

    case "dev-clear-cache":
      invoke("app:clearCache").catch(() => {});
      return true;

    default:
      console.warn(`[action-executor] Unknown action: ${actionId}`);
      return false;
  }
}
