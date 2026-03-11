import * as fsPromises from "fs/promises";
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

// In-session cache: projectPath -> data URL or null
const iconCache = new Map<string, string | null>();

/**
 * Clears the icon cache. Useful for testing or when projects change on disk.
 */
export function clearIconCache(): void {
  iconCache.clear();
}

/**
 * Checks if a file exists using fs/promises.access (non-blocking).
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks common locations for a project icon (async, non-blocking).
 * Reads the file and returns a base64 data URL, or null if not found.
 * Result is cached per project path for the session lifetime.
 */
export async function detectProjectIcon(projectPath: string): Promise<string | null> {
  if (iconCache.has(projectPath)) {
    return iconCache.get(projectPath) ?? null;
  }

  for (const candidate of ICON_CANDIDATES) {
    const fullPath = path.join(projectPath, candidate);
    if (await fileExists(fullPath)) {
      try {
        const buffer = await fsPromises.readFile(fullPath);
        const ext = path.extname(fullPath).toLowerCase();
        const mime = MIME_TYPES[ext] ?? "image/png";
        const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
        iconCache.set(projectPath, dataUrl);
        return dataUrl;
      } catch {
        iconCache.set(projectPath, null);
        return null;
      }
    }
  }

  iconCache.set(projectPath, null);
  return null;
}

/**
 * Reads a specific image file and returns a base64 data URL (async, non-blocking).
 * Used for user-selected custom icons.
 */
export async function readIconAsDataUrl(filePath: string): Promise<string | null> {
  try {
    const buffer = await fsPromises.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] ?? "image/png";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
