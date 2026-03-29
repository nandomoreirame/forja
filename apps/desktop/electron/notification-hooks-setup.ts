import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";

// The OSC 9 notification script content. Emits a notification sequence
// that Forja's xterm.js captures to trigger OS notifications / Discord webhook.
// All CLI hooks pipe JSON on stdin and expect JSON on stdout.
const FORJA_OSC_SCRIPT_CONTENT = `#!/usr/bin/env bash
# forja-osc-notify.sh — Generic Forja OSC 9 notification hook.
# Called by AI CLI hooks on response completion.
# Reads JSON from stdin, extracts the message, emits OSC 9 for Forja capture.
# Required env: FORJA_TERMINAL=1 (injected by Forja at PTY spawn).
set -euo pipefail

# Only emit when running inside Forja
if [ "\${FORJA_TERMINAL:-}" != "1" ]; then
  cat > /dev/null 2>&1
  echo '{}'
  exit 0
fi

# Requires jq for JSON parsing
if ! command -v jq &>/dev/null; then
  cat > /dev/null 2>&1
  echo '{}'
  exit 0
fi

# Read JSON payload from stdin (all CLIs pipe JSON)
INPUT=\$(cat 2>/dev/null || echo '{}')

# Extract message: try common field names across CLIs
# Claude/Codex: last_assistant_message
# Gemini: output.text / response
# Cursor/Copilot: message / content / text / result
MESSAGE=\$(echo "\$INPUT" | jq -r '
  .last_assistant_message //
  .output.text //
  .response //
  .message //
  .content //
  .text //
  .result //
  empty
' 2>/dev/null || echo "")

# Skip if no meaningful message
if [ -z "\$MESSAGE" ] || [ "\${#MESSAGE}" -lt 10 ]; then
  echo '{}'
  exit 0
fi

# Truncate to 4000 chars to avoid overwhelming the terminal parser
TRUNCATED="\${MESSAGE:0:4000}"

# Emit OSC 9 subtype 1 (notification): \\033]9;1;<message>\\007
printf '\\033]9;1;%s\\007' "\$TRUNCATED" 2>/dev/null || true

# Output required JSON response (all CLIs expect JSON on stdout)
echo '{}'
`;

export interface HookStatus {
  cliId: string;
  configured: boolean;
}

export interface NotificationHooksStatus {
  statuses: HookStatus[];
  scriptExists: boolean;
}

function getHomedir(): string {
  return os.homedir();
}

function getForjaOscScriptPath(): string {
  return path.join(getHomedir(), ".config", "forja", "hooks", "forja-osc-notify.sh");
}

/**
 * Checks if a file exists and contains a given substring.
 */
async function fileContains(filePath: string, substring: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content.includes(substring);
  } catch {
    return false;
  }
}

/**
 * Checks if the Forja OSC hook is configured for each CLI.
 */
export async function getNotificationHooksStatus(): Promise<NotificationHooksStatus> {
  const home = getHomedir();
  const scriptPath = getForjaOscScriptPath();

  const [
    claudeConfigured,
    codexConfigured,
    geminiConfigured,
    cursorConfigured,
    copilotConfigured,
    scriptExists,
  ] = await Promise.all([
    fileContains(path.join(home, ".claude", "hooks", "notify.sh"), "emit_osc_for_forja"),
    fileContains(path.join(home, ".codex", "superpowers", "hooks", "hooks.json"), "forja-osc-notify.sh"),
    fileContains(path.join(home, ".gemini", "settings.json"), "forja-osc-notify.sh"),
    fileContains(path.join(home, ".cursor", "hooks.json"), "forja-osc-notify.sh"),
    fileContains(path.join(home, ".copilot", "hooks.json"), "forja-osc-notify.sh"),
    // Check script existence
    fs.access(scriptPath).then(() => true).catch(() => false),
  ]);

  return {
    statuses: [
      { cliId: "claude", configured: claudeConfigured },
      { cliId: "codex", configured: codexConfigured },
      { cliId: "gemini", configured: geminiConfigured },
      { cliId: "cursor", configured: cursorConfigured },
      { cliId: "gh-copilot", configured: copilotConfigured },
    ],
    scriptExists,
  };
}

/**
 * Adds the Forja OSC notification hook to a CLI's config file.
 * Idempotent — safe to call multiple times.
 * For Claude, the hook is already handled by notify.sh (no changes needed).
 */
export async function setupNotificationHook(cliId: string): Promise<void> {
  const home = getHomedir();
  const scriptPath = getForjaOscScriptPath();

  switch (cliId) {
    case "claude":
      // Already handled by ~/.claude/hooks/notify.sh which checks FORJA_TERMINAL=1
      return;

    case "codex": {
      const configPath = path.join(home, ".codex", "superpowers", "hooks", "hooks.json");
      await ensureHookInJsonConfig(configPath, (existing) => {
        const config = existing ?? {} as Record<string, unknown>;
        const hooks = (config.hooks ?? {}) as Record<string, unknown[]>;
        const stopHooks = (hooks.Stop ?? []) as Array<Record<string, unknown>>;
        const alreadyConfigured = stopHooks.some(
          (entry) => JSON.stringify(entry).includes("forja-osc-notify.sh"),
        );
        if (alreadyConfigured) return config;
        stopHooks.push({
          hooks: [{ type: "command", command: scriptPath, timeout: 5000 }],
        });
        return { ...config, hooks: { ...hooks, Stop: stopHooks } };
      });
      return;
    }

    case "gemini": {
      const configPath = path.join(home, ".gemini", "settings.json");
      await ensureHookInJsonConfig(configPath, (existing) => {
        const config = existing ?? {} as Record<string, unknown>;
        const hooks = (config.hooks ?? {}) as Record<string, unknown[]>;
        const afterAgentHooks = (hooks.AfterAgent ?? []) as Array<Record<string, unknown>>;
        const alreadyConfigured = afterAgentHooks.some(
          (entry) => JSON.stringify(entry).includes("forja-osc-notify.sh"),
        );
        if (alreadyConfigured) return config;
        afterAgentHooks.push({
          hooks: [{ type: "command", command: scriptPath }],
        });
        return { ...config, hooks: { ...hooks, AfterAgent: afterAgentHooks } };
      });
      return;
    }

    case "cursor": {
      const configPath = path.join(home, ".cursor", "hooks.json");
      await ensureHookInJsonConfig(configPath, (existing) => {
        const config = existing ?? { version: 1 } as Record<string, unknown>;
        const hooks = (config.hooks ?? {}) as Record<string, unknown[]>;
        const stopHooks = (hooks.stop ?? []) as Array<Record<string, unknown>>;
        const alreadyConfigured = stopHooks.some(
          (entry) => JSON.stringify(entry).includes("forja-osc-notify.sh"),
        );
        if (alreadyConfigured) return config;
        stopHooks.push({ command: scriptPath });
        return { ...config, hooks: { ...hooks, stop: stopHooks } };
      });
      return;
    }

    case "gh-copilot": {
      const configPath = path.join(home, ".copilot", "hooks.json");
      await ensureHookInJsonConfig(configPath, (existing) => {
        const config = existing ?? { version: 1 } as Record<string, unknown>;
        const hooks = (config.hooks ?? {}) as Record<string, unknown[]>;
        const agentStopHooks = (hooks.agentStop ?? []) as Array<Record<string, unknown>>;
        const alreadyConfigured = agentStopHooks.some(
          (entry) => JSON.stringify(entry).includes("forja-osc-notify.sh"),
        );
        if (alreadyConfigured) return config;
        agentStopHooks.push({ command: scriptPath });
        return { ...config, hooks: { ...hooks, agentStop: agentStopHooks } };
      });
      return;
    }

    default:
      throw new Error(`Unknown CLI: ${cliId}`);
  }
}

/**
 * Reads a JSON config file, applies a transform function, and writes back.
 * Creates parent directories if needed.
 */
async function ensureHookInJsonConfig(
  configPath: string,
  transform: (existing: Record<string, unknown> | null) => Record<string, unknown>
): Promise<void> {
  let existing: Record<string, unknown> | null = null;
  try {
    const content = await fs.readFile(configPath, "utf-8");
    existing = JSON.parse(content) as Record<string, unknown>;
  } catch {
    // File doesn't exist or invalid JSON — start from scratch
  }

  const updated = transform(existing);
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(updated, null, 2) + "\n", "utf-8");
}

/**
 * Ensures the forja-osc-notify.sh script exists and is executable.
 * Creates it if it doesn't exist.
 * Idempotent — safe to call multiple times.
 */
export async function ensureForjaOscScript(): Promise<void> {
  const scriptPath = getForjaOscScriptPath();
  const scriptDir = path.dirname(scriptPath);

  await fs.mkdir(scriptDir, { recursive: true });

  // Check if file already exists with correct content
  try {
    const existing = await fs.readFile(scriptPath, "utf-8");
    if (existing === FORJA_OSC_SCRIPT_CONTENT) {
      // Already up to date; ensure it's executable
      await fs.chmod(scriptPath, 0o755);
      return;
    }
  } catch {
    // File doesn't exist yet
  }

  await fs.writeFile(scriptPath, FORJA_OSC_SCRIPT_CONTENT, { encoding: "utf-8", mode: 0o755 });
}
