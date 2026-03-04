import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs/promises";
import { assertPathWithinScope } from "./path-validation.js";

const execFileAsync = promisify(execFile);

export interface GitInfo {
  branch: string;
  modified_count: number;
}

export async function getGitInfo(projectPath: string): Promise<GitInfo> {
  try {
    const { stdout } = await execFileAsync(
      "git", ["status", "--porcelain", "--branch"],
      { cwd: projectPath, timeout: 5000 }
    );

    const lines = stdout.split("\n");
    const branchLine = lines[0] ?? "";

    let branch = "unknown";
    const branchMatch = branchLine.match(/^## (.+?)(?:\.\.\.|$)/);
    if (branchMatch) {
      const raw = branchMatch[1];
      // "HEAD (no branch)" → "HEAD"
      branch = raw.startsWith("HEAD") ? "HEAD" : raw;
    }

    const modifiedCount = lines
      .slice(1)
      .filter((l) => l.trim().length > 0).length;

    return { branch, modified_count: modifiedCount };
  } catch {
    return { branch: "unknown", modified_count: 0 };
  }
}

export async function getGitFileStatuses(
  projectPath: string
): Promise<Record<string, string>> {
  try {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain"], {
      cwd: projectPath,
      timeout: 5000,
    });

    const statuses: Record<string, string> = {};

    for (const line of stdout.split("\n")) {
      if (line.length < 4) continue;

      const code = line.substring(0, 2).trim();
      let filePart = line.substring(3);

      // Handle renames: "R  old -> new"
      const arrowIndex = filePart.indexOf(" -> ");
      if (arrowIndex !== -1) {
        filePart = filePart.substring(arrowIndex + 4);
      }

      // Handle quoted paths (e.g. for special characters)
      if (filePart.startsWith('"') && filePart.endsWith('"')) {
        filePart = filePart.slice(1, -1);
      }

      // Normalize to forward slashes and resolve relative paths
      const normalized = path.normalize(filePart).replace(/\\/g, "/");
      if (code && normalized) {
        statuses[normalized] = code;
      }
    }

    return statuses;
  } catch {
    return {};
  }
}

export interface GitChangedFile {
  path: string;
  status: string;
  staged: boolean;
  unstaged: boolean;
}

export interface GitFileDiff {
  path: string;
  status: string;
  patch: string;
  truncated: boolean;
  isBinary: boolean;
}

interface GitDiffOptions {
  stage?: "combined" | "staged" | "unstaged";
  maxBytes?: number;
}

const DEFAULT_DIFF_MAX_BYTES = 300 * 1024;

function normalizeRepoPath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, "/");
}

function statusFromPorcelainCode(code: string): string {
  if (code === "??") return "??";

  const x = code[0] ?? " ";
  const y = code[1] ?? " ";
  if (x !== " " && x !== "?") return x;
  if (y !== " " && y !== "?") return y;
  return code.trim() || "M";
}

function splitNul(value: string): string[] {
  return value.split("\0").filter((part) => part.length > 0);
}

function parsePorcelainZ(stdout: string): GitChangedFile[] {
  const parts = splitNul(stdout);
  const entries: GitChangedFile[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.length < 3) continue;

    const code = part.slice(0, 2);
    const rawPath = part.slice(3);
    if (!rawPath) continue;

    const x = code[0] ?? " ";
    const y = code[1] ?? " ";

    let resolvedPath = rawPath;
    // For rename/copy in -z format, next token is destination path.
    if ((x === "R" || x === "C") && i + 1 < parts.length) {
      resolvedPath = parts[i + 1];
      i += 1;
    }

    entries.push({
      path: normalizeRepoPath(resolvedPath),
      status: statusFromPorcelainCode(code),
      staged: x !== " " && x !== "?",
      unstaged: code === "??" || (y !== " " && y !== "?"),
    });
  }

  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

export async function getGitChangedFiles(
  projectPath: string
): Promise<GitChangedFile[]> {
  try {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain", "-z"], {
      cwd: projectPath,
      timeout: 5000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return parsePorcelainZ(stdout);
  } catch {
    return [];
  }
}

function truncatePatch(patch: string, maxBytes: number): { patch: string; truncated: boolean } {
  const bytes = Buffer.byteLength(patch, "utf8");
  if (bytes <= maxBytes) return { patch, truncated: false };

  // keep near byte bound while avoiding huge output
  const roughLength = Math.max(0, Math.floor((patch.length * maxBytes) / bytes));
  const sliced = patch.slice(0, roughLength);
  return {
    patch: `${sliced}\n\n[Forja] Diff truncated due to size limit.`,
    truncated: true,
  };
}

function toAddedLinesPatch(content: string): string {
  if (content.length === 0) return "";
  return content
    .split("\n")
    .map((line, index, arr) => {
      if (index === arr.length - 1 && line.length === 0) return "";
      return `+${line}`;
    })
    .filter((line) => line.length > 0)
    .join("\n");
}

async function buildUntrackedPatch(projectPath: string, relativePath: string): Promise<string> {
  const absolutePath = assertPathWithinScope(projectPath, relativePath);
  const fileContent = await fs.readFile(absolutePath, "utf8");
  const lineCount = fileContent.length === 0 ? 0 : fileContent.split("\n").length;
  const addedLines = toAddedLinesPatch(fileContent);
  const hunkHeader = `@@ -0,0 +1,${lineCount} @@`;
  return [
    `diff --git a/${relativePath} b/${relativePath}`,
    "new file mode 100644",
    "--- /dev/null",
    `+++ b/${relativePath}`,
    hunkHeader,
    addedLines,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function getFileContentAtHead(
  projectPath: string,
  relativePath: string
): Promise<string> {
  const normalizedPath = normalizeRepoPath(relativePath);
  try {
    const { stdout } = await execFileAsync(
      "git", ["show", `HEAD:${normalizedPath}`],
      { cwd: projectPath, timeout: 5000, maxBuffer: 10 * 1024 * 1024 }
    );
    return stdout;
  } catch {
    return "";
  }
}

export async function getGitFileDiff(
  projectPath: string,
  relativePath: string,
  options: GitDiffOptions = {}
): Promise<GitFileDiff> {
  const normalizedPath = normalizeRepoPath(relativePath);
  const maxBytes = options.maxBytes ?? DEFAULT_DIFF_MAX_BYTES;
  const stage = options.stage ?? "combined";
  const changedFiles = await getGitChangedFiles(projectPath);
  const file = changedFiles.find((entry) => entry.path === normalizedPath);
  const status = file?.status ?? "M";

  try {
    let rawPatch = "";

    if (status === "??") {
      rawPatch = await buildUntrackedPatch(projectPath, normalizedPath);
    } else {
      const diffArgs = ["diff", "--no-color", "--src-prefix=a/", "--dst-prefix=b/", "--relative"];
      if (stage === "staged") {
        diffArgs.push("--cached");
      } else if (stage === "combined") {
        diffArgs.push("HEAD");
      }
      diffArgs.push("--", normalizedPath);

      const { stdout } = await execFileAsync("git", diffArgs, {
        cwd: projectPath,
        timeout: 5000,
        maxBuffer: 20 * 1024 * 1024,
      });
      rawPatch = stdout ?? "";
    }

    const { patch, truncated } = truncatePatch(rawPatch, maxBytes);
    return {
      path: normalizedPath,
      status,
      patch,
      truncated,
      isBinary: patch.includes("Binary files"),
    };
  } catch {
    return {
      path: normalizedPath,
      status,
      patch: "",
      truncated: false,
      isBinary: false,
    };
  }
}
