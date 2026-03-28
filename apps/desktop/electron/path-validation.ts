import * as path from "path";

/**
 * Validates that a resolved path stays within the given base directory.
 * Throws if the path escapes the base (e.g. via ../ traversal).
 * Returns the resolved absolute path if valid.
 */
export function assertPathWithinScope(basePath: string, relativePath: string): string {
  const resolved = path.resolve(basePath, relativePath);
  const normalizedBase = path.resolve(basePath);

  if (!resolved.startsWith(normalizedBase + path.sep) && resolved !== normalizedBase) {
    throw new Error(`Path traversal blocked: ${relativePath}`);
  }

  return resolved;
}
