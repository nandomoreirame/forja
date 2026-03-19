import { useEffect, type RefObject } from "react";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import { useCommandPaletteStore } from "@/stores/command-palette";
import { useFilePreviewStore } from "@/stores/file-preview";
import { useFileTreeStore } from "@/stores/file-tree";
import { useGitDiffStore } from "@/stores/git-diff";
import { useProjectsStore } from "@/stores/projects";
import { useTilingLayoutStore } from "@/stores/tiling-layout";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { useTerminalZoomStore } from "@/stores/terminal-zoom";
import { useUserSettingsStore } from "@/stores/user-settings";
import { useFocusModeStore } from "@/stores/focus-mode";
import { paneFocusRegistry } from "@/lib/pane-focus-registry";
import type { TerminalTab } from "@/stores/terminal-tabs";

interface UseKeyboardShortcutsOptions {
  tabsRef: RefObject<TerminalTab[]>;
  activeTabIdRef: RefObject<string | null>;
  closeTab: (tabId: string) => void;
}

export function useKeyboardShortcuts({
  tabsRef,
  activeTabIdRef,
  closeTab,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      const tilingStore = useTilingLayoutStore.getState();

      const createSplit = (direction: "horizontal" | "vertical") => {
        const activeId = activeTabIdRef.current;
        if (!activeId) return;
        const activeTab = tabsRef.current?.find((t) => t.id === activeId);
        const sessionType = activeTab?.sessionType ?? "terminal";
        tilingStore.splitActiveTabset(direction, sessionType);
      };

      if (mod && event.key === "s") {
        const settingsState = useUserSettingsStore.getState();
        if (settingsState.editorOpen && settingsState.editorDirty) {
          event.preventDefault();
          settingsState.saveEditorContent();
          return;
        }
      }
      if (mod && event.key === ",") {
        event.preventDefault();
        useAppDialogsStore.getState().setSettingsOpen(true);
        return;
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        useFileTreeStore.getState().openProject();
        return;
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        useCommandPaletteStore.getState().open("sessions");
        return;
      }
      if (mod && event.key.toLowerCase() === "w") {
        event.preventDefault();
        tilingStore.closeActiveTab();
        return;
      }
      if (mod && event.altKey && event.key.toLowerCase() === "v") {
        event.preventDefault();
        createSplit("vertical");
        return;
      }
      if (mod && event.altKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        createSplit("horizontal");
        return;
      }
      // Ctrl+Alt+[/] focus switching removed — flexlayout handles focus natively
      if (mod && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        useCommandPaletteStore.getState().open("commands");
        return;
      }
      // Ctrl/Cmd+Shift+L — go to project (project switcher)
      if (mod && event.shiftKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        useCommandPaletteStore.getState().open("projects");
        return;
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "g") {
        event.preventDefault();
        const projectPath = useFileTreeStore.getState().currentPath;
        if (!projectPath) return;
        const diffState = useGitDiffStore.getState();
        const files = diffState.changedFilesByProject[projectPath] ?? [];
        if (files.length === 0) return;
        useFilePreviewStore.getState().openPreview();
        const targetPath =
          diffState.selectedProjectPath === projectPath && diffState.selectedPath
            ? diffState.selectedPath
            : files[0].path;
        diffState.selectChangedFile(projectPath, targetPath);
        return;
      }
      if (mod && event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        const projectPath = useFileTreeStore.getState().currentPath;
        if (!projectPath) return;
        const diffState = useGitDiffStore.getState();
        const files = diffState.changedFilesByProject[projectPath] ?? [];
        if (files.length === 0) return;

        const currentIndex = files.findIndex((f) => f.path === diffState.selectedPath);
        const fallbackIndex = currentIndex === -1 ? 0 : currentIndex;
        const nextIndex =
          event.key === "ArrowDown"
            ? (fallbackIndex + 1) % files.length
            : (fallbackIndex - 1 + files.length) % files.length;
        useFilePreviewStore.getState().openPreview();
        diffState.selectChangedFile(projectPath, files[nextIndex].path);
        return;
      }
      if (mod && !event.shiftKey && event.key === "p") {
        event.preventDefault();
        const { tree: t, currentPath: cp } = useFileTreeStore.getState();
        if (t && cp) {
          useCommandPaletteStore.getState().open("files");
        }
        return;
      }
      // Ctrl/Cmd+Shift+F — toggle terminal fullscreen
      if (mod && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        useTerminalTabsStore.getState().toggleTerminalFullscreen();
        return;
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "e") {
        event.preventDefault();
        if (tilingStore.hasBlock("tab-file-tree")) {
          tilingStore.selectTab("tab-file-tree");
        } else {
          const tree = useFileTreeStore.getState().tree;
          const projectName = tree?.root?.name;
          tilingStore.addBlock(
            { type: "file-tree", projectName },
            undefined,
            "tab-file-tree",
          );
        }
        return;
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        const blockId = `browser-${Date.now().toString(36)}`;
        tilingStore.addBlock(
          { type: "browser", url: "https://github.com/nandomoreirame/forja" },
          undefined,
          blockId,
        );
        return;
      }
      // Ctrl/Cmd+Alt+F — toggle focus mode
      if (mod && event.altKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        useFocusModeStore.getState().toggleFocusMode();
        return;
      }
      if (mod && event.altKey && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        useTerminalZoomStore.getState().zoomIn();
        return;
      }
      if (mod && event.altKey && event.key === "-") {
        event.preventDefault();
        useTerminalZoomStore.getState().zoomOut();
        return;
      }
      if (mod && event.altKey && event.key === "0") {
        event.preventDefault();
        useTerminalZoomStore.getState().resetZoom();
        return;
      }
      // Ctrl/Cmd+Shift+1..9: switch projects by position
      // Uses event.code (Digit1-Digit9) because event.key returns symbols (!, @, #) when Shift is held
      const digitMatch = event.code?.match(/^Digit([1-9])$/);
      if (mod && event.shiftKey && !event.altKey && digitMatch) {
        event.preventDefault();
        const index = parseInt(digitMatch[1], 10) - 1;
        const { projects, switchToProject: swp } = useProjectsStore.getState();
        if (index < projects.length) {
          swp(projects[index].path);
        }
        return;
      }
      // Ctrl+Tab / Ctrl+Shift+Tab: cycle ALL tabs across ALL panes (like Chrome)
      if (event.ctrlKey && event.key === "Tab") {
        event.preventDefault();
        const direction = event.shiftKey ? "backward" : "forward";
        const nextTabId = tilingStore.cycleGlobalTab(direction);
        if (nextTabId) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              paneFocusRegistry.focus(nextTabId);
            });
          });
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeTab, tabsRef, activeTabIdRef]);
}
