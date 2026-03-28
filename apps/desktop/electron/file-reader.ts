import * as fs from "fs/promises";
import * as path from "path";

const MAX_SIZE_BYTES_DEFAULT = 10 * 1024 * 1024; // 10 MB

export interface FileContent {
  path: string;
  content: string;
  size: number;
  encoding?: "base64";
}

export async function readFile(
  filePath: string,
  maxSizeMb: number = 10
): Promise<FileContent> {
  const maxBytes = maxSizeMb * 1024 * 1024 || MAX_SIZE_BYTES_DEFAULT;
  const stats = await fs.stat(filePath);

  if (stats.size > maxBytes) {
    throw new Error(
      `File too large: ${(stats.size / 1024 / 1024).toFixed(1)} MB (limit: ${maxSizeMb} MB)`
    );
  }

  if (isImageFile(filePath)) {
    const buffer = await fs.readFile(filePath);
    return {
      path: filePath,
      content: buffer.toString("base64"),
      size: stats.size,
      encoding: "base64",
    };
  }

  const content = await fs.readFile(filePath, "utf-8");
  return {
    path: filePath,
    content,
    size: stats.size,
  };
}

const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp",
]);

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  bmp: "image/bmp",
};

export function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

export function getImageMimeType(ext: string): string {
  return MIME_TYPES[ext.toLowerCase()] || "image/png";
}

export function getExtension(filePath: string): string | null {
  const ext = path.extname(filePath);
  return ext.length > 1 ? ext.slice(1) : null;
}
