import { stat, readdir } from "fs/promises";
import type { Dirent } from "fs";
import * as path from "path";
import { spawn } from "child_process";

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
  ignored?: boolean;
}

export interface DirectoryTree {
  root: FileNode;
}

export async function readDirectoryTree(
  dirPath: string,
  maxDepth: number = 3,
  currentDepth: number = 0
): Promise<DirectoryTree> {
  const root = await buildNode(dirPath, dirPath, maxDepth, currentDepth);
  await markIgnoredNodes(root, dirPath);
  return { root };
}

async function buildNode(
  nodePath: string,
  basePath: string,
  maxDepth: number,
  currentDepth: number
): Promise<FileNode> {
  const name = path.basename(nodePath);
  const stats = await stat(nodePath);
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
    const entries: Dirent[] = await readdir(nodePath, { withFileTypes: true });

    const filtered = entries.filter((e) => !SKIP_DIRS.has(e.name));

    // Sort: dirs first, then files, both alphabetically
    filtered.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    node.children = await Promise.all(
      filtered.map((e) =>
        buildNode(
          path.join(nodePath, e.name),
          basePath,
          maxDepth,
          currentDepth + 1
        )
      )
    );
  } catch {
    node.children = [];
  }

  return node;
}

function collectRelativePaths(node: FileNode, basePath: string, out: string[]): void {
  const relative = path.relative(basePath, node.path).replace(/\\/g, "/");
  if (relative) out.push(relative);
  if (!node.children?.length) return;
  for (const child of node.children) {
    collectRelativePaths(child, basePath, out);
  }
}

async function readIgnoredPaths(basePath: string, relativePaths: string[]): Promise<Set<string>> {
  if (relativePaths.length === 0) return new Set();
  return new Promise<Set<string>>((resolve) => {
    const child = spawn("git", ["check-ignore", "--stdin"], {
      cwd: basePath,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, 5000);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 && stdout.trim().length === 0) {
        // non-git repo or no matches
        resolve(new Set());
        return;
      }
      const ignored = new Set<string>();
      for (const line of stdout.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        ignored.add(trimmed.replace(/\\/g, "/"));
      }
      resolve(ignored);
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve(new Set());
    });
    child.stdin.on("error", () => {
      // git may exit early in non-repo directories, causing EPIPE while writing stdin
    });

    try {
      child.stdin.write(relativePaths.join("\n"));
      child.stdin.end();
    } catch {
      resolve(new Set());
    }
    void stderr; // keep collected for debug if needed
  });
}

function applyIgnoredFlags(node: FileNode, basePath: string, ignoredPaths: Set<string>): void {
  const relative = path.relative(basePath, node.path).replace(/\\/g, "/");
  node.ignored = relative ? ignoredPaths.has(relative) : false;
  if (!node.children?.length) return;
  for (const child of node.children) {
    applyIgnoredFlags(child, basePath, ignoredPaths);
  }
}

async function markIgnoredNodes(root: FileNode, basePath: string): Promise<void> {
  const relPaths: string[] = [];
  if (root.children?.length) {
    for (const child of root.children) {
      collectRelativePaths(child, basePath, relPaths);
    }
  }
  const ignoredPaths = await readIgnoredPaths(basePath, relPaths);
  applyIgnoredFlags(root, basePath, ignoredPaths);
}
