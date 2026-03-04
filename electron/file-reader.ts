import * as fs from "fs";
import * as path from "path";

const MAX_SIZE_BYTES_DEFAULT = 10 * 1024 * 1024; // 10 MB

export interface FileContent {
  path: string;
  content: string;
  size: number;
}

export function readFile(
  filePath: string,
  maxSizeMb: number = 10
): FileContent {
  const maxBytes = maxSizeMb * 1024 * 1024 || MAX_SIZE_BYTES_DEFAULT;
  const stats = fs.statSync(filePath);

  if (stats.size > maxBytes) {
    throw new Error(
      `File too large: ${(stats.size / 1024 / 1024).toFixed(1)} MB (limit: ${maxSizeMb} MB)`
    );
  }

  const content = fs.readFileSync(filePath, "utf-8");
  return {
    path: filePath,
    content,
    size: stats.size,
  };
}

export function getExtension(filePath: string): string | null {
  const ext = path.extname(filePath);
  return ext.length > 1 ? ext.slice(1) : null;
}
