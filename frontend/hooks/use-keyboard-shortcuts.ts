import { useEffect, type RefObject } from "react";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import { useCommandPaletteStore } from "@/stores/command-palette";
import { useFilePreviewStore } from "@/stores/file-preview";
import { useFileTreeStore } from "@/stores/file-tree";
import { useGitDiffStore } from "@/stores/git-diff";
import { useProjectsStore } from "@/stores/projects";
import { useTerminalSplitLayoutStore } from "@/stores/terminal-split-layout";
import { useRightPanelStore } from "@/stores/right-panel";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { useTerminalZoomStore } from "@/stores/terminal-zoom";
import { useUserSettingsStore } from "@/stores/user-settings";
import { useBrowserPaneStore } from "@/stores/browser-pane";
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
      const splitStore = useTerminalSplitLayoutStore.getState();

      const createSplit = (orientation: "horizontal" | "vertical") => {
        if (splitStore.orientation !== "none") return;
        const activeId = activeTabIdRef.current;
        if (!activeId) return;
        const activeTab = tabsRef.current?.find((t) => t.id === activeId);
        const sessionType = activeTab?.sessionType ?? "terminal";
        splitStore.openSplit(orientation, activeId, sessionType);
        splitStore.setFocusedPane("secondary");
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
      // Ctrl/Cmd+Alt+B — toggle browser pane
      if (mod && event.altKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        useBrowserPaneStore.getState().toggleOpen();
        return;
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        const { tree: t, trees: tr } = useFileTreeStore.getState();
        if (t !== null || Object.keys(tr).length > 0) {
          useFileTreeStore.getState().toggleSidebar();
        }
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
        // Ctrl+Alt+W: close split (unchanged)
        if (event.altKey && splitStore.orientation !== "none") {
          event.preventDefault();
          splitStore.closeSplit();
          return;
        }
        // Ctrl+Shift+W: close terminal tab
        if (event.shiftKey) {
          event.preventDefault();
          const id = activeTabIdRef.current;
          if (id) closeTab(id);
          return;
        }
        // Ctrl+W: close file preview
        event.preventDefault();
        const previewState = useFilePreviewStore.getState();
        if (previewState.isOpen) {
          previewState.closePreview();
        }
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
      if (mod && event.altKey && (event.key === "[" || event.key === "]")) {
        event.preventDefault();
        if (splitStore.orientation === "none") return;
        splitStore.setFocusedPane(
          splitStore.focusedPane === "primary" ? "secondary" : "primary",
        );
        return;
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        useCommandPaletteStore.getState().open("commands");
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
      if (mod && event.key === "j") {
        event.preventDefault();
        useRightPanelStore.getState().togglePanel();
        return;
      }
      if (mod && event.key === "e") {
        event.preventDefault();
        useFilePreviewStore.getState().togglePreview();
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
      // Ctrl+1..9: switch tabs by position
      if (mod && !event.shiftKey && !event.altKey && event.key >= "1" && event.key <= "9") {
        event.preventDefault();
        const projectPath = useFileTreeStore.getState().currentPath;
        if (!projectPath) return;
        const projectTabs = useTerminalTabsStore.getState().getTabsForProject(projectPath);
        const index = parseInt(event.key, 10) - 1;
        if (index < projectTabs.length) {
          useTerminalTabsStore.getState().setActiveTab(projectTabs[index].id);
        }
        return;
      }
      // Alt+1..9: switch projects by position
      if (event.altKey && !mod && !event.shiftKey && event.key >= "1" && event.key <= "9") {
        event.preventDefault();
        const index = parseInt(event.key, 10) - 1;
        const { projects, switchToProject: swp } = useProjectsStore.getState();
        if (index < projects.length) {
          swp(projects[index].path);
        }
        return;
      }
      // Ctrl+Tab / Ctrl+Shift+Tab: cycle tabs
      if (event.ctrlKey && event.key === "Tab") {
        event.preventDefault();
        const currentTabs = tabsRef.current;
        const currentActive = activeTabIdRef.current;
        if (currentTabs && currentTabs.length > 1 && currentActive) {
          const currentIndex = currentTabs.findIndex(
            (t) => t.id === currentActive,
          );
          const nextIndex = event.shiftKey
            ? (currentIndex - 1 + currentTabs.length) % currentTabs.length
            : (currentIndex + 1) % currentTabs.length;
          useTerminalTabsStore.getState().setActiveTab(currentTabs[nextIndex].id);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeTab, tabsRef, activeTabIdRef]);
}
