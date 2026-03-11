import type { FileNode } from "@/stores/file-tree";

export interface FlatFile {
  name: string;
  path: string;
  relativePath: string;
  extension: string | null | undefined;
}

export function flattenFileTree(root: FileNode, rootPath: string): FlatFile[] {
  const normalizedRoot = rootPath.endsWith("/")
    ? rootPath.slice(0, -1)
    : rootPath;
  const result: FlatFile[] = [];

  function walk(node: FileNode) {
    if (node.ignored) return;
    if (!node.isDir) {
      result.push({
        name: node.name,
        path: node.path,
        relativePath: node.path.slice(normalizedRoot.length + 1),
        extension: node.extension ?? null,
      });
      return;
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  if (root.children) {
    for (const child of root.children) {
      walk(child);
    }
  }

  return result;
}
