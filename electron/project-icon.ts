import * as fs from "fs";
import * as path from "path";

// Ordered by preference: SVG > PNG > ICO
const ICON_CANDIDATES = [
  "public/favicon.svg",
  "public/favicon.png",
  "public/favicon.ico",
  "public/logo.svg",
  "public/logo.png",
  "public/images/logo.svg",
  "public/images/logo.png",
  "public/images/icon.svg",
  "public/images/icon.png",
  "assets/icons/icon.svg",
  "assets/icons/icon.png",
  "favicon.svg",
  "favicon.png",
  "favicon.ico",
];

const MIME_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/**
 * Checks common locations for a project icon.
 * Reads the file and returns a base64 data URL, or null if not found.
 */
export function detectProjectIcon(projectPath: string): string | null {
  for (const candidate of ICON_CANDIDATES) {
    const fullPath = path.join(projectPath, candidate);
    if (fs.existsSync(fullPath)) {
      try {
        const buffer = fs.readFileSync(fullPath);
        const ext = path.extname(fullPath).toLowerCase();
        const mime = MIME_TYPES[ext] ?? "image/png";
        return `data:${mime};base64,${buffer.toString("base64")}`;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Reads a specific image file and returns a base64 data URL.
 * Used for user-selected custom icons.
 */
export function readIconAsDataUrl(filePath: string): string | null {
  try {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] ?? "image/png";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
