import * as fs from "fs/promises";
import * as path from "path";

import { assertPathWithinScope } from "./path-validation.js";

const UNIX_FORBIDDEN = ["/etc", "/usr", "/bin", "/sbin", "/var", "/sys", "/proc"];
const WIN_FORBIDDEN = [
  "C:\\Windows",
  "C:\\Program Files",
  "C:\\Program Files (x86)",
  "C:\\ProgramData",
];

export function getForbiddenPrefixes(): string[] {
  return process.platform === "win32" ? WIN_FORBIDDEN : UNIX_FORBIDDEN;
}

function assertNotSystemPath(resolvedPath: string): void {
  for (const prefix of getForbiddenPrefixes()) {
    if (resolvedPath.startsWith(prefix + path.sep) || resolvedPath === prefix) {
      throw new Error(`Path traversal blocked: ${resolvedPath} is a system path`);
    }
  }
}

/**
 * Renames (moves) a file or directory within the project scope.
 * Both source and destination must be within projectPath.
 */
export async function renameFileOrDir(
  projectPath: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  // Validate both paths are within project scope
  const resolvedOld = path.resolve(oldPath);
  const resolvedNew = path.resolve(newPath);
  const resolvedProject = path.resolve(projectPath);

  // Check old path is within project
  if (
    !resolvedOld.startsWith(resolvedProject + path.sep) &&
    resolvedOld !== resolvedProject
  ) {
    throw new Error(`Path traversal blocked: ${oldPath}`);
  }

  // Check new path is within project
  if (
    !resolvedNew.startsWith(resolvedProject + path.sep) &&
    resolvedNew !== resolvedProject
  ) {
    throw new Error(`Path traversal blocked: ${newPath}`);
  }

  // Extra: check neither path is a system path
  assertNotSystemPath(resolvedOld);
  assertNotSystemPath(resolvedNew);

  await fs.rename(resolvedOld, resolvedNew);
}

/**
 * Deletes a file or directory (recursively) within the project scope.
 * Prevents deletion of the project root itself.
 */
export async function deleteFileOrDir(
  projectPath: string,
  targetPath: string
): Promise<void> {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedProject = path.resolve(projectPath);

  // Block system paths
  assertNotSystemPath(resolvedTarget);

  // Validate within project scope using assertPathWithinScope helper
  if (
    !resolvedTarget.startsWith(resolvedProject + path.sep) &&
    resolvedTarget !== resolvedProject
  ) {
    throw new Error(`Path traversal blocked: ${targetPath}`);
  }

  // Prevent deleting the project root itself
  if (resolvedTarget === resolvedProject) {
    throw new Error(`Cannot delete project root: ${targetPath}`);
  }

  await fs.rm(resolvedTarget, { recursive: true, force: false });
}
