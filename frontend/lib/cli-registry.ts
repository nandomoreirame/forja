export type CliId = "claude" | "gemini" | "codex" | "cursor-agent";
export type SessionType = CliId | "terminal";

export interface CliDefinition {
  id: CliId;
  displayName: string;
  binary: string;
  description: string;
  iconColor: string;
  icon: string;
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
  },
  gemini: {
    id: "gemini",
    displayName: "Gemini CLI",
    binary: "gemini",
    description: "AI-assisted coding with Google Gemini",
    iconColor: "text-ctp-blue",
    icon: "./images/gemini.svg",
  },
  codex: {
    id: "codex",
    displayName: "Codex CLI",
    binary: "codex",
    description: "AI-assisted coding with OpenAI Codex",
    iconColor: "text-ctp-green",
    icon: "./images/openai.svg",
  },
  "cursor-agent": {
    id: "cursor-agent",
    displayName: "Cursor Agent",
    binary: "cursor-agent",
    description: "AI-assisted coding with Cursor",
    iconColor: "text-ctp-peach",
    icon: "./images/cursor.svg",
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

export function getAllCliIds(): CliId[] {
  return Object.keys(CLI_REGISTRY) as CliId[];
}

export function getAllCliBinaries(): string[] {
  return getAllCliIds().map((id) => CLI_REGISTRY[id].binary);
}
