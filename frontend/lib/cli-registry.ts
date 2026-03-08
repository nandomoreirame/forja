export type CliId = "claude" | "gemini" | "codex" | "cursor-agent" | "opencode" | "gh-copilot";
export type SessionType = CliId | "terminal";

export interface CliDefinition {
  id: CliId;
  displayName: string;
  binary: string;
  description: string;
  iconColor: string;
  icon: string;
  chatSupported: boolean;
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
  },
  gemini: {
    id: "gemini",
    displayName: "Gemini CLI",
    binary: "gemini",
    description: "AI-assisted coding with Google Gemini",
    iconColor: "text-ctp-blue",
    icon: "./images/gemini.svg",
    chatSupported: true,
  },
  codex: {
    id: "codex",
    displayName: "Codex CLI",
    binary: "codex",
    description: "AI-assisted coding with OpenAI Codex",
    iconColor: "text-ctp-green",
    icon: "./images/openai.svg",
    chatSupported: true,
  },
  "cursor-agent": {
    id: "cursor-agent",
    displayName: "Cursor Agent",
    binary: "cursor-agent",
    description: "AI-assisted coding with Cursor",
    iconColor: "text-ctp-peach",
    icon: "./images/cursor.svg",
    chatSupported: true,
  },
  opencode: {
    id: "opencode",
    displayName: "OpenCode",
    binary: "opencode",
    description: "Open source AI coding agent",
    iconColor: "text-ctp-teal",
    icon: "./images/opencode.svg",
    chatSupported: false,
  },
  "gh-copilot": {
    id: "gh-copilot",
    displayName: "GitHub Copilot",
    binary: "gh",
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
 * - If only 1 tab of a given sessionType exists: show name without number.
 * - If 2+ tabs of the same sessionType exist: show name with per-type sequential
 *   counter (#1, #2, ...) based on position in the provided list.
 *
 * Returns a map of tabId -> display name.
 */
export function computeTabDisplayNames<T extends { id: string; sessionType: SessionType }>(
  tabs: T[]
): Record<string, string> {
  // First pass: count tabs per type
  const countByType = new Map<SessionType, number>();
  for (const tab of tabs) {
    countByType.set(tab.sessionType, (countByType.get(tab.sessionType) ?? 0) + 1);
  }

  // Second pass: assign names with per-type counter when needed
  const indexByType = new Map<SessionType, number>();
  const result: Record<string, string> = {};

  for (const tab of tabs) {
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
  "opencode",
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
