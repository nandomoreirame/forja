import { useMemo } from "react";
import { useFileTreeStore } from "@/stores/file-tree";
import { flattenVisibleNodes, type FlatNode } from "@/components/file-tree-sidebar";

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
      if (!currentNode) return;
      e.preventDefault();
      e.stopPropagation();
      if (currentNode.node.isDir) {
        state.toggleExpanded(currentNode.node.path);
      } else {
        state.selectFile(currentNode.node.path);
      }
      break;
    }

    case "ArrowRight": {
      if (!currentNode || !currentNode.node.isDir) return;
      e.preventDefault();
      e.stopPropagation();
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
