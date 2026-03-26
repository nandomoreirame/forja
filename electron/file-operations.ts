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

/**
 * Copies a file or directory (recursively) to a target directory within the project scope.
 * Both source and destination must be within projectPath.
 * Returns the destination path.
 */
export async function copyFileOrDir(
  projectPath: string,
  sourcePath: string,
  targetDir: string
): Promise<string> {
  const resolvedSource = path.resolve(sourcePath);
  const resolvedProject = path.resolve(projectPath);

  // Check source is within project
  if (
    !resolvedSource.startsWith(resolvedProject + path.sep) &&
    resolvedSource !== resolvedProject
  ) {
    throw new Error(`Path traversal blocked: ${sourcePath}`);
  }

  const resolvedTargetDir = path.resolve(targetDir);

  // Check target dir is within project
  if (
    !resolvedTargetDir.startsWith(resolvedProject + path.sep) &&
    resolvedTargetDir !== resolvedProject
  ) {
    throw new Error(`Path traversal blocked: ${targetDir}`);
  }

  // Extra: check neither path is a system path
  assertNotSystemPath(resolvedSource);
  assertNotSystemPath(resolvedTargetDir);

  const baseName = path.basename(resolvedSource);
  const destPath = path.join(resolvedTargetDir, baseName);

  await fs.mkdir(resolvedTargetDir, { recursive: true });
  await fs.cp(resolvedSource, destPath, { recursive: true });
  return destPath;
}

/**
 * Moves a file or directory to a target directory within the project scope.
 * Both source and destination must be within projectPath.
 * Returns the destination path.
 */
export async function moveFileOrDir(
  projectPath: string,
  sourcePath: string,
  targetDir: string
): Promise<string> {
  const resolvedSource = path.resolve(sourcePath);
  const resolvedProject = path.resolve(projectPath);

  // Check source is within project
  if (
    !resolvedSource.startsWith(resolvedProject + path.sep) &&
    resolvedSource !== resolvedProject
  ) {
    throw new Error(`Path traversal blocked: ${sourcePath}`);
  }

  const resolvedTargetDir = path.resolve(targetDir);

  // Check target dir is within project
  if (
    !resolvedTargetDir.startsWith(resolvedProject + path.sep) &&
    resolvedTargetDir !== resolvedProject
  ) {
    throw new Error(`Path traversal blocked: ${targetDir}`);
  }

  // Extra: check neither path is a system path
  assertNotSystemPath(resolvedSource);
  assertNotSystemPath(resolvedTargetDir);

  const baseName = path.basename(resolvedSource);
  const destPath = path.join(resolvedTargetDir, baseName);

  await fs.mkdir(resolvedTargetDir, { recursive: true });
  await fs.rename(resolvedSource, destPath);
  return destPath;
}

/**
 * Creates an empty file within the project scope.
 */
export async function createFile(
  projectPath: string,
  filePath: string
): Promise<void> {
  const resolvedFile = path.resolve(filePath);
  const resolvedProject = path.resolve(projectPath);

  // Check file path is within project
  if (
    !resolvedFile.startsWith(resolvedProject + path.sep) &&
    resolvedFile !== resolvedProject
  ) {
    throw new Error(`Path traversal blocked: ${filePath}`);
  }

  // Extra: check not a system path
  assertNotSystemPath(resolvedFile);

  await fs.writeFile(resolvedFile, "", "utf-8");
}

/**
 * Creates a directory (recursively) within the project scope.
 */
export async function createDirectory(
  projectPath: string,
  dirPath: string
): Promise<void> {
  const resolvedDir = path.resolve(dirPath);
  const resolvedProject = path.resolve(projectPath);

  // Check dir path is within project
  if (
    !resolvedDir.startsWith(resolvedProject + path.sep) &&
    resolvedDir !== resolvedProject
  ) {
    throw new Error(`Path traversal blocked: ${dirPath}`);
  }

  // Extra: check not a system path
  assertNotSystemPath(resolvedDir);

  await fs.mkdir(resolvedDir, { recursive: true });
}
