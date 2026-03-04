import * as fs from "fs";
import * as path from "path";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "target",
  ".DS_Store",
  "__pycache__",
  ".venv",
  "venv",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "coverage",
  ".cache",
]);

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
  extension?: string | null;
}

export interface DirectoryTree {
  root: FileNode;
}

export function readDirectoryTree(
  dirPath: string,
  maxDepth: number = 3,
  currentDepth: number = 0
): DirectoryTree {
  const root = buildNode(dirPath, dirPath, maxDepth, currentDepth);
  return { root };
}

function buildNode(
  nodePath: string,
  basePath: string,
  maxDepth: number,
  currentDepth: number
): FileNode {
  const name = path.basename(nodePath);
  const stats = fs.statSync(nodePath);
  const isDir = stats.isDirectory();

  if (!isDir) {
    const ext = path.extname(nodePath);
    return {
      name,
      path: nodePath,
      isDir: false,
      extension: ext.length > 1 ? ext.slice(1) : null,
    };
  }

  const node: FileNode = { name, path: nodePath, isDir: true };

  if (currentDepth >= maxDepth) {
    node.children = [];
    return node;
  }

  try {
    const entries = fs.readdirSync(nodePath, { withFileTypes: true });

    const filtered = entries.filter((e) => {
      if (e.name.startsWith(".") && e.name !== ".env") {
        // allow .env files but skip hidden dirs (except we already skip via SKIP_DIRS)
        if (e.isDirectory()) return false;
      }
      return !SKIP_DIRS.has(e.name);
    });

    // Sort: dirs first, then files, both alphabetically
    filtered.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    node.children = filtered.map((e) =>
      buildNode(
        path.join(nodePath, e.name),
        basePath,
        maxDepth,
        currentDepth + 1
      )
    );
  } catch {
    node.children = [];
  }

  return node;
}
