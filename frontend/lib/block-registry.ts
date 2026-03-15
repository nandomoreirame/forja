export type BlockType =
  | "terminal"
  | "file-preview"
  | "browser"
  | "plugin"
  | "file-tree"
  | "agent-chat"
  | "marketplace";

export interface BlockConfig {
  type: BlockType;
  tabId?: string;
  sessionType?: string;
  filePath?: string;
  url?: string;
  pluginName?: string;
  pluginDisplayName?: string;
  pluginIcon?: string;
  projectName?: string;
}

const BLOCK_LABELS: Record<BlockType, string> = {
  terminal: "Terminal",
  "file-preview": "Preview",
  browser: "Browser",
  plugin: "Plugin",
  "file-tree": "Files",
  "agent-chat": "Chat",
  marketplace: "Marketplace",
};

const BLOCK_ICONS: Record<BlockType, string> = {
  terminal: "terminal",
  "file-preview": "file-text",
  browser: "globe",
  plugin: "puzzle",
  "file-tree": "folder-tree",
  "agent-chat": "message-circle",
  marketplace: "store",
};

export const ALL_BLOCK_TYPES: BlockType[] = [
  "terminal",
  "file-preview",
  "browser",
  "plugin",
  "file-tree",
  "agent-chat",
  "marketplace",
];

export function getBlockLabel(type: BlockType): string {
  return BLOCK_LABELS[type];
}

export function getBlockIcon(type: BlockType): string {
  return BLOCK_ICONS[type];
}

export function isValidBlockType(type: string): type is BlockType {
  return ALL_BLOCK_TYPES.includes(type as BlockType);
}
