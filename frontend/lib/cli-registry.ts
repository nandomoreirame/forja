export type CliId = "claude" | "gemini" | "codex" | "cursor-agent" | "gh-copilot";
export type SessionType = CliId | "terminal";

export interface CliDefinition {
  id: CliId;
  displayName: string;
  binary: string;
  description: string;
  iconColor: string;
  icon: string;
  chatSupported: boolean;
  resumeFlag?: string;           // e.g. "--resume"
  sessionIdPattern?: RegExp;     // regex to extract session ID from PTY output
}

export const TERMINAL_ICON = "./images/terminal.svg";

export const CLI_REGISTRY: Record<CliId, CliDefinition> = {
  claude: {
    id: "claude",
    displayName: "Claude Code",
    binary: "claude",
    description: "AI-assisted coding with Anthropic Claude",
    iconColor: "text-brand",
    icon: "./images/claude.svg",
    chatSupported: true,
    resumeFlag: "--resume",
    sessionIdPattern: /session:\s+([a-f0-9-]+)/i,
  },
  gemini: {
    id: "gemini",
    displayName: "Gemini CLI",
    binary: "gemini",
    description: "AI-assisted coding with Google Gemini",
    iconColor: "text-ctp-blue",
    icon: "./images/gemini.svg",
    chatSupported: true,
    resumeFlag: "--resume",
    sessionIdPattern: /session[:\s]+([a-zA-Z0-9_-]+)/i,
  },
  codex: {
    id: "codex",
    displayName: "Codex CLI",
    binary: "codex",
    description: "AI-assisted coding with OpenAI Codex",
    iconColor: "text-ctp-green",
    icon: "./images/openai.svg",
    chatSupported: true,
    resumeFlag: "--resume",
    sessionIdPattern: /session[:\s]+([a-zA-Z0-9_-]+)/i,
  },
  "cursor-agent": {
    id: "cursor-agent",
    displayName: "Cursor Agent",
    binary: "cursor-agent",
    description: "AI-assisted coding with Cursor",
    iconColor: "text-ctp-peach",
    icon: "./images/cursor.svg",
    chatSupported: true,
    resumeFlag: "--resume=",
    sessionIdPattern: /chat[:\s]+([a-zA-Z0-9_-]+)/i,
  },
  "gh-copilot": {
    id: "gh-copilot",
    displayName: "GitHub Copilot",
    binary: "copilot",
    description: "AI coding assistant by GitHub Copilot",
    iconColor: "text-ctp-lavender",
    icon: "./images/github-copilot.svg",
    chatSupported: false,
  },
};

export function getCliDefinition(id: CliId): CliDefinition {
  return CLI_REGISTRY[id];
}

export function getSessionDisplayName(
  sessionType: SessionType,
  counter?: number
): string {
  const baseName =
    sessionType === "terminal"
      ? "Terminal"
      : CLI_REGISTRY[sessionType].displayName;

  if (counter === undefined) {
    return baseName;
  }

  return `${baseName} #${counter}`;
}

/**
 * Computes display names for a list of tabs dynamically based on their current
 * grouping by sessionType.
 *
 * Rules:
 * - If a tab has a `customName`, it is always shown as-is.
 * - If only 1 tab of a given sessionType exists (excluding custom-named tabs): show name without number.
 * - If 2+ tabs of the same sessionType exist (excluding custom-named tabs): show name with per-type
 *   sequential counter (#1, #2, ...) based on position in the provided list.
 *
 * Returns a map of tabId -> display name.
 */
export function computeTabDisplayNames<T extends { id: string; sessionType: SessionType; customName?: string }>(
  tabs: T[]
): Record<string, string> {
  // Only consider tabs without a customName for auto-numbering
  const autoTabs = tabs.filter((t) => !t.customName);

  // First pass: count auto-named tabs per type
  const countByType = new Map<SessionType, number>();
  for (const tab of autoTabs) {
    countByType.set(tab.sessionType, (countByType.get(tab.sessionType) ?? 0) + 1);
  }

  // Second pass: assign names
  const indexByType = new Map<SessionType, number>();
  const result: Record<string, string> = {};

  for (const tab of tabs) {
    // Custom name takes priority
    if (tab.customName) {
      result[tab.id] = tab.customName;
      continue;
    }

    const typeCount = countByType.get(tab.sessionType) ?? 1;
    if (typeCount === 1) {
      result[tab.id] = getSessionDisplayName(tab.sessionType);
    } else {
      const current = (indexByType.get(tab.sessionType) ?? 0) + 1;
      indexByType.set(tab.sessionType, current);
      result[tab.id] = getSessionDisplayName(tab.sessionType, current);
    }
  }

  return result;
}

/** Canonical display order for CLIs across all UI surfaces. */
const CLI_DISPLAY_ORDER: CliId[] = [
  "claude",
  "codex",
  "gemini",
  "cursor-agent",
  "gh-copilot",
];

export function getAllCliIds(): CliId[] {
  return [...CLI_DISPLAY_ORDER];
}

export function getAllCliBinaries(): string[] {
  return getAllCliIds().map((id) => CLI_REGISTRY[id].binary);
}

export function getChatCliIds(): CliId[] {
  return getAllCliIds().filter((id) => CLI_REGISTRY[id].chatSupported);
}

/**
 * Attempts to extract a CLI session ID from a chunk of PTY output.
 *
 * Returns the captured session ID string if the sessionType has a registered
 * `sessionIdPattern` and the pattern matches. Returns `null` for terminal
 * sessions, CLIs without a pattern, or when no match is found in the data.
 */
export function detectSessionId(sessionType: SessionType, data: string): string | null {
  if (sessionType === "terminal") return null;
  const def = CLI_REGISTRY[sessionType];
  if (!def?.sessionIdPattern) return null;
  const match = data.match(def.sessionIdPattern);
  return match?.[1] ?? null;
}
