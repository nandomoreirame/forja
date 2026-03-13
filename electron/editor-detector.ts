import { execFile } from "child_process";

/**
 * Code editors to probe, in preference order.
 * The first one found in PATH wins.
 */
export const EDITOR_CANDIDATES = [
  "code",          // VS Code
  "cursor",        // Cursor
  "zed",           // Zed
  "windsurf",      // Windsurf
  "codium",        // VSCodium
  "sublime_text",  // Sublime Text
];

function isAvailable(binary: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("which", [binary], { timeout: 3000 }, (err) => {
      resolve(!err);
    });
  });
}

/**
 * Returns the first available code editor binary, or null if none found.
 */
export async function detectEditor(): Promise<string | null> {
  for (const binary of EDITOR_CANDIDATES) {
    if (await isAvailable(binary)) {
      return binary;
    }
  }
  return null;
}
