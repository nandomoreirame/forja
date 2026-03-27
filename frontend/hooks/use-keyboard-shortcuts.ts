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
import { useWorkspaceStore } from "@/stores/workspace";
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

        if (!useFileTreeStore.getState().currentPath) return;
        useCommandPaletteStore.getState().open("sessions");
        return;
      }
      if (mod && event.key.toLowerCase() === "w") {
        event.preventDefault();

        // Check if closing file-preview with unsaved changes
        const previewStore = useFilePreviewStore.getState();
        const model = tilingStore.model;
        const activeTabset = model.getActiveTabset();
        const selectedNode = activeTabset?.getSelectedNode();
        const selectedId = selectedNode?.getId();
        if (selectedId === "block-file-preview" && previewStore.isEditing && previewStore.editDirty) {
          previewStore.setShowUnsavedDialog(true);
          return;
        }
        tilingStore.closeActiveTab();
        // Focus file-tree container if no other content tabs remain
        requestAnimationFrame(() => {
          const model = tilingStore.model;
          const active = model.getActiveTabset();
          const selected = active?.getSelectedNode();
          const isFileTree = selected?.getId() === "tab-file-tree";
          if (!selected || isFileTree) {
            const container = document.querySelector<HTMLElement>('[data-testid="file-tree-sidebar"]')?.closest<HTMLElement>('[tabindex="0"]');
            container?.focus();
          }
        });
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
      // Ctrl/Cmd+Enter — toggle file editor (only if a file is loaded)
      if (mod && event.key === "Enter") {
        const previewStore = useFilePreviewStore.getState();
        if (previewStore.currentFile) {
          event.preventDefault();
  
          previewStore.toggleEditing();
          return;
        }
        // Don't consume the event if no file is loaded — let file-tree handler use it
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "e") {
        event.preventDefault();

        if (!useFileTreeStore.getState().currentPath) return;
        if (tilingStore.hasBlock("tab-file-tree")) {
          // Toggle: close if it's the currently selected tab, otherwise focus it
          const activeTabset = tilingStore.model.getActiveTabset();
          const selectedId = activeTabset?.getSelectedNode()?.getId();
          if (selectedId === "tab-file-tree") {
            tilingStore.removeBlock("tab-file-tree");
          } else {
            tilingStore.selectTab("tab-file-tree");
          }
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
        const { projects, switchToProject: swp, flashKeyboardFocus } = useProjectsStore.getState();
        if (index < projects.length) {
          const targetPath = projects[index].path;
          swp(targetPath);
          flashKeyboardFocus(targetPath);
        }

        return;
      }
      // ⌘+Alt+1-9 — switch workspace (use event.code for reliable digit detection)
      if (mod && event.altKey && !event.shiftKey && digitMatch) {
        const digit = parseInt(digitMatch[1], 10);
        if (digit === 0) return; // 0 is bound to resetZoom
        event.preventDefault();
        const { workspaces, openWorkspaceInNewWindow } = useWorkspaceStore.getState();
        const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;
        const wsIndex = digit - 1;
        if (wsIndex < workspaces.length) {
          const ws = workspaces[wsIndex];
          if (ws.id !== activeWorkspaceId) {
            openWorkspaceInNewWindow(ws.id);
          }
        }

        return;
      }
      // ⌘+1-9 — switch to tab by position (global tab order)
      if (mod && !event.shiftKey && !event.altKey && digitMatch) {
        event.preventDefault();
        const tabIndex = parseInt(digitMatch[1], 10) - 1;
        const allTabIds: string[] = [];
        tilingStore.model.visitNodes((node) => {
          if (node.getType() === "tab") allTabIds.push(node.getId());
        });
        if (tabIndex < allTabIds.length) {
          const targetTabId = allTabIds[tabIndex];
          tilingStore.selectTab(targetTabId);
          requestAnimationFrame(() => {
            paneFocusRegistry.focus(targetTabId);
          });
        }
        return;
      }
      // Alt+N — jump to next project with pending notification
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "n") {
        event.preventDefault();

        const { projects, activeProjectPath, notifiedProjects, switchToProject } =
          useProjectsStore.getState();
        const unread = projects.filter((p) => notifiedProjects.has(p.path));
        if (unread.length === 0) return;

        const activeIdx = projects.findIndex((p) => p.path === activeProjectPath);
        const next =
          unread.find((p) => {
            const idx = projects.findIndex((pp) => pp.path === p.path);
            return idx > activeIdx;
          }) ?? unread[0];

        if (next) switchToProject(next.path);
        return;
      }
      // Ctrl+Tab / Ctrl+Shift+Tab: cycle ALL tabs across ALL panes (like Chrome)
      if (event.ctrlKey && event.key === "Tab") {
        event.preventDefault();
        // Don't cancelBadges — Ctrl is still held, user may keep cycling
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
      // Ctrl+Shift+Arrow: navigate between visible panes directionally
      if (
        mod &&
        event.shiftKey &&
        (event.key === "ArrowRight" ||
          event.key === "ArrowLeft" ||
          event.key === "ArrowDown" ||
          event.key === "ArrowUp")
      ) {
        event.preventDefault();
        // Don't cancelBadges — Cmd+Shift is still held, user may keep navigating
        const dirMap: Record<string, "right" | "left" | "down" | "up"> = {
          ArrowRight: "right",
          ArrowLeft: "left",
          ArrowDown: "down",
          ArrowUp: "up",
        };
        const dir = dirMap[event.key];
        const nextTabId = tilingStore.navigateToAdjacentTabset(dir);
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
