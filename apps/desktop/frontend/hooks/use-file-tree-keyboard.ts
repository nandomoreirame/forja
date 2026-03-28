import { useMemo } from "react";
import { useFileTreeStore, findNode } from "@/stores/file-tree";
import { useFilePreviewStore } from "@/stores/file-preview";
import { flattenVisibleNodes, type FlatNode } from "@/components/file-tree-sidebar";
import { invoke } from "@/lib/ipc";

export function handleFileTreeKeyDown(e: React.KeyboardEvent): void {
  const state = useFileTreeStore.getState();
  const { tree, expandedPaths, focusedPath } = state;

  if (!tree || !tree.root.children) return;

  const flatNodes = flattenVisibleNodes(
    tree.root.children,
    expandedPaths,
    tree.root.path,
    0,
  );

  if (flatNodes.length === 0) return;

  const currentIndex = focusedPath
    ? flatNodes.findIndex((fn) => fn.node.path === focusedPath)
    : -1;

  const currentNode = currentIndex >= 0 ? flatNodes[currentIndex] : null;

  const mod = e.metaKey || e.ctrlKey;
  const alt = e.altKey;
  const shift = e.shiftKey;
  const key = e.key.toLowerCase();

  // ⌘↩ — Open file preview or toggle editor
  if (mod && e.key === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    // Use currentNode from flatNodes (same source as arrow keys — always reliable)
    const targetNode = currentNode;
    if (targetNode && !targetNode.node.isDir) {
      const previewStore = useFilePreviewStore.getState();
      if (previewStore.currentFile === targetNode.node.path && !previewStore.isEditing) {
        previewStore.setEditing(true);
      } else {
        state.selectFile(targetNode.node.path);
      }
    }
    return;
  }

  // ⇧⌥⌘C — Copy Relative Path
  if (mod && alt && shift && key === "c" && focusedPath) {
    e.preventDefault();
    const projectPath = state.currentPath;
    const relative = projectPath
      ? focusedPath.replace(projectPath + "/", "")
      : focusedPath;
    navigator.clipboard.writeText(relative);
    return;
  }

  // ⌥⌘C — Copy Path
  if (mod && alt && key === "c" && focusedPath) {
    e.preventDefault();
    navigator.clipboard.writeText(focusedPath);
    return;
  }

  // ⌥⌘R — Reveal in Finder
  if (mod && alt && key === "r" && focusedPath) {
    e.preventDefault();
    invoke("reveal_in_finder", { path: focusedPath });
    return;
  }

  // ⌘X — Cut to clipboard
  if (mod && key === "x") {
    e.preventDefault();
    useFileTreeStore.getState().cutToClipboard();
    return;
  }

  // ⌘C — Copy to clipboard
  if (mod && key === "c") {
    e.preventDefault();
    useFileTreeStore.getState().copyToClipboard();
    return;
  }

  // ⌘V — Paste from clipboard
  if (mod && key === "v") {
    e.preventDefault();
    const store = useFileTreeStore.getState();
    const focused = store.focusedPath;
    if (focused) {
      const node = store.tree ? findNode(store.tree.root, focused) : null;
      const targetDir = node?.isDir
        ? focused
        : focused.substring(0, focused.lastIndexOf("/"));

      // Try image paste first (e.g. screenshot from Cmd+Shift+4)
      void (async () => {
        const imagePath = await invoke<string | null>("paste_clipboard_image", { targetDir });
        if (imagePath) {
          store.refreshTree();
          return;
        }
        // Fall back to file clipboard paste
        store.pasteFromClipboard(targetDir);
      })();
    }
    return;
  }

  // ⌘⌫ — Delete
  if (mod && (e.key === "Backspace" || e.key === "Delete")) {
    e.preventDefault();
    const store = useFileTreeStore.getState();
    const selected = Object.keys(store.selectedPaths).filter((p) => store.selectedPaths[p]);
    const pathsToDelete = selected.length > 0
      ? selected
      : store.focusedPath ? [store.focusedPath] : [];

    if (pathsToDelete.length > 0) {
      store.confirmDelete(pathsToDelete);
    }
    return;
  }

  // Space — open file (preview then editor) / expand dir
  if (e.key === " ") {
    e.preventDefault();
    if (currentNode) {
      if (currentNode.node.isDir) {
        state.toggleExpanded(currentNode.node.path);
      } else {
        const previewStore = useFilePreviewStore.getState();
        if (previewStore.currentFile === currentNode.node.path && !previewStore.isEditing) {
          previewStore.setEditing(true);
        } else {
          state.selectFile(currentNode.node.path);
        }
      }
    }
    return;
  }

  // F2 — start rename of focused item
  if (e.key === "F2") {
    e.preventDefault();
    if (focusedPath) {
      useFileTreeStore.getState().startRename(focusedPath);
    }
    return;
  }

  // Delete / Backspace (sem Cmd) — also delete
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    const store = useFileTreeStore.getState();
    const selected = Object.keys(store.selectedPaths).filter((p) => store.selectedPaths[p]);
    const pathsToDelete = selected.length > 0
      ? selected
      : store.focusedPath ? [store.focusedPath] : [];

    if (pathsToDelete.length > 0) {
      store.confirmDelete(pathsToDelete);
    }
    return;
  }

  // Let Cmd/Ctrl+Shift+Arrow pass through for pane navigation
  if (mod && shift && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    return;
  }

  switch (e.key) {
    case "ArrowDown": {
      e.preventDefault();
      e.stopPropagation();
      if (currentIndex < 0) {
        state.setFocusedPath(flatNodes[0].node.path);
      } else if (currentIndex < flatNodes.length - 1) {
        state.setFocusedPath(flatNodes[currentIndex + 1].node.path);
      }
      break;
    }

    case "ArrowUp": {
      e.preventDefault();
      e.stopPropagation();
      if (currentIndex < 0) {
        state.setFocusedPath(flatNodes[0].node.path);
      } else if (currentIndex > 0) {
        state.setFocusedPath(flatNodes[currentIndex - 1].node.path);
      }
      break;
    }

    case "Enter": {
      // Ignore Enter with modifiers (e.g. ⇧⌘↩ for toggle editor)
      if (!currentNode || mod || shift || alt) return;
      e.preventDefault();
      e.stopPropagation();
      // Enter: rename (like VS Code)
      state.startRename(currentNode.node.path);
      break;
    }

    case "ArrowRight": {
      if (!currentNode) return;
      e.preventDefault();
      e.stopPropagation();
      // ArrowRight on file: open preview/editor
      if (!currentNode.node.isDir) {
        const previewStore = useFilePreviewStore.getState();
        if (previewStore.currentFile === currentNode.node.path && !previewStore.isEditing) {
          previewStore.setEditing(true);
        } else {
          state.selectFile(currentNode.node.path);
        }
        break;
      }
      if (!expandedPaths[currentNode.node.path]) {
        state.toggleExpanded(currentNode.node.path);
        if (
          currentNode.node.children &&
          currentNode.node.children.length === 0 &&
          state.activeProjectPath
        ) {
          state.loadSubdirectory(
            currentNode.node.path,
            state.activeProjectPath,
          );
        }
      } else {
        // Already expanded: focus first child
        const expandedIndex = currentIndex;
        if (expandedIndex >= 0 && expandedIndex < flatNodes.length - 1) {
          state.setFocusedPath(flatNodes[expandedIndex + 1].node.path);
        }
      }
      break;
    }

    case "ArrowLeft": {
      if (!currentNode) return;
      e.preventDefault();
      e.stopPropagation();
      if (currentNode.node.isDir && expandedPaths[currentNode.node.path]) {
        state.toggleExpanded(currentNode.node.path);
      } else {
        const parentPath = findParentDir(flatNodes, currentIndex);
        if (parentPath) {
          state.setFocusedPath(parentPath);
        }
      }
      break;
    }

    case "Home": {
      e.preventDefault();
      e.stopPropagation();
      state.setFocusedPath(flatNodes[0].node.path);
      break;
    }

    case "End": {
      e.preventDefault();
      e.stopPropagation();
      state.setFocusedPath(flatNodes[flatNodes.length - 1].node.path);
      break;
    }

    default:
      return;
  }
}

function findParentDir(
  flatNodes: FlatNode[],
  currentIndex: number,
): string | null {
  if (currentIndex <= 0) return null;
  const currentDepth = flatNodes[currentIndex].depth;
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (flatNodes[i].node.isDir && flatNodes[i].depth < currentDepth) {
      return flatNodes[i].node.path;
    }
  }
  return null;
}

export function useFileTreeKeyboard(): (e: React.KeyboardEvent) => void {
  return useMemo(() => handleFileTreeKeyDown, []);
}
