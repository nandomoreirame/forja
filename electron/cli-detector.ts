import { execFile } from "child_process";

// Regex to validate binary names - only allow safe characters, no shell metacharacters
const SAFE_BINARY_RE = /^[a-zA-Z0-9._-]+$/;

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
  opencode: "opencode",
};

/**
 * Checks if a binary is available in PATH using `which`.
 * Returns true if found, false otherwise.
 */
export function detectCli(binary: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!SAFE_BINARY_RE.test(binary)) {
      resolve(false);
      return;
    }
    execFile("which", [binary], { timeout: 3000 }, (err) => {
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
 * Returns a Record<cliId, boolean> with detection results.
 */
export async function detectInstalledClis(
  cliIds: string[]
): Promise<Record<string, boolean>> {
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
  return results;
}
