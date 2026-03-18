import { execFile } from "child_process";

// Regex to validate binary names - only allow safe characters, no shell metacharacters
const SAFE_BINARY_RE = /^[a-zA-Z0-9._-]+$/;

/**
 * TTL for the CLI detection cache: 24 hours in milliseconds.
 */
export const CLI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * In-memory cache for CLI detection results.
 * Stores all detected CLIs with a timestamp to enforce TTL.
 */
let cliCache: { data: Record<string, boolean>; timestamp: number } | null =
  null;

/**
 * Maps CLI IDs to their executable binary names.
 * Must stay in sync with frontend/lib/cli-registry.ts CLI_REGISTRY.
 *
 * Note: "gh-copilot" has special detection logic (gh extension check)
 * and is NOT included here - it's handled separately.
 */
const CLI_BINARY_MAP: Record<string, string> = {
  claude: "claude",
  gemini: "gemini",
  codex: "codex",
  "cursor-agent": "cursor-agent",
};

/**
 * Checks if a binary is available in PATH using `which` (Unix) or `where.exe` (Windows).
 * Returns true if found, false otherwise.
 */
export function detectCli(binary: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!SAFE_BINARY_RE.test(binary)) {
      resolve(false);
      return;
    }
    const cmd = process.platform === "win32" ? "where.exe" : "which";
    execFile(cmd, [binary], { timeout: 3000 }, (err) => {
      resolve(!err);
    });
  });
}

/**
 * Special detection for GitHub Copilot CLI.
 * Requires `gh` binary + the copilot extension installed.
 */
export async function detectGhCopilot(): Promise<boolean> {
  const ghFound = await detectCli("gh");
  if (!ghFound) return false;

  return new Promise((resolve) => {
    execFile("gh", ["extension", "list"], { timeout: 5000 }, (err, stdout) => {
      if (err) {
        resolve(false);
        return;
      }
      // Check if copilot extension is in the output
      resolve(stdout.includes("copilot") || stdout.includes("gh-copilot"));
    });
  });
}

/**
 * Detects which CLIs from the given list are installed.
 * Results are cached in-memory for CLI_CACHE_TTL_MS (24h).
 * Subsequent calls within the TTL return cached results without re-running detection.
 * Returns a Record<cliId, boolean> filtered to the requested cliIds.
 */
export async function detectInstalledClis(
  cliIds: string[]
): Promise<Record<string, boolean>> {
  const now = Date.now();

  // Return cached results if within TTL
  if (cliCache !== null && now - cliCache.timestamp < CLI_CACHE_TTL_MS) {
    const cached = cliCache.data;
    const filtered: Record<string, boolean> = {};
    for (const id of cliIds) {
      if (id in cached) {
        filtered[id] = cached[id];
      }
    }
    return filtered;
  }

  // Cache miss or expired — run fresh detection
  const results: Record<string, boolean> = {};

  const checks = cliIds.map(async (cliId) => {
    if (cliId === "gh-copilot") {
      results[cliId] = await detectGhCopilot();
      return;
    }

    const binary = CLI_BINARY_MAP[cliId];
    if (!binary) {
      results[cliId] = false;
      return;
    }

    results[cliId] = await detectCli(binary);
  });

  await Promise.all(checks);

  // Store all results in cache with current timestamp
  cliCache = { data: { ...results }, timestamp: now };

  return results;
}

/**
 * Clears the CLI detection cache, forcing fresh detection on the next call.
 */
export function clearCliCache(): void {
  cliCache = null;
}
