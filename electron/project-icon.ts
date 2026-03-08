import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";

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

/**
 * Checks common locations for a project icon.
 * Returns a `file://` URL string if found, or null.
 */
export function detectProjectIcon(projectPath: string): string | null {
  for (const candidate of ICON_CANDIDATES) {
    const fullPath = path.join(projectPath, candidate);
    if (fs.existsSync(fullPath)) {
      return pathToFileURL(fullPath).toString();
    }
  }
  return null;
}
