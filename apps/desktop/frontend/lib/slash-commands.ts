export interface SlashCommandDef {
  command: string;
  label: string;
  description: string;
  group: string;
  needsArgs?: boolean;
}

export const SLASH_COMMANDS: SlashCommandDef[] = [
  // Context
  { command: "/context init", label: "/context init", description: "Initialize context hub", group: "Context" },
  { command: "/context status", label: "/context status", description: "Show context status", group: "Context" },
  { command: "/context sync out", label: "/context sync out", description: "Sync hub to CLIs", group: "Context" },
  { command: "/context sync in", label: "/context sync in", description: "Sync CLIs to hub", group: "Context" },
  // Skills
  { command: "/skill create ", label: "/skill create <slug>", description: "Create a new skill", group: "Skills", needsArgs: true },
  // Agents
  { command: "/agent create ", label: "/agent create <slug>", description: "Create a new agent", group: "Agents", needsArgs: true },
];

export function filterSlashCommands(
  commands: SlashCommandDef[],
  query: string
): SlashCommandDef[] {
  if (!query) return commands;
  const lower = query.toLowerCase();
  return commands.filter(
    (cmd) =>
      cmd.command.toLowerCase().includes(lower) ||
      cmd.description.toLowerCase().includes(lower)
  );
}

export function groupSlashCommands(
  commands: SlashCommandDef[]
): Array<[string, SlashCommandDef[]]> {
  const map = new Map<string, SlashCommandDef[]>();
  for (const cmd of commands) {
    const list = map.get(cmd.group) ?? [];
    list.push(cmd);
    map.set(cmd.group, list);
  }
  return Array.from(map.entries());
}
